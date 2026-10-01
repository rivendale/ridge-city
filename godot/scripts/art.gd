class_name Art
extends RefCounted
## Flat-color, toon-lit, ink-outlined primitives. Every mesh in the prototype comes from here.

const INK := Color(0.09, 0.07, 0.16)
const OUTLINE := 0.07
const PAINT := Color(1.0, 0.31, 0.69)

static var _mats: Dictionary = {}
static var _ink: StandardMaterial3D
static var _blob: StandardMaterial3D


static func mat(color: Color) -> StandardMaterial3D:
	var key := color.to_html(true)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	m.roughness = 1.0
	if color.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_mats[key] = m
	return m


static func unshaded(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m


static func ink() -> StandardMaterial3D:
	if _ink == null:
		_ink = StandardMaterial3D.new()
		_ink.albedo_color = INK
		_ink.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_ink.cull_mode = BaseMaterial3D.CULL_FRONT
	return _ink


static func blob_mat() -> StandardMaterial3D:
	if _blob == null:
		var g := Gradient.new()
		g.set_color(0, Color(0, 0, 0, 0.42))
		g.set_color(1, Color(0, 0, 0, 0))
		var tex := GradientTexture2D.new()
		tex.gradient = g
		tex.fill = GradientTexture2D.FILL_RADIAL
		tex.fill_from = Vector2(0.5, 0.5)
		tex.fill_to = Vector2(0.5, 0.0)
		tex.width = 64
		tex.height = 64
		_blob = StandardMaterial3D.new()
		_blob.albedo_texture = tex
		_blob.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_blob.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return _blob


## Adds a mesh with an inverted-hull outline sized to its bounding box.
static func mesh(parent: Node3D, m: Mesh, pos: Vector3, color: Color, outline := true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = m
	mi.material_override = mat(color)
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	if outline:
		add_outline(mi)
	return mi


static func add_outline(mi: MeshInstance3D, t := OUTLINE) -> MeshInstance3D:
	var s := mi.mesh.get_aabb().size
	var o := MeshInstance3D.new()
	o.name = "Ink"
	o.mesh = mi.mesh
	o.material_override = ink()
	o.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	o.scale = Vector3(
		(s.x + 2.0 * t) / maxf(s.x, 0.01),
		(s.y + 2.0 * t) / maxf(s.y, 0.01),
		(s.z + 2.0 * t) / maxf(s.z, 0.01))
	mi.add_child(o)
	return o


static func box(parent: Node3D, size: Vector3, pos: Vector3, color: Color, outline := true) -> MeshInstance3D:
	var bm := BoxMesh.new()
	bm.size = size
	return mesh(parent, bm, pos, color, outline)


static func cyl(parent: Node3D, r_top: float, r_bot: float, h: float, pos: Vector3, color: Color, segs := 8, outline := true) -> MeshInstance3D:
	var cm := CylinderMesh.new()
	cm.top_radius = r_top
	cm.bottom_radius = r_bot
	cm.height = h
	cm.radial_segments = segs
	cm.rings = 1
	return mesh(parent, cm, pos, color, outline)


static func ball(parent: Node3D, r: float, pos: Vector3, color: Color, outline := true) -> MeshInstance3D:
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	sm.radial_segments = 8
	sm.rings = 4
	return mesh(parent, sm, pos, color, outline)


static func flat(parent: Node3D, size: Vector2, center: Vector3, color: Color) -> MeshInstance3D:
	var pm := PlaneMesh.new()
	pm.size = size
	return mesh(parent, pm, center, color, false)


static func blob(parent: Node3D, rx: float, rz := -1.0) -> MeshInstance3D:
	var pm := PlaneMesh.new()
	pm.size = Vector2(rx * 2.0, (rz if rz > 0.0 else rx) * 2.0)
	var mi := MeshInstance3D.new()
	mi.name = "Blob"
	mi.mesh = pm
	mi.material_override = blob_mat()
	mi.position = Vector3(0, 0.05, 0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi


static func static_box(parent: Node3D, size: Vector3, pos: Vector3, color: Color, outline := true) -> StaticBody3D:
	var sb := StaticBody3D.new()
	sb.collision_layer = 1
	sb.collision_mask = 0
	sb.position = pos
	parent.add_child(sb)
	box(sb, size, Vector3.ZERO, color, outline)
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	sb.add_child(cs)
	return sb


## A fountain of water from a smashed hydrant. Frees itself.
static func geyser(parent: Node3D, pos: Vector3) -> void:
	var p := CPUParticles3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.14
	sm.height = 0.28
	sm.radial_segments = 6
	sm.rings = 3
	sm.material = unshaded(Color(0.55, 0.85, 1.0))
	p.mesh = sm
	p.amount = 40
	p.lifetime = 1.1
	p.direction = Vector3.UP
	p.spread = 10.0
	p.initial_velocity_min = 7.0
	p.initial_velocity_max = 10.0
	p.scale_amount_min = 0.8
	p.scale_amount_max = 1.6
	p.position = pos + Vector3(0, 0.6, 0)
	parent.add_child(p)
	p.emitting = true
	var puddle := flat(parent, Vector2(3.2, 3.2), pos + Vector3(0, 0.035, 0), Color(0.55, 0.82, 1.0, 0.7))
	parent.get_tree().create_timer(4.5).timeout.connect(func() -> void:
		p.queue_free()
		puddle.queue_free())


## A short burst of foam paint where a blaster shot lands. Frees itself.
static func paint_burst(parent: Node3D, pos: Vector3) -> void:
	var p := CPUParticles3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.1
	sm.height = 0.2
	sm.radial_segments = 6
	sm.rings = 3
	sm.material = unshaded(PAINT)
	p.mesh = sm
	p.amount = 12
	p.lifetime = 0.5
	p.one_shot = true
	p.explosiveness = 1.0
	p.spread = 180.0
	p.initial_velocity_min = 2.0
	p.initial_velocity_max = 4.0
	p.position = pos
	parent.add_child(p)
	p.emitting = true
	parent.get_tree().create_timer(1.0).timeout.connect(p.queue_free)
