'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class GjsOskPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		const UIFolderPath = this.dir.get_child('ui').get_path();

		let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
		iconTheme.add_search_path(UIFolderPath + `/icons`);
		const settings = this.getSettings('org.gnome.shell.extensions.gjsosk');

		const page1 = new Adw.PreferencesPage({
			title: _("General"),
			icon_name: "general-symbolic"
		});

		const group0 = new Adw.PreferencesGroup();
		page1.add(group0)

		const apply = Gtk.Button.new_with_label(_("Apply Changes"));
		apply.connect("clicked", () => {
			settings.set_int("lang", langDrop.selected);
			settings.set_boolean("enable-drag", dragToggle.active);
			settings.set_int("enable-tap-gesture", dragOpt.selected);
			settings.set_boolean("indicator-enabled", indEnabled.active);
			settings.set_int("portrait-width-percent", numChanger_pW.value);
			settings.set_int("portrait-height-percent", numChanger_pH.value);
			settings.set_int("landscape-width-percent", numChanger_lW.value);
			settings.set_int("landscape-height-percent", numChanger_lH.value);
			let [r, g, b] = colorButton.get_rgba().to_string().replace("rgb(", "").replace(")", "").split(",")
			settings.set_double("background-r", r);
			settings.set_double("background-g", g);
			settings.set_double("background-b", b);
			settings.set_int("font-size-px", numChanger_font.value);
			settings.set_int("border-spacing-px", numChanger_bord.value);
			settings.set_boolean("round-key-corners", dragToggle2.active);
			settings.set_boolean("play-sound", dragToggle3.active);
			settings.set_int("default-snap", dropDown.selected);
		});
		group0.add(apply)

		const group1 = new Adw.PreferencesGroup({
			title: _("Behavior")
		});
		page1.add(group1);

		const row0 = new Adw.ActionRow({
			title: _('Language')
		});
		group1.add(row0);

		let langList = ["QWERTY", "AZERTY", "Dvorak", "QWERTZ"];
		let langDrop = Gtk.DropDown.new_from_strings(langList);
		langDrop.valign = Gtk.Align.CENTER;
		langDrop.selected = settings.get_int("lang");

		row0.add_suffix(langDrop);
		row0.activatable_widget = langDrop;

		const row1 = new Adw.ActionRow({
			title: _('Enable Dragging')
		});
		group1.add(row1);

		const dragToggle = new Gtk.Switch({
			active: settings.get_boolean('enable-drag'),
			valign: Gtk.Align.CENTER,
		});

		row1.add_suffix(dragToggle);
		row1.activatable_widget = dragToggle;

		const row1t3 = new Adw.ActionRow({
			title: _('Enable Panel Indicator')
		});
		group1.add(row1t3);

		const indEnabled = new Gtk.Switch({
			active: settings.get_boolean("indicator-enabled"),
			valign: Gtk.Align.CENTER,
		});

		row1t3.add_suffix(indEnabled);
		row1t3.activatable_widget = indEnabled;

		const row1t5 = new Adw.ActionRow({
			title: _('Open upon clicking in a text field')
		});
		group1.add(row1t5);


		let dragOptList = [_("Never"), _("Only on Touch"), _("Always")];
		let dragOpt = Gtk.DropDown.new_from_strings(dragOptList);
		dragOpt.valign = Gtk.Align.CENTER;
		dragOpt.selected = settings.get_int("enable-tap-gesture");

		row1t5.add_suffix(dragOpt);
		row1t5.activatable_widget = dragOpt;

		const row2 = new Adw.ExpanderRow({
			title: _('Portrait Sizing')
		});
		group1.add(row2);

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

		row2.add_row(pW);
		row2.add_row(pH);

		const row3 = new Adw.ExpanderRow({
			title: _('Landscape Sizing')
		});
		group1.add(row3);

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

		row3.add_row(lW);
		row3.add_row(lH);

		const row4 = new Adw.ActionRow({
			title: _('Default Position')
		});
		group1.add(row4);

		let posList = [
		    _("Top Left"), _("Top Center"), _("Top Right"),
		    _("Center Left"), _("Center"), _("Center Right"),
		    _("Bottom Left"), _("Bottom Center"), _("Bottom Right")
		];
		let dropDown = Gtk.DropDown.new_from_strings(posList);
		dropDown.valign = Gtk.Align.CENTER;
		dropDown.selected = settings.get_int("default-snap");

		row4.add_suffix(dropDown);
		row4.activatable_widget = dropDown;

		const group2 = new Adw.PreferencesGroup({
			title: _("Appearance")
		});
		page1.add(group2);

		const row5 = new Adw.ActionRow({
			title: _('Color')
		});
		group2.add(row5);settings.set_boolean("enable-tap-gesture", dragOpt.selected);

		let rgba = new Gdk.RGBA();
		rgba.parse("rgba(" + settings.get_double("background-r") + ", " + settings.get_double("background-g") + ", " + settings.get_double("background-b") + ", 1)");
		let colorButton = new Gtk.ColorButton({
			rgba,
			use_alpha: false,
			valign: Gtk.Align.CENTER
		});
		row5.add_suffix(colorButton);
		row5.activatable_widget = colorButton;

		let row6 = new Adw.ActionRow({
			title: _('Font Size (px)')
		});
		group2.add(row6);

		let numChanger_font = Gtk.SpinButton.new_with_range(0, 100, 1);
		numChanger_font.value = settings.get_int('font-size-px');
		numChanger_font.valign = Gtk.Align.CENTER;
		row6.add_suffix(numChanger_font);
		row6.activatable_widget = numChanger_font;

		let row7 = new Adw.ActionRow({
			title: _('Border Spacing (px)')
		});
		group2.add(row7);

		let numChanger_bord = Gtk.SpinButton.new_with_range(0, 10, 1);
		numChanger_bord.value = settings.get_int('border-spacing-px');
		numChanger_bord.valign = Gtk.Align.CENTER;
		row7.add_suffix(numChanger_bord);
		row7.activatable_widget = numChanger_bord;

		const row8 = new Adw.ActionRow({
			title: _('Round Corners')
		});
		group2.add(row8);

		const dragToggle2 = new Gtk.Switch({
			active: settings.get_boolean('round-key-corners'),
			valign: Gtk.Align.CENTER,
		});

		row8.add_suffix(dragToggle2);
		row8.activatable_widget = dragToggle2;
		
		const row9 = new Adw.ActionRow({
			title: _('Play sound')
		});
		group2.add(row9);

		const dragToggle3 = new Gtk.Switch({
			active: settings.get_boolean('play-sound'),
			valign: Gtk.Align.CENTER,
		});

		row9.add_suffix(dragToggle3);
		row9.activatable_widget = dragToggle3;

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
			label: _("Version ") + this.metadata.version
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

		code_row.add_suffix(github_link);
		code_row.set_activatable_widget(github_link);
		links_pref_group.add(code_row);

		label_box.append(label);
		label_box.append(another_label);
		icon_box.append(icon_image);
		icon_box.append(label_box);
		contribute_icon_pref_group.add(icon_box);

		page2.add(contribute_icon_pref_group);
		page2.add(links_pref_group);

		window.add(page2);
		window.connect("close-request", () => {
			settings.set_int("lang", langDrop.selected);
			settings.set_boolean("enable-drag", dragToggle.active);
			settings.set_int("enable-tap-gesture", dragOpt.selected);
			settings.set_boolean("indicator-enabled", indEnabled.active);
			settings.set_int("portrait-width-percent", numChanger_pW.value);
			settings.set_int("portrait-height-percent", numChanger_pH.value);
			settings.set_int("landscape-width-percent", numChanger_lW.value);
			settings.set_int("landscape-height-percent", numChanger_lH.value);
			let [r, g, b] = colorButton.get_rgba().to_string().replace("rgb(", "").replace(")", "").split(",")
			settings.set_double("background-r", r);
			settings.set_double("background-g", g);
			settings.set_double("background-b", b);
			settings.set_int("font-size-px", numChanger_font.value);
			settings.set_int("border-spacing-px", numChanger_bord.value);
			settings.set_boolean("round-key-corners", dragToggle2.active);
			settings.set_boolean("play-sound", dragToggle3.active);
			settings.set_int("default-snap", dropDown.selected);
		});
	}
};
