# Trackpad and scroll strip

Two touch panels in the space the keyboard leaves empty beside the keys:
a scroll strip on the left, a trackpad on the right.

## Why

A touchscreen gives absolute presses and nothing else. There is no cursor, no
right button, no scroll wheel and no dragging, which makes anything built for a
mouse — a terminal, an IDE, any context menu — painful on a tablet.

A shell extension runs inside the compositor, so it can create a virtual
pointer device on the seat. The events it synthesises reach every client,
including XWayland ones, which a standalone application cannot do: Mutter has
no `wlr-layer-shell`, so an ordinary Wayland window cannot be an overlay that
stays above everything without stealing input focus.

## Gestures

Right panel, trackpad:

| Gesture | Action |
| --- | --- |
| One finger moving | Pointer motion, with acceleration |
| One finger tap | Left click |
| Two finger tap | Right click |
| Three finger tap | Middle click |
| Tap, then press and move within 300 ms | Drag |
| Press and hold still for 600 ms | Drag |
| Two fingers moving | Smooth scrolling on both axes |

Left panel, scroll strip: one finger moving scrolls. Nothing else, so that a
stray tap during a scroll cannot click.

## Settings

Preferences → General → Trackpad.

| Key | Default | Meaning |
| --- | --- | --- |
| `pad-trackpad-enabled` | `true` | The right panel |
| `pad-scroll-enabled` | `true` | The left panel |
| `pad-sensitivity` | `140` | Pointer speed, per cent |
| `pad-scroll-speed` | `100` | Scroll speed, per cent |
| `pad-natural-scroll` | `true` | Content follows the finger |
| `pad-tap-to-click` | `true` | Tap to click, and drag by tapping |
| `pad-keep-cursor-visible` | `true` | See "The cursor" below |
| `pad-min-width-px` | `90` | Below this the panels are not built |

With both panels off, no virtual pointer is created and the keyboard behaves
exactly as it did before.

Scroll direction is a setting of its own rather than the system touchpad one,
because a finger on the screen and a physical touchpad can reasonably want
opposite directions.

## Geometry

The keyboard grid is wrapped in a row: `[left panel][keys][right panel]`. Each
panel is as wide as the gap the keyboard already leaves:

```
gap = floor(((monitor.width - 2 * snap-spacing-px) - keyboardBox.width) / 2)
```

Both panels take the full gap even when only one is enabled, so the keys stay
where they were; the disabled side becomes an empty spacer. The panels are
skipped for split layouts, which already span the screen, and whenever the gap
is narrower than `pad-min-width-px`.

To get a bigger trackpad, reduce the keyboard width. On a 1440 px wide logical
screen, 70 % leaves 208 px per panel and 60 % leaves 288 px.

## The cursor

Mutter hides the pointer whenever the last input event came from a touchscreen.
A gesture on the panel is a stream of touch events interleaved with synthesised
pointer motion, so the cursor blinks while the finger moves and stays hidden
once it is lifted. Mutter no longer exposes a way to force the cursor visible —
`MetaCursorTracker` only has `inhibit_cursor_visibility` and
`uninhibit_cursor_visibility`, which hide it.

The workaround is a 40 ms timer, running only while a gesture is in progress
and for eight ticks afterwards, that sends pointer motion with a zero delta.
That does not move the cursor but keeps the virtual pointer the last device the
backend saw. `pad-keep-cursor-visible` turns it off.

If a better mechanism appears, this is the one piece that should be replaced.

## Implementation notes

`trackpad.js` holds everything; `extension.js` changes are confined to
`buildPads()`, the wrapper it returns, and the pointer's lifecycle.

* Touches are keyed by `Clutter.EventSequence.get_slot()`, so fingers are
  distinguished by the libinput slot rather than guessed from coordinates.
* A gesture that became a scroll stays a scroll until every finger is lifted.
  Otherwise lifting one finger of a two finger scroll would fall back to
  pointer motion mid-gesture and jump the cursor.
* The finger count used to classify a tap is the maximum over the gesture, not
  the count at release, so a two finger tap whose fingers leave at slightly
  different times is still a right click.
* Only the lowest slot drives scrolling, so two fingers moving together do not
  scroll twice as fast as one.
* Scrolling is sent as `notify_scroll_continuous` with `ScrollSource.FINGER`,
  which is what makes clients apply kinetic scrolling, followed by a finish
  event so the kinetic phase starts.
* The open and close animation fades the wrapping row rather than the key grid,
  or the panels would stay opaque while the keyboard fades.
* Held buttons are released when the keyboard closes and when the dialog is
  destroyed. A button left held across a close would leave the session
  unusable.

## Limitations

* Nothing on the lock screen: shell extensions do not run there.
* The slide-in animation offset is computed from the key grid width rather than
  the whole row, which is only visible when the keyboard is snapped to the left
  or right edge.
* The panels are not shown for split layouts.
