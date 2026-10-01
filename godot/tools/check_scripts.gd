extends SceneTree
# tools/check_scripts.gd: compiles every .gd outside addons/, with autoloads registered.
# From rivendale/opensource engines/godot.md. Run: godot --headless --path godot --script res://tools/check_scripts.gd
var checked := 0
var failed := 0

func _initialize() -> void:
	_walk("res://")
	print("checked %d scripts, %d failed" % [checked, failed])
	quit(1 if failed > 0 or checked == 0 else 0)

func _walk(dir: String) -> void:
	for sub in DirAccess.get_directories_at(dir):
		if sub != "addons" and not sub.begins_with("."):
			_walk(dir.path_join(sub))
	for file in DirAccess.get_files_at(dir):
		if file.ends_with(".gd"):
			checked += 1
			var script := load(dir.path_join(file)) as Script
			if script == null or not script.can_instantiate():
				failed += 1
				printerr("FAIL ", dir.path_join(file))
