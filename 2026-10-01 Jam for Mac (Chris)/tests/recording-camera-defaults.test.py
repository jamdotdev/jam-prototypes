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
    for color in ("#abc", "#1234", "#12345678", "transparent", "rgb(10 20 30 / .5)",
                  "rgba(1, 2, 3, .5)", "hsl(.25turn 50% 50%)", "oklch(.5 .2 90)",
                  "color(display-p3 .1 .2 .3)"):
        for key in ("placeholderColor", "placeholderContrastColor", "placeholderContrastHoverColor", "placeholderContrastActiveColor", "placeholderContrastEdgeColor", "placeholderOverlayColor"):
            assert scope["validate_default_values"]("recording", {**camera, key: color}), (key, color)
    assert saved["groups"]["welcome"] == original["groups"]["welcome"]
    for increase in (0, .5, 1, 4):
        assert scope["validate_default_values"]("recording", {**camera, "placeholderActiveStroke": increase})
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
    tuned = {**camera, "followShrink": 22, "placeholderTargetScale": 1.23, "placeholderOtherOpacity": 38}
    scope["update_defaults"]({"version": 1, "groups": {"recording": tuned}})
    old_client = {k: v for k, v in tuned.items() if k not in ("followShrink", "placeholderTargetScale", "placeholderOtherOpacity")}
    assert scope["update_defaults"]({"version": 1, "groups": {"recording": old_client}})["groups"]["recording"] == tuned
    for key, low, high in (("followShrink",0,30),("placeholderTargetScale",1,1.3),("placeholderOtherOpacity",0,100)):
        for valid in (low,high):
            assert scope["validate_default_values"]("recording",{**tuned,key:valid})
        for invalid in (low-1,high+1,True,float("nan")):
            assert not scope["validate_default_values"]("recording",{**tuned,key:invalid})
    placeholder = {key: value for key, value in camera.items() if key.startswith("placeholder")}
    assert placeholder["placeholderPinContrast"] is True
    styled = {**camera, "placeholderColor": "#ff8833", "placeholderContrastColor": "#445566",
              "placeholderContrastActiveColor": "#112233", "placeholderContrastEdgeColor": "hsl(40 80% 90%)", "placeholderActiveStroke": 2.5, "placeholderDash": 8, "placeholderGap": 12,
              "placeholderOverlayColor": "rgb(20 30 40 / 80%)", "placeholderOverlayOpacity": 45}
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": styled}})
    assert saved["groups"]["recording"] == styled
    legacy_stroke = {key: value for key, value in styled.items() if key != "placeholderActiveStroke"}
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": legacy_stroke}})
    assert saved["groups"]["recording"] == styled, "Older previews preserve the active stroke increase"
    assert scope["with_player_settings"]("recording", legacy_stroke)["placeholderActiveStroke"] == 1
    hover = {**styled, "placeholderContrastHoverColor": "rgba(20, 30, 40, .65)"}
    scope["update_defaults"]({"version": 1, "groups": {"recording": hover}})
    old_client = {key: value for key, value in hover.items() if key != "placeholderContrastHoverColor"}
    assert scope["update_defaults"]({"version": 1, "groups": {"recording": old_client}})["groups"]["recording"] == hover
    scope["update_defaults"]({"version": 1, "groups": {"recording": styled}})
    legacy_colors = {key: value for key, value in styled.items() if not key.startswith("placeholderContrast")}
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": legacy_colors}})
    assert saved["groups"]["recording"] == styled, "Older previews preserve tuned contrast colors"
    migrated = scope["with_player_settings"]("recording", legacy_colors)
    assert migrated["placeholderContrastColor"] == "rgba(0, 0, 0, 0.45)"
    assert migrated["placeholderContrastActiveColor"] == "#000000"
    assert migrated["placeholderContrastEdgeColor"] == "#ffffff"
    legacy = {key: value for key, value in styled.items() if not key.startswith("placeholder")}
    saved = scope["update_defaults"]({"version": 1, "groups": {"recording": legacy}})
    assert saved["groups"]["recording"] == styled
    for key, invalid in (("placeholderStroke", 0), ("placeholderActiveStroke", -1), ("placeholderActiveStroke", 4.5),
                         ("placeholderActiveStroke", True), ("placeholderActiveStroke", "1"), ("placeholderActiveStroke", float("nan")),
                         ("placeholderGap", 0), ("placeholderDash", 30),
                         ("placeholderOpacity", 101), ("placeholderOverlayOpacity", 81), ("placeholderPinContrast", 1),
                         ("placeholderColor", "url(https://example.com)"), ("placeholderOverlayColor", "var(--color)"),
                         ("placeholderContrastColor", "url(https://example.com)"), ("placeholderContrastActiveColor", "var(--color)"),
                         ("placeholderContrastEdgeColor", "not a color"), ("placeholderContrastEdgeColor", 1)):
        try:
            scope["update_defaults"]({"version": 1, "groups": {"recording": {**styled, key: invalid}}})
        except ValueError:
            pass
        else:
            raise AssertionError(f"Accepted invalid placeholder setting {key}: {invalid}")
    assert scope["read_defaults"]() == saved
print("PASS: zoom and placeholder styles persist centrally, picker formats save, legacy clients preserve settings, invalid saves are rejected, and other screens stay unchanged.")
