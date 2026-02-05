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
numlockKey = 1 << keymap.mod_get_index("NumLock")
altshiftKey = altKey | shiftKey
capsnumKey = capslockKey | numlockKey

state = keymap.state_new()

keysToTest = [
    "ESC", "FK01", "FK02", "FK03", "FK04", "FK05", "FK06", "FK07", "FK08", "FK09", "FK10", "FK11", "FK12", "PRSC", "SCLK", "PAUS",
    "TLDE", "AE01", "AE02", "AE03", "AE04", "AE05", "AE06", "AE07", "AE08", "AE09", "AE10", "AE11", "AE12", "BKSP", "INS", "HOME", "PGUP", "NMLK", "KPDV", "KPMU", "KPSU",
    "TAB", "AD01", "AD02", "AD03", "AD04", "AD05", "AD06", "AD07", "AD08", "AD09", "AD10", "AD11", "AD12", "BKSL", "DELE", "END", "PGDN", "KP7", "KP8", "KP9", "KPAD",
    "CAPS", "AC01", "AC02", "AC03", "AC04", "AC05", "AC06", "AC07", "AC08", "AC09", "AC10", "AC11", "RTRN", "KP4", "KP5", "KP6", 
    "LFSH", "LSGT", "AB01", "AB02", "AB03", "AB04", "AB05", "AB06", "AB07", "AB08", "AB09", "AB10", "RTSH", "UP", "KP1", "KP2", "KP3", "KPEN", 
    "LCTL", "LWIN", "LALT", "SPCE", "RALT", "RWIN", "MENU", "RCTL", "LEFT", "DOWN", "RGHT", "KP0", "KPDL", "KPEQ", 
]

def getKeyOutput(keyval, modifier = 0, locked = 0):
    state.update_mask(modifier, 0, locked, 0, 0, 0)
    code = state.key_get_one_sym(keymap.key_by_name(keyval))
    return convertKeySymToString(code)

def convertKeySymToString(sym):
    label = ""
    for i in range(1, 13):
        if (sym == getattr(Gdk, ("KEY_F%d" % (i)))):
            return ("F%d" % (i))

    match sym:        
        case Gdk.KEY_dead_A:
            label = "A"

        case Gdk.KEY_dead_E:
            label = "E"

        case Gdk.KEY_dead_I:
            label = "I"

        case Gdk.KEY_dead_O:
            label = "O"

        case Gdk.KEY_dead_U:
            label = "U"

        case Gdk.KEY_dead_a:
            label = "a"

        case Gdk.KEY_dead_e:
            label = "e"

        case Gdk.KEY_dead_i:
            label = "i"

        case Gdk.KEY_dead_o:
            label = "o"

        case Gdk.KEY_dead_u:
            label = "u"

        case Gdk.KEY_dead_hook:
            label = "̉"

        case Gdk.KEY_dead_horn:
            label = "̛"

        case Gdk.KEY_dead_iota:
            label = "ι"

        case Gdk.KEY_dead_acute:
            label = "ˊ"

        case Gdk.KEY_dead_breve:
            label = "˘"

        case Gdk.KEY_dead_caron:
            label = "ˇ"

        case Gdk.KEY_dead_dasia:
            label = "῾"

        case Gdk.KEY_dead_grave:
            label = "ˋ"

        case Gdk.KEY_dead_greek:
            label = "⊞"

        case Gdk.KEY_dead_psili:
            label = "᾿"
        
        case Gdk.KEY_dead_tilde:
            label = "~"
        
        case Gdk.KEY_dead_macron:
            label = "ˉ"
        
        case Gdk.KEY_dead_ogonek:
            label = "˛"
        
        case Gdk.KEY_dead_stroke:
            label = "̵"
        
        case Gdk.KEY_dead_cedilla:
            label = "¸"

        case Gdk.KEY_dead_lowline:
            label = "_"
        
        case Gdk.KEY_dead_abovedot:
            label = "˙"
        
        case Gdk.KEY_dead_belowdot:
            label = " ̣"

        case Gdk.KEY_dead_currency:
            label = "¤"
        
        case Gdk.KEY_dead_abovering:
            label = "˚"

        case Gdk.KEY_dead_belowring:
            label = "̥"
        
        case Gdk.KEY_dead_diaeresis:
            label = "¨"

        case Gdk.KEY_dead_abovecomma:
            label = "̓"

        case Gdk.KEY_dead_belowbreve:
            label = "̮"

        case Gdk.KEY_dead_belowcomma:
            label = "̦"

        case Gdk.KEY_dead_belowtilde:
            label = "̰"
        
        case Gdk.KEY_dead_circumflex:
            label = "ˆ"

        case Gdk.KEY_dead_belowmacron:
            label = "̱"
        
        case Gdk.KEY_dead_doubleacute:
            label = "˝"

        case Gdk.KEY_dead_doublegrave:
            label = "̏"

        case Gdk.KEY_dead_perispomeni:
            label = "῀"

        case Gdk.KEY_dead_small_schwa:
            label = "ᵊ"

        case Gdk.KEY_dead_voiced_sound:
            label = "゛"

        case Gdk.KEY_dead_capital_schwa:
            label = "Ə"

        case Gdk.KEY_dead_invertedbreve:
            label = "̑"

        case Gdk.KEY_dead_belowdiaeresis:
            label = "̤"

        case Gdk.KEY_dead_belowcircumflex:
            label = "̭"

        case Gdk.KEY_dead_semivoiced_sound:
            label = "゜"

        case Gdk.KEY_dead_aboveverticalline:
            label = "̍"

        case Gdk.KEY_dead_belowverticalline:
            label = "̩"

        case Gdk.KEY_dead_abovereversedcomma:
            label = "̔"

        case Gdk.KEY_dead_longsolidusoverlay:
            label = "̸"

        case Gdk.KEY_horizconnector:
            label = ""

        case Gdk.KEY_Multi_key:
            label = ""

        case Gdk.KEY_Up:
            label = "up"
        
        case Gdk.KEY_KP_Up:
            label = "↑"

        case Gdk.KEY_Down:
            label = "down"

        case Gdk.KEY_KP_Down:
            label = "↓"
        
        case Gdk.KEY_Right:
            label = "right"
        
        case Gdk.KEY_KP_Right:
            label = "→"

        case Gdk.KEY_Left:
            label = "left"

        case Gdk.KEY_KP_Left:
            label = "←"
        
        case Gdk.KEY_Insert | Gdk.KEY_KP_Insert:
            label = "Ins"

        case Gdk.KEY_Home | Gdk.KEY_KP_Home:
            label = "Home"

        case Gdk.KEY_Page_Up | Gdk.KEY_KP_Page_Up:
            label = "PgUp"

        case Gdk.KEY_Delete | Gdk.KEY_KP_Delete:
            label = "Del"

        case Gdk.KEY_End | Gdk.KEY_KP_End:
            label = "End"

        case Gdk.KEY_Page_Down | Gdk.KEY_KP_Page_Down:
            label = "PgDn"

        case Gdk.KEY_Num_Lock:
            label = "Num"

        case Gdk.KEY_KP_0:
            label = "0"

        case Gdk.KEY_KP_1:
            label = "1"

        case Gdk.KEY_KP_2:
            label = "2"

        case Gdk.KEY_KP_3:
            label = "3"

        case Gdk.KEY_KP_4:
            label = "4"

        case Gdk.KEY_KP_5:
            label = "5"

        case Gdk.KEY_KP_6:
            label = "6"

        case Gdk.KEY_KP_7:
            label = "7"

        case Gdk.KEY_KP_8:
            label = "8"

        case Gdk.KEY_KP_9:
            label = "9"

        case Gdk.KEY_Print:
            label = "PrtSc"

        case Gdk.KEY_Scroll_Lock:
            label = "ScrLk"

        case Gdk.KEY_Pause:
            label = "Pause"
        
        case Gdk.KEY_Escape:
            label = "Esc"

        case Gdk.KEY_Return | Gdk.KEY_KP_Enter:
            label = "Enter"

        case Gdk.KEY_BackSpace:
            label = "Backspace"
            
        case Gdk.KEY_Delete | Gdk.KEY_KP_Delete:
            label = "Delete"

        case Gdk.KEY_space:
            label = "Space"
        
        case Gdk.KEY_Mode_switch | Gdk.KEY_ISO_Level3_Shift | Gdk.KEY_Alt_L | Gdk.KEY_Alt_R:
            label = "Alt"

        case Gdk.KEY_Shift_L | Gdk.KEY_Shift_R:
            label = "Shift"

        case Gdk.KEY_Caps_Lock:
            label = "Capslock"

        case Gdk.KEY_Tab | Gdk.KEY_ISO_Left_Tab:
            label = "Tab"

        case Gdk.KEY_Super_L | Gdk.KEY_Super_R:
            label = "Super"

        case Gdk.KEY_Control_L | Gdk.KEY_Control_R:
            label = "Ctrl"

        case Gdk.KEY_Meta_L | Gdk.KEY_Meta_R:
            label = "Alt"

        case Gdk.KEY_Menu:
            label = "Menu"

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

for key in keysToTest:
    formattedJson[key] = {
        "code": (keymap.key_by_name(key) - 8),
        "layers": { 
            "default": getKeyOutput(key),
            "numlock": getKeyOutput(key, locked = numlockKey),
            "capslock": getKeyOutput(key, locked = capslockKey),
            "shift": getKeyOutput(key, modifier = shiftKey),
            "alt": getKeyOutput(key, modifier = altKey),
            "numcapslock": getKeyOutput(key, locked = capsnumKey),
            "shiftcapslock": getKeyOutput(key, modifier = shiftKey, locked = capslockKey),
            "altshift": getKeyOutput(key, modifier = altshiftKey),
            "altnumlock": getKeyOutput(key, modifier = altKey, locked = numlockKey),
            "shiftnumlock": getKeyOutput(key, modifier = shiftKey, locked = numlockKey),
            "altcapslock": getKeyOutput(key, modifier = altKey, locked = capslockKey),
            "shiftnumcapslock": getKeyOutput(key, modifier = shiftKey, locked = capsnumKey),
            "altshiftcapslock": getKeyOutput(key, modifier = altshiftKey, locked = capslockKey),
            "altshiftnumlock": getKeyOutput(key, modifier = altshiftKey, locked = numlockKey),
            "altnumcapslock": getKeyOutput(key, modifier = altKey, locked = capsnumKey),
            "altshiftnumcapslock": getKeyOutput(key, modifier = altshiftKey, locked = capsnumKey),
        }
    }
                
print(json.dumps(formattedJson, indent = 4))

