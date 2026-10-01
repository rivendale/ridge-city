class_name Breakable
extends StaticBody3D
## A prop that smashes into capped debris when the car rams it or a blaster shot lands. Raises heat.

const RED := Color(0.9, 0.2, 0.2)
const ORANGE := Color(1.0, 0.5, 0.12)
const WHITE := Color(0.97, 0.96, 0.94)
const WOOD := Color(0.62, 0.42, 0.24)
const GLASS := Color(0.62, 0.86, 1.0, 0.55)

var kind := "cone"
var broken := false
var height := 1.0
var _colors: Array = []
var _count := 4
var _piece := 0.3


func setup(k: String) -> void:
	kind = k
	name = "Prop_%s" % k
	collision_layer = 2
	collision_mask = 0
	var sh := BoxShape3D.new()
	match kind:
		"hydrant":
			Art.cyl(self, 0.26, 0.3, 0.85, Vector3(0, 0.425, 0), RED)
			Art.cyl(self, 0.12, 0.33, 0.25, Vector3(0, 0.97, 0), Color(0.75, 0.12, 0.15))
			Art.box(self, Vector3(0.8, 0.16, 0.16), Vector3(0, 0.6, 0), RED)
			sh.size = Vector3(0.7, 1.1, 0.7)
			_colors = [RED, Color(0.75, 0.12, 0.15), Color(0.8, 0.8, 0.85)]
			_count = 5
			_piece = 0.24
			Art.blob(self, 0.55)
		"fruit_stand":
			Art.box(self, Vector3(2.2, 0.16, 1.2), Vector3(0, 0.9, 0), WOOD)
			for lx in [-1.0, 1.0]:
				for lz in [-0.5, 0.5]:
					Art.box(self, Vector3(0.12, 0.9, 0.12), Vector3(lx, 0.45, lz), WOOD, false)
					Art.box(self, Vector3(0.08, 1.2, 0.08), Vector3(lx, 1.55, lz), WHITE, false)
			var fruit := [ORANGE, Color(0.45, 0.8, 0.25), RED, Color(1, 0.85, 0.2)]
			for i in 8:
				Art.ball(self, 0.17, Vector3(-0.85 + (i % 4) * 0.56, 1.13, -0.25 + (i / 4) * 0.5), fruit[i % 4], false)
			for s in 6:
				Art.box(self, Vector3(0.42, 0.1, 1.5), Vector3(-1.05 + s * 0.42, 2.18, 0), RED if s % 2 == 0 else WHITE, s == 0)
			sh.size = Vector3(2.2, 2.2, 1.2)
			_colors = [WOOD, ORANGE, Color(0.45, 0.8, 0.25), RED, WHITE]
			_count = 10
			_piece = 0.3
			Art.blob(self, 1.4, 0.9)
		"glass":
			Art.box(self, Vector3(2.0, 1.7, 0.08), Vector3(0, 1.15, 0), GLASS, false)
			Art.box(self, Vector3(2.1, 0.12, 0.14), Vector3(0, 2.05, 0), Color(0.3, 0.32, 0.4))
			Art.box(self, Vector3(2.1, 0.12, 0.14), Vector3(0, 0.27, 0), Color(0.3, 0.32, 0.4))
			for x in [-1.0, 1.0]:
				Art.box(self, Vector3(0.1, 2.1, 0.12), Vector3(x, 1.05, 0), Color(0.3, 0.32, 0.4))
			sh.size = Vector3(2.1, 2.1, 0.3)
			_colors = [GLASS, Color(0.8, 0.95, 1.0, 0.7), Color(0.3, 0.32, 0.4)]
			_count = 8
			_piece = 0.26
			Art.blob(self, 1.1, 0.3)
		_:
			Art.box(self, Vector3(0.6, 0.06, 0.6), Vector3(0, 0.03, 0), ORANGE)
			Art.cyl(self, 0.03, 0.27, 0.75, Vector3(0, 0.43, 0), ORANGE)
			Art.cyl(self, 0.13, 0.17, 0.14, Vector3(0, 0.5, 0), WHITE, 8, false)
			sh.size = Vector3(0.6, 0.85, 0.6)
			_colors = [ORANGE, WHITE]
			_count = 3
			_piece = 0.22
			Art.blob(self, 0.45)
	height = sh.size.y
	var cs := CollisionShape3D.new()
	cs.shape = sh
	cs.position.y = sh.size.y * 0.5
	add_child(cs)


func smash(push: Vector3, by: String) -> void:
	if broken:
		return
	broken = true
	collision_layer = 0
	visible = false
	GameState.spawn_debris(global_position + Vector3(0, height * 0.6, 0), _colors, _count, _piece, push)
	if kind == "hydrant":
		Art.geyser(GameState.fx_root, global_position)
	GameState.on_smash(self, by)
