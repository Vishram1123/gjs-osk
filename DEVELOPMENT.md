# Development & Testing

GJS OSK is a pure-GJS GNOME Shell extension. No build step — the "build" is
installing the directory and reloading the shell.

## Requirements

- GNOME 45+ (shell-version 45–50 in `metadata.json`)
- **Wayland session** (X11 is not supported)

Check session type:

```bash
echo $XDG_SESSION_TYPE   # must print: wayland
```

## Install

Symlink the extension directory (best for editing — changes reflect on reload
without re-copying):

```bash
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s "$PWD/gjsosk@vishram1123.com" ~/.local/share/gnome-shell/extensions/gjsosk@vishram1123.com
```

Install the GSettings schema (user-local or system-wide; pick one):

```bash
# user-local
mkdir -p ~/.local/share/glib-2.0/schemas
cp gjsosk@vishram1123.com/schemas/org.gnome.shell.extensions.gjsosk.gschema.xml ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# system-wide (alternative)
sudo cp gjsosk@vishram1123.com/schemas/org.gnome.shell.extensions.gjsosk.gschema.xml /usr/share/glib-2.0/schemas/
sudo glib-compile-schemas /usr/share/glib-2.0/schemas/
```

Enable and verify:

```bash
gnome-extensions enable gjsosk@vishram1123.com
gnome-extensions info gjsosk@vishram1123.com   # State: ACTIVE
```

## Reload (no hot-reload on Wayland)

GNOME 45+ extensions are loaded once; there is no `Alt+F2 r` on Wayland.
Changes require a shell restart.

### Option A — real session

Log out and log back in.

### Option B — nested shell (recommended for iteration)

Run a second GNOME Shell in a window; Ctrl+C kills it, relaunch = fresh reload:

```bash
dbus-run-session -- gnome-shell --nested --wayland
```

If it errors about `WAYLAND_DISPLAY`:

```bash
env -u WAYLAND_DISPLAY dbus-run-session -- gnome-shell --nested --wayland
```

## Debug output

```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep -i -E "gjsosk|gjs|extension"
```

The extension's `fail()` surfaces via `Main.notifyError`. Syntax errors and
runtime errors land here.

## Testing auto-focus on a laptop (mouse, no touch)

Default `enable-tap-gesture=1` ("Only on Touch") means **mouse clicks will not
auto-open the keyboard**. For visual testing on a laptop, switch to "Always":

```bash
dconf write /org/gnome/shell/extensions/gjsosk/enable-tap-gesture 2
```

Then click into a text field in Firefox / gedit / GNOME Web (all speak the
Wayland `text-input-v3` protocol, which drives auto-focus). GNOME Terminal is
**not** a good test target — terminals do not use `text-input-v3`.

## What cannot be tested on a laptop

- **Edge-swipe** — touch-only gesture.
- **"Only on Touch"** gating — needs a real touchscreen.
- **Kiosk strut / multi-monitor behavior** — needs the kiosk hardware.

Everything else — auto-focus, layout, key input via the virtual device, the
quick-settings toggle — is testable with a mouse in "Always" mode.
