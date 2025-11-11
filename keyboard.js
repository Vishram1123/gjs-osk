let currentLayout = [
    [{ "key": "ESC", "width": 0.5 }, { "key": "FK01" }, { "key": "FK02" }, { "key": "FK03" }, { "key": "FK04" }, { "key": "FK05" }, { "key": "FK06" }, { "key": "FK07" }, { "split": true }, { "key": "FK08" }, { "key": "FK09" }, { "key": "FK10" }, { "key": "FK11" }, { "key": "FK12" }, { "key": "PRSC" }, { "key": "DELE" }],
    [{ "key": "TLDE", "width": 1 }, { "key": "AE01" }, { "key": "AE02" }, { "key": "AE03" }, { "key": "AE04" }, { "key": "AE05" }, { "key": "AE06" }, { "split": true }, { "key": "AE07" }, { "key": "AE08" }, { "key": "AE09" }, { "key": "AE10" }, { "key": "AE11" }, { "key": "AE12" }, { "key": "BKSP", "width": 1.5 }],
    [{ "key": "TAB", "width": 1.5 }, { "key": "AD01" }, { "key": "AD02" }, { "key": "AD03" }, { "key": "AD04" }, { "key": "AD05" }, { "key": "AD06" }, { "split": true }, { "key": "AD07" }, { "key": "AD08" }, { "key": "AD09" }, { "key": "AD10" }, { "key": "AD11" }, { "key": "AD12" }, { "key": "RTRN", "height": 2 }],
    [{ "key": "CAPS", "width": 2 }, { "key": "AC01" }, { "key": "AC02" }, { "key": "AC03" }, { "key": "AC04" }, { "key": "AC05" }, { "split": true }, { "key": "AC06" }, { "key": "AC07" }, { "key": "AC08" }, { "key": "AC09" }, { "key": "AC10" }, { "key": "AC11" }, { "key": "BKSL", "width": 0.5 }, { "width": 1 }],
    [{ "key": "LFSH", "width": 2 }, { "key": "LSGT" }, { "key": "AB01" }, { "key": "AB02" }, { "key": "AB03" }, { "key": "AB04" }, { "split": true }, { "key": "AB05" }, { "key": "AB06" }, { "key": "AB07" }, { "key": "AB08" }, { "key": "AB09" }, { "key": "AB10" }, { "key": "RTSH", "width": 1.5 }],
    [{ "key": "LCTL" }, { "key": "LWIN" }, { "key": "LALT" }, { "key": "SPCE", "width": 4 }, { "split": true }, { "key": "SPCE", "width": 2.5 }, { "key": "RALT" }, { "key": "RCTL" }, { "key": "LEFT" }, [{ "key": "UP", "height": 0.5 }, { "key": "DOWN", "height": 0.5 }], { "key": "RGHT" }],
    { "split": true, "settings": true, "close": true }
]

const major = 50;
let monitor = {};
let currentKeyElement = null;
let currentKeyRow = -1;
let currentKeyCol = -1;

class KeyEditor {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'key-editor';
        this.element.classList.add('disabled');
        document.body.appendChild(this.element);

        this.keycodeInput = null;
        this.keycodeInput2 = null;
        this.widthInput = null;
        this.heightInput = null;
        this.isSplit = false;
        this.currentKeyDef = null;

        this.initUI();
        this.setupEventListeners();
    }

    initUI() {
        this.element.innerHTML = `
            <h3>Key Editor</h3>
            <div class="key-editor-row">
                <span class="key-editor-label"><a title="Use one of the keycodes here, or blank for spacer" target="_blank" rel="noopener noreferrer" class='key_help' href="https://kb.aseri.net/kbd/xkb.png"></a> Keycode:</span>
                <input type="text" class="key-editor-input" id="keycode-input">
            </div>
            <div class="key-editor-split-container" id="split-container" style="display: none;">
                <div class="key-editor-row">
                    <a title="Valid Keycodes and Where they Are" target="_blank" rel="noopener noreferrer" class='key_help' href="https://kb.aseri.net/kbd/xkb.png"></a>
                    <span class="key-editor-label">Top Keycode:</span>
                    <input type="text" class="key-editor-input" id="keycode-input-top">
                </div>
                <div class="key-editor-row">
                    <a title="Valid Keycodes and Where they Are" target="_blank" rel="noopener noreferrer" class='key_help' href="https://kb.aseri.net/kbd/xkb.png"></a>
                    <span class="key-editor-label">Bottom Keycode:</span>
                    <input type="text" class="key-editor-input" id="keycode-input-bottom">
                </div>
            </div>
            <div class="key-editor-row">
                <span class="key-editor-label">Width:</span>
                <input type="number" min="0.5" step="0.5" class="key-editor-input" id="width-input">
            </div>
            <div class="key-editor-row">
                <span class="key-editor-label">Height:</span>
                <input type="number" min="0.5" step="0.5" class="key-editor-input" id="height-input">
            </div>
            <div class="key-editor-buttons">
                <button class="key-editor-button secondary" id="toggle-split">Split Key</button>
                <button class="key-editor-button" id="move-left">Move Left</button>
                <button class="key-editor-button" id="move-right">Move Right</button>
                <button class="key-editor-button" id="move-up">Move Up</button>
                <button class="key-editor-button" id="move-down">Move Down</button>
            </div>
            <div class="key-editor-buttons">
                <button class="key-editor-button" id="add-left">Add Left</button>
                <button class="key-editor-button" id="add-right">Add Right</button>
            </div>
            <div class="key-editor-buttons">
                <button class="key-editor-button danger" id="remove-key">Remove Key</button>
                <button class="key-editor-button secondary" id="deselect-key">Deselect</button>
            </div>
        `;

        this.keycodeInput = this.element.querySelector('#keycode-input');
        this.keycodeInputTop = this.element.querySelector('#keycode-input-top');
        this.keycodeInputBottom = this.element.querySelector('#keycode-input-bottom');
        this.widthInput = this.element.querySelector('#width-input');
        this.heightInput = this.element.querySelector('#height-input');
        this.splitContainer = this.element.querySelector('#split-container');
    }

    setupEventListeners() {
        this.element.querySelector('#toggle-split').addEventListener('click', () => this.toggleSplit());
        this.element.querySelector('#move-left').addEventListener('click', () => this.moveKey(0));
        this.element.querySelector('#move-right').addEventListener('click', () => this.moveKey(1));
        this.element.querySelector('#move-up').addEventListener('click', () => this.moveKey(2));
        this.element.querySelector('#move-down').addEventListener('click', () => this.moveKey(3));
        this.element.querySelector('#add-left').addEventListener('click', () => this.addKey('left'));
        this.element.querySelector('#add-right').addEventListener('click', () => this.addKey('right'));
        this.element.querySelector('#remove-key').addEventListener('click', () => this.removeKey());
        this.element.querySelector('#deselect-key').addEventListener('click', () => this.hide());

        this.keycodeInput.addEventListener('change', () => this.updateKeycode(this.keycodeInput.value));
        this.keycodeInputTop.addEventListener('change', () => this.updateSplitKeycode('top', this.keycodeInputTop.value));
        this.keycodeInputBottom.addEventListener('change', () => this.updateSplitKeycode('bottom', this.keycodeInputBottom.value));
        this.widthInput.addEventListener('change', () => this.updateSize('width', parseFloat(this.widthInput.value)));
        this.heightInput.addEventListener('change', () => this.updateSize('height', parseFloat(this.heightInput.value)));
    }

    show(keyElement, keyDef, row, col) {
        this.currentKeyElement = keyElement;
        this.currentKeyDef = keyDef;
        this.currentRow = row;
        this.currentCol = col;

        if (Array.isArray(keyDef)) {
            this.isSplit = true;
            this.keycodeInput.style.display = 'none';
            this.splitContainer.style.display = 'block';
            this.keycodeInputTop.value = keyDef[0].key || '';
            this.keycodeInputBottom.value = keyDef[1].key || '';
            this.widthInput.value = keyDef[0].width || 1;
            this.heightInput.value = keyDef[0].height || 1;
        } else {
            this.isSplit = false;
            this.keycodeInput.style.display = 'block';
            this.splitContainer.style.display = 'none';
            this.keycodeInput.value = keyDef.key || '';
            this.widthInput.value = keyDef.width || 1;
            this.heightInput.value = keyDef.height || 1;
        }

        this.element.classList.remove('disabled');
        document.addEventListener('click', this.outsideClickHandler);
    }

    hide() {
        this.isSplit = false;
        this.keycodeInput.style.display = 'block';
        this.splitContainer.style.display = 'none';
        this.keycodeInput.value = '';
        this.widthInput.value = null;
        this.heightInput.value = null;
        this.element.classList.add('disabled');
        document.removeEventListener('click', this.outsideClickHandler);
        if (currentKeyElement) {
            currentKeyElement.classList.remove('pressed');
            currentKeyElement = null;
        }
    }

    outsideClickHandler = (e) => {
        if (!this.element.contains(e.target) && e.target !== currentKeyElement) {
            this.hide();
        }
    }

    toggleSplit() {
        if (this.isSplit) {
            this.isSplit = false;
            this.keycodeInput.style.display = 'block';
            this.splitContainer.style.display = 'none';
            const newKeycode = this.keycodeInputTop.value || this.keycodeInputBottom.value || '';
            this.keycodeInput.value = newKeycode;
            this.updateKeycode(newKeycode);
        } else {
            this.isSplit = true;
            this.keycodeInput.style.display = 'none';
            this.splitContainer.style.display = 'block';
            const currentKeycode = this.keycodeInput.value;
            this.keycodeInputTop.value = currentKeycode;
            this.keycodeInputBottom.value = currentKeycode;
            this.updateSplitKey();
        }
    }

    updateKeycode(keycode) {
        if (!this.currentKeyDef || !currentKeyElement) return;
        const oldWidth = this.currentKeyDef[0] ? this.currentKeyDef[0].width : this.currentKeyDef.width
        const oldHeight = this.currentKeyDef[0] ? this.currentKeyDef[0].height * 2 : this.currentKeyDef.height
        this.currentKeyDef = { width: oldWidth ? oldWidth : 1 }
        if (oldHeight) {
            this.currentKeyDef.height = oldHeight
        }
        if (keycode)
            this.currentKeyDef.key = keycode

        currentLayout[this.currentRow][this.currentCol] = this.currentKeyDef
        rebuild();
    }

    updateSplitKeycode(part, keycode) {
        if (!this.currentKeyDef || !Array.isArray(this.currentKeyDef) || !currentKeyElement) return;

        if (part === 'top') {
            this.currentKeyDef[0].key = keycode;
        } else {
            this.currentKeyDef[1].key = keycode;
        }
        currentLayout[this.currentRow][this.currentCol] = this.currentKeyDef
        rebuild();
    }

    updateSplitKey() {
        if (!this.currentKeyDef || !currentKeyElement) return;

        const topKey = this.keycodeInputTop.value || '';
        const bottomKey = this.keycodeInputBottom.value || '';

        if (!Array.isArray(this.currentKeyDef)) {
            const width = this.currentKeyDef.width || 1;
            const height = 1
            this.currentKeyDef = [
                { key: topKey, width, height: height / 2 },
                { key: bottomKey, width, height: height / 2 }
            ];
        } else {
            this.currentKeyDef.height
            this.currentKeyDef[0].key = topKey;
            this.currentKeyDef[1].key = bottomKey;
        }
        currentLayout[this.currentRow][this.currentCol] = this.currentKeyDef
        rebuild();
    }

    updateSize(prop, value) {
        if (!this.currentKeyDef || !currentKeyElement) return;

        if (Array.isArray(this.currentKeyDef)) {
            this.currentKeyDef[0][prop] = value;
            this.currentKeyDef[1][prop] = value;
        } else {
            this.currentKeyDef[prop] = value;
        }
        currentLayout[this.currentRow][this.currentCol] = this.currentKeyDef
        rebuild();
    }

    moveKey(direction) {
        if (
            !Array.isArray(currentLayout) ||
            this.currentRow < 0 ||
            this.currentCol < 0 ||
            this.currentRow >= currentLayout.length - 1 || 
            !Array.isArray(currentLayout[this.currentRow]) ||
            this.currentCol >= currentLayout[this.currentRow].length
        ) {
            return;
        }

        const row = this.currentRow;
        const col = this.currentCol;
        const key = currentLayout[row][col];

        const moveHorizontal = (offset) => {
            const targetCol = col + offset;
            if (targetCol < 0 || targetCol >= currentLayout[row].length) return;
            [currentLayout[row][col], currentLayout[row][targetCol]] =
                [currentLayout[row][targetCol], currentLayout[row][col]];
            this.currentCol = targetCol;
            currentKeyCol = targetCol;
        };

        const moveVertical = (offset) => {
            let targetRowIndex = row + offset;
            if (targetRowIndex < 0) {
                targetRowIndex = 0;
            } else if (targetRowIndex >= currentLayout.length - 1) {
                const beforeSettingsIndex = currentLayout.length - 1;
                const settingsRow = currentLayout[beforeSettingsIndex];

                if (
                    !Array.isArray(currentLayout[beforeSettingsIndex - 1]) ||
                    currentLayout[beforeSettingsIndex - 1]._isInserted !== true
                ) {
                    const newRow = [];
                    if (settingsRow && settingsRow.split === true) {
                        newRow.push({ split: true });
                    }
                    newRow._isInserted = true;
                    currentLayout.splice(beforeSettingsIndex, 0, newRow);
                }
                targetRowIndex = beforeSettingsIndex;
            }

            const targetRow = currentLayout[targetRowIndex];
            if (!Array.isArray(targetRow)) return;
            const removed = currentLayout[row].splice(col, 1);
            if (removed.length === 0) return;
            let insertIndex = Math.min(col, targetRow.length);
            if (
                targetRow.length > 0 &&
                targetRow[targetRow.length - 1] &&
                targetRow[targetRow.length - 1].split === true
            ) {
                insertIndex = Math.min(insertIndex, targetRow.length - 1);
            }

            targetRow.splice(insertIndex, 0, key);
            if (
                (currentLayout[row].length === 0 || (currentLayout[row].length === 1 && "split" in currentLayout[row][0])) &&
                row < currentLayout.length - 1
            ) {
                currentLayout.splice(row, 1);
                if (targetRowIndex > row) targetRowIndex--;
            }

            this.currentRow = targetRowIndex;
            currentKeyRow = targetRowIndex;
            this.currentCol = insertIndex;
            currentKeyCol = insertIndex;
        };


        try {
            switch (direction) {
                case 0: moveHorizontal(-1); break; // left
                case 1: moveHorizontal(1); break;  // right
                case 2: moveVertical(-1); break;   // up
                case 3: moveVertical(1); break;    // down
                default: return;
            }
        } catch (err) {
            return;
        }

        rebuild();
    }


    addKey(position) {
        if (this.currentRow === -1 || this.currentCol === -1) return;

        const newKey = { width: 1, height: 1 };
        const insertPos = position === 'left' ? this.currentCol : this.currentCol + 1;
        currentLayout[this.currentRow].splice(insertPos, 0, newKey);
        if (position === 'left') {
            this.currentCol++;
        }
        rebuild();
        let newKeyElement = null
        for (var key of document.querySelectorAll('.selectable')) {
            const row = Number.parseInt(key.dataset.keyRow);
            const col = Number.parseInt(key.dataset.keyCol);
            if (row === this.currentRow && col === (position === 'left' ? this.currentCol - 1 : this.currentCol + 1)) {
                newKeyElement = key
                break
            }
        }
        if (newKeyElement) {
            newKeyElement.onclick()
        }
    }

    removeKey() {
        if (
            this.currentRow < 0 ||
            this.currentCol < 0 ||
            this.currentRow >= currentLayout.length - 1
        ) {
            return;
        }

        const row = currentLayout[this.currentRow];
        if (!Array.isArray(row) || row.length === 0) return;
        row.splice(this.currentCol, 1);
        if (row.length === 0 || (row.length === 1 && "split" in row[0])) {
            currentLayout.splice(this.currentRow, 1);
            if (this.currentRow >= currentLayout.length - 1) {
                this.currentRow = currentLayout.length - 2;
            }
            if (this.currentRow >= 0 && Array.isArray(currentLayout[this.currentRow])) {
                this.currentCol = Math.min(this.currentCol, currentLayout[this.currentRow].length - 1);
            } else {
                this.currentCol = -1;
            }
        } else {
            if (this.currentCol >= row.length) {
                this.currentCol = row.length - 1;
            }
        }

        rebuild();
        this.hide();
    }

}

class KeyboardSettingsEditor {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'key-editor';
        this.element.style.display = 'flex'
        this.element.style.flexDirection = 'column'
        this.element.id = 'keyboard-settings-editor';
        document.body.appendChild(this.element);
        this.initUI();
        this.setupEventListeners();
    }

    initUI() {
        this.element.innerHTML = `
            <h3>Keyboard Settings</h3>
            
            <div class="form-group">
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-split">
                    <span class="slider"></span>
                    <span class="toggle-label">Split Keyboard</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-settings">
                    <span class="slider"></span>
                    <span class="toggle-label">Show Settings Button</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-close">
                    <span class="slider"></span>
                    <span class="toggle-label">Show Close Button</span>
                </label>
            </div>

            <label for="layout-json" style='margin-top: 15px'>Layout JSON:</label>

            <textarea id="layout-json" class="form-control" rows="8" style="font-family: monospace !important; resize: none; width: 100%; box-sizing: border-box; padding: 0; margin: 0;"></textarea>
            
            <div class="key-editor-buttons">
                <button class="key-editor-button" id="import-layout">Import</button>
                <button class="key-editor-button secondary" id="export-layout">Export</button>
            </div>
        `;
        const lastRow = currentLayout[currentLayout.length - 1];
        this.element.querySelector('#toggle-split').checked = lastRow.split || false;
        this.element.querySelector('#toggle-settings').checked = lastRow.settings || false;
        this.element.querySelector('#toggle-close').checked = lastRow.close || false;
        const layoutCopy = JSON.parse(JSON.stringify(currentLayout));
        const jsonString = JSON.stringify(layoutCopy, null, 2);
        this.element.querySelector('#layout-json').value = jsonString;
    }

    setupEventListeners() {
        this.element.querySelector('#toggle-split').addEventListener('change', (e) => {
            this.toggleSplit(e.target.checked);
        });
        this.element.querySelector('#toggle-settings').addEventListener('change', (e) => {
            this.toggleSettings(e.target.checked);
        });
        this.element.querySelector('#toggle-close').addEventListener('change', (e) => {
            this.toggleClose(e.target.checked);
        });
        this.element.querySelector('#import-layout').addEventListener('click', () => this.importLayout());
        this.element.querySelector('#export-layout').addEventListener('click', () => this.exportLayout());
    }

    toggleSplit(enabled) {
        const lastRow = currentLayout[currentLayout.length - 1];
        lastRow.split = enabled;
        for (let i = 0; i < currentLayout.length - 1; i++) {
            const row = currentLayout[i];
            const hasSplit = row.some(key => key.split);

            if (enabled && !hasSplit) {
                const mid = Math.floor(row.length / 2);
                row.splice(mid, 0, { split: true });
            } else if (!enabled && hasSplit) {
                currentLayout[i] = row.filter(key => !key.split);
            }
        }
        currentKeyCol = -1;
        currentKeyRow = -1;
        currentKeyElement = null;
        rebuild();
    }

    toggleSettings(enabled) {
        const lastRow = currentLayout[currentLayout.length - 1];
        lastRow.settings = enabled;
        currentKeyCol = -1;
        currentKeyRow = -1;
        currentKeyElement = null;
        rebuild();
    }

    toggleClose(enabled) {
        const lastRow = currentLayout[currentLayout.length - 1];
        lastRow.close = enabled;
        currentKeyCol = -1;
        currentKeyRow = -1;
        currentKeyElement = null;
        rebuild();
    }

    exportLayout() {
        const layoutCopy = JSON.parse(JSON.stringify(currentLayout));
        const jsonString = JSON.stringify(layoutCopy, null, 2);
        this.element.querySelector('#layout-json').value = jsonString;
        navigator.clipboard.writeText(jsonString);
        alert("Layout copied to keyboard!")
    }

    importLayout() {
        try {
            const jsonString = this.element.querySelector('#layout-json').value;
            const newLayout = JSON.parse(jsonString);
            if (!Array.isArray(newLayout) || newLayout.length === 0) {
                throw new Error('Invalid layout format');
            }
            currentLayout = newLayout;
            rebuild();
            const lastRow = currentLayout[currentLayout.length - 1];
            this.element.querySelector('#toggle-split').checked = lastRow.split || false;
            this.element.querySelector('#toggle-settings').checked = lastRow.settings || false;
            this.element.querySelector('#toggle-close').checked = lastRow.close || false;

            alert('Layout imported successfully!');
        } catch (error) {
            alert('Error importing layout: ' + error.message);
            console.error('Import error:', error);
        }
        currentKeyCol = -1;
        currentKeyRow = -1;
        currentKeyElement = null;
    }
}

class GridLayout {
    constructor(container) {
        this.container = container;
        container.style.display = 'grid';
        container.style.gridAutoRows = '1fr';
        container.style.gridAutoColumns = '1fr';
        container.style.gap = '0px';
    }
    set_row_homogeneous(_) { }
    set_column_homogeneous(_) { }
    attach(widget, col, row, colspan, rowspan) {
        const el = widget.el || widget;
        el.style.gridColumn = (col + 1) + ' / span ' + colspan;
        el.style.gridRow = (row + 1) + ' / span ' + rowspan;
        this.container.appendChild(el);
    }
}

const St = {
    Widget: class {
        constructor(opts = {}) {
            this.el = document.createElement('div');
            if (opts.width != null) this.el.style.width = opts.width + 'px';
            this.layout_manager = new GridLayout(this.el);
            this.reactive = !!opts.reactive;
            this.x_expand = opts.x_expand;
            this.y_expand = opts.y_expand;
        }
        add_style_class_name(name) { this.el.classList.add(name); }
        set_style(style) { this.el.setAttribute('style', (this.el.getAttribute('style') || '') + style); }
    },
    Button: class {
        constructor(opts = {}) {
            this.el = document.createElement('button');
            this.x_expand = opts.x_expand;
            this.y_expand = opts.y_expand;
            if (opts.style_class) this.el.classList.add(opts.style_class);
            if (opts.label != null) this.el.innerHTML = `<div>${opts.label}</div>`;
        }
        add_style_class_name(name) { this.el.classList.add(name); }
        set_style(style) { this.el.setAttribute('style', (this.el.getAttribute('style') || '') + style); }
        clear_actions() { }
        get visible() { return this.el.style.display !== 'none'; }
        set visible(v) { this.el.style.display = v ? '' : 'none'; }
    }
};

const Clutter = {
    Orientation: { HORIZONTAL: 0, VERTICAL: 1 }
};

class Keyboard {
    constructor() {
        this.box = document.getElementById("keyboard")
        this.box.layout_manager = new GridLayout(this.box);
        this.box.add_style_class_name = (name) => this.box.classList.add(name);
        this.box.set_style = (style) => this.box.setAttribute('style', (this.box.getAttribute('style') || '') + style);
        this.box.add_child = (child) => this.box.appendChild(child.el || child);
        this.snap_spacing_px = 8;
        this.border_spacing_px = 2;
        this.show_icons = true;
        this.outer_spacing_px = 8;
        this.background_r = 50; this.background_g = 50; this.background_b = 50; this.background_a = 1;
        this.font_size_px = 16;
        this.round_key_corners = true;
        this.font_bold = false;
        this.enable_drag = false;
    }
    buildUI() {
        this.keys = [];
        this.box.width = Math.round((monitor.width - this.snap_spacing_px * 2))
        this.box.height = Math.round((monitor.height - this.snap_spacing_px * 2))
        this.box.style.width = this.box.width + "px"
        this.box.style.height = this.box.height + "px"
        this.box.style.gridAutoFlow = 'column'
        const grid = this.box.layout_manager
        grid.set_row_homogeneous(true)
        grid.set_column_homogeneous(!currentLayout[currentLayout.length - 1].split)

        let gridLeft;
        let gridRight;
        let currentGrid = grid;
        let left;
        let right;
        let topBtnWidth;

        if (currentLayout[currentLayout.length - 1].split) {
            this.box.reactive = false;
            left = new St.Widget({
                reactive: true,
                width: Math.round((monitor.width - this.snap_spacing_px * 2)) / 2
            })
            gridLeft = left.layout_manager;
            let middle = new St.Widget({
                reactive: false,
                width: this.box.width - 10 + this.border_spacing_px
            });
            right = new St.Widget({
                reactive: true,
                width: Math.round((monitor.width - this.snap_spacing_px * 2)) / 2
            })
            gridRight = right.layout_manager;
            this.box.add_child(left)
            this.box.add_child(middle)
            this.box.add_child(right)
        }

        this.shiftButtons = [];

        let width = 0;
        for (const c of currentLayout[0]) {
            width += (("width" in c) ? c.width : 1)
        }
        let rowSize;
        let halfSize;
        let r = 0;
        let c;
        const doAddKey = (keydef, row, col) => {
            const i = ("key" in keydef) ? window.keycodes[keydef.key] : ("split" in keydef) ? "split" : "empty space";
            if (i != null && typeof i !== 'string') {
                if (i.layers.default == null) {
                    for (var key of Object.keys(i.layers)) {
                        i.layers[key] = i.layers["_" + key]
                    }
                }
                let params = {
                    x_expand: true,
                    y_expand: true
                }

                let iconKeys = ["left", "up", "right", "down", "space"]
                if (this.show_icons) {
                    iconKeys = ["left", "up", "right", "down", "backspace", "tab", "capslock", "shift", "enter", "ctrl", "super", "alt", "space", "menu"]
                }
                if (iconKeys.some(j => { return i.layers.default.toLowerCase() == j })) {
                    params.style_class = i.layers.default.toLowerCase() + "_btn"
                    for (var key of Object.keys(i.layers)) {
                        i.layers["_" + key] = i.layers[key]
                        i.layers[key] = null
                    }
                } else {
                    params.label = i.layers.default
                }
                i.isMod = false
                if ([42, 54, 29, 125, 56, 100, 97, 58, 69].some(j => { return i.code == j })) {
                    i.isMod = true;
                }
                const keyBtn = new St.Button(params)
                keyBtn.add_style_class_name('key')
                keyBtn.add_style_class_name('selectable')
                keyBtn.char = i
                keyBtn.keyDef = keydef

                currentGrid.attach(keyBtn, c, 5 + r, (("width" in keydef) ? keydef.width : 1) * 2, r == 0 ? 3 : (("height" in keydef) ? keydef.height : 1) * 4)
                keyBtn.visible = true
                c += (("width" in keydef) ? keydef.width : 1) * 2
                keyBtn.el.dataset.keyRow = row;
                keyBtn.el.dataset.keyCol = col;
                this.keys.push(keyBtn)
            } else if (i == "empty space") {
                const keyBtn = new St.Button({
                    x_expand: true,
                    y_expand: true
                })
                keyBtn.add_style_class_name('selectable')
                keyBtn.el.dataset.keyRow = row;
                keyBtn.el.dataset.keyCol = col;
                currentGrid.attach(keyBtn, c, 5 + r, (("width" in keydef) ? keydef.width : 1) * 2, r == 0 ? 3 : (("height" in keydef) ? keydef.height : 1) * 4)
                c += (("width" in keydef) ? keydef.width : 1) * 2
            } else if (i == "split") {
                currentGrid = gridRight
                const size = c
                if (!halfSize) halfSize = size
            }
        }

        for (const [row, kRow] of currentLayout.slice(0, -1).entries()) {
            c = 0;
            if (currentLayout[currentLayout.length - 1].split) {
                currentGrid = gridLeft;
            }
            for (const [col, keydef] of kRow.entries()) {
                if (keydef instanceof Array) {
                    keydef.forEach(i => { doAddKey(i, row, col); r += 2; c -= (("width" in i) ? i.width : 1) * 2 });
                    c += (("width" in keydef[0]) ? keydef[0].width : 1) * 2;
                    r -= 4;
                } else {
                    doAddKey(keydef, row, col)
                }
            }
            if (!topBtnWidth) topBtnWidth = ((("width" in kRow[kRow.length - 1]) && ("key" in kRow[kRow.length - 1])) ? kRow[kRow.length - 1].width : 1)
            const size = c;
            if (!rowSize) rowSize = size;
            r += r == 0 ? 3 : 4
        }

        if (left != null) {
            this.set_reactive(false)
            left.add_style_class_name("boxLay");
            right.add_style_class_name("boxLay");
            left.set_style("background-color: rgba(" + this.background_r + "," + this.background_g + "," + this.background_b + ", " + this.background_a + "); padding: " + this.outer_spacing_px + "px;")
            right.set_style("background-color: rgba(" + this.background_r + "," + this.background_g + "," + this.background_b + ", " + this.background_a + "); padding: " + this.outer_spacing_px + "px;")

            if (this.lightOrDark()) {
                left.add_style_class_name("inverted");
                right.add_style_class_name("inverted");
            } else {
                left.add_style_class_name("regular");
                right.add_style_class_name("regular");
            }

            let mvBtnStartLeft = 2 * topBtnWidth
            let mvBtnEndRight = 2 * topBtnWidth

            if (currentLayout[currentLayout.length - 1].settings) {
                const settingsBtn = new St.Button({
                    x_expand: true,
                    y_expand: true
                })
                settingsBtn.add_style_class_name("settings_btn")
                settingsBtn.add_style_class_name("key")
                this.keys.push(settingsBtn)
                gridLeft.attach(settingsBtn, 0, 0, 2 * topBtnWidth, 3)
            } else {
                mvBtnStartLeft = 0
            }

            if (currentLayout[currentLayout.length - 1].close) {
                const closeBtn = new St.Button({
                    x_expand: true,
                    y_expand: true
                })
                closeBtn.add_style_class_name("close_btn")
                closeBtn.add_style_class_name("key")
                gridRight.attach(closeBtn, (rowSize - 2 * topBtnWidth), 0, 2 * topBtnWidth, 3)
                this.keys.push(closeBtn)
            } else {
                mvBtnEndRight = 0
            }

            let moveHandleLeft = new St.Button({
                x_expand: true,
                y_expand: true
            })
            moveHandleLeft.add_style_class_name("moveHandle")
            moveHandleLeft.set_style("font-size: " + this.font_size_px + "px; border-radius: " + (this.round_key_corners ? "5px" : "0") + "; background-size: " + this.font_size_px + "px; font-weight: " + (this.font_bold ? "bold" : "normal") + "; border: " + this.border_spacing_px + "px solid transparent;");
            if (this.lightOrDark()) {
                moveHandleLeft.add_style_class_name("inverted");
            } else {
                moveHandleLeft.add_style_class_name("regular");
            }

            gridLeft.attach(moveHandleLeft, mvBtnStartLeft, 0, (halfSize - mvBtnStartLeft), 3)

            let moveHandleRight = new St.Button({
                x_expand: true,
                y_expand: true
            })
            moveHandleRight.add_style_class_name("moveHandle")
            moveHandleRight.set_style("font-size: " + this.font_size_px + "px; border-radius: " + (this.round_key_corners ? "5px" : "0") + "; background-size: " + this.font_size_px + "px; font-weight: " + (this.font_bold ? "bold" : "normal") + "; border: " + this.border_spacing_px + "px solid transparent;");
            if (this.lightOrDark()) {
                moveHandleRight.add_style_class_name("inverted");
            } else {
                moveHandleRight.add_style_class_name("regular");
            }

            gridRight.attach(moveHandleRight, halfSize, 0, (rowSize - halfSize - mvBtnEndRight), 3)
            gridLeft.attach(new St.Widget({ x_expand: true, y_expand: true }), 0, 3, halfSize, 1)
            gridRight.attach(new St.Widget({ x_expand: true, y_expand: true }), halfSize, 3, (rowSize - halfSize), 1)
            let minStart = Number.MAX_SAFE_INTEGER;
            for (var i of gridRight.container.children) {
                if (Number.parseInt(i.style.gridColumnStart) < minStart)
                    minStart = Number.parseInt(i.style.gridColumnStart)
            }
            for (var j of gridRight.container.children) {
                j.style.gridColumnStart = Number.parseInt(j.style.gridColumnStart) - minStart + 1
            }
        } else {
            this.box.add_style_class_name("boxLay");
            this.box.set_style("background-color: rgba(" + this.background_r + "," + this.background_g + "," + this.background_b + ", " + this.background_a + "); padding: " + this.outer_spacing_px + "px;")
            if (this.lightOrDark()) {
                this.box.add_style_class_name("inverted");
            } else {
                this.box.add_style_class_name("regular");
            }

            let mvBtnStartLeft = 2 * topBtnWidth
            let mvBtnEndRight = 2 * topBtnWidth

            if (currentLayout[currentLayout.length - 1].settings) {
                const settingsBtn = new St.Button({
                    x_expand: true,
                    y_expand: true
                })
                settingsBtn.add_style_class_name("settings_btn")
                settingsBtn.add_style_class_name("key")
                this.keys.push(settingsBtn)
                grid.attach(settingsBtn, 0, 0, 2 * topBtnWidth, 3)
            } else {
                mvBtnStartLeft = 0
            }
            if (currentLayout[currentLayout.length - 1].close) {
                const closeBtn = new St.Button({
                    x_expand: true,
                    y_expand: true
                })
                closeBtn.add_style_class_name("close_btn")
                closeBtn.add_style_class_name("key")
                grid.attach(closeBtn, (rowSize - 2 * topBtnWidth), 0, 2 * topBtnWidth, 3)
                this.keys.push(closeBtn)
            } else {
                mvBtnEndRight = 0;
            }

            let moveHandle = new St.Button({
                x_expand: true,
                y_expand: true
            })
            moveHandle.clear_actions();
            moveHandle.add_style_class_name("moveHandle")
            moveHandle.set_style("font-size: " + this.font_size_px + "px; border-radius: " + (this.round_key_corners ? "5px" : "0") + "; background-size: " + this.font_size_px + "px; font-weight: " + (this.font_bold ? "bold" : "normal") + "; border: " + this.border_spacing_px + "px solid transparent;");
            if (this.lightOrDark()) {
                moveHandle.add_style_class_name("inverted");
            } else {
                moveHandle.add_style_class_name("regular");
            }

            grid.attach(moveHandle, mvBtnStartLeft, 0, (rowSize - mvBtnStartLeft - mvBtnEndRight), 3)
            grid.attach(new St.Widget({ x_expand: true, y_expand: true }), 0, 3, rowSize, 1)
        }
        this.keys.forEach(item => {
            item.set_style("font-size: " + this.font_size_px + "px; border-radius: " + (this.round_key_corners ? (this.border_spacing_px + 5) + "px" : "0") + "; background-size: " + this.font_size_px + "px; font-weight: " + (this.font_bold ? "bold" : "normal") + "; border: " + this.border_spacing_px + "px solid transparent;");
            if (this.lightOrDark()) {
                item.add_style_class_name("inverted");
            } else {
                item.add_style_class_name("regular");
            }
        })
    }

    lightOrDark() {
        let r, g, b;
        r = this.background_r
        g = this.background_g
        b = this.background_b
        var hsp;
        hsp = Math.sqrt(
            0.299 * (r * r) +
            0.587 * (g * g) +
            0.114 * (b * b)
        );
        return hsp > 127.5
    }

    set_reactive(_) { }
}

const keyEditor = new KeyEditor();
const settingsEditor = new KeyboardSettingsEditor();

let rebuild = () => {
    window.keycodes = window.structuredClone(window._keycodes)

    kbdElem = document.querySelector("#keyboard-holder").querySelector('#keyboard')
    if (kbdElem) {
        kbdElem.remove()
    }
    kbdElem = document.createElement('div')
    kbdElem.id = 'keyboard'
    monitor = { width: kbdElem.innerWidth, height: kbdElem.innerHeight }
    document.querySelector("#keyboard-holder").insertAdjacentElement('afterbegin', kbdElem)
    let keyboard = new Keyboard()
    keyboard.buildUI()
    keyEditor.hide()
    document.querySelectorAll('.selectable').forEach((i, index) => {
        i.onclick = (e) => {
            if (e)
                e.stopPropagation();

            document.querySelectorAll('.selectable').forEach(j => {
                j.classList.remove('pressed');
            });

            if (currentKeyElement === i) {
                currentKeyElement = null;
                keyEditor.hide();
                return;
            }

            i.classList.add('pressed');
            currentKeyElement = i;
            currentKeyRow = Number.parseInt(i.dataset.keyRow);
            currentKeyCol = Number.parseInt(i.dataset.keyCol);
            keyEditor.show(i, currentLayout[currentKeyRow][currentKeyCol], currentKeyRow, currentKeyCol)
        };
        if (Number.parseInt(i.dataset.keyRow) == currentKeyRow && currentKeyCol == Number.parseInt(i.dataset.keyCol)) {
            i.classList.add('pressed');
            currentKeyElement = i;
            keyEditor.show(i, currentLayout[currentKeyRow][currentKeyCol], currentKeyRow, currentKeyCol)
        }
    });
}
rebuild()
