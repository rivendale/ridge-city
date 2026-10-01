class_name Pedestrian
extends CharacterBody3D
## Walks a sidewalk loop. When tagged by foam or bumped by the car, sits down dizzy for 3 s with
## stars circling, then stands up and walks on. Nobody is ever hurt.

const DIZZY_TIME := 3.0

var is_cop := false
var path: PackedVector3Array = PackedVector3Array()
var path_i := 0
var speed := 1.6
var dizzy_left := 0.0
var frozen := false
var tag_count := 0

var _visual: Node3D
var _legs: Node3D
var _shirt: MeshInstance3D
var _shirt_color: Color
var _stars: Node3D
var _walk_t := 0.0


func setup(cop: bool, shirt: Color, skin: Color, pts: PackedVector3Array, start: int) -> void:
	is_cop = cop
	path = pts
	speed = 2.0 if cop else 1.6
	_shirt_color = shirt
	name = "Cop" if cop else "Pedestrian"
	collision_layer = 4
	collision_mask = 1
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	position = pts[start]
	path_i = (start + 1) % pts.size()

	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.38
	cap.height = 1.75
	cs.shape = cap
	cs.position.y = 0.875
	add_child(cs)

	_visual = Node3D.new()
	add_child(_visual)
	_legs = Node3D.new()
	_legs.position.y = 0.8
	_visual.add_child(_legs)
	var pants := Color(0.17, 0.2, 0.35) if cop else Color(0.25, 0.3, 0.45)
	Art.box(_legs, Vector3(0.22, 0.8, 0.26), Vector3(-0.13, -0.4, 0), pants)
	Art.box(_legs, Vector3(0.22, 0.8, 0.26), Vector3(0.13, -0.4, 0), pants)
	_shirt = Art.box(_visual, Vector3(0.62, 0.7, 0.36), Vector3(0, 1.15, 0), shirt)
	_shirt.material_override = Art.mat(shirt)
	Art.ball(_visual, 0.27, Vector3(0, 1.72, 0), skin)
	if cop:
		Art.box(_visual, Vector3(0.6, 0.14, 0.6), Vector3(0, 1.97, 0), Color(0.12, 0.15, 0.3))
		Art.box(_visual, Vector3(0.14, 0.14, 0.05), Vector3(0.15, 1.3, -0.19), Color(1, 0.85, 0.2), false)
	Art.blob(self, 0.5)

	_stars = Node3D.new()
	_stars.position.y = 2.25
	_stars.visible = false
	_visual.add_child(_stars)
	for i in 3:
		var a := i * TAU / 3.0
		var s := Art.box(_stars, Vector3(0.18, 0.18, 0.18), Vector3(cos(a) * 0.42, 0, sin(a) * 0.42), Color(1, 0.88, 0.2))
		s.rotation = Vector3(0.6, 0.0, 0.785)


func _physics_process(delta: float) -> void:
	if dizzy_left > 0.0:
		dizzy_left -= delta
		_stars.rotate_y(delta * 6.0)
		if dizzy_left <= 0.0:
			_stand()
		return
	if frozen or path.is_empty():
		return
	var to := path[path_i] - global_position
	to.y = 0.0
	if to.length() < 0.5:
		path_i = (path_i + 1) % path.size()
		return
	var dir := to.normalized()
	velocity = dir * speed
	move_and_slide()
	_visual.rotation.y = atan2(-dir.x, -dir.z)
	_walk_t += delta * 8.0
	_visual.position.y = absf(sin(_walk_t)) * 0.06


func tag(by: String, _hit_dir: Vector3) -> void:
	if dizzy_left > 0.0:
		return
	tag_count += 1
	dizzy_left = DIZZY_TIME
	_visual.position.y = -0.62
	_legs.rotation.x = PI * 0.5
	_visual.rotation.x = -0.18
	_stars.visible = true
	if by == "blaster":
		_shirt.material_override = Art.mat(Art.PAINT)
	GameState.on_tag(self, by)


func _stand() -> void:
	dizzy_left = 0.0
	_visual.position.y = 0.0
	_visual.rotation.x = 0.0
	_legs.rotation.x = 0.0
	_stars.visible = false
	_shirt.material_override = Art.mat(_shirt_color)


func state_name() -> String:
	if dizzy_left > 0.0:
		return "dizzy"
	return "standing" if frozen else "walking"
