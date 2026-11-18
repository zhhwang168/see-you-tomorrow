import io
import json
import os
import time
from threading import Lock
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import torch
from kokoro import KModel, KPipeline

VOICES = {
    "af_sky": "a", "af_heart": "a", "af_bella": "a", "af_nova": "a",
    "af_nicole": "a", "af_jessica": "a", "bf_alice": "b", "bf_emma": "b",
    "bf_isabella": "b",
}
device = os.environ.get("MIRA_TTS_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
model = KModel(repo_id="hexgrad/Kokoro-82M").to(device).eval()
inference_lock = Lock()
pipelines = {lang: KPipeline(lang_code=lang, model=model) for lang in set(VOICES.values())}


class SpeechHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Length", "6")
        self.end_headers()
        self.wfile.write(b"kokoro")

    def do_POST(self):
        if self.path != "/speech":
            self.send_error(404)
            return
        if self.headers.get("Content-Type") != "application/json":
            self.send_error(415)
            return
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 8192:
                raise ValueError("Invalid body length")
            data = json.loads(self.rfile.read(size))
            text = data["text"]
            voice = data["voice"]
            if not isinstance(text, str) or not text.strip() or len(text) > 1200 or voice not in VOICES:
                raise ValueError("Invalid speech request")
        except (ValueError, TypeError, KeyError):
            self.send_error(400)
            return

        start = time.perf_counter()
        try:
            with inference_lock, torch.inference_mode():
                chunks = [result.audio.cpu().numpy()
                          for result in pipelines[VOICES[voice]](text, voice=voice)
                          if result.audio is not None]
            pcm = (np.clip(np.concatenate(chunks), -1, 1) * 32767).astype("<i2")
            output = io.BytesIO()
            with wave.open(output, "wb") as wav:
                wav.setparams((1, 2, 24000, 0, "NONE", "not compressed"))
                wav.writeframes(pcm.tobytes())
            audio = output.getvalue()
        except Exception as error:
            print(f"Kokoro synthesis failed: {error}", flush=True)
            self.send_error(500)
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("X-Synthesis-Ms", str(round((time.perf_counter() - start) * 1000)))
        self.end_headers()
        self.wfile.write(audio)


print(f"Kokoro ready on {device}: {torch.cuda.get_device_name() if device == 'cuda' else 'CPU'}", flush=True)
ThreadingHTTPServer(("127.0.0.1", 3082), SpeechHandler).serve_forever()

