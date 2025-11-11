# [GJS OSK Keyboard Layout Editor](https://vishram1123.github.io/gjs-osk)

A (marginally) better on-screen keyboard for GNOME 42+

This branch provides a web-based visual tool to edit the keyboard layouts directly in your browser, powered by HTML/CSS/JavaScript.

## Features

- **Visual Editing**: Drag and modify keys, rows, and keyboard settings visually.
- **Split Layouts**: Supports split-keyboard modes and handed layouts.
- **Custom Resizing**: Adjust key width, height, and position.
- **Import/Export**: Copy/paste JSON layouts for easy sharing and backup.
- **Settings and Close Buttons**: Toggle standard function buttons for the keyboard.
- **Works Entirely in Browser**: No server or external dependencies required, just open `keyboard.html`.

## Getting Started

### 1. Clone or Download

Download this branch, or clone it:

```sh
git clone https://github.com/Vishram1123/gjs-osk.git -b keyboard_view
cd gjs-osk
```

### 2. Running the Editor

Just open `keyboard.html` in your web browser (Chrome/Firefox/etc):

```
file:///<path-to-repo>/keyboard.html
```

## Usage

### Layout

- The keyboard layout is described as a nested array of keys, defined in `keyboard.js`.
- Each key can specify properties like `key` (keycode), `width`, `height`, and special roles like `split`, `settings`, or `close`.
- The last row contains split/settings/close controls.

### Editing Keys

- **Select** any key by clicking on it.
- The **Key Editor** panel will enable (bottom-right).
- Edit key labels (keycode), width, and height directly.
- Use `Move Left`, `Move Right`, `Move Up`, or `Move Down` to re-arrange the selected key.
- Use `Add Left` or `Add Right` to insert empty keys.
- Use `Remove Key` to delete a key.

### Special Operations

- **Split Key**: Make a physical key two virtual half-height switches.
- **Deselect Key**: Deselect the key and disable the editor panel.

### Layout Settings

- Open the **Keyboard Settings Editor** (bottom-left).
- Toggle **Split Keyboard**, **Settings**, and **Close** buttons.
- The JSON for a sample layout is available in the editor – you can edit, import, or export layouts easily.

## Import/Export Layout

- **Export**: Copies the keyboard layout as JSON (to clipboard). Paste it into Settings > Layout > Custom Layout in GJS OSK prefs
- **Import**: Paste or write your JSON layout and click *Import* to apply.

*Note*: Invalid JSON will show an error.

## Advanced

- Keycodes correspond to XKB key names. See the [reference image](https://kb.aseri.net/kbd/xkb.png) linked in the key editor.
- Styling and layout are highly customizable via `keyboard.css`.

## Development

- Most logic is in `keyboard.js`
- Layout and styles in `keyboard.html` and `keyboard.css`
- Custom icons are in the `icons/` folder (SVG).
