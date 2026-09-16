// Trackpad / scroll strip panels for GJS OSK.
//
// The panels sit next to the keyboard grid and drive a virtual pointer device
// created on the default seat, so the events reach every client the compositor
// knows about, XWayland ones included.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

const BTN_LEFT = 1;
const BTN_MIDDLE = 2;
const BTN_RIGHT = 3;

// A press shorter than this, that stayed within TAP_SLOP_PX, counts as a tap.
const TAP_TIMEOUT_MS = 250;
const TAP_SLOP_PX = 16;
// The press of a tap-and-drag has to start within this window after the tap.
const DOUBLE_TAP_MS = 300;
// Holding still for this long starts a drag without a preceding tap.
const LONG_PRESS_MS = 600;
// Pointer acceleration: finger speed in px/ms at which the multiplier reaches
// ACCEL_MAX. Below it the multiplier scales linearly from 1.
const ACCEL_PIVOT = 1.4;
const ACCEL_MAX = 2.6;
// How often zero-delta pointer motion is sent to keep the cursor on screen,
// and how many of those are sent after the last finger lifts.
const CURSOR_KEEPALIVE_MS = 40;
const CURSOR_KEEPALIVE_TAIL = 8;

function nowUs() {
    return GLib.get_monotonic_time();
}

function nowMs() {
    return GLib.get_monotonic_time() / 1000;
}

/**
 * Owns the virtual pointer and the button state. One instance is shared by
 * every panel so two fingers on two different panels cannot fight over it.
 */
export class PointerEmulator {
    constructor() {
        this._device = null;
        this._buttonsDown = new Set();
    }

    get device() {
        if (this._device === null) {
            this._device = Clutter.get_default_backend()
                .get_default_seat()
                .create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
        }
        return this._device;
    }

    // The keyboard asks the seat for a fresh virtual device every time it
    // opens; the pointer follows the same lifecycle.
    reacquire() {
        this.releaseAll();
        this._device = null;
    }

    // Zero-delta motion: makes the virtual pointer the last device the backend
    // saw, which is what keeps the cursor on screen in touch mode.
    keepAlive() {
        this.device.notify_relative_motion(nowUs(), 0, 0);
    }

    move(dx, dy) {
        if (dx === 0 && dy === 0)
            return;
        this.device.notify_relative_motion(nowUs(), dx, dy);
    }

    scroll(dx, dy) {
        if (dx === 0 && dy === 0)
            return;
        this.device.notify_scroll_continuous(
            nowUs(), dx, dy, Clutter.ScrollSource.FINGER, 0);
    }

    scrollStop() {
        if (this._device === null)
            return;
        this.device.notify_scroll_continuous(
            nowUs(), 0, 0, Clutter.ScrollSource.FINGER,
            Clutter.ScrollFinishFlags.HORIZONTAL |
            Clutter.ScrollFinishFlags.VERTICAL);
    }

    buttonDown(button) {
        if (this._buttonsDown.has(button))
            return;
        this._buttonsDown.add(button);
        this.device.notify_button(nowUs(), button, Clutter.ButtonState.PRESSED);
    }

    buttonUp(button) {
        if (!this._buttonsDown.delete(button))
            return;
        this.device.notify_button(nowUs(), button, Clutter.ButtonState.RELEASED);
    }

    click(button) {
        const t = nowUs();
        this.device.notify_button(t, button, Clutter.ButtonState.PRESSED);
        this.device.notify_button(t + 1, button, Clutter.ButtonState.RELEASED);
    }

    releaseAll() {
        if (this._device === null)
            return;
        for (const button of [...this._buttonsDown])
            this.buttonUp(button);
    }

    destroy() {
        this.releaseAll();
        this._device = null;
    }
}

/**
 * A touch surface next to the keyboard.
 *
 * mode 'pointer': one finger moves the cursor, two fingers scroll, taps click.
 * mode 'scroll':  one finger scrolls, nothing else.
 */
export const TouchPanel = GObject.registerClass(
class TouchPanel extends St.Widget {
    _init(pointer, settings, mode, params = {}) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            reactive: true,
            track_hover: false,
            style_class: mode === 'pointer' ? 'gjsosk-trackpad' : 'gjsosk-scrollbar-pad',
            ...params,
        });

        this._pointer = pointer;
        this._settings = settings;
        this._mode = mode;
        this._touches = new Map();   // libinput slot -> touch state
        this._dragging = false;
        this._gestureIsScroll = false;
        this._didScroll = false;
        this._lastTapEndMs = 0;
        this._lastTapWasSingle = false;
        this._gestureFingers = 0;
        this._longPressId = null;
        this._cursorKeeperId = null;
        this._cursorFadeCount = 0;

        this._hint = new St.Label({
            style_class: 'gjsosk-pad-hint',
            text: mode === 'pointer' ? '◎' : '↕',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
        });
        this.add_child(this._hint);

        this.connect('touch-event', (_actor, event) => this._onTouch(event));
        this.connect('destroy', () => {
            this._cancelLongPress();
            this._stopCursorKeeper();
            this._touches.clear();
        });
    }

    // Swallow pointer events as well, otherwise the dialog underneath starts
    // dragging the whole keyboard around when a real mouse is used here.
    vfunc_button_press_event() {
        return Clutter.EVENT_STOP;
    }

    vfunc_button_release_event() {
        return Clutter.EVENT_STOP;
    }

    vfunc_motion_event() {
        return Clutter.EVENT_STOP;
    }

    _sensitivity() {
        return this._settings.get_int('pad-sensitivity') / 100;
    }

    _scrollSpeed() {
        return this._settings.get_int('pad-scroll-speed') / 100;
    }

    _tapToClick() {
        return this._settings.get_boolean('pad-tap-to-click');
    }

    _scrollSign() {
        return this._settings.get_boolean('pad-natural-scroll') ? -1 : 1;
    }

    _keepCursorVisible() {
        return this._settings.get_boolean('pad-keep-cursor-visible');
    }

    // While a gesture runs, touch events and synthesised pointer motion take
    // turns being the last device the backend saw, and the cursor blinks. A
    // steady trickle of zero-delta pointer motion keeps it on screen, and a
    // few more after the finger lifts stop it vanishing again.
    _startCursorKeeper() {
        this._stopCursorKeeper();
        if (!this._keepCursorVisible())
            return;
        this._cursorKeeperId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            CURSOR_KEEPALIVE_MS, () => {
                this._pointer.keepAlive();
                if (this._touches.size === 0 && --this._cursorFadeCount <= 0) {
                    this._cursorKeeperId = null;
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
    }

    _stopCursorKeeper() {
        if (this._cursorKeeperId !== null) {
            GLib.source_remove(this._cursorKeeperId);
            this._cursorKeeperId = null;
        }
    }

    _cancelLongPress() {
        if (this._longPressId !== null) {
            GLib.source_remove(this._longPressId);
            this._longPressId = null;
        }
    }

    _armLongPress() {
        this._cancelLongPress();
        if (!this._tapToClick())
            return;
        this._longPressId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, LONG_PRESS_MS, () => {
            this._longPressId = null;
            if (this._touches.size === 1 && !this._dragging) {
                const [touch] = this._touches.values();
                if (!touch.moved) {
                    this._dragging = true;
                    this._pointer.buttonDown(BTN_LEFT);
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _firstSlot() {
        let first = null;
        for (const slot of this._touches.keys()) {
            if (first === null || slot < first)
                first = slot;
        }
        return first;
    }

    _onTouch(event) {
        event ??= Clutter.get_current_event();
        if (event === null)
            return Clutter.EVENT_PROPAGATE;

        const sequence = event.get_event_sequence();
        const slot = sequence !== null ? sequence.get_slot() : 0;
        const [x, y] = event.get_coords();

        switch (event.type()) {
        case Clutter.EventType.TOUCH_BEGIN:
            this._onBegin(slot, x, y);
            break;
        case Clutter.EventType.TOUCH_UPDATE:
            this._onUpdate(slot, x, y);
            break;
        case Clutter.EventType.TOUCH_END:
            this._onEnd(slot, false);
            break;
        case Clutter.EventType.TOUCH_CANCEL:
            this._onEnd(slot, true);
            break;
        default:
            return Clutter.EVENT_PROPAGATE;
        }
        return Clutter.EVENT_STOP;
    }

    _onBegin(slot, x, y) {
        const t = nowMs();
        this._touches.set(slot, {
            x, y,
            startX: x, startY: y,
            startMs: t,
            lastMs: t,
            moved: false,
        });
        this._gestureFingers = Math.max(this._gestureFingers, this._touches.size);
        this.add_style_pseudo_class('active');
        this._cursorFadeCount = CURSOR_KEEPALIVE_TAIL;
        if (this._cursorKeeperId === null)
            this._startCursorKeeper();

        if (this._touches.size > 1) {
            this._cancelLongPress();
            return;
        }

        if (this._mode !== 'pointer')
            return;

        // A press right after a tap means "tap and drag".
        if (this._lastTapWasSingle && this._tapToClick() &&
            t - this._lastTapEndMs < DOUBLE_TAP_MS) {
            this._dragging = true;
            this._pointer.buttonDown(BTN_LEFT);
        } else {
            this._armLongPress();
        }
        this._lastTapWasSingle = false;
    }

    _onUpdate(slot, x, y) {
        const touch = this._touches.get(slot);
        if (touch === undefined)
            return;

        const dx = x - touch.x;
        const dy = y - touch.y;
        const t = nowMs();
        const dt = Math.max(1, t - touch.lastMs);
        touch.x = x;
        touch.y = y;
        touch.lastMs = t;

        if (!touch.moved &&
            Math.hypot(x - touch.startX, y - touch.startY) > TAP_SLOP_PX) {
            touch.moved = true;
            this._cancelLongPress();
        }

        const fingers = this._touches.size;
        if (this._mode === 'scroll' ? fingers >= 1 : fingers >= 2)
            this._gestureIsScroll = true;

        if (this._gestureIsScroll) {
            // Only the lowest slot drives the scroll, so two fingers moving
            // together do not scroll twice as fast as one.
            if (slot !== this._firstSlot())
                return;
            const speed = this._scrollSpeed() * this._scrollSign();
            this._pointer.scroll(dx * speed, dy * speed);
            this._didScroll = true;
            return;
        }

        if (this._mode !== 'pointer' || fingers !== 1)
            return;

        const speed = Math.hypot(dx, dy) / dt;
        const accel = 1 + Math.min(speed / ACCEL_PIVOT, 1) * (ACCEL_MAX - 1);
        const factor = this._sensitivity() * accel;
        this._pointer.move(dx * factor, dy * factor);
    }

    _onEnd(slot, cancelled) {
        const touch = this._touches.get(slot);
        this._touches.delete(slot);
        if (touch === undefined)
            return;

        const t = nowMs();
        const wasTap = !cancelled && !touch.moved &&
            t - touch.startMs < TAP_TIMEOUT_MS;

        if (this._touches.size > 0)
            return;

        this._cancelLongPress();
        this.remove_style_pseudo_class('active');
        this._cursorFadeCount = CURSOR_KEEPALIVE_TAIL;
        const fingers = this._gestureFingers;
        const scrolled = this._didScroll;
        this._gestureFingers = 0;
        this._gestureIsScroll = false;
        this._didScroll = false;

        if (this._dragging) {
            this._dragging = false;
            this._pointer.buttonUp(BTN_LEFT);
            this._lastTapWasSingle = false;
            return;
        }

        if (scrolled)
            this._pointer.scrollStop();

        if (!wasTap || this._mode !== 'pointer' || !this._tapToClick()) {
            this._lastTapWasSingle = false;
            return;
        }

        if (fingers === 1) {
            this._pointer.click(BTN_LEFT);
            this._lastTapWasSingle = true;
            this._lastTapEndMs = t;
        } else if (fingers === 2) {
            this._pointer.click(BTN_RIGHT);
        } else {
            this._pointer.click(BTN_MIDDLE);
        }
    }
});
