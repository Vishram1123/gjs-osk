# [GJS OSK](https://extensions.gnome.org/extension/5949/gjs-osk/)
A (marginally) better on screen keyboard for GNOME 45+ (go to the [pre-45 branch](https://github.com/Vishram1123/gjs-osk/tree/pre-45) for compatibility from gnome 42 and up)
# Update
Sorry, I haven't been able to make progress on the keyboard - I have been busy with school work and life. I will get back to this as soon as possible.
## Advantages over the default OSK:
-	Function, modifier, tab, and arrow key support
-	Ability to move around the screen
-	More compact layout
## Requirements
- GNOME 45 or above
- Wayland (X11 is not working properly)
- [Block Caribou 36](https://extensions.gnome.org/extension/3222/block-caribou-36/) for blocking default GNOME OSK
## Demo
[Keyboard Demo.webm](https://user-images.githubusercontent.com/64966832/210458851-1b91adba-f6e4-4d40-b0d5-dba2c46cc354.webm)

[Settings Demo.webm](https://user-images.githubusercontent.com/64966832/210458854-eb458311-3d3f-4edb-93df-f5b8334d4cbc.webm)

## Install[^1]
1. Visit [https://extensions.gnome.org/extension/5949/gjs-osk/](https://extensions.gnome.org/extension/5949/gjs-osk/)
2. Confirming that you have Chrome GNOME shell installed on your computer and your browser's GNOME Shell Integration plugin
3. Click Install, and accept the prompt
[^1]: Keep in mind that this version isn't updated yet
## Install from Source
1. Clone this repo (or download as zip) - `git clone https://github.com/Vishram1123/gjs-osk/`
2. Copy `gjsosk@vishram1123.com/` to `~/.local/share/gnome-shell/extensions/`
3. Log out of GNOME and log back in
4. Click on the keyboard button in the dash bar
## Usage
- To drag the keyboard around, click on the move icon in the bottom right, then drag the keyboard around the screen. To get the full keyboard back, press the move icon again.
  - The keyboard will snap to the corners, edges, and center of the screen.
- To change properties about the keyboard, open up the "Extensions" application, and click on "Settings" under this extension to get a list of changeable properties
  - Close the settings dialog to save any modified settings
- To type special characters, open GNOME settings, and turn on "Compose Key" under the Keyboard submenu. Choose a modifier (preferably right alt), and use the [key combinations listed here](https://en.wikipedia.org/wiki/Compose_key#Common_compose_combinations) to type special characters
- To change the keyboard layout, ~~add an input source in GNOME Settings (currently only QWERTY, AZERTY, and Dvorak layouts supported), and~~ change the layout in GJS OSK's settings (method changed as of [this commit](https://github.com/Vishram1123/gjs-osk/commit/6c0058f25713fc02a55b1381660ba7c5ac52b6b7))
- To add typing prediction, add "Typing Booster" as an input source (in GNOME's settings), and keep it chosen as the primary input source [(extended guide here)](https://mike-fabian.github.io/ibus-typing-booster/docs/user/).
  - Note that this will cause predictive text to be present even without the OSK open, and the input language for Typing Booster's predictions will have to be set in Typing Booster's settings 
## Known Problems/Issues and Intended Features (Would appreciate solutions about how to fix):
- 100% width or height doesn't take up the full monitor width or height (minus 25 px on either side). Instead, it is 1 or 2 px smaller, depending on the monitor size
- Even though the keyboard displays over system modals, it isn't interactable
- Open from command line
## Help
- If you find any bugs, or if you have any suggestions, please open an issue or submit a pull request. Thanks!
### Keyboard Layouts
- If you wish to add a keyboard layout, edit the "keycodes.json" file as follows: 
  - If a letter behaves the same if caps lock or shift is turned on, add a `"letter": "primary"` key-value pair to the object pertaining to the character
  - If a letter simply turns uppercase on caps lock, but is a completely different character on shift, add a `"letter": "pseudo"` key-value pair to the object pertaining to the character
  - If a letter is not affected by caps lock, don't add a `"letter"` key to the object
  - If a letter changes to another on alt, change `"altName": ""` such that its value represents the output of the character if it is pressed along with alt
  - Keys have to follow a general QWERTY shape (though more or less keys can be on a single line), as this is how the keyboard is coded
- Once "keycodes.json" is modified, add the layout name to the array `langList` in prefs.js, and on the arrays in line 40 and 59 in extension.js

**Help in this area is greatly appreciated!**
