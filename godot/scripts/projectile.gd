class_name Projectile
extends Node3D
## A foam paint ball. Ray-cast each physics tick so a fast shot cannot pass through a thin target.

var vel := Vector3.ZERO
var life := 1.1
var shooter: RID


func _ready() -> void:
	Art.ball(self, 0.2, Vector3.ZERO, Art.PAINT)


func _physics_process(delta: float) -> void:
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	var from := global_position
	var to := from + vel * delta
	var ex: Array[RID] = [shooter]
	var q := PhysicsRayQueryParameters3D.create(from, to, 1 | 2 | 4, ex)
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	if hit.is_empty():
		global_position = to
		return
	var col = hit.collider
	if col is Pedestrian:
		col.tag("blaster", vel.normalized())
	elif col is Breakable:
		col.smash(vel.normalized(), "blaster")
	Art.paint_burst(GameState.fx_root, hit.position)
	queue_free()
