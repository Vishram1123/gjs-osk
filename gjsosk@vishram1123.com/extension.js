const { GObject, St, Gio, Clutter, Meta, Shell, GLib, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;

class Extension {
    constructor() {
    }
    _openKeyboard(){
        if (this.Keyboard.state == "closed"){
            this.Keyboard.opened = true;
            this.Keyboard.open();
        }
    }
    _closeKeyboard(){
        if (this.Keyboard.state == "opened"){
            this.Keyboard.opened = false;
            this.Keyboard.close();
        }
    }
    _toggleKeyboard(){
        if (!this.Keyboard.opened){
            this._openKeyboard();
        } else {
            this._closeKeyboard();
        }
    }
    enable() {
        log(`enabling ${Me.metadata.name}`);
        log(this);
        let indicatorName = `${Me.metadata.name} Indicator`;
        this.Keyboard = new Keyboard();
        // Create a panel button
        this._indicator = new PanelMenu.Button(0.0, indicatorName, false);
        
        // Add an icon
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({name: 'input-keyboard-symbolic'}),
            style_class: 'system-status-icon'
        });
        this._indicator.add_child(icon);
        
        this._indicator.connect("button-press-event", () => this._toggleKeyboard());
        this._indicator.connect("touch-event", () => this._toggleKeyboard());
        
        // `Main.panel` is the actual panel you see at the top of the screen,
        // not a class constructor.
        Main.panel.addToStatusArea(indicatorName, this._indicator);
    }
    
    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    disable() {
        log(`disabling ${Me.metadata.name}`);

        this._indicator.destroy();
        this._indicator = null;
        this.Keyboard.destroy();
    }
}
let keycodes = {
	row1: [
		{code: 1, lowerName: "esc", upperName: "esc"},
		{code: 59, lowerName: "F1", upperName: "F1"},
		{code: 60, lowerName: "F2", upperName: "F2"},
		{code: 61, lowerName: "F3", upperName: "F3"},
		{code: 62, lowerName: "F4", upperName: "F4"},
		{code: 63, lowerName: "F5", upperName: "F5"},
		{code: 64, lowerName: "F6", upperName: "F6"},
		{code: 65, lowerName: "F7", upperName: "F7"},
		{code: 66, lowerName: "F8", upperName: "F8"},
		{code: 67, lowerName: "F9", upperName: "F9"},
		{code: 68, lowerName: "F10", upperName: "F10"},
		{code: 87, lowerName: "F11", upperName: "F11"},
		{code: 88, lowerName: "F12", upperName: "F12"},
		{code: 210, lowerName: "PrtSc", upperName: "PrtSc"},
		{code: 111, lowerName: "⌦", upperName: "⌦"}
	],
	row2: [
		{code: 41, lowerName: "`", upperName: "~"},
		{code: 2, lowerName: "1", upperName: "!"},
		{code: 3, lowerName: "2", upperName: "@"},
		{code: 4, lowerName: "3", upperName: "#"},
		{code: 5, lowerName: "4", upperName: "$"},
		{code: 6, lowerName: "5", upperName: "%"},
		{code: 7, lowerName: "6", upperName: "^"},
		{code: 8, lowerName: "7", upperName: "&"},
		{code: 9, lowerName: "8", upperName: "*"},
		{code: 10, lowerName: "9", upperName: "("},
		{code: 11, lowerName: "0", upperName: ")"},
		{code: 12, lowerName: "-", upperName: "_"},
		{code: 13, lowerName: "=", upperName: "+"},
		{code: 14, lowerName: "⌫", upperName: "⌫"}
	],
	row3: [
		{code: 15, lowerName: "⇥", upperName: "⇥"},
		{code: 16, lowerName: "q", upperName: "Q"},
		{code: 17, lowerName: "w", upperName: "W"},
		{code: 18, lowerName: "e", upperName: "E"},
		{code: 19, lowerName: "r", upperName: "R"},
		{code: 20, lowerName: "t", upperName: "T"},
		{code: 21, lowerName: "y", upperName: "Y"},
		{code: 22, lowerName: "u", upperName: "U"},
		{code: 23, lowerName: "i", upperName: "I"},
		{code: 24, lowerName: "o", upperName: "O"},
		{code: 25, lowerName: "p", upperName: "P"},
		{code: 26, lowerName: "[", upperName: "{"},
		{code: 27, lowerName: "]", upperName: "}"},
		{code: 43, lowerName: "\\", upperName: "|"}
	],
	row4: [
		{code: 58, lowerName: "⇪", upperName: "⇪"},
		{code: 30, lowerName: "a", upperName: "A"},
		{code: 31, lowerName: "s", upperName: "S"},
		{code: 32, lowerName: "d", upperName: "D"},
		{code: 33, lowerName: "f", upperName: "F"},
		{code: 34, lowerName: "g", upperName: "G"},
		{code: 35, lowerName: "h", upperName: "H"},
		{code: 36, lowerName: "j", upperName: "J"},
		{code: 37, lowerName: "k", upperName: "K"},
		{code: 38, lowerName: "l", upperName: "L"},
		{code: 39, lowerName: ";", upperName: ":"},
		{code: 40, lowerName: "'", upperName: "\""},
		{code: 28, lowerName: "⏎", upperName: "⏎"}
	],
	row5: [
		{code: 42, lowerName: "⇧", upperName: "⇧"},
		{code: 44, lowerName: "z", upperName: "Z"},
		{code: 45, lowerName: "x", upperName: "X"},
		{code: 46, lowerName: "c", upperName: "C"},
		{code: 47, lowerName: "v", upperName: "V"},
		{code: 48, lowerName: "b", upperName: "B"},
		{code: 49, lowerName: "n", upperName: "N"},
		{code: 50, lowerName: "m", upperName: "M"},
		{code: 51, lowerName: ",", upperName: "<"},
		{code: 52, lowerName: ".", upperName: ">"},
		{code: 53, lowerName: "/", upperName: "?"},
		{code: 54, lowerName: "⇧", upperName: "⇧"}
	],
	row6: [
		{code: 29, lowerName: "⌃", upperName: "⌃"},
		{code: 125, lowerName: "❖", upperName: "❖"},
		{code: 56, lowerName: "⌥", upperName: "⌥"},
        {code: 57, lowerName: "␣", upperName: "␣"},
        {code: 100, lowerName: "⌥", upperName: "⌥"},
        {code: 97, lowerName: "⌃", upperName: "⌃"},
        [
            {code: 105, lowerName: "←", upperName: "←"},
            {code: 103, lowerName: "↑", upperName: "↑"},
            {code: 108, lowerName: "↓", upperName: "↓"},
            {code: 106, lowerName: "→", upperName: "→"}
        ]
	]
}
const Keyboard = GObject.registerClass({Signals: {
        'drag-begin': {},
        'drag-end': {},
    },
},
class Keyboard extends imports.ui.dialog.Dialog{
     _init(){
        let monitor = Main.layoutManager.primaryMonitor;
        super._init(Main.layoutManager.modalDialogGroup, 'db-keyboard-content');
        this.box = new St.BoxLayout({vertical: true});
        this.buildUI();
        this.add_child(this.box);
        this.close(); 
        this.mod = [];
        this.modBtns = [];
        this.capsL = false;
        this.box.add_style_class_name("boxLay");
        this.opened = false;
        this.state = "closed";
        this.delta = [];
		this.checkMonitor();
		this._dragging = false;
    }
    vfunc_button_press_event() {
		this.delta = [global.get_pointer()[0] - this.translation_x, global.get_pointer()[1] - this.translation_y];
		console.log("dragging");
		return this.startDragging(Clutter.get_current_event(), this.delta)
	}
	startDragging(event, delta) {
		if (this._dragging)
            return Clutter.EVENT_PROPAGATE;
        this._dragging = true;
        let device = event.get_device();
        let sequence = event.get_event_sequence();
        this._grab = global.stage.grab(this);
        this._grabbedDevice = device;
        this._grabbedSequence = sequence;
		this.emit('drag-begin');
		let [absX, absY] = event.get_coords();
		this.snapMovement(absX - delta[0], absY - delta[1]);
		return Clutter.EVENT_STOP;
    }
	vfunc_button_release_event() {
		if (this._dragging && !this._grabbedSequence) {
            return this.endDragging();
		}
        return Clutter.EVENT_PROPAGATE;
	}
	endDragging() {
        if (this._dragging) {
            if (this._releaseId) {
                this.disconnect(this._releaseId);
                this._releaseId = 0;
            }
            if (this._grab) {
                this._grab.dismiss();
                this._grab = null;
            }
            this._grabbedSequence = null;
            this._grabbedDevice = null;
            this._dragging = false;
            this.delta = [];
            this.emit('drag-end');
            this._dragging = false;
        }
        return Clutter.EVENT_STOP;
    }
    vfunc_motion_event() {
		let event = Clutter.get_current_event();
		if (this._dragging && !this._grabbedSequence) {
			this.motionEvent(event);
		}
        return Clutter.EVENT_PROPAGATE;
	}
	motionEvent(event) {
		let [absX, absY] = event.get_coords();
		this.snapMovement(absX - this.delta[0], absY - this.delta[1]);
		return Clutter.EVENT_STOP
	}
    vfunc_touch_event() {
        let event = Clutter.get_current_event();
        let sequence = event.get_event_sequence();

        if (!this._dragging && event.type() == Clutter.EventType.TOUCH_BEGIN) {
            this.delta = [event.get_coords()[0] - this.translation_x, event.get_coords()[1] - this.translation_y];
            this.startDragging(event);
            console.log("started")
            return Clutter.EVENT_STOP;
        } else if (this._grabbedSequence && sequence.get_slot() === this._grabbedSequence.get_slot()) {
            if (event.type() == Clutter.EventType.TOUCH_UPDATE) {
				console.log("moving")
                return this.motionEvent(event);
			}
            else if (event.type() == Clutter.EventType.TOUCH_END) {
				console.log("ending") 
                return this.endDragging();
			}
        }

        return Clutter.EVENT_PROPAGATE;
    }
    snapMovement(xPos, yPos) {
		let monitor = Main.layoutManager.primaryMonitor
		if (Math.abs(xPos - ((monitor.width * .5) - ((this.width * .5)))) <= 50) {
			xPos = ((monitor.width * .5) - ((this.width * .5)));
		} else if (Math.abs(xPos - 40) <= 50) {
			xPos = 40;
		} else if (Math.abs(xPos - (monitor.width - this.width - 40)) <= 50) {
			xPos = monitor.width - this.width - 40
		}
		if (Math.abs(yPos - (monitor.height - this.height - 40)) <= 50) {
			yPos = monitor.height - this.height - 40;
		} else if (Math.abs(yPos - 40) <= 50) {
			yPos = 40;
		} else if (Math.abs(yPos - ((monitor.height * .5) - (this.height * .5))) <= 50) {
			yPos = (monitor.height * .5) - (this.height * .5);
		}
		this.set_translation(xPos, yPos, 0);
	}
    checkMonitor() {
		let oldMonitorDimensions = [Main.layoutManager.primaryMonitor.width, Main.layoutManager.primaryMonitor.height];
		setInterval(() => {
			if (oldMonitorDimensions[0] != Main.layoutManager.primaryMonitor.width || oldMonitorDimensions[1] != Main.layoutManager.primaryMonitor.height) {
				this.remove_all_children();
				this.box = new St.BoxLayout({vertical: true});
				this.buildUI();
				this.add_child(this.box);
				this.close(); 
				this.mod = [];
				this.modBtns = [];
				this.capsL = false;
				this.box.add_style_class_name("boxLay");
				this.opened = false;
				this.state = "closed";
				this.dragging = false;
				oldMonitorDimensions = [Main.layoutManager.primaryMonitor.width, Main.layoutManager.primaryMonitor.height];
			}
		}, 200);
	}
    open() {
		let monitor = Main.layoutManager.primaryMonitor;
		this.set_translation(0, 0, 0);
		this.set_translation((monitor.width * .5) - ((this.width * .5)), monitor.height - this.height - 25, 0);
        this.state = "opening"
        this.box.opacity = 0;
        this.show();
        this.box.ease({
            opacity: 255,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {setTimeout(() => {this.state = "opened"}, 500); this.set_translation((monitor.width * .5) - ((this.width * .5)), monitor.height - this.height - 25, 0);}
        });
        this.opened = true;
    }    
    close() {
		let monitor = Main.layoutManager.primaryMonitor;
        this.state = "closing"
        this.box.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
        this.set_translation(0, 0, 0); this.set_translation((monitor.width * .5) - ((this.width * .5)), monitor.height - this.height - 40, 0);
        this.opened = false;this.hide(); setTimeout(() => {this.state = "closed"}, 500);},
        });
    }
    buildUI(){
		let monitor = Main.layoutManager.primaryMonitor
        var topRowWidth = Math.round((monitor.width * 0.7) / 16);
        var topRowHeight = Math.round((monitor.height * 0.037));
        let row1 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row1){
            const i = keycodes.row1[num]
            var w = topRowWidth;
            row1.add_child(new St.Button({
                label: i.lowerName,
                height: topRowHeight,
                width: w 
            }));
            var isMod = false;
            for (var j of [42, 54, 29, 125, 56, 100, 97]){
                if (i.code == j){
                    isMod = true;
                    break;
                }
            }
            row1.get_children()[num].char = i;
            if (!isMod) {
                row1.get_children()[num].connect("clicked", () => this.decideMod(i))
            } else {
                const modButton = row1.get_children()[num];
                row1.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
            }
        }
        row1.add_style_class_name("keysHolder");
        let row2 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row2){
            const i = keycodes.row2[num]
            var w;
            if (num == 0){
                w = ((row1.width - ((keycodes.row2.length - 2) * ((topRowWidth) + 5)))/2) * 0.5;
            } else if (num == keycodes.row2.length - 1){
                w = ((row1.width - ((keycodes.row2.length - 2) * ((topRowWidth) + 5)))/2) * 1.5;
            }
            else {
                w = (topRowWidth) + 5;
            }
            row2.add_child(new St.Button({
                label: i.lowerName,
                height: topRowHeight + 20,
                width: w 
            }));
            var isMod = false;
            for (var j of [42, 54, 29, 125, 56, 100, 97]){
                if (i.code == j){
                    isMod = true;
                    break;
                }
            }
            row2.get_children()[num].char = i;
            if (!isMod) {
                row2.get_children()[num].connect("clicked", () => this.decideMod(i))
            } else {
                const modButton = row2.get_children()[num];
                row2.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
            }
        }
        row2.add_style_class_name("keysHolder");
        let row3 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row3){
            const i = keycodes.row3[num]
            var w;
            if (num == 0){
                w = ((row1.width - ((keycodes.row3.length - 2) * ((topRowWidth) + 5)))/2) * 1.1;
            } else if (num == keycodes.row3.length - 1){
                w = ((row1.width - ((keycodes.row3.length - 2) * ((topRowWidth) + 5)))/2) * 0.9;
            }
            else {
                w = (topRowWidth) + 5;
            }
            row3.add_child(new St.Button({
                label: i.lowerName,
                height: topRowHeight + 20,
                width: w 
            }));
            var isMod = false;
            for (var j of [42, 54, 29, 125, 56, 100, 97]){
                if (i.code == j){
                    isMod = true;
                    break;
                }
            }
            row3.get_children()[num].char = i;
            if (!isMod) {
                row3.get_children()[num].connect("clicked", () => this.decideMod(i))
            } else {
                const modButton = row3.get_children()[num];
                row3.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
            }
        }
        row3.add_style_class_name("keysHolder");
        let row4 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row4){
            const i = keycodes.row4[num]
            var w;
            if (num == 0 || num == keycodes.row4.length - 1){
                w = ((row1.width - ((keycodes.row4.length - 2) * ((topRowWidth) + 5)))/2);
            } 
            else {
                w = (topRowWidth) + 5;
            }
            row4.add_child(new St.Button({
                label: i.lowerName,
                height: topRowHeight + 20,
                width: w 
            }));
            var isMod = false;
            for (var j of [42, 54, 29, 125, 56, 100, 97]){
                if (i.code == j){
                    isMod = true;
                    break;
                }
            }
            row4.get_children()[num].char = i;
            if (num == 0){
                const capsLock = row4.get_children()[num];
                row4.get_children()[num].connect("clicked", () => {this.decideMod(i); this.setCapsLock(); if (!this.capsL) {capsLock.add_style_class_name('selected'); this.capsL = true;} else {capsLock.remove_style_class_name('selected'); this.capsL = false;}})
            } else if (!isMod) {
                row4.get_children()[num].connect("clicked", () => this.decideMod(i))
            } else {
                const modButton = row4.get_children()[num];
                row4.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
            }
        }
        row4.add_style_class_name("keysHolder");
        let row5 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row5){
            const i = keycodes.row5[num]
            var w;
            if (num == 0 || num == keycodes.row5.length - 1){
                w = ((row1.width - ((keycodes.row5.length - 2) * ((topRowWidth) + 5)))/2);
            }
            else {
                w = (topRowWidth) + 5;
            }
            row5.add_child(new St.Button({
                label: i.lowerName,
                height: topRowHeight + 20,
                width: w 
            }));
            var isMod = false;
            for (var j of [42, 54, 29, 125, 56, 100, 97]){
                if (i.code == j){
                    isMod = true;
                    break;
                }
            }
            row5.get_children()[num].char = i;
            if (!isMod) {
                row5.get_children()[num].connect("clicked", () => this.decideMod(i))
            } else {
                const modButton = row5.get_children()[num];
                row5.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
            }
        }
        row5.add_style_class_name("keysHolder");
        let row6 = new St.BoxLayout({pack_start: true});
        for (var num in keycodes.row6){
            const i = keycodes.row6[num]
            var w;
            if (num == 3){
                w = ((row1.width - ((keycodes.row6.length + 1) * ((topRowWidth) + 5))));
                row6.add_child(new St.Button({
                    label: i.lowerName,
                    height: topRowHeight + 20,
                    width: w 
                }));
                var isMod = false;
                for (var j of [42, 54, 29, 125, 56, 100, 97]){
                    if (i.code == j){
                        isMod = true;
                        break;
                    }
                }
                row6.get_children()[num].char = i;
                if (!isMod) {
                    row6.get_children()[num].connect("clicked", () => this.decideMod(i))
                } else {
                    const modButton = row6.get_children()[num];
                    row6.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
                }
            }
            else if (num == keycodes.row6.length - 1) {
                var gbox = new St.BoxLayout({pack_start: true});
                var btn1 = new St.Button({
                    label: (keycodes.row6[keycodes.row6.length - 1])[0].lowerName
                });
                gbox.add_child(btn1);
                var vbox = new St.BoxLayout({vertical: true});
                var btn2 = new St.Button({
                    label: (keycodes.row6[keycodes.row6.length - 1])[1].lowerName
                });
                var btn3 = new St.Button({
                    label: (keycodes.row6[keycodes.row6.length - 1])[2].lowerName
                });
                vbox.add_child(btn2);
                vbox.add_child(btn3);
                gbox.add_child(vbox);
                var btn4 = new St.Button({
                    label: (keycodes.row6[keycodes.row6.length - 1])[3].lowerName
                });
                gbox.add_child(btn4);
                var btn5 = new St.Button({
                    label: "🗙",    
                });
                gbox.add_child(btn5);
                btn1.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[0]))
                btn2.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[1]))
                btn3.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[2]))
                btn4.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[3]))
                btn5.connect("clicked", () => this.close());
                btn1.char = (keycodes.row6[keycodes.row6.length - 1])[0]
                btn2.char = (keycodes.row6[keycodes.row6.length - 1])[1]
                btn3.char = (keycodes.row6[keycodes.row6.length - 1])[2]
                btn4.char = (keycodes.row6[keycodes.row6.length - 1])[3]
                btn1.width =  Math.round((((topRowWidth) + 5)) * (2/3)) - 4 ;
                btn1.height = topRowHeight + 20;
                btn2.width = Math.round((((topRowWidth) + 5)) * (2/3)) - 4 ;
                btn3.width = Math.round((((topRowWidth) + 5)) * (2/3))- 4 ;
                btn4.width = Math.round((((topRowWidth) + 5)) * (2/3)) - 4 ;
                btn4.height = topRowHeight + 20;
                btn2.height = (topRowHeight + 20)/2;
                btn3.height = (topRowHeight + 20)/2;
                btn5.width = (((topRowWidth) + 5) - 4) ;
                btn5.height = topRowHeight + 20;
                btn1.add_style_class_name('dr-b');
                btn2.add_style_class_name('dr-b');
                btn3.add_style_class_name('dr-b');
                btn4.add_style_class_name('dr-b');
                btn5.add_style_class_name('dr-b');
                gbox.add_style_class_name('keyActionBtns');
                row6.add_child(gbox);
            }
            else {
                w = (topRowWidth) + 5;
                row6.add_child(new St.Button({
                    label: i.lowerName,
                    height: topRowHeight + 20,
                    width: w 
                }));
                
                var isMod = false;
                for (var j of [42, 54, 29, 125, 56, 100, 97]){
                    if (i.code == j){
                        isMod = true;
                        break;
                    }
                }
                row6.get_children()[num].char = i;
                if (!isMod) {
                    row6.get_children()[num].connect("clicked", () => this.decideMod(i))
                } else {
                    const modButton = row6.get_children()[num];
                    row6.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
                }
            }
        }
        row6.add_style_class_name("keysHolder");
        
        
        this.box.add_child(row1);
        this.box.add_child(row2);
        this.box.add_child(row3);
        this.box.add_child(row4);
        this.box.add_child(row5);
        this.box.add_child(row6);
        var containers_ = this.box.get_children();
        var elems_ = []
        containers_.forEach(items => {
            items.get_children().forEach(btn => {
                elems_.push(btn);
            })
        })
        elems_.forEach(item => {
            item.width -= 4;
        });
    }
    spawnCommandLine(command_line) {
    try {
        
            GLib.spawn_command_line_async(command_line);
        } catch (err) {
            
        }
    }
    decideMod(i,mBtn){
    let monitor = Main.layoutManager.primaryMonitor;    
        var modKeys = [42, 54, 29, 125, 56, 100, 97];
        var containers = this.box.get_children();
        var elems = []
        containers.forEach(items => {
            items.get_children().forEach(btn => {
                elems.push(btn);
            })
        })
        for (var j of modKeys){
            if (i.code == j){
                for (var k of this.mod){
                    if (k == i.code){
                        if (i.code == 42 || i.code == 54){
                            for (var elem of elems){
                                if (elem.char != undefined) {
                                    elem.label = (elem.label == elem.char.upperName) ? elem.char.lowerName : elem.char.upperName;
                                }
                            }
                        }
                        this.spawnCommandLine("ydotool key " + this.mod.join(":1 ") + ":1 " + this.mod.join(":0 ") + ":0 ");
                        for (var bt of this.modBtns){
                            bt.remove_style_class_name("selected");
                        }
                        this.mod = [];
                        return;
                    }
                }
                if (i.code == 42 || i.code == 54){
                    for (var elem of elems){
                        if (elem.char != undefined) {
                            elem.label = (elem.label == elem.char.upperName) ? elem.char.lowerName : elem.char.upperName;
                        }
                    }
                }
                this.mod.push(i.code)
                this.modBtns.push(mBtn)
                mBtn.add_style_class_name("selected");
                return;
            }
        }
        if (this.mod.length != 0 && i.code != 58) {
            this.spawnCommandLine("ydotool key " + this.mod.join(":1 ") + ":1 " + i.code + ":1 " + i.code + ":0 " + this.mod.join(":0 ") + ":0 ");
            for (var bt of this.modBtns){
                bt.remove_style_class_name("selected");
            }
            for (var elem of elems){
                if (elem.char != undefined && (this.mod.includes(42) || this.mod.includes(54))) {
                    elem.label = (elem.label == elem.char.upperName) ? elem.char.lowerName : elem.char.upperName;
                }
            }
            this.mod = [];
        } else {
            this.spawnCommandLine("ydotool key " + i.code + ":1 " + i.code + ":0");
        }
    }
    setCapsLock() {
		var containers = this.box.get_children();
        var elems = []
        containers.forEach(items => {
            items.get_children().forEach(btn => {
                elems.push(btn);
            })
        })
        for (var elem of elems) {
			var code = elem.char != undefined ? elem.char.code : 0;
			if ((code >= 16 && code <= 25) || (code >= 30 && code <= 38) || (code >= 44 && code <= 50)){
				elem.label = (elem.label == elem.char.upperName) ? elem.char.lowerName : elem.char.upperName;
			}
		}
	}
});
function init() {
    log(`initializing ${Me.metadata.name}`);
    
    return new Extension();
}
