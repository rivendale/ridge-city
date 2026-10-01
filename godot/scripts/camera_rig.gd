extends Camera3D
## High three-quarter chase view with a fixed heading. Pulls back and leads with the car's speed.

const OFFSET := Vector3(0, 25.0, 21.0)


func _ready() -> void:
	fov = 50.0
	near = 0.5
	far = 300.0
	rotation_degrees = Vector3(-50.0, 0, 0)
	current = true


func desired() -> Vector3:
	var p := GameState.player
	var target := p.global_position
	var pull := 1.0
	if p.in_car:
		var car := GameState.car
		var k := clampf(absf(car.speed) / Car.MAX_SPEED, 0.0, 1.0)
		pull += k * 0.45
		target += -car.global_transform.basis.z * car.speed * 0.25
	return target + OFFSET * pull


func snap() -> void:
	global_position = desired()


func _process(delta: float) -> void:
	if GameState.player == null:
		return
	global_position = global_position.lerp(desired(), 1.0 - exp(-5.0 * delta))
