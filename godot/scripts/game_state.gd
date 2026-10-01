extends Node
## Autoload "GameState": cash, heat (wanted stars), the debris cap, shared input, and the test snapshot.

signal changed
signal toast_requested(text: String, color: Color)

const DEBRIS_CAP := 64
const SMASH_HEAT := 0.5
const BREAK_IN_HEAT := 0.5

var cash := 40
var heat := 0.0
var cool_left := 0.0
var props_broken := 0
var tags := 0
var break_ins := 0
var debris_spawned := 0
var debris_max_seen := 0
var prompt := ""
var prompt_short := "ACT"
var fps_text := ""

var player: Player
var car: Car
var touch: TouchControls
var debris_root: Node3D
var fx_root: Node3D
var props: Array[Breakable] = []
var peds: Array[Pedestrian] = []
var doors: Array[BreakInDoor] = []
var _debris: Array[Node3D] = []


func stars() -> int:
	return clampi(ceili(heat - 0.001), 0, 5)


func cool_time() -> float:
	return 8.0 + 4.0 * stars()


func _process(delta: float) -> void:
	if heat > 0.0:
		cool_left -= delta
		if cool_left <= 0.0:
			heat = maxf(0.0, float(stars() - 1))
			cool_left = cool_time() if heat > 0.0 else 0.0
			changed.emit()


func add_heat(amount: float) -> void:
	heat = minf(heat + amount, 5.0)
	cool_left = cool_time()
	changed.emit()


func add_cash(amount: int) -> void:
	cash += amount
	changed.emit()


func toast(text: String, color := Color(1, 0.85, 0.2)) -> void:
	toast_requested.emit(text, color)


func on_smash(_prop: Breakable, _by: String) -> void:
	props_broken += 1
	add_heat(SMASH_HEAT)
	toast("SMASH!")


## Tagging never pays. A cop raises a full star; a pedestrian a little.
func on_tag(ped: Pedestrian, _by: String) -> void:
	tags += 1
	add_heat(1.0 if ped.is_cop else 0.25)
	toast("TAGGED!", Color(1, 0.45, 0.8))


func on_break_in(payout: int) -> void:
	break_ins += 1
	add_cash(payout)
	add_heat(BREAK_IN_HEAT)
	toast("+$%d" % payout, Color(0.45, 1, 0.55))


# Input shared by keyboard and the touch overlay.

func move_vector() -> Vector2:
	var v := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if touch != null and touch.stick.length() > v.length():
		v = touch.stick
	return v


func fire_held() -> bool:
	return Input.is_action_pressed("fire") or (touch != null and touch.fire_down)


func act_just() -> bool:
	var t := touch != null and touch.consume_act()
	return Input.is_action_just_pressed("act") or t


func key_label() -> String:
	return "ACT" if touch != null and touch.enabled else "E"


# Debris: never more than DEBRIS_CAP pieces alive. The oldest piece goes first.

func spawn_debris(origin: Vector3, colors: Array, count: int, piece: float, push: Vector3) -> void:
	for i in count:
		var rb := RigidBody3D.new()
		rb.collision_layer = 16
		rb.collision_mask = 1
		var sz := Vector3.ONE * piece * randf_range(0.7, 1.3)
		var cs := CollisionShape3D.new()
		var sh := BoxShape3D.new()
		sh.size = sz
		cs.shape = sh
		rb.add_child(cs)
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = sz
		mi.mesh = bm
		mi.material_override = Art.mat(colors[i % colors.size()])
		rb.add_child(mi)
		rb.position = origin + Vector3(randf_range(-0.4, 0.4), randf_range(-0.2, 0.3), randf_range(-0.4, 0.4))
		_add_debris(rb)
		var p := push
		p.y = 0.0
		rb.linear_velocity = p.normalized() * randf_range(2.0, 5.0) + Vector3(randf_range(-2, 2), randf_range(3, 6), randf_range(-2, 2))
		rb.angular_velocity = Vector3(randf_range(-8, 8), randf_range(-8, 8), randf_range(-8, 8))


func _add_debris(node: Node3D) -> void:
	debris_root.add_child(node)
	_debris.append(node)
	debris_spawned += 1
	while _debris.size() > DEBRIS_CAP:
		var old = _debris.pop_front()
		if is_instance_valid(old):
			old.queue_free()
	debris_max_seen = maxi(debris_max_seen, debris_live())
	get_tree().create_timer(5.0).timeout.connect(_expire.bind(node))


func _expire(node) -> void:
	if is_instance_valid(node):
		_debris.erase(node)
		node.queue_free()


func debris_live() -> int:
	var n := 0
	if debris_root:
		for c in debris_root.get_children():
			if not c.is_queued_for_deletion():
				n += 1
	return n


func snapshot() -> Dictionary:
	var ped_list := []
	for p in peds:
		ped_list.append({
			"state": p.state_name(), "cop": p.is_cop, "tagged": p.tag_count,
			"x": snappedf(p.global_position.x, 0.01), "z": snappedf(p.global_position.z, 0.01)})
	var broken := 0
	for pr in props:
		if pr.broken:
			broken += 1
	return {
		"ready": true,
		"scene": "week1_block",
		"cash": cash,
		"heat": snappedf(heat, 0.01),
		"stars": stars(),
		"cool_left": snappedf(cool_left, 0.1),
		"in_car": player.in_car if player else false,
		"player": {"x": snappedf(player.global_position.x, 0.01), "z": snappedf(player.global_position.z, 0.01)} if player else {},
		"car": {"x": snappedf(car.global_position.x, 0.01), "z": snappedf(car.global_position.z, 0.01),
			"speed": snappedf(car.speed, 0.01), "heading": snappedf(car.rotation.y, 0.001)} if car else {},
		"shots": player.shots if player else 0,
		"props_total": props.size(),
		"props_broken": broken,
		"smashes": props_broken,
		"debris_live": debris_live(),
		"debris_spawned": debris_spawned,
		"debris_max_seen": debris_max_seen,
		"debris_cap": DEBRIS_CAP,
		"tags": tags,
		"break_ins": break_ins,
		"peds": ped_list,
		"prompt": prompt,
		"fps": Engine.get_frames_per_second(),
		"fps_text": fps_text,
		"touch_ui": touch.enabled if touch else false,
		"touch_events": touch.touch_events if touch else 0,
		"last_touch": [snappedf(touch.last_touch_pos.x, 0.1), snappedf(touch.last_touch_pos.y, 0.1), snappedf(touch.size.x, 0.1), snappedf(touch.size.y, 0.1)] if touch else [],
		"frames": Engine.get_process_frames(),
	}
