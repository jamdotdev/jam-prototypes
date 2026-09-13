"""Exercise shared zoom saves and old-client compatibility without touching live defaults."""
import copy
import pathlib
import tempfile

directory = pathlib.Path(__file__).resolve().parent.parent
scope = {"__file__": str(directory / "serve.py"), "__name__": "test_server"}
exec(compile((directory / "serve.py").read_text(), "serve.py", "exec"), scope)
with tempfile.TemporaryDirectory() as temporary:
    scope["DEFAULTS_PATH"] = pathlib.Path(temporary) / "defaults.js"
    scope["DEFAULTS_PATH"].write_text((directory / "playground-defaults-data.js").read_text())
    original = scope["read_defaults"]()
    camera = copy.deepcopy(original["groups"]["recording"])
    camera["cameraZoom"] = 2.25
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": camera}})
    assert saved["groups"]["recording"]["cameraZoom"] == 2.25
    assert scope["read_defaults"]() == saved
    assert saved["groups"]["welcome"] == original["groups"]["welcome"]
    legacy = copy.deepcopy(camera)
    del legacy["cameraZoom"]
    legacy["mirror"] = not legacy["mirror"]
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": legacy}})
    assert saved["groups"]["recording"]["cameraZoom"] == 2.25
    for invalid in (0, 3.1, True, "2", float("nan"), float("inf")):
        bad = {**camera, "cameraZoom": invalid}
        try:
            scope["update_defaults"]({"version": 1, "groups": {"recording": bad}})
        except ValueError:
            pass
        else:
            raise AssertionError(f"Accepted invalid zoom {invalid}")
    assert scope["read_defaults"]() == saved
    old = scope["with_player_settings"]("recording", legacy)
    assert old["cameraZoom"] == 1
print("PASS: zoom persists centrally, legacy clients preserve it, invalid saves are rejected, and other screens stay unchanged.")
