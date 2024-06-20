import gi
gi.require_version('Gdk', '4.0')
gi.require_version('GLib', '2.0')

from gi.repository import Gdk, GLib
from xkbcommon import xkb
import sys
import json

model = sys.argv[1].split("+", 1)

ly = model[0]
va = model[1] if len(model) > 1 else None
ctx = xkb.Context()
keymap = ctx.keymap_new_from_names(rules = None, model = "pc105", layout = ly, variant = va, options = "terminate:ctrl_alt_bksp")


altKey = 1 << keymap.mod_get_index("LevelThree")
shiftKey = 1 << keymap.mod_get_index("Shift")
capslockKey = 1 << keymap.mod_get_index("Lock")
altshiftKey = altKey | shiftKey

state = keymap.state_new()

keysToTest = [
    ["ESC", "FK01", "FK02", "FK03", "FK04", "FK05", "FK06", "FK07", "FK08", "FK09", "FK10", "FK11", "FK12", "PRSC", "DELE"],
    ["TLDE", "AE01", "AE02", "AE03", "AE04", "AE05", "AE06", "AE07", "AE08", "AE09", "AE10", "AE11", "AE12", "BKSP"],
    ["TAB", "AD01", "AD02", "AD03", "AD04", "AD05", "AD06", "AD07", "AD08", "AD09", "AD10", "AD11", "AD12", "BKSL"], 
    ["CAPS", "AC01", "AC02", "AC03", "AC04", "AC05", "AC06", "AC07", "AC08", "AC09", "AC10", "AC11", "RTRN"],  
    ["LFSH", "LSGT", "AB01", "AB02", "AB03", "AB04", "AB05", "AB06", "AB07", "AB08", "AB09", "AB10", "RTSH"],
    ["LCTL", "LWIN", "LALT", "SPCE", "RALT", "RCTL", ["UP", "DOWN", "LEFT", "RGHT"]]
]

def getKeyOutput(keyval, modifier = 0, capslock = False):
    state.update_mask(modifier, 0, capslockKey if capslock else 0, 0, 0, 0)
    code = state.key_get_one_sym(keymap.key_by_name(keyval))
    return convertKeySymToString(code)

def convertKeySymToString(sym):
    label = ""
    for i in range(1, 13):
        if (sym == getattr(Gdk, ("KEY_F%d" % (i)))):
            return ("F%d" % (i))

    match sym:
        case Gdk.KEY_dead_grave:
            label = "ˋ"
            
        case Gdk.KEY_dead_abovecomma:
            label = "̓"
        
        case Gdk.KEY_dead_abovereversedcomma:
            label = "̔"
        
        case Gdk.KEY_dead_acute:
            label = "ˊ"
        
        case Gdk.KEY_dead_circumflex:
            label = "ˆ"
        
        case Gdk.KEY_dead_tilde:
            label = "~"
        
        case Gdk.KEY_dead_macron:
            label = "ˉ"
        
        case Gdk.KEY_dead_breve:
            label = "˘"
        
        case Gdk.KEY_dead_abovedot:
            label = "˙"
        
        case Gdk.KEY_dead_diaeresis:
            label = "¨"
        
        case Gdk.KEY_dead_abovering:
            label = "˚"
        
        case Gdk.KEY_dead_doubleacute:
            label = "˝"
        
        case Gdk.KEY_dead_caron:
            label = "ˇ"
        
        case Gdk.KEY_dead_cedilla:
            label = "¸"
        
        case Gdk.KEY_dead_ogonek:
            label = "˛"
        
        case Gdk.KEY_dead_belowdot:
            label = " ̣"

        case Gdk.KEY_dead_hook:
            label = "̉"

        case Gdk.KEY_dead_horn:
            label = "̛"
        
        case Gdk.KEY_dead_stroke:
            label = "̵"

        case Gdk.KEY_horizconnector:
            label = ""

        case Gdk.KEY_Multi_key:
            label = ""

        case Gdk.KEY_Up:
            label = "up"
        
        case Gdk.KEY_Down:
            label = "down"
        
        case Gdk.KEY_Right:
            label = "right"
        
        case Gdk.KEY_Left:
            label = "left"
        
        case Gdk.KEY_Print:
            label = "PrtSc"
        
        case Gdk.KEY_Escape:
            label = "esc"

        case Gdk.KEY_Return:
            label = "enter"
        
        case Gdk.KEY_BackSpace:
            label = "backspace"
            
        case Gdk.KEY_Delete:
            label = "delete"

        case Gdk.KEY_space:
            label = "space"
        
        case Gdk.KEY_Mode_switch | Gdk.KEY_ISO_Level3_Shift | Gdk.KEY_Alt_L | Gdk.KEY_Alt_R:
            label = "alt"

        case Gdk.KEY_Shift_L | Gdk.KEY_Shift_R:
            label = "shift"

        case Gdk.KEY_Caps_Lock:
            label = "capslock"

        case Gdk.KEY_Tab | Gdk.KEY_ISO_Left_Tab:
            label = "tab"

        case Gdk.KEY_Super_L | Gdk.KEY_Super_R:
            label = "super"

        case Gdk.KEY_Control_L | Gdk.KEY_Control_R:
            label = "ctrl"

        case Gdk.KEY_Meta_L | Gdk.KEY_Meta_R:
            label = "alt"

        case Gdk.KEY_Menu:
            label = "☰"

        case Gdk.KEY_VoidSymbol:
            label = ""

        case Gdk.KEY_nobreakspace:
            label = ""

        case _:
            uc = chr(Gdk.keyval_to_unicode(sym))

            if (len(uc) != 0):
                return uc
            else:
                name = Gdk.keyval_name(sym)

                if (name != None):
                    return name.replace("_", "").replace("ISO ", "")
                else:
                    return ""
    
    return label

formattedJson = {}

for row in range(len(keysToTest)):
    formattedJson["row" + str(row + 1)] = []
    for key in keysToTest[row]:
        if (type(key) is str):
            formattedJson["row" + str(row + 1)].append({
                "code": (keymap.key_by_name(key) - 8),
                "layers": { 
                    "default": getKeyOutput(key),
                    "alt": getKeyOutput(key, modifier = altKey),
                    "shift": getKeyOutput(key, modifier = shiftKey),
                    "capslock": getKeyOutput(key, capslock = True),
                    "altshift": getKeyOutput(key, modifier = altshiftKey),
                    "altcapslock": getKeyOutput(key, modifier = altKey, capslock = True),
                    "shiftcapslock": getKeyOutput(key, modifier = shiftKey, capslock = True),
                    "altshiftcapslock": getKeyOutput(key, modifier = altshiftKey, capslock = True)
                }
            })
        else:
            formattedJson["row" + str(row + 1)].append([])
            for akey in key:
                formattedJson["row" + str(row + 1)][len(formattedJson["row" + str(row + 1)]) - 1].append({
                    "code": (keymap.key_by_name(akey) - 8),
                    "layers": {
                        "default": getKeyOutput(akey),
                        "alt": getKeyOutput(akey, modifier = altKey),
                        "shift": getKeyOutput(akey, modifier = shiftKey),
                        "capslock": getKeyOutput(akey, capslock = True),
                        "altshift": getKeyOutput(akey, modifier = altshiftKey),
                        "altcapslock": getKeyOutput(akey, modifier = altKey, capslock = True),
                        "shiftcapslock": getKeyOutput(akey, modifier = shiftKey, capslock = True),
                        "altshiftcapslock": getKeyOutput(akey, modifier = altshiftKey, capslock = True)
                    }
                })
                
print("    ".join(('\n'+str("\"" + "+".join(model) + "\": " + json.dumps(formattedJson, indent = 4) + ",").lstrip()).splitlines(True)))

