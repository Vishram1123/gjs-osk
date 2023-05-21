const {
	GObject,
	St,
	Gio,
	Clutter,
	Shell,
	GLib
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ByteArray = imports.byteArray;
const Signals = imports.misc.signals;
const KeyboardManager = imports.misc.keyboardManager;

let keycodes;

class Extension {
	constructor() {}
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
		} else {
			this._closeKeyboard();
		}
	}
	enable() {
		this.settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.gjsosk");

		let [ok, contents] = GLib.file_get_contents(Me.path + '/keycodes.json');
		if (ok) {
			keycodes = JSON.parse(contents)[['qwerty', 'azerty', 'dvorak', "qwertz"][this.settings.get_int("lang")]];
		}

		let indicatorName = `${Me.metadata.name} Indicator`;
		this.Keyboard = new Keyboard(this.settings);
		this._indicator = new PanelMenu.Button(0.0, indicatorName, false);
		let icon = new St.Icon({
			gicon: new Gio.ThemedIcon({
				name: 'input-keyboard-symbolic'
			}),
			style_class: 'system-status-icon'
		});
		this._indicator.add_child(icon);

		this._indicator.connect("button-press-event", () => this._toggleKeyboard());
		this._indicator.connect("touch-event", () => this._toggleKeyboard());

		Main.panel.addToStatusArea(indicatorName, this._indicator);
		this.settingsHandler = this.settings.connect("changed", key => {
			let [ok, contents] = GLib.file_get_contents(Me.path + '/keycodes.json');
			if (ok) {
				keycodes = JSON.parse(contents)[["qwerty", "azerty", "dvorak", "qwertz"][this.settings.get_int("lang")]];
			}
			this.Keyboard.refresh();
		});
	}

	disable() {
		this._indicator.destroy();
		this._indicator = null;
		this.Keyboard.destroy();
		this.settings.disconnect(this.settingsHandler);
		this.settings = null;
	}
}

const Keyboard = GObject.registerClass({
		Signals: {
			'drag-begin': {},
			'drag-end': {},
		},
	},
	class Keyboard extends imports.ui.dialog.Dialog {
		_init(settings) {
			this.settings = settings;
			let monitor = Main.layoutManager.primaryMonitor;
			super._init(Main.layoutManager.modalDialogGroup, 'db-keyboard-content');
			this.box = new St.BoxLayout({
				vertical: true
			});
			this.widthPercent = (monitor.width > monitor.height) ? settings.get_int("landscape-width-percent") / 100 : settings.get_int("portrait-width-percent") / 100;
			this.heightPercent = (monitor.width > monitor.height) ? settings.get_int("landscape-height-percent") / 100 : settings.get_int("portrait-height-percent") / 100;
			this.buildUI();
			this.draggable = false;
			this.add_child(this.box);
			this.startupTimeout = setTimeout(() => {
				this.init = KeyboardManager.getKeyboardManager()._current.id;
				this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			}, 200); 
			this.close();
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
		}
		destroy() {
			if (this.startupTimeout !== null && this.startupTimeout <= 4294967295) {
				clearInterval(this.startupTimeout);
				this.startupTimeout = null;
			}
			if (this.monitorChecker !== null && this.monitorChecker <= 4294967295) {
				clearInterval(this.monitorChecker);
				this.monitorChecker = null;
			}
			if (this.stateTimeout !== null && this.stateTimeout <= 4294967295) {
				clearTimeout(this.stateTimeout);
				this.stateTimeout = null;
			}
			if (this.keyTimeout !== null && this.keyTimeout <= 4294967295) {
				clearTimeout(this.keyTimeout);
				this.keyTimeout = null;
			}
			super.destroy();

		}
		vfunc_button_press_event() {
			this.delta = [global.get_pointer()[0] - this.translation_x, global.get_pointer()[1] - this.translation_y];
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
			this.widthPercent = (monitor.width > monitor.height) ? this.settings.get_int("landscape-width-percent") / 100 : this.settings.get_int("portrait-width-percent") / 100;
			this.heightPercent = (monitor.width > monitor.height) ? this.settings.get_int("landscape-height-percent") / 100 : this.settings.get_int("portrait-height-percent") / 100;
			this.buildUI();
			this.draggable = false;
			this.keys.forEach(keyholder => {
				if (keyholder.label != "🕂") {
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
			if (this.startupTimeout !== null && this.startupTimeout <= 4294967295) {
				clearInterval(this.startupTimeout);
				this.startupTimeout = null;
			}
			this.startupTimeout = setTimeout(() => {
				this.init = KeyboardManager.getKeyboardManager()._current.id;
				this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			}, 200); 
			this.close();
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
			if (this.startupTimeout !== null && this.startupTimeout <= 4294967295) {
				clearInterval(this.startupTimeout);
				this.startupTimeout = null;
			}
			this.startupTimeout = setTimeout(() => {
				this.init = KeyboardManager.getKeyboardManager()._current.id;
				this.initLay = Object.keys(KeyboardManager.getKeyboardManager()._layoutInfos);
			}, 200); 
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
					if (this.stateTimeout !== null && this.stateTimeout <= 4294967295) {
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
					if (this.stateTimeout !== null && this.stateTimeout <= 4294967295) {
						clearTimeout(this.stateTimeout);
						this.stateTimeout = null;
					}
					this.stateTimeout = setTimeout(() => {
						this.state = "closed"
					}, 500);
				},
			});
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
					var btn5 = new St.Button({
						label: "🕂",
					});
					var btn6 = new St.Button({
						label: "🗙",
					});
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
								if (keyholder.label != "🕂") {
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
					btn6.connect("clicked", () => this.close());
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
			this.keys.forEach(item => {
				item.width -= this.settings.get_int("border-spacing-px") * 2;
				item.height -= this.settings.get_int("border-spacing-px") * 2;
				item.set_style("margin: " + this.settings.get_int("border-spacing-px") + "px; font-size: " + this.settings.get_int("font-size-px") + "px; border-radius: " + (this.settings.get_boolean("round-key-corners") ? "5px;" : "0;"));
				if (this.lightOrDark(this.settings.get_double("background-r"), this.settings.get_double("background-g"), this.settings.get_double("background-b"))) {
					item.add_style_class_name("inverted");
				} else {
					item.add_style_class_name("regular");
				}
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
				if (this.keyTimeout !== null && this.keyTimeout <= 4294967295) {
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
	});

function init() {
	return new Extension();
}
