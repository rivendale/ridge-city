extends Node3D
## Builds the week-one block in code: a road loop, sidewalks, six buildings (one enterable shop),
## 20 breakables, five pedestrians (one cop), the car, the player, the camera, HUD and touch.
## On the web it also publishes window.__ridgeCity for the Playwright check.

const ROAD := Color(0.3, 0.3, 0.36)
const WALK := Color(0.7, 0.69, 0.76)
const GRASS := Color(0.49, 0.78, 0.42)
const LINE := Color(1.0, 0.84, 0.2)
const ROOF := Color(0.23, 0.21, 0.31)
const WINDOW := Color(0.17, 0.23, 0.42)

const SHOP_MIN := Vector2(4.0, 4.0)
const SHOP_MAX := Vector2(20.0, 20.0)

var world: Node3D
var camera: Camera3D
var buildings: Array[Dictionary] = []
var shop_roof: Array[Node3D] = []
var _bridge_t := 0.0
var _web := OS.has_feature("web")


func _ready() -> void:
	randomize()
	_setup_input()
	_environment()
	world = Node3D.new()
	world.name = "World"
	add_child(world)
	var debris := Node3D.new()
	debris.name = "Debris"
	add_child(debris)
	GameState.debris_root = debris
	var fx := Node3D.new()
	fx.name = "Fx"
	add_child(fx)
	GameState.fx_root = fx

	_ground()
	_buildings()
	_shop()
	_street_furniture()
	_props()
	_people()

	var car := Car.new()
	add_child(car)
	car.global_position = Vector3(-4.0, 0, 27.5)
	car.rotation.y = -PI * 0.5
	GameState.car = car

	var player := Player.new()
	add_child(player)
	player.global_position = Vector3(-4.0, 0, 24.0)
	GameState.player = player

	camera = preload("res://scripts/camera_rig.gd").new()
	add_child(camera)
	camera.snap()

	var hud := preload("res://scripts/hud.gd").new()
	add_child(hud)
	var touch_layer := CanvasLayer.new()
	touch_layer.layer = 10
	add_child(touch_layer)
	var touch := TouchControls.new()
	touch_layer.add_child(touch)
	GameState.touch = touch

	if _web:
		JavaScriptBridge.eval("""
			window.__ridgeCityQueue = window.__ridgeCityQueue || [];
			window.__ridgeCity = {
				cmd: function (name, arg) { window.__ridgeCityQueue.push({name: name, arg: arg || {}}); },
				get state() { return window.__ridgeCityState; }
			};
		""", true)


func _setup_input() -> void:
	_bind("move_left", [KEY_A, KEY_LEFT])
	_bind("move_right", [KEY_D, KEY_RIGHT])
	_bind("move_up", [KEY_W, KEY_UP])
	_bind("move_down", [KEY_S, KEY_DOWN])
	_bind("act", [KEY_E, KEY_ENTER])
	_bind("fire", [KEY_SPACE])


func _bind(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action, 0.2)
	for k in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = k
		InputMap.action_add_event(action, ev)


func _environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.56, 0.83, 1.0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.85, 0.85, 1.0)
	env.ambient_light_energy = 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -35, 0)
	sun.light_energy = 0.85
	sun.shadow_enabled = false
	add_child(sun)


func _ground() -> void:
	var g := StaticBody3D.new()
	g.name = "Ground"
	g.collision_layer = 1
	g.collision_mask = 0
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = Vector3(200, 1, 200)
	cs.shape = sh
	cs.position.y = -0.5
	g.add_child(cs)
	world.add_child(g)

	Art.flat(world, Vector2(200, 200), Vector3(0, -0.02, 0), GRASS)
	# The road loop around one block.
	Art.flat(world, Vector2(72, 12), Vector3(0, 0, -30), ROAD)
	Art.flat(world, Vector2(72, 12), Vector3(0, 0, 30), ROAD)
	Art.flat(world, Vector2(12, 48), Vector3(-30, 0, 0), ROAD)
	Art.flat(world, Vector2(12, 48), Vector3(30, 0, 0), ROAD)
	# Sidewalks: the whole inner block, and an outer ring.
	Art.flat(world, Vector2(48, 48), Vector3(0, 0.01, 0), WALK)
	Art.flat(world, Vector2(82, 5), Vector3(0, 0.01, -38.5), WALK)
	Art.flat(world, Vector2(82, 5), Vector3(0, 0.01, 38.5), WALK)
	Art.flat(world, Vector2(5, 72), Vector3(-38.5, 0.01, 0), WALK)
	Art.flat(world, Vector2(5, 72), Vector3(38.5, 0.01, 0), WALK)
	# Center dashes.
	var x := -21.0
	while x <= 21.0:
		Art.box(world, Vector3(2.4, 0.02, 0.25), Vector3(x, 0.02, -30), LINE, false)
		Art.box(world, Vector3(2.4, 0.02, 0.25), Vector3(x, 0.02, 30), LINE, false)
		Art.box(world, Vector3(0.25, 0.02, 2.4), Vector3(-30, 0.02, x), LINE, false)
		Art.box(world, Vector3(0.25, 0.02, 2.4), Vector3(30, 0.02, x), LINE, false)
		x += 5.25
	# A crosswalk in front of the shop.
	for i in 6:
		Art.box(world, Vector3(0.7, 0.02, 3.2), Vector3(-2.5 + i * 1.0, 0.02, 25.8), Color(0.97, 0.97, 0.97), false)
	# Hedges keep the car inside the block.
	var hedge := Color(0.24, 0.55, 0.3)
	Art.static_box(world, Vector3(86, 1.2, 1.4), Vector3(0, 0.6, -42), hedge)
	Art.static_box(world, Vector3(86, 1.2, 1.4), Vector3(0, 0.6, 42), hedge)
	Art.static_box(world, Vector3(1.4, 1.2, 86), Vector3(-42, 0.6, 0), hedge)
	Art.static_box(world, Vector3(1.4, 1.2, 86), Vector3(42, 0.6, 0), hedge)


func _buildings() -> void:
	_building(Vector3(-12, 0, -12), Vector3(16, 11, 16), Color(0.54, 0.44, 0.94))
	_building(Vector3(12, 0, -12), Vector3(16, 9, 16), Color(0.23, 0.66, 0.88))
	_building(Vector3(-12, 0, 12), Vector3(16, 8, 16), Color(0.91, 0.77, 0.28))
	_building(Vector3(-20, 0, -52), Vector3(30, 12, 14), Color(0.94, 0.42, 0.66))
	_building(Vector3(18, 0, -52), Vector3(26, 9, 14), Color(0.2, 0.72, 0.85))


func _building(center: Vector3, size: Vector3, color: Color) -> void:
	var root := Node3D.new()
	root.position = center
	world.add_child(root)
	var sb := StaticBody3D.new()
	sb.collision_layer = 1
	sb.collision_mask = 0
	root.add_child(sb)
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	cs.position.y = size.y * 0.5
	sb.add_child(cs)

	var opaque := Art.mat(color).duplicate() as StandardMaterial3D
	var faded := opaque.duplicate() as StandardMaterial3D
	faded.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	faded.albedo_color.a = 0.28
	var body := Art.box(root, size, Vector3(0, size.y * 0.5, 0), color)
	body.material_override = opaque
	var extras: Array[Node3D] = [body.get_node("Ink")]
	extras.append(Art.box(root, Vector3(size.x + 0.5, 0.5, size.z + 0.5), Vector3(0, size.y + 0.25, 0), ROOF))
	extras.append(Art.box(root, Vector3(2.4, 1.2, 2.0), Vector3(size.x * 0.2, size.y + 1.1, -size.z * 0.15), Color(0.78, 0.8, 0.86)))
	extras.append(_windows(root, size))
	buildings.append({
		"body": body, "opaque": opaque, "faded": faded, "extras": extras, "faded_now": false,
		"aabb": AABB(center - Vector3(size.x * 0.5, 0, size.z * 0.5), size + Vector3(0, 0.6, 0))})


## All of a building's windows in one mesh, so one draw call. South, east and west faces.
func _windows(root: Node3D, size: Vector3) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pane := BoxMesh.new()
	pane.size = Vector3(1.5, 1.7, 0.2)
	var y := 2.6
	while y < size.y - 1.0:
		var x := -size.x * 0.5 + 2.2
		while x < size.x * 0.5 - 1.5:
			st.append_from(pane, 0, Transform3D(Basis(), Vector3(x, y, size.z * 0.5)))
			x += 3.2
		var z := -size.z * 0.5 + 2.2
		while z < size.z * 0.5 - 1.5:
			var b := Basis(Vector3.UP, PI * 0.5)
			st.append_from(pane, 0, Transform3D(b, Vector3(size.x * 0.5, y, z)))
			st.append_from(pane, 0, Transform3D(b, Vector3(-size.x * 0.5, y, z)))
			z += 3.2
		y += 3.0
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = Art.mat(WINDOW)
	root.add_child(mi)
	return mi


## The corner shop: hollow walls, a door you break open, and a roof that hides while you are inside.
func _shop() -> void:
	var coral := Color(0.94, 0.45, 0.35)
	var h := 6.0
	var cx := (SHOP_MIN.x + SHOP_MAX.x) * 0.5
	var w := SHOP_MAX.x - SHOP_MIN.x
	var t := 0.5
	Art.static_box(world, Vector3(w, h, t), Vector3(cx, h * 0.5, SHOP_MIN.y + t * 0.5), coral)
	Art.static_box(world, Vector3(t, h, w), Vector3(SHOP_MIN.x + t * 0.5, h * 0.5, cx), coral)
	Art.static_box(world, Vector3(t, h, w), Vector3(SHOP_MAX.x - t * 0.5, h * 0.5, cx), coral)
	var gap := 2.6
	var seg := (w - gap) * 0.5
	var fz := SHOP_MAX.y - t * 0.5
	Art.static_box(world, Vector3(seg, h, t), Vector3(SHOP_MIN.x + seg * 0.5, h * 0.5, fz), coral)
	Art.static_box(world, Vector3(seg, h, t), Vector3(SHOP_MAX.x - seg * 0.5, h * 0.5, fz), coral)
	Art.static_box(world, Vector3(gap, 2.0, t), Vector3(cx, h - 1.0, fz), coral)
	# Shop windows and a striped awning on the front.
	Art.box(world, Vector3(4.0, 2.0, 0.1), Vector3(cx - 4.4, 2.0, SHOP_MAX.y + 0.02), Color(0.62, 0.86, 1.0), false)
	Art.box(world, Vector3(4.0, 2.0, 0.1), Vector3(cx + 4.4, 2.0, SHOP_MAX.y + 0.02), Color(0.62, 0.86, 1.0), false)
	for i in 8:
		Art.box(world, Vector3(1.6, 0.12, 1.6), Vector3(SHOP_MIN.x + 1.6 + i * 1.75, 3.6, SHOP_MAX.y + 0.75),
			Color(0.9, 0.2, 0.25) if i % 2 == 0 else Color(0.97, 0.96, 0.94), false)
	var sign := Label3D.new()
	sign.text = "CORNER SHOP"
	sign.font_size = 96
	sign.pixel_size = 0.012
	sign.outline_size = 24
	sign.modulate = Color(1, 0.95, 0.75)
	sign.outline_modulate = Art.INK
	sign.position = Vector3(cx, 4.8, SHOP_MAX.y + 0.05)
	world.add_child(sign)
	# Inside: a floor, a counter with a till, and stocked shelves.
	Art.flat(world, Vector2(w - 1.0, w - 1.0), Vector3(cx, 0.03, cx), Color(0.96, 0.9, 0.78))
	Art.static_box(world, Vector3(6.0, 1.1, 1.0), Vector3(cx, 0.55, 9.5), Color(0.55, 0.36, 0.22))
	Art.box(world, Vector3(0.9, 0.5, 0.6), Vector3(cx + 1.5, 1.35, 9.5), Color(0.25, 0.75, 0.45))
	for row in 3:
		var shelf := Art.static_box(world, Vector3(1.0, 2.0, 2.8), Vector3(SHOP_MIN.x + 1.4, 1.0, 7.4 + row * 3.2), Color(0.85, 0.85, 0.9))
		for k in 4:
			Art.box(shelf, Vector3(0.5, 0.4, 0.7), Vector3(0.6, -0.3 + (k % 2) * 0.8, -1.05 + k * 0.7), [Color(1, 0.5, 0.2), Color(0.3, 0.6, 1), Color(1, 0.85, 0.2), Color(0.9, 0.3, 0.6)][k], false)
	var roof := Art.box(world, Vector3(w + 0.5, 0.5, w + 0.5), Vector3(cx, h + 0.25, cx), ROOF)
	shop_roof.append(roof)

	var door := BreakInDoor.new()
	door.name = "ShopDoor"
	door.position = Vector3(cx, 0, SHOP_MAX.y + 0.9)
	world.add_child(door)
	var pivot := Node3D.new()
	pivot.position = Vector3(-gap * 0.5, 0, -0.9 - t * 0.5)
	door.add_child(pivot)
	door.pivot = pivot
	var panel := Art.static_box(pivot, Vector3(gap, 4.0, 0.2), Vector3(gap * 0.5, 2.0, 0), Color(0.36, 0.24, 0.5))
	Art.box(panel, Vector3(0.18, 0.18, 0.3), Vector3(gap * 0.35, 0, 0), Color(1, 0.85, 0.2), false)
	GameState.doors.append(door)


func _street_furniture() -> void:
	for p in [Vector2(-23, -23), Vector2(23, -23), Vector2(-23, 23), Vector2(23, 23)]:
		var lamp := Art.static_box(world, Vector3(0.3, 5.0, 0.3), Vector3(p.x, 2.5, p.y), Color(0.35, 0.36, 0.44))
		Art.box(lamp, Vector3(0.5, 0.35, 0.8), Vector3(0, 2.6, 0), Color(1, 0.95, 0.65))
	for p in [Vector2(-38.5, -38.5), Vector2(38.5, -38.5), Vector2(-38.5, 38.5), Vector2(38.5, 38.5), Vector2(0, 0)]:
		var trunk := Art.static_box(world, Vector3(0.5, 2.2, 0.5), Vector3(p.x, 1.1, p.y), Color(0.5, 0.33, 0.2))
		Art.ball(trunk, 1.7, Vector3(0, 2.2, 0), Color(0.3, 0.68, 0.35))
		Art.blob(trunk, 1.8).position.y = -1.05


func _props() -> void:
	# 5 hydrants, 4 fruit stands, 5 glass panels, 6 cones: 20 breakables.
	var spots := [
		["hydrant", Vector3(-23.2, 0, -8), 0.0], ["hydrant", Vector3(23.2, 0, 4), 0.0],
		["hydrant", Vector3(-8, 0, 23.2), 0.0], ["hydrant", Vector3(37, 0, -15), 0.0],
		["hydrant", Vector3(-37, 0, 18), 0.0],
		["fruit_stand", Vector3(-10, 0, 38.4), 0.0], ["fruit_stand", Vector3(14, 0, 38.4), 0.0],
		["fruit_stand", Vector3(38.4, 0, 10), PI * 0.5], ["fruit_stand", Vector3(-38.4, 0, -12), PI * 0.5],
		["glass", Vector3(2, 0, 38.6), 0.0], ["glass", Vector3(38.6, 0, -6), PI * 0.5],
		["glass", Vector3(-38.6, 0, 2), PI * 0.5], ["glass", Vector3(-4.2, 0, -38.6), 0.0],
		["glass", Vector3(-1.9, 0, -38.6), 0.0],
		["cone", Vector3(6, 0, 34.5), 0.0], ["cone", Vector3(9, 0, 34.5), 0.0],
		["cone", Vector3(12, 0, 34.5), 0.0], ["cone", Vector3(-25.5, 0, -6), 0.0],
		["cone", Vector3(-25.5, 0, -2), 0.0], ["cone", Vector3(-25.5, 0, 2), 0.0],
	]
	for s in spots:
		var b := Breakable.new()
		b.setup(s[0])
		world.add_child(b)
		b.global_position = s[1]
		b.rotation.y = s[2]
		GameState.props.append(b)


func _people() -> void:
	var r_in := 21.9
	var r_out := 39.7
	var inner := PackedVector3Array([Vector3(-r_in, 0, -r_in), Vector3(r_in, 0, -r_in), Vector3(r_in, 0, r_in), Vector3(-r_in, 0, r_in)])
	var inner_rev := PackedVector3Array([Vector3(-r_in, 0, r_in), Vector3(r_in, 0, r_in), Vector3(r_in, 0, -r_in), Vector3(-r_in, 0, -r_in)])
	var outer := PackedVector3Array([Vector3(-r_out, 0, -r_out), Vector3(r_out, 0, -r_out), Vector3(r_out, 0, r_out), Vector3(-r_out, 0, r_out)])
	var outer_rev := PackedVector3Array([Vector3(-r_out, 0, r_out), Vector3(r_out, 0, r_out), Vector3(r_out, 0, -r_out), Vector3(-r_out, 0, -r_out)])
	var specs := [
		[false, Color(1, 0.5, 0.71), Color(0.95, 0.76, 0.49), inner, 3],
		[false, Color(0.35, 0.79, 0.42), Color(0.55, 0.33, 0.16), inner_rev, 1],
		[false, Color(0.61, 0.42, 0.94), Color(0.78, 0.53, 0.26), outer, 2],
		[false, Color(0.96, 0.77, 0.26), Color(0.88, 0.67, 0.41), outer_rev, 0],
		[true, Color(0.17, 0.25, 0.56), Color(0.76, 0.52, 0.32), outer, 0],
	]
	for s in specs:
		var p := Pedestrian.new()
		p.setup(s[0], s[1], s[2], s[3], s[4])
		world.add_child(p)
		GameState.peds.append(p)


func _process(delta: float) -> void:
	_fade_occluders()
	var pp := GameState.player.global_position
	var inside := pp.x > SHOP_MIN.x and pp.x < SHOP_MAX.x and pp.z > SHOP_MIN.y and pp.z < SHOP_MAX.y
	for r in shop_roof:
		r.visible = not inside
	if _web:
		_bridge_t -= delta
		if _bridge_t <= 0.0:
			_bridge_t = 0.1
			_bridge()


## A building between the camera and the player turns see-through.
func _fade_occluders() -> void:
	var from := GameState.player.global_position + Vector3(0, 1.2, 0)
	var to := camera.global_position
	for b in buildings:
		var hide: bool = (b["aabb"] as AABB).intersects_segment(from, to) != null
		if hide != b["faded_now"]:
			b["faded_now"] = hide
			(b["body"] as MeshInstance3D).material_override = b["faded"] if hide else b["opaque"]
			for e in b["extras"]:
				e.visible = not hide


func _bridge() -> void:
	var raw = JavaScriptBridge.eval("JSON.stringify((window.__ridgeCityQueue || []).splice(0))", true)
	if typeof(raw) == TYPE_STRING and raw != "[]":
		var cmds = JSON.parse_string(raw)
		if cmds is Array:
			for c in cmds:
				_run_cmd(c)
	JavaScriptBridge.eval("window.__ridgeCityState = " + JSON.stringify(GameState.snapshot()) + ";", true)


## Test hooks for the headless check. They place things; the game logic does the rest.
func _run_cmd(c: Dictionary) -> void:
	var a: Dictionary = c.get("arg", {}) if c.get("arg") is Dictionary else {}
	var player := GameState.player
	var car := GameState.car
	match str(c.get("name", "")):
		"place_car":
			if not player.in_car:
				player.global_position = Vector3(a.get("x", 0.0), 0, a.get("z", 0.0) + 5.0)
			car.global_position = Vector3(a.get("x", 0.0), 0, a.get("z", 0.0))
			car.rotation.y = float(a.get("heading", 0.0))
			car.speed = 0.0
			car.velocity = Vector3.ZERO
		"place_player":
			if player.in_car:
				player.exit_car()
			player.global_position = Vector3(a.get("x", 0.0), 0, a.get("z", 0.0))
			player.facing = Vector3(a.get("fx", 0.0), 0, a.get("fz", -1.0)).normalized()
		"freeze_peds":
			for p in GameState.peds:
				p.frozen = bool(a.get("on", true))
		"place_ped":
			var p: Pedestrian = GameState.peds[int(a.get("i", 0))]
			p.global_position = Vector3(a.get("x", 0.0), 0, a.get("z", 0.0))
		"break_all":
			for pr in GameState.props:
				pr.smash(Vector3(1, 0, 0), "test")
