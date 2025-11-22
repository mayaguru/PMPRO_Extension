import copy
import io
import socket
import threading
import time

from flask import Flask, Response, render_template, request
import mss
from PIL import Image


app = Flask(__name__)


# --- Global Capture State ---
CONFIG_LOCK = threading.Lock()
CAPTURE_CONFIG = {
    "mode": "region",  # region or monitor
    "monitor_index": 1,  # 1 = primary monitor (mss index), 0 = virtual desktop
    "region": {
        "top": 0,
        "left": 0,
        "width": 1280,
        "height": 720,
    },
    "fps": 30,
    "quality": 80,
}

FRAME_CONDITION = threading.Condition()
LATEST_FRAME_BYTES = None
LATEST_BBOX = None
CAPTURE_THREAD_STARTED = False

MONITORS_CACHE = []
MONITORS_CACHE_LOCK = threading.Lock()


def update_monitors_cache(sct):
    """Update the global monitors cache from an MSS instance."""
    global MONITORS_CACHE
    summary = []
    for idx, mon in enumerate(sct.monitors):
        summary.append(
            {
                "index": idx,
                "top": mon.get("top", 0),
                "left": mon.get("left", 0),
                "width": mon.get("width", 0),
                "height": mon.get("height", 0),
            }
        )
    with MONITORS_CACHE_LOCK:
        MONITORS_CACHE = summary


def get_monitors_summary():
    """Get monitors summary from cache or fallback to direct query."""
    with MONITORS_CACHE_LOCK:
        if MONITORS_CACHE:
            return copy.deepcopy(MONITORS_CACHE)
    
    # Fallback if cache is empty
    return monitors_summary_direct()


def background_capture_loop():
    """Background thread to capture screen continuously."""
    global LATEST_FRAME_BYTES, LATEST_BBOX
    print("Background capture loop started.")
    with mss.mss() as sct:
        update_monitors_cache(sct)  # Initial cache update
        frame_count = 0
        while True:
            cfg = clone_config()
            try:
                # Update monitor cache occasionally (e.g., every 300 frames ~ 10s)
                frame_count += 1
                if frame_count % 300 == 0:
                     update_monitors_cache(sct)

                frame_bytes, bbox = encode_frame_bytes(sct, cfg)
                if frame_bytes:
                    with FRAME_CONDITION:
                        LATEST_FRAME_BYTES = frame_bytes
                        LATEST_BBOX = bbox
                        FRAME_CONDITION.notify_all()

                fps = clamp(int(cfg.get("fps", 30)), 1, 60)
                time.sleep(1.0 / fps)
            except Exception as exc:
                print(f"Capture error: {exc}")
                time.sleep(1)


def start_background_thread():
    global CAPTURE_THREAD_STARTED
    if not CAPTURE_THREAD_STARTED:
        t = threading.Thread(target=background_capture_loop, daemon=True)
        t.start()
        CAPTURE_THREAD_STARTED = True
CAPTURE_CONFIG = {
    "mode": "region",  # region or monitor
    "monitor_index": 1,  # 1 = primary monitor (mss index), 0 = virtual desktop
    "region": {
        "top": 0,
        "left": 0,
        "width": 1280,
        "height": 720,
    },
    "fps": 30,
    "quality": 80,
}


def clone_config():
    with CONFIG_LOCK:
        return copy.deepcopy(CAPTURE_CONFIG)


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def local_ip():
    """Best-effort discovery of a LAN IP for headset instructions."""
    sock = None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        try:
            sock.close()
        except Exception:
            pass
    return ip


def monitors_summary_direct():
    """Directly query monitors using a new MSS instance (fallback)."""
    with mss.mss() as sct:
        summary = []
        for idx, mon in enumerate(sct.monitors):
            summary.append(
                {
                    "index": idx,
                    "top": mon.get("top", 0),
                    "left": mon.get("left", 0),
                    "width": mon.get("width", 0),
                    "height": mon.get("height", 0),
                }
            )
        return summary


def build_bbox(cfg, monitors):
    if not monitors:
        return None

    monitor_index = int(cfg.get("monitor_index", 1))
    monitor_index = clamp(monitor_index, 0, len(monitors) - 1)
    base_monitor = monitors[monitor_index]

    mode = cfg.get("mode", "region")
    if mode not in ("region", "monitor"):
        mode = "region"

    if mode == "monitor":
        return {
            "top": base_monitor["top"],
            "left": base_monitor["left"],
            "width": base_monitor["width"],
            "height": base_monitor["height"],
        }

    region = cfg.get("region") or {}
    top = clamp(int(region.get("top", 0)), 0, max(0, base_monitor["height"] - 1))
    left = clamp(int(region.get("left", 0)), 0, max(0, base_monitor["width"] - 1))

    max_width = max(1, base_monitor["width"] - left)
    max_height = max(1, base_monitor["height"] - top)
    width = clamp(int(region.get("width", base_monitor["width"])), 1, max_width)
    height = clamp(int(region.get("height", base_monitor["height"])), 1, max_height)

    return {
        "top": base_monitor["top"] + top,
        "left": base_monitor["left"] + left,
        "width": width,
        "height": height,
    }


def apply_config(data):
    if not isinstance(data, dict):
        return False, "Invalid payload", clone_config()

    updated = False
    new_cfg = clone_config()

    if "mode" in data:
        mode = data.get("mode", "").lower()
        if mode in ("region", "monitor"):
            new_cfg["mode"] = mode
            updated = True

    if "monitor_index" in data:
        try:
            idx = int(data["monitor_index"])
            new_cfg["monitor_index"] = idx
            updated = True
        except (ValueError, TypeError):
            pass

    if "fps" in data:
        try:
            fps = clamp(int(data["fps"]), 1, 60)
            new_cfg["fps"] = fps
            updated = True
        except (ValueError, TypeError):
            pass

    if "quality" in data:
        try:
            quality = clamp(int(data["quality"]), 10, 95)
            new_cfg["quality"] = quality
            updated = True
        except (ValueError, TypeError):
            pass

    region_payload = None
    if "region" in data and isinstance(data["region"], dict):
        region_payload = data["region"]
    else:
        legacy_keys = ("top", "left", "width", "height")
        if any(k in data for k in legacy_keys):
            region_payload = {k: data.get(k) for k in legacy_keys}

    if region_payload:
        region = new_cfg.get("region", {}).copy()
        for key in ("top", "left", "width", "height"):
            if region_payload.get(key) is None:
                continue
            try:
                value = int(region_payload[key])
                if key in ("width", "height"):
                    value = max(1, value)
                else:
                    value = max(0, value)
                region[key] = value
                updated = True
            except (ValueError, TypeError):
                pass
        new_cfg["region"] = region

    if updated:
        with CONFIG_LOCK:
            global CAPTURE_CONFIG
            CAPTURE_CONFIG = new_cfg

    return True, "updated" if updated else "no changes", clone_config()


def encode_frame_bytes(sct, cfg):
    bbox = build_bbox(cfg, sct.monitors)
    if not bbox:
        return None, None

    img = sct.grab(bbox)
    img_pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
    frame_buffer = io.BytesIO()
    img_pil.save(frame_buffer, format="JPEG", quality=cfg.get("quality", 80))
    return frame_buffer.getvalue(), bbox


def generate_mjpeg_stream():
    """Generator that yields MJPEG frames from the shared buffer."""
    while True:
        with FRAME_CONDITION:
            FRAME_CONDITION.wait()
            frame = LATEST_FRAME_BYTES

        if frame:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            )


@app.route("/")
def index():
    """Video streaming home page."""
    return render_template("vr_client.html")


@app.route("/video_feed")
def video_feed():
    """Video streaming route. Put this in the src attribute of an img tag."""
    return Response(
        generate_mjpeg_stream(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/update_config", methods=["POST", "OPTIONS"])
def update_config():
    """API to update capture region from Premiere Panel."""
    if request.method == "OPTIONS":
        return ("", 204)
    success, message, cfg = apply_config(request.json or {})
    status = 200 if success else 400
    return (
        {
            "status": "success" if success else "error",
            "message": message,
            "config": cfg,
            "monitors": get_monitors_summary(),
        },
        status,
    )


@app.route("/config", methods=["GET", "OPTIONS"])
def current_config():
    """Expose the current capture config for the panel."""
    if request.method == "OPTIONS":
        return ("", 204)
    return {
        "status": "ok",
        "config": clone_config(),
        "monitors": get_monitors_summary(),
    }


@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    """Simple health endpoint used by the CEP panel to check connectivity."""
    if request.method == "OPTIONS":
        return ("", 204)
    
    summary = get_monitors_summary()
    cfg = clone_config()
    bbox = build_bbox(cfg, summary)
    
    return {
        "status": "ok",
        "config": cfg,
        "monitors": summary,
        "ip": local_ip(),
        "bbox": bbox,
    }


@app.route("/frame.jpg")
def frame_jpg():
    """Returns a single JPEG frame for WebXR texture updates."""
    with FRAME_CONDITION:
        frame_bytes = LATEST_FRAME_BYTES
        bbox = LATEST_BBOX

    if not frame_bytes:
        return Response(status=503)

    response = Response(frame_bytes, mimetype="image/jpeg")
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    if bbox:
        response.headers["X-Capture-Width"] = str(bbox["width"])
        response.headers["X-Capture-Height"] = str(bbox["height"])
    return response


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


if __name__ == "__main__":
    start_background_thread()
    print("Starting VR Streamer...")
    print("1. Ensure your VR headset is on the SAME Wi-Fi.")
    print("2. Find your PC's IP address (automatically shown in the panel).")
    print("3. Open http://<YOUR_PC_IP>:5000 in the VR browser.")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
