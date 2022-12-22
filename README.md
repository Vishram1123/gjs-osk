# gjs-osk
A (marginally) better on screen keyboard for GNOME 43+
## Advantages over the default OSK:
-	Function, modifier, tab, and arrow key support
-	Ability to move around the screen
-	More compact layout
## Requirements
- GNOME 43 or above
- [ydotool](https://github.com/ReimuNotMoe/ydotool) for sending keystrokes
- Wayland (X11 not tested)
- [Block Caribou 36](https://extensions.gnome.org/extension/3222/block-caribou-36/) for blocking default GNOME OSK
## Demo (sped up by 1.5x)
![](https://github.com/Vishram1123/gjs-osk/blob/main/demo.gif?raw=true)
## Install
1. Clone this repo (or download as zip)
2. Copy `gjsosk@vishram1123.com/` to `~/.local/share/gnome-shell/extensions/`
3. Log out of GNOME and log back in
4. Click on the keyboard button in the dash bar
## Known Problems/Issues (Would appreciate solutions about how to fix):
- Inabliliy to resize
- ~~Does not size correctly if screen size changes (i.e. if the screen is rotated)~~ [Fixed here](https://github.com/Vishram1123/gjs-osk/commit/bfe9a201dada51fd793cd994b74f290e0b18651a)
- Caps lock does not change the case of the letter keys
- No alternate keyboard layouts (other than en_US)
## Help
- This project was created in literally two days, and I have no prior experience with GNOME JS, so if you find any bugs, please open an issue or submit a pull request. Thanks!
