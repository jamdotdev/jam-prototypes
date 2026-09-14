"""Serve the local playground with byte ranges for immediate video seeking."""

import os
import re
import json
import math
import tempfile
import plistlib
import secrets
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit


AUTH_TTL = 600
AUTH_SESSIONS = {}
AUTH_LOCK = threading.Lock()
SESSION_PATTERN = re.compile(r"^[a-f0-9]{48}$")
DEFAULTS_PATH = Path(__file__).resolve().parent / "playground-defaults-data.js"
DEFAULTS_LOCK = threading.Lock()
DEFAULTS_PREFIX = "window.JamDefaultValues = "
PLAYBACK_RATES = (0.5, 0.75, 1, 1.5, 2)


def invalid_json_constant(value):
    raise ValueError("Non-finite numbers are not valid defaults")


def with_player_settings(group, value, fallback=None):
    """Fill only the fields added with the shared Player, retaining saved values."""
    if group == "recording" and isinstance(value, dict):
        fallback = fallback or {}
        added = {"placeholderContrastColor": "rgba(0, 0, 0, 0.45)", "placeholderContrastHoverColor": "rgba(0, 0, 0, 0.65)", "placeholderContrastActiveColor": "#000000", "placeholderContrastEdgeColor": "#ffffff",
                 "placeholderPinContrast": True, "placeholderColor": "#ffffff", "placeholderStroke": 1, "placeholderActiveStroke": 1, "placeholderDash": 4, "placeholderGap": 8,
                 "placeholderOpacity": 50, "placeholderActiveOpacity": 100,
                 "placeholderOverlayColor": "#000000", "placeholderOverlayOpacity": 32,
                 "cameraZoom": 1, "cameraMinSize": 12, "cameraMaxSize": 240, "warningSeconds": 10, "pulseStart": 1000, "pulseEnd": 350, "pulseStrength": 4}
        return {**{key: fallback.get(key, default) for key, default in added.items()}, **value}
    if group in ("handoff", "permissions") and isinstance(value, dict):
        fallback = fallback or {}
        return {"rate": fallback.get("rate", 1), "loop": fallback.get("loop", False), **value}
    return value


def read_defaults():
    source = DEFAULTS_PATH.read_text(encoding="utf-8").strip()
    if not source.startswith(DEFAULTS_PREFIX) or not source.endswith(";"):
        raise ValueError("Invalid defaults data file")
    data = json.loads(source[len(DEFAULTS_PREFIX):-1], parse_constant=invalid_json_constant)
    if (not isinstance(data, dict) or data.get("version") != 1 or
            type(data.get("revision")) is not int or data["revision"] < 0 or
            not isinstance(data.get("groups"), dict)):
        raise ValueError("Invalid defaults document")
    groups = data["groups"]
    if "handoff" in groups:
        groups["handoff"] = with_player_settings("handoff", groups["handoff"])
    groups["permissions"] = with_player_settings("permissions", groups.get("permissions", {}))
    if "recording" in groups:
        groups["recording"] = with_player_settings("recording", groups["recording"])
    return data


def validate_default_shape(value, template):
    """Keep saved settings inside the small JSON schema of the checked-in file."""
    if isinstance(template, dict):
        return (isinstance(value, dict) and value.keys() == template.keys() and
                all(validate_default_shape(value[key], item) for key, item in template.items()))
    if isinstance(template, list):
        return (isinstance(value, list) and len(value) == len(template) and
                all(validate_default_shape(item, sample) for item, sample in zip(value, template)))
    if isinstance(template, bool):
        return isinstance(value, bool)
    if isinstance(template, (int, float)):
        return type(value) in (int, float) and math.isfinite(value)
    if isinstance(template, str):
        return isinstance(value, str) and len(value) <= 64
    return False


def validate_default_values(group, value):
    def between(number, low, high):
        return low <= number <= high

    def valid_rate(number):
        return type(number) in (int, float) and number in PLAYBACK_RATES

    def valid_color(color):
        # Self-contained colors supported by the DialKit picker, never URLs or variables.
        if not isinstance(color, str) or len(color) > 64:
            return False
        color = color.strip().lower()
        if color == "transparent" or re.fullmatch(r"#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})", color):
            return True
        match = re.fullmatch(r"(rgb|rgba|hsl|hsla|oklch|color)\(([^()]*)\)", color)
        if not match:
            return False
        kind, body = match.groups()
        if kind == "color":
            if not body.startswith("display-p3 "):
                return False
            body = body[11:]
        parts = re.split(r"[,/\s]+", body.strip())
        if len(parts) not in (3, 4):
            return False
        number = r"[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?"
        for index, part in enumerate(parts):
            hue = (index == 0 and kind.startswith("hsl")) or (index == 2 and kind == "oklch")
            unit = r"(?:deg|grad|rad|turn)?" if hue else r"%?"
            if not re.fullmatch(number + unit, part) or not math.isfinite(float(re.match(number, part).group())):
                return False
        return True

    if group == "welcome":
        bounds = {"stagger": (0, 90), "turn": (0, 120), "drift": (0, 5), "depth": (0, 60),
                  "orbit": (70, 115), "gridAmount": (0, 20), "gridSoftness": (20, 100),
                  "hDelay": (0, 1200), "hDuration": (100, 2400), "hOpacity": (0, 100),
                  "vDelay": (-1600, 1600), "vDuration": (100, 2400), "vOpacity": (0, 100)}
        return (all(between(value["settings"][key], *limits) for key, limits in bounds.items()) and
                value["settings"]["gridStyle"] in ("wave", "diffusion", "magnetize", "twist") and
                valid_rate(value["rate"]))
    if group == "handoff":
        bounds = {"wiggleDelay": (0, 1500), "wiggle": (100, 600), "fan": (20, 180),
                  "glide": (600, 2400), "arc": (40, 160)}
        return (all(between(value["settings"][key], *limits) for key, limits in bounds.items()) and
                all(between(value["easing"][index], 0, 1) for index in (0, 2)) and
                all(between(number, -3, 3) for number in value["easing"]) and
                value["browserMode"] in ("auto", "popup") and valid_rate(value["rate"]))
    if group == "permissions":
        return valid_rate(value["rate"])
    if group == "grid":
        return (value["effect"] in value["effects"] and between(value["fill"], 0, 30) and
                all(between(effect["strength"], 0, 100) and between(effect["radius"], 40, 240) and
                    between(effect["speed"], 0.2, 2) for effect in value["effects"].values()))
    if group == "onboarding":
        return value["lensZoom"] in (1.5, 2, 3, 4) and between(value["lensSize"], 88, 176)
    if group == "recording":
        bounds = {"placeholderStroke": (.5, 4), "placeholderActiveStroke": (0, 4), "placeholderDash": (1, 16), "placeholderGap": (1, 24),
                  "placeholderOpacity": (0, 100), "placeholderActiveOpacity": (0, 100), "placeholderOverlayOpacity": (0, 80),
                  "cameraZoom": (1, 3), "cameraSize": (12, 480), "cameraMinSize": (12, 480), "cameraMaxSize": (12, 480), "followSize": (12, 160), "gap": (8, 64),
                  "stiffness": (80, 500), "damping": (10, 50), "anticipation": (0, 100),
                  "beltSpring": (80, 500), "beltDamping": (10, 50),
                  "warningSeconds": (5, 30), "pulseStart": (600, 1600), "pulseEnd": (350, 600), "pulseStrength": (0, 8)}
        flags = ("placeholderPinContrast", "camera", "microphone", "followCursor", "mirror", "showBounds", "loop")
        return (value["cameraMinSize"] <= value["cameraSize"] <= value["cameraMaxSize"] and
                all(valid_color(value[key]) for key in ("placeholderColor", "placeholderContrastColor", "placeholderContrastHoverColor", "placeholderContrastActiveColor", "placeholderContrastEdgeColor", "placeholderOverlayColor")) and
                value["mode"] in ("screen", "window", "area") and
                isinstance(value["cameraDevice"], str) and 0 < len(value["cameraDevice"]) <= 64 and
                value["microphoneDevice"] in ("MacBook", "AirPods Pro 3", "ZoomAudioDevice", "BoseQC Ultra Headphones", "Mac Studio Display Microphone") and
                all(type(value[key]) is bool for key in flags) and
                all(type(value[key]) in (int, float) and math.isfinite(value[key]) and
                    between(value[key], *limits) for key, limits in bounds.items()) and
                valid_rate(value["rate"]))
    if group == "draft":
        return (value["connection"] in ("connected", "offline") and value["preview"] in ("video", "figma") and
                between(value["handleResponse"], 80, 500) and between(value["springiness"], 0, 100) and
                value["playbackSpeed"] in (0.5, 1, 1.5, 2) and
                0 <= value["trimStart"] < value["trimEnd"] <= 1)
    return False


def update_defaults(patch):
    """Merge under one lock and replace atomically so separate screens retain each other."""
    if (set(patch) != {"version", "groups"} or patch.get("version") != 1 or
            not isinstance(patch.get("groups"), dict) or not patch["groups"]):
        raise ValueError("Invalid defaults request")
    with DEFAULTS_LOCK:
        current = read_defaults()
        updates = {}
        for group, value in patch["groups"].items():
            if group not in current["groups"]:
                raise ValueError("Invalid defaults settings")
            # Preserve player settings when an older client saves without those fields.
            template = current["groups"][group]
            value = with_player_settings(group, value, template)
            if not validate_default_shape(value, template) or not validate_default_values(group, value):
                raise ValueError("Invalid defaults settings")
            updates[group] = value
        current["groups"].update(updates)
        current["revision"] += 1
        content = DEFAULTS_PREFIX + json.dumps(current, indent=2, allow_nan=False) + ";\n"
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=DEFAULTS_PATH.parent,
                                             prefix=".playground-defaults-", suffix=".tmp", delete=False) as output:
                temporary = Path(output.name)
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
            os.chmod(temporary, DEFAULTS_PATH.stat().st_mode & 0o777)
            os.replace(temporary, DEFAULTS_PATH)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        return current


def launch_default_browser(url):
    """Only called with an internally built, loopback prototype URL."""
    if sys.platform != "darwin":
        return False
    command = ["/usr/bin/open", url]
    # Chromium accepts --new-window even when handing off to its existing process.
    # Other defaults use the user's normal OS browser-opening preference.
    try:
        exported = subprocess.run(
            ["/usr/bin/defaults", "export", "com.apple.LaunchServices/com.apple.launchservices.secure", "-"],
            capture_output=True, timeout=2, check=True,
        )
        handlers = plistlib.loads(exported.stdout).get("LSHandlers", [])
        browser = next((item.get("LSHandlerRoleAll", "").lower() for item in handlers
                        if item.get("LSHandlerURLScheme") == "https"), "")
        chromium = {"com.google.chrome": "com.google.Chrome", "com.microsoft.edgemac": "com.microsoft.edgemac",
                    "com.brave.browser": "com.brave.Browser", "company.thebrowser.browser": "company.thebrowser.Browser",
                    "company.thebrowser.dia": "company.thebrowser.dia"}
        if browser in chromium:
            command = ["/usr/bin/open", "-n", "-b", chromium[browser], "--args", "--new-window", url]
    except (OSError, subprocess.SubprocessError, ValueError, plistlib.InvalidFileException):
        pass
    try:
        return subprocess.run(command, capture_output=True, timeout=5).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def active_session(token):
    now = time.monotonic()
    with AUTH_LOCK:
        for key in list(AUTH_SESSIONS):
            if AUTH_SESSIONS[key]["expires"] <= now:
                del AUTH_SESSIONS[key]
        return AUTH_SESSIONS.get(token)


class PlaygroundHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).resolve().parent), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def loopback_origin(self):
        host = self.headers.get("Host", "")
        try:
            parsed = urlsplit("http://" + host)
            if (parsed.hostname not in ("127.0.0.1", "localhost", "::1") or
                    parsed.port != self.server.server_port or parsed.username or parsed.password or
                    parsed.path or parsed.query or parsed.fragment):
                return None
        except ValueError:
            return None
        return "http://" + host

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == "/__prototype/defaults":
            if not self.loopback_origin():
                return self.send_json(403, {"error": "Invalid local host"})
            try:
                with DEFAULTS_LOCK:
                    return self.send_json(200, read_defaults())
            except (OSError, ValueError):
                return self.send_json(500, {"error": "The shared defaults file could not be read"})
        if not parsed.path.startswith("/prototype-auth/"):
            return super().do_GET()
        if not self.loopback_origin():
            return self.send_json(403, {"error": "Invalid local host"})
        if parsed.path == "/prototype-auth/capabilities":
            return self.send_json(200, {"available": sys.platform == "darwin", "expiresIn": AUTH_TTL})
        if parsed.path == "/prototype-auth/status":
            token = parse_qs(parsed.query).get("session", [""])[0]
            session = active_session(token) if SESSION_PATTERN.fullmatch(token) else None
            if not session:
                return self.send_json(404, {"status": "expired"})
            return self.send_json(200, {"status": session["status"]})
        self.send_json(404, {"error": "Unknown prototype endpoint"})

    def do_POST(self):
        route = urlsplit(self.path).path
        origin = self.loopback_origin()
        if not origin or self.headers.get("Origin") != origin:
            return self.send_json(403, {"error": "Same-origin local requests only"})
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            return self.send_json(415, {"error": "JSON required"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            limit = 16384 if route == "/__prototype/defaults" else 1024
            if length < 2 or length > limit:
                raise ValueError
            data = json.loads(self.rfile.read(length), parse_constant=invalid_json_constant)
            if not isinstance(data, dict):
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "Invalid request"})
        if route == "/__prototype/defaults":
            try:
                return self.send_json(200, update_defaults(data))
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            except OSError:
                return self.send_json(500, {"error": "The shared defaults file could not be saved"})
        token = data.get("session", "")
        if not isinstance(token, str):
            return self.send_json(400, {"error": "Invalid session"})
        if route == "/prototype-auth/start":
            if token:
                session = active_session(token) if SESSION_PATTERN.fullmatch(token) else None
                if not session:
                    return self.send_json(404, {"error": "Session expired"})
                if session["status"] == "complete":
                    return self.send_json(409, {"error": "Session already completed"})
            else:
                active_session("")
                token = secrets.token_hex(24)
                with AUTH_LOCK:
                    if len(AUTH_SESSIONS) >= 100:
                        return self.send_json(429, {"error": "Too many prototype sessions"})
                    AUTH_SESSIONS[token] = {"expires": time.monotonic() + AUTH_TTL, "status": "waiting"}
            url = origin + "/auth.html?" + urlencode({"session": token, "transport": "local"})
            launched = launch_default_browser(url)
            return self.send_json(200, {"session": token, "authURL": url, "launched": launched, "expiresIn": AUTH_TTL})
        if route in ("/prototype-auth/complete", "/prototype-auth/cancel"):
            session = active_session(token) if SESSION_PATTERN.fullmatch(token) else None
            if not session:
                return self.send_json(404, {"error": "Session expired"})
            with AUTH_LOCK:
                if route.endswith("/cancel"):
                    AUTH_SESSIONS.pop(token, None)
                else:
                    session["status"] = "complete"
            return self.send_json(200, {"status": "complete" if route.endswith("/complete") else "cancelled"})
        self.send_json(404, {"error": "Unknown prototype endpoint"})

    def send_head(self):
        self.remaining = None
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        try:
            source = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        stat = os.fstat(source.fileno())
        size = stat.st_size
        start, end = 0, size - 1
        requested_range = self.headers.get("Range")
        if requested_range:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested_range.strip())
            try:
                if not match or not any(match.groups()):
                    raise ValueError
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    if int(last) == 0:
                        raise ValueError
                    start = max(0, size - int(last))
                if start >= size or end < start:
                    raise ValueError
            except ValueError:
                source.close()
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                return None

        self.send_response(206 if requested_range else 200)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
        self.send_header("Accept-Ranges", "bytes")
        if requested_range:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        source.seek(start)
        self.remaining = end - start + 1
        return source

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            return super().copyfile(source, outputfile)
        try:
            while self.remaining > 0:
                chunk = source.read(min(self.remaining, 64 * 1024))
                if not chunk:
                    break
                outputfile.write(chunk)
                self.remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Browsers cancel old range requests when seeking again.


if __name__ == "__main__":
    print("Jam playground: http://127.0.0.1:8765", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", 8765), PlaygroundHandler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
