'use strict';

const {
    Adw,
    Gtk,
    Gdk,
    GLib,
    Rsvg
} = imports.gi;
const Cairo = imports.cairo;

const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const { gettext: _ } = ExtensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const UIFolderPath = Me.dir.get_child('ui').get_path();

class SVGNode {
    constructor(tag) {
        this.tag = tag;
        this.attrs = {};
        this.children = [];
        this.textContent = '';
    }
    setAttribute(k, v) { this.attrs[k] = v; }
    appendChild(child) { this.children.push(child); }
    insertBefore(newNode, refNode) {
        if (!refNode) { this.children.push(newNode); return; }
        const idx = this.children.indexOf(refNode);
        if (idx >= 0) this.children.splice(idx, 0, newNode);
        else this.children.push(newNode);
    }
    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
    }
    get firstChild() { return this.children.length ? this.children[0] : null; }

    toString() {
        let attrStr = Object.entries(this.attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
        if (attrStr) attrStr = ' ' + attrStr;
        let content = (this.textContent || "") + this.children.map(c => c.toString()).join('');
        if (!content) return `<${this.tag}${attrStr}/>`;
        return `<${this.tag}${attrStr}>${content}</${this.tag}>`;
    }
}

function generateStaticSVG(layoutData) {
    const layout = typeof layoutData === 'string' ? JSON.parse(layoutData) : layoutData;

    const document = {
        _kb: new SVGNode('g'),
        createElementNS: (ns, tag) => new SVGNode(tag),
        getElementById: (id) => {
            if (id === 'kb') {
                document._kb.setAttribute('id', 'kb');
                return document._kb;
            }
            return new SVGNode('g');
        }
    };

    function VEl() {
        this.classes = []; this.children = []; this._gc = [];
        this.dataset = {}; this._label = null; this._styleStr = '';
        this._gC = 0; this._gR = 0; this._gCS = 1; this._gRS = 1;
        var self = this;
        this.classList = { add: function (c) { if (self.classes.indexOf(c) < 0) self.classes.push(c); } };
    }
    VEl.prototype.getAttribute = function () { return null; };
    VEl.prototype.setAttribute = function (k, v) { if (k === 'style') this._styleStr = v; };
    VEl.prototype.appendChild = function (c) { this.children.push(c); };

    function Grid(cont) {
        this.cont = cont;
        cont._gc = [];
    }
    Grid.prototype.set_row_homogeneous = Grid.prototype.set_column_homogeneous = function () { };
    Grid.prototype.attach = function (w, col, row, cs, rs) {
        var el = (w && w.el) ? w.el : w;
        el._gC = col; el._gR = row; el._gCS = cs; el._gRS = rs; el._w = w;
        this.cont._gc.push(el);
    };
    var St = {
        Widget: function (o) { o = o || {}; this.el = new VEl(); this.layout_manager = new Grid(this.el); this.el.lm = this.layout_manager; },
        Button: function (o) {
            o = o || {}; this.el = new VEl();
            if (o.style_class) this.el.classes.push(o.style_class); if (o.label != null) this.el._label = o.label;
        }
    };
    function proto(cls) {
        cls.prototype.add_style_class_name = function (c) { this.el.classList.add(c); };
        cls.prototype.set_style = function () { };
    }
    proto(St.Widget); proto(St.Button);
    St.Button.prototype.clear_actions = function () { };
    St.Widget.prototype.layout_manager = null;

    function Keyboard(box, layout, W, H) {
        this.box = box;
        this.layout = layout;
        this.W = W; this.H = H;
        box._gc = [];
        box.lm = new Grid(box);
        box.add_style_class_name = function (c) { box.classList.add(c); };
        box.set_style = function () { };
        box.add_child = function (ch) { var el = (ch.el || ch); box.children.push(el); };
        this.snap_spacing_px = 8;
        this.border_spacing_px = 2;
        this.show_icons = true;
        this.outer_spacing_px = 8;
        this.background_r = 0; this.background_g = 0; this.background_b = 0; this.background_a = 0;
        this.font_size_px = 11;
        this.round_key_corners = true;
        this.font_bold = false;
        this.enable_drag = false;
    }
    Keyboard.prototype.lightOrDark = function () { return false; };
    Keyboard.prototype.set_reactive = function () { };
    Keyboard.prototype.buildUI = function () {
        var currentLayout = this.layout;
        var self = this;
        this.keys = [];
        this.box.width = this.W;
        this.box.height = this.H;
        this.box.style = {};
        var grid = this.box.lm;
        grid.set_row_homogeneous(true);
        grid.set_column_homogeneous(!currentLayout[currentLayout.length - 1].split);

        var gridLeft, gridRight, currentGrid = grid;
        var left, right, topBtnWidth;
        var isSplit = currentLayout[currentLayout.length - 1].split;
        if (isSplit) {
            left = new St.Widget({ reactive: true, width: this.W / 2 });
            gridLeft = left.el.lm;
            var middle = new St.Widget({ reactive: false, width: this.W - 10 + this.border_spacing_px });
            right = new St.Widget({ reactive: true, width: this.W / 2 });
            gridRight = right.el.lm;
            this.box.add_child(left);
            this.box.add_child(middle);
            this.box.add_child(right);
        }

        this.shiftButtons = [];
        var rowSize, halfSize, r = 0, c;
        var doAddKey = function (keydef, row, col) {
            var i = ("key" in keydef) ? "key" : ("split" in keydef) ? "split" : "empty space";
            if (i === "key") {
                var params = { x_expand: true, y_expand: true };
                var iconKeys = self.show_icons
                    ? ["left", "up", "right", "down", "backspace", "tab", "capslock", "shift", "enter", "ctrl", "super", "alt", "space", "menu"]
                    : ["left", "up", "right", "down", "space"];
                var keyBtn = new St.Button(params);
                keyBtn.add_style_class_name('key');
                keyBtn.add_style_class_name('selectable');
                var w = ("width" in keydef) ? keydef.width : 1;
                var h = ("height" in keydef) ? keydef.height : 1;
                currentGrid.attach(keyBtn, currentGrid == gridRight ? c - halfSize + 1 : c, 5 + r, w * 2, r === 0 ? 3 : h * 4);
                c += w * 2;
                keyBtn.el.dataset.keyRow = row;
                keyBtn.el.dataset.keyCol = col;
                self.keys.push(keyBtn);
            } else if (i === "empty space") {
                var kb2 = new St.Button({ x_expand: true, y_expand: true });
                var w2 = ("width" in keydef) ? keydef.width : 1;
                var h2 = ("height" in keydef) ? keydef.height : 1;
                currentGrid.attach(kb2, currentGrid == gridRight ? c - halfSize + 1 : c, 5 + r, w2 * 2, r === 0 ? 3 : h2 * 4);
                c += w2 * 2;
            } else if (i === "split") {
                currentGrid = gridRight;
                if (!halfSize) halfSize = c;
            }
        };

        for (var rowIdx = 0; rowIdx < currentLayout.length - 1; rowIdx++) {
            var kRow = currentLayout[rowIdx];
            c = 0;
            if (isSplit) currentGrid = gridLeft;
            for (var colIdx = 0; colIdx < kRow.length; colIdx++) {
                var keydef = kRow[colIdx];
                if (Array.isArray(keydef)) {
                    keydef.forEach(function (item) { doAddKey(item, rowIdx, colIdx); r += 2; c -= (("width" in item) ? item.width : 1) * 2; });
                    c += (("width" in keydef[0]) ? keydef[0].width : 1) * 2;
                    r -= 4;
                } else {
                    doAddKey(keydef, rowIdx, colIdx);
                }
            }
            if (!topBtnWidth) topBtnWidth = (("width" in kRow[kRow.length - 1]) && ("key" in kRow[kRow.length - 1])) ? kRow[kRow.length - 1].width : 1;
            if (!rowSize) rowSize = c;
            r += r === 0 ? 3 : 4;
        }

        var lastRow = currentLayout[currentLayout.length - 1];
        if (left != null) {
            left.add_style_class_name("boxLay");
            right.add_style_class_name("boxLay");
            var mvL = 2 * topBtnWidth, mvR = 2 * topBtnWidth;
            if (lastRow.settings) {
                var sb = new St.Button({ x_expand: true, y_expand: true });
                sb.add_style_class_name("key");
                gridLeft.attach(sb, 0, 0, 2 * topBtnWidth, 3); self.keys.push(sb);
            } else mvL = 0;
            if (lastRow.close) {
                var cb = new St.Button({ x_expand: true, y_expand: true }); cb.add_style_class_name("key");
                gridRight.attach(cb, rowSize - 2 * topBtnWidth - halfSize + 1, 0, 2 * topBtnWidth, 3); self.keys.push(cb);
            } else mvR = 0;
            var mhL = new St.Button({ x_expand: true, y_expand: true });
            mhL.add_style_class_name("key");
            gridLeft.attach(mhL, mvL, 0, halfSize - mvL, 3);
            var mhR = new St.Button({ x_expand: true, y_expand: true }); mhR.add_style_class_name("key");
            gridRight.attach(mhR, 1, 0, rowSize - halfSize - mvR, 3);
        } else {
            this.box.add_style_class_name("boxLay");
            var mvL2 = 2 * topBtnWidth, mvR2 = 2 * topBtnWidth;
            if (lastRow.settings) {
                var sb2 = new St.Button({ x_expand: true, y_expand: true }); sb2.add_style_class_name("key");
                grid.attach(sb2, 0, 0, 2 * topBtnWidth, 3); self.keys.push(sb2);
            } else mvL2 = 0;
            if (lastRow.close) {
                var cb2 = new St.Button({ x_expand: true, y_expand: true }); cb2.add_style_class_name("key");
                grid.attach(cb2, rowSize - 2 * topBtnWidth, 0, 2 * topBtnWidth, 3); self.keys.push(cb2);
            } else mvR2 = 0;
            var mhM = new St.Button({ x_expand: true, y_expand: true }); mhM.add_style_class_name("key");
            grid.attach(mhM, mvL2, 0, rowSize - mvL2 - mvR2, 3);
        }
    };

    var ICON_SYM = {
        backspace: '⌫', tab: '⇥', capslock: '⇪', shift: '⇧', enter: '↵',
        ctrl: 'Ctrl', super: '❖', alt: 'Alt', space: '', left: '◀',
        up: '▲', down: '▼', right: '▶', menu: '☰', settings: '⚙', close: '✕'
    };
    function renderGrid(svgG, gc, x, y, w, h, outerPad, borderGap, roundR) {
        if (!gc || gc.length === 0) return;
        var maxC = 0, maxR = 0;
        gc.forEach(function (el) {
            var ec = el._gC + el._gCS; var er = el._gR + el._gRS;
            if (ec > maxC) maxC = ec; if (er > maxR) maxR = er;
        });
        var colW = (w - outerPad * 2) / maxC;
        var rowH = (h - outerPad * 2) / maxR;
        gc.forEach(function (el) {
            var isKey = el.classes.indexOf('key') >= 0;
            var isSel = el.classes.indexOf('selectable') >= 0;
            var isMH = el.classes.indexOf('moveHandle') >= 0;
            if (!isKey && !isSel && !isMH) return;

            var kx = x + outerPad + el._gC * colW;
            var ky = y + outerPad + el._gR * rowH;
            var kw = el._gCS * colW;
            var kh = el._gRS * rowH;
            var gx = kx + borderGap, gy = ky + borderGap;

            var gw = kw - borderGap * 2, gh = kh - borderGap * 2;
            if (gw < 1 || gh < 1) return;

            var fill = isKey ? 'rgba(255,255,255,0.08)' : isSel ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.03)';

            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", gx.toFixed(2));
            rect.setAttribute("y", gy.toFixed(2));
            rect.setAttribute("width", gw.toFixed(2));
            rect.setAttribute("height", gh.toFixed(2));
            rect.setAttribute("rx", roundR);
            rect.setAttribute("fill", fill);
            svgG.appendChild(rect);

            if (isMH) return;
            var label = el._label;
            var iconCls = null;
            var cls = el.classes;
            for (var ic in ICON_SYM) {
                if (cls.indexOf(ic + '_btn') >= 0) { iconCls = ic; break; }
            }

            var txt = label || (iconCls ? ICON_SYM[iconCls] : null);
            if (!txt) return;

            var fs = Math.max(6, Math.min(11, Math.min(gw * 0.5, gh * 0.6)));
            var tEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            tEl.setAttribute("x", (gx + gw / 2).toFixed(2));
            tEl.setAttribute("y", (gy + gh / 2 + 0.5).toFixed(2));
            tEl.setAttribute("font-size", fs.toFixed(1));
            tEl.setAttribute("fill", "white");
            tEl.setAttribute("text-anchor", "middle");
            tEl.setAttribute("dominant-baseline", "middle");
            tEl.setAttribute("font-family", "Cantarell, Arial, sans-serif");
            tEl.textContent = txt;
            svgG.appendChild(tEl);
        });
    }

    function render(layout) {
        var W = 800, H = 350;
        var svgG = document.getElementById('kb');
        while (svgG.firstChild) svgG.removeChild(svgG.firstChild);
        var box = new VEl();
        var kbd = new Keyboard(box, layout, W, H);
        kbd.buildUI();

        var isSplit = layout[layout.length - 1].split;
        var rr = kbd.round_key_corners ? 5 : 0;
        var op = kbd.outer_spacing_px, bg2 = kbd.border_spacing_px;
        var br = kbd.background_r, bg3 = kbd.background_g, bb = kbd.background_b, ba = kbd.background_a;
        var bgC = 'rgba(' + br + ',' + bg3 + ',' + bb + ',' + ba + ')';
        var ns = "http://www.w3.org/2000/svg";

        if (isSplit) {
            var hw = W / 2;
            var children = box.children;
            var leftEl = children[0];
            var rightEl = children[2];
            function mkBg(x, w) {
                var r2 = document.createElementNS(ns, "rect");
                r2.setAttribute("x", x); r2.setAttribute("y", 0);
                r2.setAttribute("width", w); r2.setAttribute("height", H);
                r2.setAttribute("rx", 10); r2.setAttribute("fill", bgC);
                svgG.appendChild(r2);
            }
            mkBg(0, hw - 5); mkBg(hw + 5, hw - 5);
            renderGrid(svgG, leftEl._gc, 0, 0, hw - 5, H, op, bg2, rr);
            renderGrid(svgG, rightEl._gc, hw + 5, 0, hw - 5, H, op, bg2, rr);
        } else {
            var bgR = document.createElementNS(ns, "rect");
            bgR.setAttribute("x", 0);
            bgR.setAttribute("y", 0);
            bgR.setAttribute("width", W); bgR.setAttribute("height", H);
            bgR.setAttribute("rx", 10); bgR.setAttribute("fill", bgC);
            svgG.insertBefore(bgR, svgG.firstChild);
            renderGrid(svgG, box._gc, 0, 0, W, H, op, bg2, rr);
        }
    }

    // --- 4. EXECUTE & FINALIZE STRING ---
    render(layout);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="350" viewBox="0 0 800 350">
<defs>
<style>
    text { font-family: Cantarell, Arial, sans-serif; }
</style>
</defs>
<rect width="800" height="350" fill="#00000000"/>
${document._kb.toString()}
</svg>`;
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}

function fillPreferencesWindow(window) {

    let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    iconTheme.add_search_path(UIFolderPath + `/icons`);
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.gjsosk');

    const page1 = new Adw.PreferencesPage({
        title: _("General"),
        icon_name: "general-symbolic"
    });

    const behaviorGroup = new Adw.PreferencesGroup({
        title: _("Behavior")
    });
    page1.add(behaviorGroup);

    const layoutGroup = new Adw.PreferencesGroup({
        title: _("Layout")
    });
    page1.add(layoutGroup);

    const layoutRow = new Adw.ExpanderRow({
        title: _('Layout')
    });
    layoutGroup.add(layoutRow);

    const layoutLandscapeRow = new Adw.ActionRow({
        title: _('Landscape Layout')
    });
    layoutRow.add_row(layoutLandscapeRow);

    let layouts;
    let [okL, contentsL] = GLib.file_get_contents(Me.path + '/physicalLayouts.json');
    if (okL) {
        layouts = JSON.parse(contentsL);
    }

    function normalizeCustomLayouts(rawValue) {
        try {
            const parsed = JSON.parse(rawValue || "[]");
            if (!Array.isArray(parsed)) {
                return [];
            }
            if (parsed.length > 0 && Array.isArray(parsed[0]) && typeof parsed[parsed.length - 1] === 'object' && !Array.isArray(parsed[parsed.length - 1])) {
                return [JSON.stringify(parsed)];
            }
            return parsed;
        } catch (e) {
            logError(e);
            return [];
        }
    }

    let customLayouts = normalizeCustomLayouts(settings.get_string("custom-layout") || "[]");
    if (customLayouts.length > 0) {
        try {
            const parsed = JSON.parse(settings.get_string("custom-layout") || "[]");
            if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && typeof parsed[parsed.length - 1] === 'object' && !Array.isArray(parsed[parsed.length - 1])) {
                settings.set_string("custom-layout", JSON.stringify(customLayouts));
            }
        } catch (e) {
            settings.set_string("custom-layout", JSON.stringify(customLayouts));
        }
    }

    let layoutList = Object.keys(layouts);
    for (let i = 0; i < customLayouts.length; i++) {
        layoutList.push("Custom Layout " + (i + 1));
    }
    let layoutLandscapeDrop = Gtk.DropDown.new_from_strings(layoutList);
    layoutLandscapeDrop.valign = Gtk.Align.CENTER;
    layoutLandscapeDrop.selected = settings.get_int("layout-landscape");

    layoutLandscapeRow.add_suffix(layoutLandscapeDrop);
    layoutLandscapeRow.activatable_widget = layoutLandscapeDrop;

    const layoutPortraitRow = new Adw.ActionRow({
        title: _('Portrait Layout')
    });
    layoutRow.add_row(layoutPortraitRow);

    let layoutPortraitDrop = Gtk.DropDown.new_from_strings(layoutList);
    layoutPortraitDrop.valign = Gtk.Align.CENTER;
    layoutPortraitDrop.selected = settings.get_int("layout-portrait");

    layoutPortraitRow.add_suffix(layoutPortraitDrop);
    layoutPortraitRow.activatable_widget = layoutPortraitDrop;

    const portraitSizing = new Adw.ExpanderRow({
        title: _('Portrait Sizing')
    });
    layoutGroup.add(portraitSizing);

    let pW = new Adw.ActionRow({
        title: _('Width (%)')
    })
    let pH = new Adw.ActionRow({
        title: _('Height (%)')
    })

    let numChanger_pW = Gtk.SpinButton.new_with_range(0, 100, 5);
    numChanger_pW.value = settings.get_int('portrait-width-percent');
    numChanger_pW.valign = Gtk.Align.CENTER;
    pW.add_suffix(numChanger_pW);
    pW.activatable_widget = numChanger_pW;

    let numChanger_pH = Gtk.SpinButton.new_with_range(0, 100, 5);
    numChanger_pH.value = settings.get_int('portrait-height-percent');
    numChanger_pH.valign = Gtk.Align.CENTER;
    pH.add_suffix(numChanger_pH);
    pH.activatable_widget = numChanger_pH;

    portraitSizing.add_row(pW);
    portraitSizing.add_row(pH);

    const landscapeSizing = new Adw.ExpanderRow({
        title: _('Landscape Sizing')
    });
    layoutGroup.add(landscapeSizing);

    let lW = new Adw.ActionRow({
        title: _('Width (%)')
    });
    let lH = new Adw.ActionRow({
        title: _('Height (%)')
    });

    let numChanger_lW = Gtk.SpinButton.new_with_range(0, 100, 5);
    numChanger_lW.value = settings.get_int('landscape-width-percent');
    numChanger_lW.valign = Gtk.Align.CENTER;
    lW.add_suffix(numChanger_lW);
    lW.activatable_widget = numChanger_lW;

    let numChanger_lH = Gtk.SpinButton.new_with_range(0, 100, 5);
    numChanger_lH.value = settings.get_int('landscape-height-percent');
    numChanger_lH.valign = Gtk.Align.CENTER;
    lH.add_suffix(numChanger_lH);
    lH.activatable_widget = numChanger_lH;

    landscapeSizing.add_row(lW);
    landscapeSizing.add_row(lH);

    const disableEdgeSwipeRow = new Adw.ActionRow({
        title: _('Disable Edge Swipe')
    });
    behaviorGroup.add(disableEdgeSwipeRow);

    const disableEdgeSwipeDT = new Gtk.Switch({
        active: settings.get_boolean('disable-edge-swipe'),
        valign: Gtk.Align.CENTER,
    });

    disableEdgeSwipeRow.add_suffix(disableEdgeSwipeDT);
    disableEdgeSwipeRow.activatable_widget = disableEdgeSwipeDT;

    const enableDragRow = new Adw.ActionRow({
        title: _('Enable Dragging')
    });
    behaviorGroup.add(enableDragRow);

    const dragEnableDT = new Gtk.Switch({
        active: settings.get_boolean('enable-drag'),
        valign: Gtk.Align.CENTER,
    });

    enableDragRow.add_suffix(dragEnableDT);
    enableDragRow.activatable_widget = dragEnableDT;

    const indEnabledRow = new Adw.ActionRow({
        title: _('Enable Panel Indicator')
    });
    behaviorGroup.add(indEnabledRow);

    const indEnabled = new Gtk.Switch({
        active: settings.get_boolean("indicator-enabled"),
        valign: Gtk.Align.CENTER,
    });

    indEnabledRow.add_suffix(indEnabled);
    indEnabledRow.activatable_widget = indEnabled;

    const enableKeyRepeatRow = new Adw.ActionRow({
        title: _('Enable Key Repeat for All Keys')
    });
    behaviorGroup.add(enableKeyRepeatRow);
    const enableKeyRepeatDT = new Gtk.Switch({
        active: settings.get_boolean('enable-key-repeat'),
        valign: Gtk.Align.CENTER,
    });

    enableKeyRepeatRow.add_suffix(enableKeyRepeatDT);
    enableKeyRepeatRow.activatable_widget = enableKeyRepeatDT;

    const soundPlayRow = new Adw.ExpanderRow({
        title: _('Play sound'),
        show_enable_switch: true
    });
    behaviorGroup.add(soundPlayRow);
    soundPlayRow.enable_expansion = settings.get_boolean('play-sound')

    const fileRow = new Adw.ActionRow({
        title: _('Sound file'),
        subtitle: settings.get_string('sound-file') || _('No file selected'),
        activatable: false, // prevent clicking the whole row
    });

    const fileButton = new Gtk.Button({
        label: settings.get_string('sound-file') ? _('Clear') : _('Choose'),
        valign: Gtk.Align.CENTER,
    });

    fileRow.add_suffix(fileButton);
    fileRow.activatable_widget = fileButton;

    fileButton.connect('clicked', () => {
        const currentPath = settings.get_string('sound-file');
        if (currentPath) {
            settings.set_string('sound-file', '');
            fileRow.subtitle = _('No file selected');
            fileButton.label = _('Choose');
        } else {
            const fileChooser = new Gtk.FileChooserNative({
                title: _('Select OGG File'),
                transient_for: window,
                action: Gtk.FileChooserAction.OPEN,
                accept_label: _('Open'),
                cancel_label: _('Cancel'),
            });

            const filter = new Gtk.FileFilter();
            filter.add_mime_type('audio/ogg');
            filter.set_name(_('OGG files'));
            fileChooser.add_filter(filter);

            fileChooser.connect('response', (dlg, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const file = dlg.get_file();
                    if (file) {
                        const path = file.get_path();
                        settings.set_string('sound-file', path);
                        fileRow.subtitle = path;
                        fileButton.label = _('Clear');

                        // Optionally play the file immediately
                        try {
                            let player = global.display.get_sound_player();
                            player.play_from_file(path, null);
                        } catch (e) {
                            logError(e, 'Failed to play sound file');
                        }
                    }
                }
                dlg.destroy();
            });

            fileChooser.show();
        }
    });

    soundPlayRow.add_row(fileRow);

    const keyRepeatRateRow = new Adw.ActionRow({
        title: _('Key Repeat Rate (ms)')
    });
    behaviorGroup.add(keyRepeatRateRow);
    let numChanger_keyRepeat = Gtk.SpinButton.new_with_range(10, 1000, 10);
    numChanger_keyRepeat.value = settings.get_int('key-repeat-rate');
    numChanger_keyRepeat.valign = Gtk.Align.CENTER;
    keyRepeatRateRow.add_suffix(numChanger_keyRepeat);
    keyRepeatRateRow.activatable_widget = numChanger_keyRepeat;

    const row1t5 = new Adw.ActionRow({
        title: _('Open upon clicking in a text field')
    });
    behaviorGroup.add(row1t5);


    let dragOptList = [_("Never"), _("Only on Touch"), _("Always")];
    let dragOpt = Gtk.DropDown.new_from_strings(dragOptList);
    dragOpt.valign = Gtk.Align.CENTER;
    dragOpt.selected = settings.get_int("enable-tap-gesture");

    row1t5.add_suffix(dragOpt);
    row1t5.activatable_widget = dragOpt;

    const defaultMonitor = new Adw.ActionRow({
        title: _('Default Monitor')
    })
    layoutGroup.add(defaultMonitor);

    let monitors = [];

    const display = Gdk.Display.get_default();
    if (display && "get_monitors" in display) {
        const monitorsAvailable = display.get_monitors();

        for (let idx = 0; idx < monitorsAvailable.get_n_items(); idx++) {
            const monitor = monitorsAvailable.get_item(idx);
            monitors.push(monitor);
        }
    }
    let monitorDrop = Gtk.DropDown.new_from_strings(monitors.map(m => m.get_model()))
    monitorDrop.valign = Gtk.Align.CENTER;
    let currentMonitorMap = {};
    let currentMonitors;
    if (settings.get_string("default-monitor").includes(";")) {
        currentMonitors = settings.get_string("default-monitor").split(";")
    } else {
        currentMonitors = [("1:" + monitors[0].get_connector())]
    }

    for (var i of currentMonitors) {
        let tmp = i.split(":");
        currentMonitorMap[tmp[0]] = tmp[1] + "";
    }
    if (!Object.keys(currentMonitorMap).includes(monitors.length + "")) {
        let allConfigs = Object.keys(currentMonitorMap).map(Number.parseInt).sort();
        currentMonitorMap[monitors.length + ""] = allConfigs[allConfigs.length - 1];
    }
    let index = monitors.map(m => { return m.get_connector() }).indexOf(currentMonitorMap[monitors.length + ""]);
    if (index == -1) {
        index = 0
    }
    monitorDrop.selected = index;

    defaultMonitor.add_suffix(monitorDrop);
    defaultMonitor.activatable_widget = monitorDrop;

    const defaultPosition = new Adw.ActionRow({
        title: _('Default Position')
    });
    layoutGroup.add(defaultPosition);

    let posList = [
        _("Top Left"), _("Top Center"), _("Top Right"),
        _("Center Left"), _("Center"), _("Center Right"),
        _("Bottom Left"), _("Bottom Center"), _("Bottom Right")
    ];
    let snapDrop = Gtk.DropDown.new_from_strings(posList);
    snapDrop.valign = Gtk.Align.CENTER;
    snapDrop.selected = settings.get_int("default-snap");

    defaultPosition.add_suffix(snapDrop);
    defaultPosition.activatable_widget = snapDrop;

    const appearanceGroup = new Adw.PreferencesGroup({
        title: _("Appearance")
    });
    page1.add(appearanceGroup);

    const colorRow = new Adw.ExpanderRow({
        title: _("Color")
    })
    appearanceGroup.add(colorRow);


    const lightCol = new Adw.ActionRow({
        title: _('Light Mode')
    });
    colorRow.add_row(lightCol)

    let rgba = new Gdk.RGBA();
    rgba.parse("rgba(" + settings.get_double("background-r") + ", " + settings.get_double("background-g") + ", " + settings.get_double("background-b") + ", " + settings.get_double("background-a") + ")");
    let colorButton = new Gtk.ColorButton({
        rgba: rgba,
        use_alpha: true,
        valign: Gtk.Align.CENTER
    });
    lightCol.add_suffix(colorButton);
    lightCol.activatable_widget = colorButton;

    const darkCol = new Adw.ActionRow({
        title: _('Dark Mode')
    });
    colorRow.add_row(darkCol)

    let rgba_d = new Gdk.RGBA();
    rgba_d.parse("rgba(" + settings.get_double("background-r-dark") + ", " + settings.get_double("background-g-dark") + ", " + settings.get_double("background-b-dark") + ", " + settings.get_double("background-a-dark") + ")");
    let colorButton_d = new Gtk.ColorButton({
        rgba: rgba_d,
        use_alpha: true,
        valign: Gtk.Align.CENTER
    });
    darkCol.add_suffix(colorButton_d);
    darkCol.activatable_widget = colorButton_d;

    let fontSize = new Adw.ActionRow({
        title: _('Font Size (px)')
    });
    appearanceGroup.add(fontSize);

    let numChanger_font = Gtk.SpinButton.new_with_range(0, 100, 1);
    numChanger_font.value = settings.get_int('font-size-px');
    numChanger_font.valign = Gtk.Align.CENTER;

    fontSize.add_suffix(numChanger_font);
    fontSize.activatable_widget = numChanger_font;

    const fontBoldRow = new Adw.ActionRow({
        title: _("Bold Font")
    })
    appearanceGroup.add(fontBoldRow)

    const fontBoldEnabled = new Gtk.Switch({
        active: settings.get_boolean("font-bold"),
        valign: Gtk.Align.CENTER
    })

    fontBoldRow.add_suffix(fontBoldEnabled)
    fontBoldRow.activatable_widget = fontBoldEnabled

    let borderSpacing = new Adw.ActionRow({
        title: _('Border Spacing (px)')
    });
    appearanceGroup.add(borderSpacing);

    let numChanger_bord = Gtk.SpinButton.new_with_range(0, 10, 1);
    numChanger_bord.value = settings.get_int('border-spacing-px');
    numChanger_bord.valign = Gtk.Align.CENTER;
    borderSpacing.add_suffix(numChanger_bord);
    borderSpacing.activatable_widget = numChanger_bord;

    let outerSpacing = new Adw.ActionRow({
        title: _('Outer Spacing (px)')
    });
    appearanceGroup.add(outerSpacing);

    let numChanger_outer = Gtk.SpinButton.new_with_range(0, 30, 1);
    numChanger_outer.value = settings.get_int('outer-spacing-px');
    numChanger_outer.valign = Gtk.Align.CENTER;
    outerSpacing.add_suffix(numChanger_outer);
    outerSpacing.activatable_widget = numChanger_outer;

    let snapSpacing = new Adw.ActionRow({
        title: _('Drag snap spacing (px)')
    });
    appearanceGroup.add(snapSpacing);

    let numChanger_snap = Gtk.SpinButton.new_with_range(0, 50, 5);
    numChanger_snap.value = settings.get_int('snap-spacing-px');
    numChanger_snap.valign = Gtk.Align.CENTER;
    snapSpacing.add_suffix(numChanger_snap);
    snapSpacing.activatable_widget = numChanger_snap;

    const roundCorners = new Adw.ActionRow({
        title: _('Round Corners')
    });
    appearanceGroup.add(roundCorners);

    const roundKeyCDT = new Gtk.Switch({
        active: settings.get_boolean('round-key-corners'),
        valign: Gtk.Align.CENTER,
    });

    roundCorners.add_suffix(roundKeyCDT);
    roundCorners.activatable_widget = roundKeyCDT;

    const showIcon = new Adw.ActionRow({
        title: _('Show Special Key Icons')
    });
    appearanceGroup.add(showIcon);

    const showIconDT = new Gtk.Switch({
        active: settings.get_boolean('show-icons'),
        valign: Gtk.Align.CENTER,
    });

    showIcon.add_suffix(showIconDT);
    showIcon.activatable_widget = showIconDT;

    window.add(page1);

    const page2 = new Adw.PreferencesPage({
        title: _("Custom Layouts"),
        icon_name: "view-grid-symbolic"
    });

    const addGroup = new Adw.PreferencesGroup({
        title: _("Add Layout")
    });
    page2.add(addGroup);

    const addRow = new Adw.ActionRow({
        title: _('Paste Keyboard JSON')
    });
    addGroup.add(addRow);

    const layoutTextApplyBox = new Gtk.Box()
    layoutTextApplyBox.set_margin_top(10)
    layoutTextApplyBox.set_margin_bottom(10)
    const customLayoutRowTextEntry = new Gtk.Entry()
    const addButton = Gtk.Button.new_with_label(_("Add"))
    customLayoutRowTextEntry.set_margin_end(10)
    layoutTextApplyBox.append(customLayoutRowTextEntry)
    layoutTextApplyBox.append(addButton)

    addRow.add_suffix(layoutTextApplyBox)

    const createKeyboardLayoutRow = new Adw.ActionRow({
        title: _('Create/edit a custom keyboard layout')
    })
    addGroup.add(createKeyboardLayoutRow)

    const layoutLink = new Gtk.LinkButton({
        label: 'Keyboard Layout Editor',
        uri: 'https://vishram1123.github.io/gjs-osk'
    })

    createKeyboardLayoutRow.add_suffix(layoutLink)
    createKeyboardLayoutRow.activatable_widget = layoutLink

    const layoutsGroup = new Adw.PreferencesGroup({
        title: _("Layouts")
    });
    page2.add(layoutsGroup);

    const layoutsScroll = new Gtk.ScrolledWindow({
        vexpand: false
    });
    layoutsScroll.set_propagate_natural_height(true);
    layoutsGroup.add(layoutsScroll);
    const layoutsBox = new Gtk.FlowBox({
        column_spacing: 12,
        row_spacing: 12,
        max_children_per_line: 2,
        selection_mode: Gtk.SelectionMode.NONE

    });
    layoutsBox.set_min_children_per_line(2);
    layoutsBox.set_max_children_per_line(2);
    layoutsScroll.set_child(layoutsBox);

    // Function to refresh dropdown lists
    function refreshLayoutDropdowns() {
        const savedLandscapeIdx = layoutLandscapeDrop.selected;
        const savedPortraitIdx = layoutPortraitDrop.selected;
        let newLayoutList = Object.keys(layouts);
        for (let i = 0; i < customLayouts.length; i++) {
            newLayoutList.push("Custom Layout " + (i + 1));
        }
        layoutLandscapeDrop.set_model(Gtk.StringList.new(newLayoutList));
        layoutPortraitDrop.set_model(Gtk.StringList.new(newLayoutList));
        layoutLandscapeDrop.selected = Math.min(savedLandscapeIdx, newLayoutList.length - 1);
        layoutPortraitDrop.selected = Math.min(savedPortraitIdx, newLayoutList.length - 1);
    }

    // Function to add a layout box
    function addLayoutBox(json, index) {
        const vboxparent = new Gtk.ScrolledWindow({
            min_content_height: 170,
            max_content_height: 170,
        });
        const vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            hexpand: false,
        });

        vbox.set_vexpand(false);
        vbox.set_valign(Gtk.Align.START);
        vboxparent.set_child(vbox);

        vbox.add_css_class("card");
        vbox.set_sensitive(true);
        const clickHandler = new Gtk.GestureClick();
        vbox.add_controller(clickHandler);
        clickHandler.connect('pressed', () => {
            customLayoutRowTextEntry.get_buffer().set_text(json, json.length)
        });

        const image = new Gtk.Picture({
            can_shrink: true,
            keep_aspect_ratio: true,
            margin_top: 10,
            margin_start: 10,
            margin_end: 10
        });

        vbox.append(image);
        // SVG preview (GTK4-native)
        try {
            const svg = generateStaticSVG(json)

            const handle = Rsvg.Handle.new_from_data(svg);

            const surface = new Cairo.ImageSurface(
                Cairo.Format.ARGB32,
                800,
                350
            );

            const cr = new Cairo.Context(surface);

            const dim = handle.get_dimensions();

            handle.render_cairo(cr);

            image.set_pixbuf(handle.get_pixbuf());

        } catch (e) {
            logError(e);
        }

        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            hexpand: true
        });
        vbox.append(hbox);
        // Label
        const label = new Gtk.Label({
            label: "Custom Layout " + (index + 1),
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL
        });
        hbox.append(label);

        const spacer = new Gtk.Box({
            hexpand: true
        });
        hbox.append(spacer);

        // Delete button
        const deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END
        });

        deleteButton.connect('clicked', () => {
            const idx = customLayouts.indexOf(json);
            if (idx >= 0) {
                customLayouts.splice(idx, 1);
                settings.set_string("custom-layout", JSON.stringify(customLayouts));
                let child;
                while ((child = layoutsBox.get_first_child()) !== null) {
                    layoutsBox.remove(child);
                }
                for (let i = 0; i < customLayouts.length; i++) {
                    addLayoutBox(customLayouts[i], i);
                }
                refreshLayoutDropdowns();
                addRow.set_text('');
            }
        });

        hbox.append(deleteButton);
        layoutsBox.append(vboxparent);
    }

    // Load existing
    for (let i = 0; i < customLayouts.length; i++) {
        addLayoutBox(customLayouts[i], i);
    }

    // Add button connect
    addButton.connect('clicked', () => {
        const json = customLayoutRowTextEntry.get_buffer().get_text();
        try {
            JSON.parse(json);
            const jsonStr = JSON.stringify(JSON.parse(json));
            customLayouts.push(jsonStr);
            settings.set_string("custom-layout", JSON.stringify(customLayouts));
            addLayoutBox(jsonStr, customLayouts.length - 1);
            refreshLayoutDropdowns();
            customLayoutRowTextEntry.get_buffer().set_text('');
        } catch (e) {
            logError(e);
        }
    });

    window.add(page2);

    let page3 = new Adw.PreferencesPage({
        title: _("About"),
        icon_name: 'info-symbolic',
    });

    let contribute_icon_pref_group = new Adw.PreferencesGroup();
    let icon_box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin_top: 24,
        margin_bottom: 24,
        spacing: 18,
    });

    let icon_image = new Gtk.Image({
        icon_name: "input-keyboard-symbolic",
        pixel_size: 128,
    });

    let label_box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 6,
    });

    let label = new Gtk.Label({
        label: "GJS OSK",
        wrap: true,
    });
    let context = label.get_style_context();
    context.add_class("title-1");

    let another_label = new Gtk.Label({
        label: _("Autorelease ") + `{{VERSION}}`
    });

    let links_pref_group = new Adw.PreferencesGroup();
    let code_row = new Adw.ActionRow({
        icon_name: "code-symbolic",
        title: _("More Information, submit feedback, and get help")
    });
    let github_link = new Gtk.LinkButton({
        label: "Github",
        uri: "https://github.com/Vishram1123/gjs-osk",
    });

    let icons_credit = new Adw.ActionRow({
        icon_name: "app-icon-design-symbolic",
        title: _("Icons sourced from")
    });
    let remixicon_link = new Gtk.LinkButton({
        label: "RemixIcon",
        uri: "https://remixicon.com/",
    });

    code_row.add_suffix(github_link);
    code_row.set_activatable_widget(github_link);
    links_pref_group.add(code_row);
    icons_credit.add_suffix(remixicon_link);
    icons_credit.set_activatable_widget(remixicon_link);
    links_pref_group.add(icons_credit);

    label_box.append(label);
    label_box.append(another_label);
    icon_box.append(icon_image);
    icon_box.append(label_box);
    contribute_icon_pref_group.add(icon_box);

    page3.add(contribute_icon_pref_group);
    page3.add(links_pref_group);

    window.add(page3);

    settings.bind("layout-landscape", layoutLandscapeDrop, "selected", 0);
    settings.bind("layout-portrait", layoutPortraitDrop, "selected", 0);
    settings.bind("disable-edge-swipe", disableEdgeSwipeDT, "active", 0);
    settings.bind("enable-drag", dragEnableDT, "active", 0);
    settings.bind("enable-tap-gesture", dragOpt, "selected", 0);
    settings.bind("indicator-enabled", indEnabled, "active", 0);
    settings.bind("portrait-width-percent", numChanger_pW, "value", 0);
    settings.bind("portrait-height-percent", numChanger_pH, "value", 0);
    settings.bind("landscape-width-percent", numChanger_lW, "value", 0);
    settings.bind("landscape-height-percent", numChanger_lH, "value", 0);
    colorButton.connect("color-set", () => {
        settings.set_double("background-r", Math.round(colorButton.get_rgba().red * 255));
        settings.set_double("background-g", Math.round(colorButton.get_rgba().green * 255));
        settings.set_double("background-b", Math.round(colorButton.get_rgba().blue * 255));
        settings.set_double("background-a", colorButton.get_rgba().alpha);
    })
    colorButton_d.connect("color-set", () => {
        settings.set_double("background-r-dark", Math.round(colorButton_d.get_rgba().red * 255));
        settings.set_double("background-g-dark", Math.round(colorButton_d.get_rgba().green * 255));
        settings.set_double("background-b-dark", Math.round(colorButton_d.get_rgba().blue * 255));
        settings.set_double("background-a-dark", colorButton_d.get_rgba().alpha);
    })
    settings.bind("font-size-px", numChanger_font, "value", 0);
    settings.bind("font-bold", fontBoldEnabled, "active", 0)
    settings.bind("border-spacing-px", numChanger_bord, "value", 0);
    settings.bind("outer-spacing-px", numChanger_outer, "value", 0);
    settings.bind("snap-spacing-px", numChanger_snap, "value", 0)
    settings.bind("round-key-corners", roundKeyCDT, "active", 0);
    settings.bind("enable-key-repeat", enableKeyRepeatDT, "active", 0);
    settings.bind("key-repeat-rate", numChanger_keyRepeat, "value", 0);
    settings.bind("play-sound", soundPlayRow, "enable-expansion", 0);
    settings.bind("show-icons", showIconDT, "active", 0)
    settings.bind("default-snap", snapDrop, "selected", 0);
    monitorDrop.connect("notify::selected", () => {
        currentMonitorMap[monitors.length + ""] = monitors.map(m => { return m.get_connector() })[monitorDrop.selected];
        let representation = [];
        for (var k of Object.keys(currentMonitorMap)) {
            representation.push(k + ":" + currentMonitorMap[k])
        }
        settings.set_string("default-monitor", representation.join(";"))
    })

    window.connect("close-request", () => {
        settings.set_int("layout-landscape", layoutLandscapeDrop.selected);
        settings.set_int("layout-portrait", layoutPortraitDrop.selected);
        settings.set_boolean("disable-edge-swipe", disableEdgeSwipeDT.active);
        settings.set_boolean("enable-drag", dragEnableDT.active);
        settings.set_int("enable-tap-gesture", dragOpt.selected);
        settings.set_boolean("indicator-enabled", indEnabled.active);
        settings.set_int("portrait-width-percent", numChanger_pW.value);
        settings.set_int("portrait-height-percent", numChanger_pH.value);
        settings.set_int("landscape-width-percent", numChanger_lW.value);
        settings.set_int("landscape-height-percent", numChanger_lH.value);
        settings.set_double("background-r", Math.round(colorButton.get_rgba().red * 255));
        settings.set_double("background-g", Math.round(colorButton.get_rgba().green * 255));
        settings.set_double("background-b", Math.round(colorButton.get_rgba().blue * 255));
        settings.set_double("background-a", colorButton.get_rgba().alpha);
        settings.set_double("background-r-dark", Math.round(colorButton_d.get_rgba().red * 255));
        settings.set_double("background-g-dark", Math.round(colorButton_d.get_rgba().green * 255));
        settings.set_double("background-b-dark", Math.round(colorButton_d.get_rgba().blue * 255));
        settings.set_double("background-a-dark", colorButton_d.get_rgba().alpha);
        settings.set_int("font-size-px", numChanger_font.value);
        settings.set_boolean("font-bold", fontBoldEnabled.active)
        settings.set_int("border-spacing-px", numChanger_bord.value);
        settings.set_int("outer-spacing-px", numChanger_outer.value);
        settings.set_int("snap-spacing-px", numChanger_snap.value)
        settings.set_boolean("round-key-corners", roundKeyCDT.active);
        settings.set_boolean("enable-key-repeat", enableKeyRepeatDT.active);
        settings.set_int("key-repeat-rate", numChanger_keyRepeat.value);
        settings.set_boolean("play-sound", soundPlayRow.enable_expansion);
        settings.set_boolean("show-icons", showIconDT.active)
        settings.set_int("default-snap", snapDrop.selected);
        currentMonitorMap[monitors.length + ""] = monitors.map(m => { return m.get_connector() })[monitorDrop.selected];
        let representation = [];
        for (var k of Object.keys(currentMonitorMap)) {
            representation.push(k + ":" + currentMonitorMap[k])
        }
        settings.set_string("default-monitor", representation.join(";"))
    })
}