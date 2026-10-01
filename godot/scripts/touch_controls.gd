class_name TouchControls
extends Control
## Multi-touch overlay: a floating stick on the left half, FIRE (BRAKE in the car) and ACT on the
## right. Handles InputEventScreenTouch directly, so mouse emulation from touch stays off.
## Appears when the browser reports a touchscreen or on the first touch.

const STICK_R := 90.0
const FIRE_R := 78.0
const ACT_R := 58.0

var enabled := false
var stick := Vector2.ZERO
var fire_down := false
var _act_pending := false
var _act_flash := 0.0
var _stick_idx := -1
var _stick_center := Vector2.ZERO
var _stick_pos := Vector2.ZERO
var _fire_idx := -1
var _last_touch_ms := -100000
var touch_events := 0
var last_touch_pos := Vector2.ZERO


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	enabled = DisplayServer.is_touchscreen_available()
	visible = enabled


func consume_act() -> bool:
	var a := _act_pending
	_act_pending = false
	return a


func touched_recently() -> bool:
	return Time.get_ticks_msec() - _last_touch_ms < 1000


func fire_center() -> Vector2:
	return Vector2(size.x - 120.0, size.y - 140.0)


func act_center() -> Vector2:
	return Vector2(size.x - 270.0, size.y - 92.0)


func _default_stick() -> Vector2:
	return Vector2(160.0, size.y - 160.0)


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		_last_touch_ms = Time.get_ticks_msec()
		touch_events += 1
		last_touch_pos = t.position
		if not enabled:
			enabled = true
			visible = true
		if t.pressed:
			if t.position.distance_to(fire_center()) < FIRE_R + 12.0:
				_fire_idx = t.index
				fire_down = true
			elif t.position.distance_to(act_center()) < ACT_R + 12.0:
				_act_pending = true
				_act_flash = 0.25
			elif t.position.x < size.x * 0.5 and _stick_idx == -1:
				_stick_idx = t.index
				_stick_center = t.position
				_stick_pos = t.position
				_update_stick()
		else:
			if t.index == _fire_idx:
				_fire_idx = -1
				fire_down = false
			if t.index == _stick_idx:
				_stick_idx = -1
				stick = Vector2.ZERO
		queue_redraw()
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		_last_touch_ms = Time.get_ticks_msec()
		if d.index == _stick_idx:
			_stick_pos = d.position
			_update_stick()
			queue_redraw()
		get_viewport().set_input_as_handled()


func _update_stick() -> void:
	var off := _stick_pos - _stick_center
	if off.length() > STICK_R:
		off = off.normalized() * STICK_R
	stick = off / STICK_R
	if stick.length() < 0.15:
		stick = Vector2.ZERO


func _process(delta: float) -> void:
	if _act_flash > 0.0:
		_act_flash -= delta
		queue_redraw()
	if enabled:
		queue_redraw()


func _draw() -> void:
	if not enabled:
		return
	var font := ThemeDB.fallback_font
	var ink := Color(0.09, 0.07, 0.16, 0.85)
	var c := _stick_center if _stick_idx != -1 else _default_stick()
	draw_circle(c, STICK_R, Color(1, 1, 1, 0.18))
	draw_arc(c, STICK_R, 0, TAU, 40, ink, 4.0, true)
	draw_circle(c + stick * STICK_R, 40.0, Color(1, 1, 1, 0.75))
	draw_arc(c + stick * STICK_R, 40.0, 0, TAU, 28, ink, 4.0, true)

	var in_car := GameState.player != null and GameState.player.in_car
	_button(fire_center(), FIRE_R, "BRAKE" if in_car else "FIRE",
		Color(1.0, 0.31, 0.69, 0.95 if fire_down else 0.7), font, 26)
	_button(act_center(), ACT_R, GameState.prompt_short,
		Color(1.0, 0.84, 0.15, 0.95 if _act_flash > 0.0 else 0.7), font, 18)


func _button(center: Vector2, r: float, label: String, col: Color, font: Font, fs: int) -> void:
	draw_circle(center, r, col)
	draw_arc(center, r, 0, TAU, 40, Color(0.09, 0.07, 0.16), 5.0, true)
	var w := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
	draw_string_outline(font, center + Vector2(-w * 0.5, fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 6, Color(0.09, 0.07, 0.16))
	draw_string(font, center + Vector2(-w * 0.5, fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color.WHITE)
