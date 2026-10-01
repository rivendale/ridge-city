class_name Car
extends CharacterBody3D
## Arcade handling: throttle and brake on one axis, steering that tightens at low speed, a grip
## blend that lets the tail slide, and a handbrake that loosens grip. Rams props, bumps pedestrians.

const MAX_SPEED := 24.0
const MAX_REVERSE := 8.0
const ACCEL := 16.0
const BRAKE := 32.0
const DRAG := 5.0
const TURN := 2.6
const GRIP := 9.0
const HANDBRAKE_GRIP := 2.5
const SMASH_SPEED := 2.5
const BUMP_SPEED := 3.0

var driver: Player
var speed := 0.0
var _bumper: Area3D
var _front_wheels: Array[Node3D] = []


func _ready() -> void:
	name = "Car"
	collision_layer = 8
	collision_mask = 1 | 2
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = Vector3(2.0, 1.2, 4.0)
	cs.shape = sh
	cs.position.y = 0.7
	add_child(cs)

	_bumper = Area3D.new()
	_bumper.collision_layer = 0
	_bumper.collision_mask = 4
	var bcs := CollisionShape3D.new()
	var bsh := BoxShape3D.new()
	bsh.size = Vector3(2.5, 1.6, 4.6)
	bcs.shape = bsh
	bcs.position.y = 0.8
	_bumper.add_child(bcs)
	add_child(_bumper)

	var orange := Color(1.0, 0.52, 0.12)
	Art.box(self, Vector3(2.0, 0.7, 4.0), Vector3(0, 0.62, 0), orange)
	Art.box(self, Vector3(1.7, 0.62, 2.0), Vector3(0, 1.28, 0.35), orange)
	Art.box(self, Vector3(1.5, 0.45, 0.06), Vector3(0, 1.3, -0.68), Color(0.2, 0.28, 0.5), false)
	Art.box(self, Vector3(0.06, 0.42, 1.6), Vector3(0.86, 1.3, 0.35), Color(0.2, 0.28, 0.5), false)
	Art.box(self, Vector3(0.06, 0.42, 1.6), Vector3(-0.86, 1.3, 0.35), Color(0.2, 0.28, 0.5), false)
	Art.box(self, Vector3(0.36, 0.04, 4.02), Vector3(0, 0.98, 0), Color(0.12, 0.1, 0.18), false)
	Art.box(self, Vector3(0.36, 0.04, 2.02), Vector3(0, 1.6, 0.35), Color(0.12, 0.1, 0.18), false)
	Art.box(self, Vector3(0.4, 0.2, 0.06), Vector3(0.65, 0.7, -2.02), Color(1, 0.95, 0.6), false)
	Art.box(self, Vector3(0.4, 0.2, 0.06), Vector3(-0.65, 0.7, -2.02), Color(1, 0.95, 0.6), false)
	Art.box(self, Vector3(0.4, 0.18, 0.06), Vector3(0.65, 0.7, 2.02), Color(0.9, 0.15, 0.2), false)
	Art.box(self, Vector3(0.4, 0.18, 0.06), Vector3(-0.65, 0.7, 2.02), Color(0.9, 0.15, 0.2), false)
	for wx in [-1.0, 1.0]:
		for wz in [-1.3, 1.3]:
			var pivot := Node3D.new()
			pivot.position = Vector3(wx, 0.38, wz)
			add_child(pivot)
			var w := Art.cyl(pivot, 0.38, 0.38, 0.32, Vector3.ZERO, Color(0.13, 0.12, 0.16), 10)
			w.rotation.z = PI * 0.5
			if wz < 0.0:
				_front_wheels.append(pivot)
	Art.blob(self, 1.4, 2.5)


func _physics_process(delta: float) -> void:
	var steer := 0.0
	var throttle := 0.0
	var hb := false
	if driver:
		var mv := GameState.move_vector()
		steer = -mv.x
		throttle = -mv.y
		hb = GameState.fire_held()
	if throttle > 0.05:
		speed += (BRAKE if speed < 0.0 else ACCEL) * throttle * delta
	elif throttle < -0.05:
		speed -= (BRAKE if speed > 0.0 else ACCEL * 0.7) * -throttle * delta
	else:
		speed = move_toward(speed, 0.0, DRAG * delta)
	if hb:
		speed = move_toward(speed, 0.0, 14.0 * delta)
	speed = clampf(speed, -MAX_REVERSE, MAX_SPEED)

	var turn := steer * TURN * clampf(absf(speed) / 4.0, 0.0, 1.0) * lerpf(1.0, 0.55, absf(speed) / MAX_SPEED)
	if speed < 0.0:
		turn = -turn
	rotate_y(turn * delta)
	var fwd := -global_transform.basis.z
	var flat := Vector3(velocity.x, 0, velocity.z)
	flat = flat.lerp(fwd * speed, clampf((HANDBRAKE_GRIP if hb else GRIP) * delta, 0.0, 1.0))
	velocity = flat
	var pre := velocity
	move_and_slide()
	var smashed := false
	var hit_wall := false
	for i in get_slide_collision_count():
		var col = get_slide_collision(i).get_collider()
		if col is Breakable and pre.length() > SMASH_SPEED:
			col.smash(pre, "car")
			smashed = true
		else:
			hit_wall = true
	if smashed and not hit_wall:
		velocity = pre * 0.9
		speed *= 0.9
	elif hit_wall:
		speed = velocity.dot(fwd)
	global_position.y = 0.0

	if absf(speed) > BUMP_SPEED:
		for b in _bumper.get_overlapping_bodies():
			if b is Pedestrian and b.dizzy_left <= 0.0:
				b.tag("car", pre.normalized())
	for w in _front_wheels:
		w.rotation.y = lerpf(w.rotation.y, steer * 0.45, 0.3)
