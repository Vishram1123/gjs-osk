'use strict';

const {
    Adw,
    Gtk,
    Gdk,
    GLib
} = imports.gi;

const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const { gettext: _ } = ExtensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const UIFolderPath = Me.dir.get_child('ui').get_path();

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

    const layoutRow = new Adw.ExpanderRow({
        title: _('Layout')
    });
    behaviorGroup.add(layoutRow);

    const layoutLandscapeRow = new Adw.ActionRow({
        title: _('Landscape Layout')
    });
    layoutRow.add_row(layoutLandscapeRow);

    let layouts;
    let [okL, contentsL] = GLib.file_get_contents(Me.path + '/physicalLayouts.json');
    if (okL) {
        layouts = JSON.parse(contentsL);
    }

    let layoutList = Object.keys(layouts);
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

    const portraitSizing = new Adw.ExpanderRow({
        title: _('Portrait Sizing')
    });
    behaviorGroup.add(portraitSizing);

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
    behaviorGroup.add(landscapeSizing);

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

    const defaultMonitor = new Adw.ActionRow({
        title: _('Default Monitor')
    })
    behaviorGroup.add(defaultMonitor);

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
    behaviorGroup.add(defaultPosition);

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

    let page2 = new Adw.PreferencesPage({
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

    page2.add(contribute_icon_pref_group);
    page2.add(links_pref_group);

    window.add(page2);

    settings.bind("layout-landscape", layoutLandscapeDrop, "selected", 0);
    settings.bind("layout-portrait", layoutPortraitDrop, "selected", 0);
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
