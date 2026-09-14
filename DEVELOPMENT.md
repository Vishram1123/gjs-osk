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

## GTK_IM_MODULE (required for GTK4 apps)

GTK4 apps only bind the Wayland `text-input-v3` protocol (and therefore open
the OSK on focus) when `GTK_IM_MODULE=wayland`. Ubuntu sets it to `ibus` via
im-config, which suppresses the OSK entirely.

Persistent (user session) via a systemd environment drop-in:

```bash
mkdir -p ~/.config/environment.d
printf 'GTK_IM_MODULE=wayland\n' > ~/.config/environment.d/gtk-im.conf
```

Then log out/in. Or per-app for a quick test: `GTK_IM_MODULE=wayland gedit`.

## Install

Symlink the extension directory (best for editing — changes reflect on reload
without re-copying):

```bash
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s "$PWD/gjsosk@vishram1123.com" ~/.local/share/gnome-shell/extensions/gjsosk@vishram1123.com
```

Compile the GSettings schema **in place**. GNOME 45+ `getSettings()` loads
`schemas/gschemas.compiled` from inside the extension directory (NOT from
`~/.local/share/glib-2.0/schemas/`), so the XML must be compiled there:

```bash
glib-compile-schemas gjsosk@vishram1123.com/schemas/
```

(`gschemas.compiled` is git-ignored via `*.compiled`.)

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
