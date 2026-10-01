class_name Player
extends CharacterBody3D
## On foot: walk, fire the foam blaster (auto-aim on Space or the touch FIRE button, aim with the
## mouse on click), get in the car, break into the shop. In the car: the car reads input; ACT gets out.

const SPEED := 7.5
const CAR_RANGE := 4.0
const FIRE_COOLDOWN := 0.22
const SHOT_SPEED := 32.0
const AIM_RANGE := 20.0
const AIM_CONE := 0.5236  # 30 degrees

var in_car := false
var facing := Vector3(0, 0, -1)
var shots := 0
var _fire_cd := 0.0
var _visual: Node3D


func _ready() -> void:
	name = "Player"
	collision_layer = 4
	collision_mask = 1 | 2 | 8
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.38
	cap.height = 1.75
	cs.shape = cap
	cs.position.y = 0.875
	add_child(cs)

	_visual = Node3D.new()
	add_child(_visual)
	var jeans := Color(0.2, 0.32, 0.62)
	Art.box(_visual, Vector3(0.22, 0.8, 0.26), Vector3(-0.13, 0.4, 0), jeans)
	Art.box(_visual, Vector3(0.22, 0.8, 0.26), Vector3(0.13, 0.4, 0), jeans)
	Art.box(_visual, Vector3(0.64, 0.72, 0.38), Vector3(0, 1.15, 0), Color(1.0, 0.8, 0.2))
	Art.ball(_visual, 0.28, Vector3(0, 1.74, 0), Color(0.88, 0.66, 0.47))
	Art.box(_visual, Vector3(0.6, 0.14, 0.62), Vector3(0, 1.97, -0.04), Color(0.9, 0.22, 0.25))
	Art.box(_visual, Vector3(0.5, 0.05, 0.3), Vector3(0, 1.92, -0.38), Color(0.9, 0.22, 0.25), false)
	# The toy blaster: chunky orange body and a teal foam tank.
	Art.box(_visual, Vector3(0.18, 0.2, 0.75), Vector3(0.42, 1.1, -0.3), Color(1.0, 0.5, 0.12))
	Art.ball(_visual, 0.15, Vector3(0.42, 1.3, -0.15), Color(0.2, 0.85, 0.78))
	Art.blob(self, 0.55)


func _physics_process(delta: float) -> void:
	_fire_cd -= delta
	var act := GameState.act_just()
	if in_car:
		global_position = GameState.car.global_position
		if act:
			exit_car()
		_update_prompt()
		return
	var mv := GameState.move_vector()
	var dir := Vector3(mv.x, 0, mv.y)
	velocity = dir * SPEED
	move_and_slide()
	global_position.y = 0.0
	if dir.length() > 0.1:
		facing = dir.normalized()
	_visual.rotation.y = atan2(-facing.x, -facing.z)
	if act:
		_interact()
	if GameState.fire_held() and _fire_cd <= 0.0:
		fire_at(auto_aim_point())
	_update_prompt()


func _unhandled_input(event: InputEvent) -> void:
	if in_car:
		return
	var mb := event as InputEventMouseButton
	if mb == null or not mb.pressed or mb.button_index != MOUSE_BUTTON_LEFT:
		return
	if GameState.touch and GameState.touch.touched_recently():
		return
	if _fire_cd > 0.0:
		return
	var cam := get_viewport().get_camera_3d()
	var o := cam.project_ray_origin(mb.position)
	var n := cam.project_ray_normal(mb.position)
	var ex: Array[RID] = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(o, o + n * 300.0, 1 | 2 | 4, ex))
	var target := Vector3.ZERO
	if not hit.is_empty() and (hit.collider is Pedestrian or hit.collider is Breakable):
		target = hit.position
	else:
		var plane := Plane(Vector3.UP, 1.1)
		var p = plane.intersects_ray(o, n)
		if p == null:
			return
		target = p
	fire_at(target)


func fire_at(target: Vector3) -> void:
	_fire_cd = FIRE_COOLDOWN
	var muzzle := global_position + Vector3(0, 1.15, 0) + facing * 0.6
	var d := target - muzzle
	if d.length() < 0.5:
		d = facing
	d = d.normalized()
	var flat := Vector3(d.x, 0, d.z)
	if flat.length() > 0.05:
		facing = flat.normalized()
		_visual.rotation.y = atan2(-facing.x, -facing.z)
	var p := Projectile.new()
	p.vel = d * SHOT_SPEED
	p.shooter = get_rid()
	GameState.fx_root.add_child(p)
	p.global_position = muzzle
	shots += 1


## The nearest pedestrian or unbroken prop inside a 30-degree cone ahead, else straight ahead.
func auto_aim_point() -> Vector3:
	var best := global_position + facing * AIM_RANGE + Vector3(0, 1.15, 0)
	var best_score := INF
	var candidates: Array = []
	for ped in GameState.peds:
		if ped.dizzy_left <= 0.0:
			candidates.append(ped.global_position + Vector3(0, 1.0, 0))
	for prop in GameState.props:
		if not prop.broken:
			candidates.append(prop.global_position + Vector3(0, prop.height * 0.5, 0))
	for point in candidates:
		var to: Vector3 = point - global_position
		to.y = 0.0
		var dist := to.length()
		if dist > AIM_RANGE or dist < 0.3:
			continue
		var ang := facing.angle_to(to / dist)
		if ang > AIM_CONE:
			continue
		var score := dist * (1.0 + ang * 2.0)
		if score < best_score:
			best_score = score
			best = point
	return best


func _interact() -> void:
	if global_position.distance_to(GameState.car.global_position) < CAR_RANGE:
		enter_car()
		return
	for d in GameState.doors:
		if global_position.distance_to(d.global_position) < BreakInDoor.RANGE:
			d.try_break_in()
			return


func enter_car() -> void:
	in_car = true
	_visual.visible = false
	collision_layer = 0
	collision_mask = 0
	GameState.car.driver = self


func exit_car() -> void:
	var car := GameState.car
	in_car = false
	car.driver = null
	var spot := car.global_position - car.global_transform.basis.x * 2.4
	spot.y = 0.0
	global_position = spot
	facing = -car.global_transform.basis.z
	_visual.visible = true
	collision_layer = 4
	collision_mask = 1 | 2 | 8


func _update_prompt() -> void:
	var k := GameState.key_label()
	var p := ""
	var s := "ACT"
	if in_car:
		p = "%s: get out    %s: handbrake" % [k, "BRAKE" if k == "ACT" else "Space"]
		s = "EXIT"
	elif global_position.distance_to(GameState.car.global_position) < CAR_RANGE:
		p = "%s: drive" % k
		s = "DRIVE"
	else:
		for d in GameState.doors:
			if global_position.distance_to(d.global_position) < BreakInDoor.RANGE:
				if d.can_break_in():
					p = "%s: break in ($%d)" % [k, BreakInDoor.PAYOUT]
					s = "BREAK IN"
				else:
					p = "Cleaned out. The till refills in %ds" % ceili(d.relock_left)
	GameState.prompt = p
	GameState.prompt_short = s
