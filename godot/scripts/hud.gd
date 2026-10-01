extends CanvasLayer
## Minimal HUD: cash, wanted stars with the cool-down, an FPS counter, the context prompt, toasts.

const INK := Color(0.09, 0.07, 0.16)

var _root: Control
var _cash_panel: PanelContainer
var _cash: Label
var _stars_panel: PanelContainer
var _stars: StarsBar
var _heat: Label
var _fps: Label
var _title: Label
var _tip: Label
var _prompt_panel: PanelContainer
var _prompt: Label
var _toast: Label
var _fps_t := 0.0


class StarsBar extends Control:
	var lit := 0

	func _init() -> void:
		custom_minimum_size = Vector2(5 * 46, 44)

	func _draw() -> void:
		for i in 5:
			var c := Vector2(22 + i * 46, 22)
			var pts := PackedVector2Array()
			for k in 10:
				var r := 20.0 if k % 2 == 0 else 8.5
				var a := -PI / 2.0 + k * PI / 5.0
				pts.append(c + Vector2(cos(a), sin(a)) * r)
			draw_colored_polygon(pts, Color(1, 0.84, 0.15) if i < lit else Color(0.36, 0.34, 0.47))
			pts.append(pts[0])
			draw_polyline(pts, Color(0.09, 0.07, 0.16), 3.0, true)


func _ready() -> void:
	layer = 5
	_root = Control.new()
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	_cash_panel = _panel(Color(0.1, 0.08, 0.18, 0.88))
	_cash = _label("$0", 40, Color(0.45, 1.0, 0.55))
	_cash_panel.add_child(_cash)

	_stars_panel = _panel(Color(0.1, 0.08, 0.18, 0.88))
	var col := VBoxContainer.new()
	_stars = StarsBar.new()
	col.add_child(_stars)
	_heat = _label("NO HEAT", 16, Color(1, 1, 1))
	_heat.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_heat)
	_stars_panel.add_child(col)

	_title = _label("RIDGE CITY", 40, Color(1, 0.84, 0.15))
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_root.add_child(_title)
	_tip = _label("WEEK-ONE PROTOTYPE  -  CARTOON CRIME, NOBODY GETS HURT", 15, Color(1, 1, 1))
	_tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_root.add_child(_tip)

	_fps = _label("FPS --", 18, Color(1, 1, 1))
	_root.add_child(_fps)

	_prompt_panel = _panel(Color(1.0, 0.97, 0.88, 0.95))
	_prompt = _label("", 22, INK, 0)
	_prompt_panel.add_child(_prompt)

	_toast = _label("", 72, Color(1, 0.85, 0.2), 14)
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_toast.modulate.a = 0.0
	_root.add_child(_toast)

	GameState.changed.connect(_refresh)
	GameState.toast_requested.connect(_show_toast)
	_refresh()


func _panel(bg: Color) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(14)
	sb.content_margin_left = 16
	sb.content_margin_right = 16
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	sb.border_color = INK
	sb.set_border_width_all(3)
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(p)
	return p


func _label(text: String, size: int, color: Color, outline := 8) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", INK)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _refresh() -> void:
	_cash.text = "$%d" % GameState.cash
	_stars.lit = GameState.stars()
	_stars.queue_redraw()


func _show_toast(text: String, color: Color) -> void:
	_toast.text = text
	_toast.add_theme_color_override("font_color", color)
	_toast.pivot_offset = _toast.size * 0.5
	_toast.modulate.a = 1.0
	_toast.scale = Vector2(0.6, 0.6)
	var tw := create_tween()
	tw.tween_property(_toast, "scale", Vector2.ONE, 0.15).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_interval(0.5)
	tw.tween_property(_toast, "modulate:a", 0.0, 0.35)


func _process(delta: float) -> void:
	var vp := _root.size
	_cash_panel.position = Vector2(20, 16)
	_stars_panel.position = Vector2(vp.x - _stars_panel.size.x - 20, 16)
	_title.size.x = vp.x
	_title.position = Vector2(0, 8)
	_tip.size.x = vp.x
	_tip.position = Vector2(0, 58)
	_fps.position = Vector2(24, 90)
	_toast.size.x = vp.x
	_toast.position = Vector2(0, vp.y * 0.32)
	_toast.pivot_offset = _toast.size * 0.5

	_prompt_panel.visible = GameState.prompt != ""
	_prompt.text = GameState.prompt
	_prompt_panel.reset_size()
	_prompt_panel.position = Vector2((vp.x - _prompt_panel.size.x) * 0.5, vp.y - _prompt_panel.size.y - 28)

	if GameState.heat > 0.0:
		_heat.text = "HEAT  COOLING IN %ds" % ceili(GameState.cool_left)
	else:
		_heat.text = "NO HEAT"

	_fps_t -= delta
	if _fps_t <= 0.0:
		_fps_t = 0.5
		GameState.fps_text = "FPS %d" % Engine.get_frames_per_second()
		_fps.text = GameState.fps_text
