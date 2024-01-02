import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as KeyboardManager from 'resource:///org/gnome/shell/misc/keyboardManager.js';
import { Dialog } from 'resource:///org/gnome/shell/ui/dialog.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';


class KeyboardMenuToggle extends QuickSettings.QuickMenuToggle {
	static {
		GObject.registerClass(this);
	}

	constructor(extensionObject) {
		super({
			title: _('Screen Keyboard'),
			iconName: 'input-keyboard-symbolic',
			toggleMode: true,
		});

		this.extensionObject = extensionObject;
		this.settings = extensionObject.getSettings();
		
		this.menu.setHeader('input-keyboard-symbolic', _('Screen Keyboard'), _('Opening Mode'));
		this._itemsSection = new PopupMenu.PopupMenuSection();
		this._itemsSection.addMenuItem(new PopupMenu.PopupImageMenuItem(_('Never'), this.settings.get_int("enable-tap-gesture") == 0 ? 'emblem-ok-symbolic' : null));
		this._itemsSection.addMenuItem(new PopupMenu.PopupImageMenuItem(_("Only on Touch"), this.settings.get_int("enable-tap-gesture")  == 1 ? 'emblem-ok-symbolic' : null));
		this._itemsSection.addMenuItem(new PopupMenu.PopupImageMenuItem(_("Always"), this.settings.get_int("enable-tap-gesture")  == 2 ? 'emblem-ok-symbolic' : null));
		for (var i in this._itemsSection._getMenuItems()){
			const item = this._itemsSection._getMenuItems()[i]
			const num = i
			item.connect('activate', () => this.settings.set_int("enable-tap-gesture", num))
		}

		this.menu.addMenuItem(this._itemsSection);
		this.settings.bind('indicator-enabled',
			this, 'checked',
			Gio.SettingsBindFlags.DEFAULT);
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		const settingsItem = this.menu.addAction(_('More Settings'),
			() => this.extensionObject.openPreferences());
		settingsItem.visible = Main.sessionMode.allowSettings;
		this.menu._settingsActions[this.extensionObject.uuid] = settingsItem;
	}

	_refresh() {
		for (var i in this._itemsSection._getMenuItems()){
			this._itemsSection._getMenuItems()[i].setIcon(this.settings.get_int("enable-tap-gesture") == i ? 'emblem-ok-symbolic' : null)
		}
	}
};


let keycodes;

export default class GjsOskExtension extends Extension {
	_openKeyboard() {
		if (this.Keyboard.state == "closed") {
			this.Keyboard.opened = true;
			this.Keyboard.open();
		}
	}

	_closeKeyboard() {
		if (this.Keyboard.state == "opened") {
			this.Keyboard.opened = false;
			this.Keyboard.close();
		}
	}

	_toggleKeyboard() {
		if (!this.Keyboard.opened) {
			this._openKeyboard();
			this.Keyboard.openedFromButton = true;
			this.Keyboard.closedFromButton = false
		} else {
			this._closeKeyboard();
			this.Keyboard.openedFromButton = false;
			this.Keyboard.closedFromButton = true;
		}
	}

	open_interval() {
		global.stage.disconnect(this.tapConnect)
		if (this.openInterval !== null) {
			clearInterval(this.openInterval);
			this.openInterval = null;
		}
		this.openInterval = setInterval(() => {
			this.Keyboard.get_parent().set_child_at_index(this.Keyboard, this.Keyboard.get_parent().get_n_children() - 1);
			this.Keyboard.set_child_at_index(this.Keyboard.box, this.Keyboard.get_n_children() - 1);
			if (!this.Keyboard.openedFromButton && this.lastInputMethod) {	
				if (Main.inputMethod.currentFocus != null && Main.inputMethod.currentFocus.is_focused() && !this.Keyboard.closedFromButton) {
					this._openKeyboard();
				} else if (!this.Keyboard.closedFromButton) {
					this._closeKeyboard();
					this.Keyboard.closedFromButton = false
				} else if (Main.inputMethod.currentFocus == null) {
					this.Keyboard.closedFromButton = false
				}
			}
		}, 300);
		this.tapConnect = global.stage.connect("event", (_actor, event) => {
			if (event.type() !== 4 && event.type() !== 5) {
				this.lastInputMethod = [false, event.type() >= 9 && event.type() <= 12, true][this.settings.get_int("enable-tap-gesture")]
			}
		})
	}

	enable() {
		this.settings = this.getSettings();
		this.openBit = this.settings.get_child("indicator");
		let [ok, contents] = GLib.file_get_contents(this.path + '/keycodes.json');
		if (ok) {
			keycodes = JSON.parse(contents)[['qwerty', 'azerty', 'dvorak', "qwertz"][this.settings.get_int("lang")]];
		}
		this.Keyboard = new Keyboard(this.settings);
		this._indicator = null;
		this.openInterval = null;
		if (this.settings.get_boolean("indicator-enabled")) {
			this._indicator = new PanelMenu.Button(0.0, "GJS OSK Indicator", false);
			let icon = new St.Icon({
				gicon: new Gio.ThemedIcon({
					name: 'input-keyboard-symbolic'
				}),
				style_class: 'system-status-icon'
			});
			this._indicator.add_child(icon);

			this._indicator.connect("button-press-event", () => this._toggleKeyboard());
			this._indicator.connect("touch-event", (_actor, event) => {
				if (event.type() == 11) this._toggleKeyboard()
			});
			Main.panel.addToStatusArea("GJS OSK Indicator", this._indicator);
		}

		this._toggle = new KeyboardMenuToggle(this);
		this._quick_settings_indicator = new QuickSettings.SystemIndicator();
		this._quick_settings_indicator.quickSettingsItems.push(this._toggle);
		Main.panel.statusArea.quickSettings.addExternalIndicator(this._quick_settings_indicator);

		if (this.settings.get_int("enable-tap-gesture") > 0) {
			this.open_interval();
		}
		this.openFromCommandHandler = this.openBit.connect("changed", () => {
            this.openBit.set_boolean("opened", false)
            this._toggleKeyboard();
        })
		this.settingsHandler = this.settings.connect("changed", key => {
			this.Keyboard.openedFromButton = false;
			let [ok, contents] = GLib.file_get_contents(this.path + '/keycodes.json');
			if (ok) {
				keycodes = JSON.parse(contents)[["qwerty", "azerty", "dvorak", "qwertz"][this.settings.get_int("lang")]];
			}
			this.Keyboard.refresh();
			this._toggle._refresh();
			if (this.settings.get_boolean("indicator-enabled")) {
				if (this._indicator != null) {
					this._indicator.destroy();
					this._indicator = null;
				}
				this._indicator = new PanelMenu.Button(0.0, "GJS OSK Indicator", false);
				let icon = new St.Icon({
					gicon: new Gio.ThemedIcon({
						name: 'input-keyboard-symbolic'
					}),
					style_class: 'system-status-icon'
				});
				this._indicator.add_child(icon);
				
				this._indicator.connect("button-press-event", () => this._toggleKeyboard());
				this._indicator.connect("touch-event", (_actor, event) => {
					if (event.type() == 11) this._toggleKeyboard()
				});
				Main.panel.addToStatusArea("GJS OSK Indicator", this._indicator);
			} else {
				if (this._indicator != null) {
					this._indicator.destroy();
					this._indicator = null;
				}
			}
			global.stage.disconnect(this.tapConnect)
			if (this.openInterval !== null) {
				clearInterval(this.openInterval);
				this.openInterval = null;
			}
			if (this.settings.get_int("enable-tap-gesture") > 0) {
				this.open_interval();
			}
		});
	}

	disable() {
		this._quick_settings_indicator.quickSettingsItems.forEach(item => item.destroy());
		this._quick_settings_indicator.destroy();
		this._quick_settings_indicator = null;

		if (this._indicator !== null) {
			this._indicator.destroy();
			this._indicator = null;
		}
		this.Keyboard.destroy();
		this.settings.disconnect(this.settingsHandler);
		this.settings = null;
		this.openBit.disconnect(this.openFromCommandHandler);
		this.openBit = null;
		global.stage.disconnect(this.tapConnect)
		if (this.openInterval !== null) {
			clearInterval(this.openInterval);
			this.openInterval = null;
		}
		this._toggle.destroy()
		this._toggle = null
		this.settings = null
		this.Keyboard = null
		keycodes = null
	}
}


class Keyboard extends Dialog {
	static [GObject.signals] = {
		'drag-begin': {},
		'drag-end': {}
	};

	static {
		GObject.registerClass(this);
	}

	_init(settings) {
		this.startupInterval = setInterval(() => {
			this.init = KeyboardManager.getKeyboardManager()._current.id;
			this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			if (this.initLay == undefined || this.init == undefined) { 
				return;
			}
			this.settings = settings;
			let monitor = Main.layoutManager.primaryMonitor;
			super._init(Main.layoutManager.uiGroup, 'db-keyboard-content');
			this.box = new St.BoxLayout({
				vertical: true
			});
			this.widthPercent = (monitor.width > monitor.height) ? settings.get_int("landscape-width-percent") / 100 : settings.get_int("portrait-width-percent") / 100;
			this.heightPercent = (monitor.width > monitor.height) ? settings.get_int("landscape-height-percent") / 100 : settings.get_int("portrait-height-percent") / 100;
			this.buildUI();
			this.draggable = false;
			this.add_child(this.box);
			this.close();
			this.box.set_name("osk-gjs")
			this.mod = [];
			this.modBtns = [];
			this.capsL = false;
			this.shift = false;
			this.alt = false;
			this.box.add_style_class_name("boxLay");
			this.box.set_style("background-color: rgb(" + settings.get_double("background-r") + "," + settings.get_double("background-g") + "," + settings.get_double("background-b") + ");")
			this.opened = false;
			this.state = "closed";
			this.delta = [];
			this.checkMonitor();
			this._dragging = false;
			this.inputDevice = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
			clearInterval(this.startupInterval);
		}, 200); 
	}

	destroy() {
		if (this.startupInterval !== null) {
			clearInterval(this.startupInterval);
			this.startupInterval = null;
		}
		if (this.startupTimeout !== null) {
			clearInterval(this.startupTimeout);
			this.startupTimeout = null;
		}
		if (this.monitorChecker !== null) {
			clearInterval(this.monitorChecker);
			this.monitorChecker = null;
		}
		if (this.textboxChecker !== null) {
			clearInterval(this.textboxChecker);
			this.textboxChecker = null;
		}
		if (this.stateTimeout !== null ) {
			clearTimeout(this.stateTimeout);
			this.stateTimeout = null;
		}
		if (this.keyTimeout !== null) {
			clearTimeout(this.keyTimeout);
			this.keyTimeout = null;
		}
		super.destroy();
	}

	vfunc_button_press_event() {
		this.delta = [Clutter.get_current_event().get_coords()[0] - this.translation_x, Clutter.get_current_event().get_coords()[1] - this.translation_y];
		return this.startDragging(Clutter.get_current_event(), this.delta)
	}

	startDragging(event, delta) {
		if (this.draggable) {
			if (this._dragging)
				return Clutter.EVENT_PROPAGATE;
			this._dragging = true;
			this.box.set_opacity(255);
			this.box.ease({
				opacity: 200,
				duration: 100,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				onComplete: () => {}
			});
			let device = event.get_device();
			let sequence = event.get_event_sequence();
			this._grab = global.stage.grab(this);
			this._grabbedDevice = device;
			this._grabbedSequence = sequence;
			this.emit('drag-begin');
			let [absX, absY] = event.get_coords();
			this.snapMovement(absX - delta[0], absY - delta[1]);
			return Clutter.EVENT_STOP;
		} else {
			return Clutter.EVENT_PROPAGATE;
		}
	}

	vfunc_button_release_event() {
		if (this._dragging && !this._grabbedSequence) {
			return this.endDragging();
		}
		return Clutter.EVENT_PROPAGATE;
	}

	endDragging() {
		if (this.draggable) {
			if (this._dragging) {
				if (this._releaseId) {
					this.disconnect(this._releaseId);
					this._releaseId = 0;
				}
				if (this._grab) {
					this._grab.dismiss();
					this._grab = null;
				}

				this.box.set_opacity(200);
				this.box.ease({
					opacity: 255,
					duration: 100,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					onComplete: () => {}
				});
				this._grabbedSequence = null;
				this._grabbedDevice = null;
				this._dragging = false;
				this.delta = [];
				this.emit('drag-end');
				this._dragging = false;
			}
			return Clutter.EVENT_STOP;
		} else {
			return Clutter.EVENT_STOP;
		}
	}

	vfunc_motion_event() {
		let event = Clutter.get_current_event();
		if (this._dragging && !this._grabbedSequence) {
			this.motionEvent(event);
		}
		return Clutter.EVENT_PROPAGATE;
	}

	motionEvent(event) {
		if (this.draggable) {
			let [absX, absY] = event.get_coords();
			this.snapMovement(absX - this.delta[0], absY - this.delta[1]);
			return Clutter.EVENT_STOP
		} else {
			return Clutter.EVENT_STOP
		}
	}

	vfunc_touch_event() {
		let event = Clutter.get_current_event();
		let sequence = event.get_event_sequence();

		if (!this._dragging && event.type() == Clutter.EventType.TOUCH_BEGIN) {
			this.delta = [event.get_coords()[0] - this.translation_x, event.get_coords()[1] - this.translation_y];
			this.startDragging(event);
			return Clutter.EVENT_STOP;
		} else if (this._grabbedSequence && sequence.get_slot() === this._grabbedSequence.get_slot()) {
			if (event.type() == Clutter.EventType.TOUCH_UPDATE) {
				return this.motionEvent(event);
			} else if (event.type() == Clutter.EventType.TOUCH_END) {
				return this.endDragging();
			}
		}

		return Clutter.EVENT_PROPAGATE;
	}

	snapMovement(xPos, yPos) {
		let monitor = Main.layoutManager.primaryMonitor
		if (Math.abs(xPos - ((monitor.width * .5) - ((this.width * .5)))) <= 50) {
			xPos = ((monitor.width * .5) - ((this.width * .5)));
		} else if (Math.abs(xPos - 25) <= 50) {
			xPos = 25;
		} else if (Math.abs(xPos - (monitor.width - this.width - 25)) <= 50) {
			xPos = monitor.width - this.width - 25
		}
		if (Math.abs(yPos - (monitor.height - this.height - 25)) <= 50) {
			yPos = monitor.height - this.height - 25;
		} else if (Math.abs(yPos - 25) <= 50) {
			yPos = 25;
		} else if (Math.abs(yPos - ((monitor.height * .5) - (this.height * .5))) <= 50) {
			yPos = (monitor.height * .5) - (this.height * .5);
		}
		this.set_translation(xPos, yPos, 0);
	}

	checkMonitor() {
		let monitor = Main.layoutManager.primaryMonitor;
		let oldMonitorDimensions = [monitor.width, monitor.height];
		this.monitorChecker = setInterval(() => {
			monitor = Main.layoutManager.primaryMonitor;
			if (oldMonitorDimensions[0] != monitor.width || oldMonitorDimensions[1] != monitor.height) {
				this.refresh()
				oldMonitorDimensions = [monitor.width, monitor.height];
			}
		}, 200);
	}

	refresh() {
		let monitor = Main.layoutManager.primaryMonitor;
		this.box.remove_all_children();
                this.box.set_style_class_name("boxLay")
		this.widthPercent = (monitor.width > monitor.height) ? this.settings.get_int("landscape-width-percent") / 100 : this.settings.get_int("portrait-width-percent") / 100;
		this.heightPercent = (monitor.width > monitor.height) ? this.settings.get_int("landscape-height-percent") / 100 : this.settings.get_int("portrait-height-percent") / 100;
		this.buildUI();
		this.draggable = false;
		this.keys.forEach(keyholder => {
			if (!keyholder.has_style_class_name("move_btn")) {
				keyholder.set_opacity(0);
				keyholder.ease({
					opacity: 255,
					duration: 100,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					onComplete: () => {
						keyholder.set_z_position(0);
						this.box.remove_style_pseudo_class("dragging");
					}
				});
			}
		});
		if (this.startupTimeout !== null) {
			clearInterval(this.startupTimeout);
			this.startupTimeout = null;
		}
		this.startupTimeout = setTimeout(() => {
			this.init = KeyboardManager.getKeyboardManager()._current.id;
			this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			if (this.initLay == undefined || this.init == undefined) { 
				this.refresh();
				return;
			}
			this.close();
		}, 200); 
		this.mod = [];
		this.modBtns = [];
		this.capsL = false;
		this.shift = false;
		this.alt = false;
		this.box.set_style("background-color: rgb(" + this.settings.get_double("background-r") + "," + this.settings.get_double("background-g") + "," + this.settings.get_double("background-b") + ");")
		this.opened = false;
		this.state = "closed";
		this.delta = [];
		this.dragging = false;
	}

	open() {
		this.inputDevice = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
		if (this.startupTimeout !== null) {
			clearInterval(this.startupTimeout);
			this.startupTimeout = null;
		}
		this.startupTimeout = setTimeout(() => {
			this.init = KeyboardManager.getKeyboardManager()._current.id;
			this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			if (this.initLay == undefined || this.init == undefined) { 
				this.open();
				return;
			}
			let newLay = this.initLay;
			if (!newLay.includes(["us", "fr+azerty", "us+dvorak", "de+dsb_qwertz"][this.settings.get_int("lang")])) {
				newLay.push(["us", "fr+azerty", "us+dvorak", "de+dsb_qwertz"][this.settings.get_int("lang")]);
				KeyboardManager.getKeyboardManager().setUserLayouts(newLay);
			}
			KeyboardManager.getKeyboardManager().apply(["us", "fr+azerty", "us+dvorak", "de+dsb_qwertz"][this.settings.get_int("lang")]);
			KeyboardManager.getKeyboardManager().reapply();
			this.state = "opening"
			this.box.opacity = 0;
			this.show();
			this.box.ease({
				opacity: 255,
				duration: 100,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				onComplete: () => {
					if (this.stateTimeout !== null) {
						clearTimeout(this.stateTimeout);
						this.stateTimeout = null;
					}
					this.stateTimeout = setTimeout(() => {
						this.state = "opened"
					}, 500);
					let monitor = Main.layoutManager.primaryMonitor;
					let posX = [25, ((monitor.width * .5) - ((this.width * .5))), monitor.width - this.width - 25][(this.settings.get_int("default-snap") % 3)];
					let posY = [25, ((monitor.height * .5) - ((this.height * .5))), monitor.height - this.height - 25][Math.floor((this.settings.get_int("default-snap") / 3))];
					this.set_translation(posX, posY, 0);
				}
			});
			this.opened = true;
		}, 200); 
	}

	close() {
		if (this.initLay !== undefined && this.init !== undefined) {
			KeyboardManager.getKeyboardManager().setUserLayouts(this.initLay);
			KeyboardManager.getKeyboardManager().apply(this.init);
		}
		let monitor = Main.layoutManager.primaryMonitor;
		let posX = [25, ((monitor.width * .5) - ((this.width * .5))), monitor.width - this.width - 25][(this.settings.get_int("default-snap") % 3)];
		let posY = [25, ((monitor.height * .5) - ((this.height * .5))), monitor.height - this.height - 25][Math.floor((this.settings.get_int("default-snap") / 3))];
		this.state = "closing"
		this.box.ease({
			opacity: 0,
			duration: 100,
			mode: Clutter.AnimationMode.EASE_OUT_QUAD,
			onComplete: () => {
				this.set_translation(0, 0, 0);
				this.set_translation(posX, posY, 0);
				this.opened = false;
				this.hide();
				if (this.stateTimeout !== null) {
					clearTimeout(this.stateTimeout);
					this.stateTimeout = null;
				}
				this.stateTimeout = setTimeout(() => {
					this.state = "closed"
				}, 500);
			},
		});
		this.openedFromButton = false
	}

	buildUI() {
		this.keys = [];
		let monitor = Main.layoutManager.primaryMonitor
		var topRowWidth = Math.round(((monitor.width - 90) * this.widthPercent) / 15);
		var topRowHeight = Math.round(((monitor.height - 190) * this.heightPercent) / 6);

		let row1 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row1) {
			const i = keycodes.row1[num]
			var w = topRowWidth;
			row1.add_child(new St.Button({
				label: i.lowerName,
				height: topRowHeight,
				width: w
			}));
			var isMod = false;
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				if (i.code == j) {
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
		this.keys.push.apply(this.keys, row1.get_children());
		row1.add_style_class_name("keysHolder");
		let row2 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row2) {
			const i = keycodes.row2[num]
			var w;
			if (num == 0) {
				w = ((row1.width - ((keycodes.row2.length - 2) * ((topRowWidth) + 5))) / 2) * 0.5;
			} else if (num == keycodes.row2.length - 1) {
				w = ((row1.width - ((keycodes.row2.length - 2) * ((topRowWidth) + 5))) / 2) * 1.5;
			} else {
				w = (topRowWidth) + 5;
			}
			row2.add_child(new St.Button({
				label: i.lowerName,
				height: topRowHeight + 20,
				width: w
			}));
			var isMod = false;
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				if (i.code == j) {
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
		this.keys.push.apply(this.keys, row2.get_children());
		row2.add_style_class_name("keysHolder");
		let row3 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row3) {
			const i = keycodes.row3[num]
			var w;
			if (num == 0) {
				w = ((row1.width - ((keycodes.row3.length - 2) * ((topRowWidth) + 5))) / 2) * 1.1;
			} else if (num == keycodes.row3.length - 1) {
				w = ((row1.width - ((keycodes.row3.length - 2) * ((topRowWidth) + 5))) / 2) * 0.9;
			} else {
				w = (topRowWidth) + 5;
			}
			row3.add_child(new St.Button({
				label: i.lowerName,
				height: topRowHeight + 20,
				width: w
			}));
			var isMod = false;
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				if (i.code == j) {
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
		this.keys.push.apply(this.keys, row3.get_children());
		row3.add_style_class_name("keysHolder");
		let row4 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row4) {
			const i = keycodes.row4[num]
			var w;
			if (num == 0 || num == keycodes.row4.length - 1) {
				w = ((row1.width - ((keycodes.row4.length - 2) * ((topRowWidth) + 5))) / 2);
			} else {
				w = (topRowWidth) + 5;
			}
			row4.add_child(new St.Button({
				label: i.lowerName,
				height: topRowHeight + 20,
				width: w
			}));
			var isMod = false;
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				if (i.code == j) {
					isMod = true;
					break;
				}
			}
			row4.get_children()[num].char = i;
			if (!isMod) {
				row4.get_children()[num].connect("clicked", () => this.decideMod(i))
			} else {
				const modButton = row4.get_children()[num];
				row4.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
			}
		}
		this.keys.push.apply(this.keys, row4.get_children());
		row4.add_style_class_name("keysHolder");
		let row5 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row5) {
			const i = keycodes.row5[num]
			var w;
			if (num == 0 || num == keycodes.row5.length - 1) {
				w = ((row1.width - ((keycodes.row5.length - 2) * ((topRowWidth) + 5))) / 2);
			} else {
				w = (topRowWidth) + 5;
			}
			row5.add_child(new St.Button({
				label: i.lowerName,
				height: topRowHeight + 20,
				width: w
			}));
			var isMod = false;
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				if (i.code == j) {
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
		this.keys.push.apply(this.keys, row5.get_children());
		row5.add_style_class_name("keysHolder");
		let row6 = new St.BoxLayout({
			pack_start: true
		});
		for (var num in keycodes.row6) {
			const i = keycodes.row6[num]
			var w;
			if (num == 3) {
				w = ((row1.width - ((keycodes.row6.length + 1) * ((topRowWidth) + 5))));
				row6.add_child(new St.Button({
					label: i.lowerName,
					height: topRowHeight + 20,
					width: w
				}));
				var isMod = false;
				for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
					if (i.code == j) {
						isMod = true;
						break;
					}
				}
				row6.get_children()[num].char = i;
				this.keys.push(row6.get_children()[num]);
				if (!isMod) {
					row6.get_children()[num].connect("clicked", () => this.decideMod(i))
				} else {
					const modButton = row6.get_children()[num];
					row6.get_children()[num].connect("clicked", () => this.decideMod(i, modButton))
				}
			} else if (num == keycodes.row6.length - 1) {
				var gbox = new St.BoxLayout({
					pack_start: true
				});
				var btn1 = new St.Button({
					label: (keycodes.row6[keycodes.row6.length - 1])[0].lowerName
				});
				gbox.add_child(btn1);
				var vbox = new St.BoxLayout({
					vertical: true
				});
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
				var btn5 = new St.Button();
				btn5.add_style_class_name("move_btn")
				var btn6 = new St.Button();
				btn6.add_style_class_name("close_btn")
				if (this.settings.get_boolean("enable-drag")) {
					gbox.add_child(btn5);
				}
				gbox.add_child(btn6);
				btn1.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[0]))
				btn2.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[1]))
				btn3.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[2]))
				btn4.connect("clicked", () => this.decideMod((keycodes.row6[keycodes.row6.length - 1])[3]))
				btn5.connect("clicked", () => {
					if (this.settings.get_boolean("enable-drag")) {
						this.draggable = !this.draggable;
						this.keys.forEach(keyholder => {
							if (!keyholder.has_style_class_name("move_btn")) {
								keyholder.set_opacity(this.draggable ? 255 : 0);
								keyholder.ease({
									opacity: this.draggable ? 0 : 255,
									duration: 100,
									mode: Clutter.AnimationMode.EASE_OUT_QUAD,
									onComplete: () => {
										keyholder.set_z_position(this.draggable ? -10000000000000000000000000000 : 0);
										if (this.draggable) {
											this.box.add_style_pseudo_class("dragging");
										} else {
											this.box.remove_style_pseudo_class("dragging");
										}
									}
								});
							}
						});
						btn5.ease({
							width: btn5.width * (this.draggable ? 2 : 0.5),
							duration: 100,
							mode: Clutter.AnimationMode.EASE_OUT_QUAD,
							onComplete: () => {}
						})
						btn6.ease({
							width: this.draggable ? 0 : btn5.width / 2,
							duration: 100,
							mode: Clutter.AnimationMode.EASE_OUT_QUAD,
							onComplete: () => {}
						})
					}
				})
				btn6.connect("clicked", () => { this.close(); this.closedFromButton = true; });
				btn1.char = (keycodes.row6[keycodes.row6.length - 1])[0]
				btn2.char = (keycodes.row6[keycodes.row6.length - 1])[1]
				btn3.char = (keycodes.row6[keycodes.row6.length - 1])[2]
				btn4.char = (keycodes.row6[keycodes.row6.length - 1])[3]
				btn1.width = Math.round((((topRowWidth) + 5)) * (2 / 3));
				btn1.height = topRowHeight + 20;
				btn2.width = Math.round((((topRowWidth) + 5)) * (2 / 3));
				btn3.width = Math.round((((topRowWidth) + 5)) * (2 / 3));
				btn4.width = Math.round((((topRowWidth) + 5)) * (2 / 3));
				btn4.height = topRowHeight + 20;
				btn2.height = (topRowHeight + 20) / 2;
				btn3.height = (topRowHeight + 20) / 2;
				btn5.width = Math.round((topRowWidth / 2) + 2);
				btn6.width = this.settings.get_boolean("enable-drag") ? Math.round((topRowWidth / 2) + 2) : Math.round((topRowWidth) + 4);
				btn5.height = topRowHeight + 20;
				btn6.height = topRowHeight + 20;
				btn1.add_style_class_name('dr-b');
				btn2.add_style_class_name('dr-b');
				btn3.add_style_class_name('dr-b');
				btn4.add_style_class_name('dr-b');
				btn5.add_style_class_name('dr-b');
				btn6.add_style_class_name('dr-b');
				this.keys.push.apply(this.keys, [btn1, btn2, btn3, btn4, btn5, btn6]);
				gbox.add_style_class_name('keyActionBtns');
				row6.add_child(gbox);
			} else {
				w = (topRowWidth) + 5;
				row6.add_child(new St.Button({
					label: i.lowerName,
					height: topRowHeight + 20,
					width: w
				}));

				var isMod = false;
				for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
					if (i.code == j) {
						isMod = true;
						break;
					}
				}
				row6.get_children()[num].char = i;
				this.keys.push(row6.get_children()[num]);
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
                if (this.lightOrDark(this.settings.get_double("background-r"), this.settings.get_double("background-g"), this.settings.get_double("background-b"))) {
			this.box.add_style_class_name("inverted");
		} else {
			this.box.add_style_class_name("regular");
		}
		this.keys.forEach(item => {
			item.width -= this.settings.get_int("border-spacing-px") * 2;
			item.height -= this.settings.get_int("border-spacing-px") * 2;
			item.set_style("margin: " + this.settings.get_int("border-spacing-px") + "px; font-size: " + this.settings.get_int("font-size-px") + "px; border-radius: " + (this.settings.get_boolean("round-key-corners") ? "5px;" : "0;") + "background-size: " + this.settings.get_int("font-size-px") + "px;");
			if (this.lightOrDark(this.settings.get_double("background-r"), this.settings.get_double("background-g"), this.settings.get_double("background-b"))) {
				item.add_style_class_name("inverted");
			} else {
				item.add_style_class_name("regular");
			}
			let isMod = false
			for (var j of [42, 54, 29, 125, 56, 100, 97, 58]) {
				try {
					if (item.char.code == j) {
						isMod = true;
						break;
					}
				} catch {
					print(item)
				}
			}
			item.set_pivot_point(0.5, 0.5)
			item.connect("destroy", () => {
				if (item.button_pressed !== null){
					clearTimeout(item.button_pressed)
					item.button_pressed == null
				}
				if (item.button_repeat !== null){
					clearInterval(item.button_repeat)
					item.button_repeat == null
				}
				if (item.tap_pressed !== null){
						clearTimeout(item.tap_pressed)
						item.tap_pressed == null
				}
				if (item.tap_repeat !== null){
					clearInterval(item.tap_repeat)
					item.tap_repeat == null
				}
			})
			item.connect("button-press-event", () => {
				item.set_scale(1.2, 1.2)
				let player
				if (this.settings.get_boolean("play-sound")) {
					player = global.display.get_sound_player();
					player.play_from_theme("dialog-information", "tap", null)
				}
				item.button_pressed = setTimeout(() => {
					if (!isMod) {
						const oldModBtns = this.modBtns
						item.button_repeat = setInterval(() => {
							if (this.settings.get_boolean("play-sound")) {
								player.play_from_theme("dialog-information", "tap", null)
							}
							this.decideMod(item.char)
							
							for (var i of oldModBtns) {
								this.decideMod(i.char, i)
							}
						}, 100);
						
					}
				}, 750);
			})
			item.connect("button-release-event", () => {
				item.ease({
					scale_x: 1,
					scale_y: 1,
					duration: 100,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					onComplete: () => {item.set_scale(1, 1)}
				})
				if (item.button_pressed !== null){
					clearTimeout(item.button_pressed)
					item.button_pressed == null
				}
				if (item.button_repeat !== null){
					clearInterval(item.button_repeat)
					item.button_repeat == null
				}
			})
			item.connect("touch-event", () => {
				if (Clutter.get_current_event().type() == Clutter.EventType.TOUCH_BEGIN) {
					item.set_scale(1.2, 1.2)
					let player
					if (this.settings.get_boolean("play-sound")) {
						player = global.display.get_sound_player();
						player.play_from_theme("dialog-information", "tap", null)
					}
					
					item.tap_pressed = setTimeout(() => {
						
						
						if (!isMod) {
							const oldModBtns = this.modBtns
							item.tap_repeat = setInterval(() => {
								
								if (this.settings.get_boolean("play-sound")) {
									player.play_from_theme("dialog-information", "tap", null)
								}
								this.decideMod(item.char)
								
								for (var i of oldModBtns) {
									this.decideMod(i.char, i)
								}
							}, 100);
							
						}
					}, 750);
				} else if (Clutter.get_current_event().type() == Clutter.EventType.TOUCH_END) {	
					item.ease({
						scale_x: 1,
						scale_y: 1,
						duration: 100,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
						onComplete: () => {item.set_scale(1, 1)}
					})
					if (item.tap_pressed !== null){
						clearTimeout(item.tap_pressed)
						item.tap_pressed == null
					}
					if (item.tap_repeat !== null){
						clearInterval(item.tap_repeat)
						item.tap_repeat == null
					}
				}
			})
		});
	}

	lightOrDark(r, g, b) {
		var hsp;
		hsp = Math.sqrt(
			0.299 * (r * r) +
			0.587 * (g * g) +
			0.114 * (b * b)
		);
		if (hsp > 127.5) {
			return true;
		} else {
			return false;
		}
	}

	sendKey(keys) {
		try {
			for (var i = 0; i < keys.length; i++) {
				this.inputDevice.notify_key(Clutter.get_current_event_time(), keys[i], Clutter.KeyState.PRESSED);
			}
			if (this.keyTimeout !== null) {
				clearTimeout(this.keyTimeout);
				this.keyTimeout = null;
			}
			this.keyTimeout = setTimeout(() => {
				for (var j = keys.length - 1; j >= 0; j--) {
					this.inputDevice.notify_key(Clutter.get_current_event_time(), keys[j], Clutter.KeyState.RELEASED);
				}
			}, 100);
		} catch (err) {
			let source = new imports.ui.messageTray.SystemNotificationSource();
			source.connect('destroy', () => {
				source = null;
			})
			Main.messageTray.add(source);
			let notification = new imports.ui.messageTray.Notification(source, "GJS-OSK: An unknown error occured", "Please report this bug to the Issues page:\n\n" + err + "\n\nKeys Pressed: " + keys)
			notification.setTransient(false);
			notification.setResident(false);
			source.showNotification(notification);
			notification.connect("activated", () => {
				sendCommand("xdg-open https://github.com/Vishram1123/gjs-osk/issues");
			});
		}
	}

	sendCommand(command_line) {
		try {
			let [success, argv] = GLib.shell_parse_argv(command_line);
			trySpawn(argv);
		} catch (err) {
			let source = new imports.ui.messageTray.SystemNotificationSource();
			source.connect('destroy', () => {
				source = null;
			})
			Main.messageTray.add(source);
			let notification = new imports.ui.messageTray.Notification(source, "GJS-OSK: An unknown error occured", "Please report this bug to the Issues page:\n\n" + err)
			notification.setTransient(false);
			notification.setResident(false);
			source.showNotification(notification);
		}
	}

	decideMod(i, mBtn) {
		if (i.code == 29 || i.code == 97 || i.code == 125) {
			this.setNormMod(mBtn);
		} else if (i.code == 56 || i.code == 100) {
			this.setAlt(mBtn);
		} else if (i.code == 42 || i.code == 54) {
			this.setShift(mBtn);
		} else if (i.code == 58) {
			this.setCapsLock(mBtn);
		} else {
			this.mod.push(i.code);
			this.sendKey(this.mod);
			this.mod = [];
			this.modBtns.forEach(button => {
				button.remove_style_class_name("selected");
			});
			this.resetAllMod();
			this.modBtns = [];
		}
	}

	setCapsLock(button) {
		if (!this.capsL) {
			button.add_style_class_name("selected");
			this.capsL = true;
			this.keys.forEach(key => {
				if (this.shift && key.char != undefined) {
					if (key.char.letter == "primary") {
						key.label = key.label.toLowerCase();
					} else if (key.char.letter == "pseudo") {
						key.label = key.char.upperName;
					} else if (key.char.letter == undefined) {
						key.label = key.char.upperName;
					}
				} else if (key.char != undefined && key.char.letter != undefined) {
					key.label = key.label.toUpperCase();
				}
			});
		} else {
			button.remove_style_class_name("selected");
			this.capsL = false;
			this.keys.forEach(key => {
				if (this.shift && key.char != undefined) {
					if (key.char.letter == "primary") {
						key.label = key.label.toUpperCase();
					} else if (key.char.letter == "pseudo") {
						key.label = key.char.upperName;
					} else if (key.char.letter == undefined) {
						key.label = key.char.upperName;
					}
				} else if (key.char != undefined && key.char.letter != undefined) {
					key.label = key.label.toLowerCase();
				}
			});
		}
		this.sendKey([button.char.code]);
	}

	setAlt(button) {
		if (!this.alt) {
			this.alt = true;
			this.keys.forEach(key => {
				if (!this.shift && key.char != undefined) {
					if (key.char.altName != "") {
						key.label = key.char.altName;
					}
				}
			});
		} else {
			this.alt = false;
			this.keys.forEach(key => {
				if (!this.shift && key.char != undefined) {
					if (key.char.altName != "" && this.capsL && (key.char.letter == "primary" || key.char.letter == "pseudo")) {
						key.label = key.char.lowerName.toUpperCase();
					} else if (key.char.altName != "" && this.capsL) {
						key.label = key.char.lowerName;
					} else if (key.char.altName != "" && !this.capsL) {
						key.label = key.char.lowerName;
					}
				}
			});
			this.sendKey([button.char.code]);
		}
		this.setNormMod(button);
	}

	setShift(button) {
		if (!this.shift) {
			this.shift = true;
			this.keys.forEach(key => {
				if (this.capsL && key.char != undefined) {
					if (key.char.letter == "primary") {
						key.label = key.char.lowerName.toLowerCase();
					} else if (key.char.letter == "pseudo" || key.char.letter == undefined) {
						key.label = key.char.upperName;
					}
				} else if (key.char != undefined) {
					key.label = key.char.upperName;
				}
			});
		} else {
			this.shift = false;
			this.keys.forEach(key => {
				if (this.capsL && key.char != undefined) {
					if (this.alt && key.char.altName != "") {
						key.label = key.char.altName;
					} else if (key.char.letter != undefined) {
						key.label = key.char.lowerName.toUpperCase();
					} else if (key.char.letter == undefined) {
						key.label = key.char.lowerName;
					}
				} else if (key.char != undefined) {
					if (this.alt && key.char.altName != "") {
						key.label = key.char.altName;
					} else {
						key.label = key.char.lowerName;
					}
				}
			});
			this.sendKey([button.char.code]);
		}
		this.setNormMod(button);
	}

	setNormMod(button) {
		if (this.mod.includes(button.char.code)) {
			this.mod.splice(this.mod.indexOf(button.char.code), this.mod.indexOf(button.char.code) + 1);
			button.remove_style_class_name("selected");
			this.modBtns.splice(this.modBtns.indexOf(button), this.modBtns.indexOf(button) + 1);
			this.sendKey([button.char.code]);
		} else {
			button.add_style_class_name("selected");
			this.mod.push(button.char.code);
			this.modBtns.push(button);
		}
	}

	resetAllMod() {
		if (this.shift) {
			this.shift = false;
			this.keys.forEach(key => {
				if (this.capsL && key.char != undefined) {
					if (this.alt && key.char.altName != "") {
						key.label = key.char.altName;
					} else if (key.char.letter != undefined) {
						key.label = key.char.lowerName.toUpperCase();
					} else if (key.char.letter == undefined) {
						key.label = key.char.lowerName;
					}
				} else if (key.char != undefined) {
					if (this.alt && key.char.altName != "") {
						key.label = key.char.altName;
					} else {
						key.label = key.char.lowerName;
					}
				}
			});
		}
		if (this.alt) {
			this.alt = false;
			this.keys.forEach(key => {
				if (!this.shift && key.char != undefined) {
					if (key.char.altName != "" && this.capsL && (key.char.letter == "primary" || key.char.letter == "pseudo")) {
						key.label = key.char.lowerName.toUpperCase();
					} else if (key.char.altName != "" && this.capsL) {
						key.label = key.char.lowerName;
					} else if (key.char.altName != "" && !this.capsL) {
						key.label = key.char.lowerName;
					}
				}
			});
		}
	}
};
