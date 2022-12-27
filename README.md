# gjs-osk
A (marginally) better on screen keyboard for GNOME 43+
## Advantages over the default OSK:
-	Function, modifier, tab, and arrow key support
-	Ability to move around the screen
-	More compact layout
## Requirements
- GNOME 43 or above
- [ydotool](https://github.com/ReimuNotMoe/ydotool) for sending keystrokes
- ~~Wayland (X11 not tested)~~ X11 supported
- [Block Caribou 36](https://extensions.gnome.org/extension/3222/block-caribou-36/) for blocking default GNOME OSK
## Demo
[GJS OSK DEMO.webm](https://user-images.githubusercontent.com/64966832/209698441-2921b10d-a59c-44e1-a0fd-0bec10275506.webm)
## Install
1. Clone this repo (or download as zip)
2. Copy `gjsosk@vishram1123.com/` to `~/.local/share/gnome-shell/extensions/`
3. Log out of GNOME and log back in
4. Click on the keyboard button in the dash bar
## Known Problems/Issues (Would appreciate solutions about how to fix):
- ~~Inabliliy to resize~~ Won't fix - dragging window around to different areas of screen should help, though additional size options will be added to upcoming settings view
- ~~Does not size correctly if screen size changes (i.e. if the screen is rotated)~~ [Fixed here](https://github.com/Vishram1123/gjs-osk/commit/bfe9a201dada51fd793cd994b74f290e0b18651a)
- ~~Caps lock does not change the case of the letter keys~~ [Fixed here](https://github.com/Vishram1123/gjs-osk/commit/9f425279c603d2206596e580424b12a6e212c179)
- ~~No alternate keyboard layouts (other than en_US)~~ Turn on "Compose Key" in settings, and use Right Alt to be able to type special characters [(key combinations here)](https://en.wikipedia.org/wiki/Compose_key#Common_compose_combinations)
## Help
- If you find any bugs, or if you have any suggestions, please open an issue or submit a pull request. Thanks!
