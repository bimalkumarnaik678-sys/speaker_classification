"""
app.py
------
Flask web application for the Speaker / Sound Classification project.

Serves a single-page UI (templates/index.html) that lets a visitor
record or upload a short audio clip. The clip is sent to /predict,
run through the two-stage YAMNet pipeline in utils/speaker_utils.py,
and the result (sound category + identified speaker, if human) is
returned as JSON and rendered in the browser.
"""

import os
import uuid
import traceback

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

from utils.speaker_utils import get_pipeline

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"wav", "mp3", "ogg", "flac", "m4a", "webm"}
MAX_CONTENT_LENGTH = 15 * 1024 * 1024  # 15 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file was sent."}), 400

    audio_file = request.files["audio"]

    if audio_file.filename == "":
        return jsonify({"error": "No audio file was selected."}), 400

    original_name = audio_file.filename
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "wav"

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: .{extension}"}), 400

    safe_name = f"{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], secure_filename(safe_name))

    try:
        audio_file.save(save_path)

        pipeline = get_pipeline()
        result = pipeline.classify(save_path)

        return jsonify({"success": True, "result": result})

    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"success": False, "error": str(exc)}), 500

    finally:
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except OSError:
                pass


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, "static"), filename)


if __name__ == "__main__":
    # Warm the models up before the first request so the UI's first
    # prediction doesn't pay the (slow) model-loading cost.
    get_pipeline()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
