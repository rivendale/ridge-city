class_name BreakInDoor
extends Node3D
## The corner shop's front door. Breaking in swings it open (you can walk inside) and pays cash.
## The till refills after RELOCK seconds, so a second break-in pays again.

const PAYOUT := 150
const RELOCK := 45.0
const RANGE := 2.8

var relock_left := 0.0
var pivot: Node3D


func can_break_in() -> bool:
	return relock_left <= 0.0


func try_break_in() -> bool:
	if not can_break_in():
		GameState.toast("CLEANED OUT", Color(0.8, 0.8, 0.85))
		return false
	relock_left = RELOCK
	if pivot:
		create_tween().tween_property(pivot, "rotation:y", deg_to_rad(100.0), 0.35)
	GameState.on_break_in(PAYOUT)
	return true


func _process(delta: float) -> void:
	if relock_left > 0.0:
		relock_left = maxf(0.0, relock_left - delta)
