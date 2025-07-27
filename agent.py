#!/usr/bin/env python3
"""
Minimal backend server for the GPT agent.

This server uses only the Python standard library to provide a REST‑like API for
reading and writing task queues, logs, and memory files.  It also serves the
static frontend contained in the `frontend/` directory.  Endpoints are
described in the repository README.

To run the server:

    python3 agent.py

By default, the server listens on port 8000.  You can override this by
setting the PORT environment variable.
"""

import http.server
import json
import os
import time
import urllib.parse
from pathlib import Path
from http import HTTPStatus
import cgi
from dotenv import load_dotenv
load_dotenv()

# Resolve base directory relative to this script
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
LOGS_DIR = BASE_DIR / "logs"
MEMORY_DIR = BASE_DIR / "memory"

def load_json(path, default=None):
    """Load JSON from the given path, returning default if file is missing."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def save_json(path, data):
    """Write data as JSON to the given path."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class AgentRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Request handler implementing API endpoints and static file serving."""

    def end_headers(self):
        # Allow cross‑origin requests for the frontend
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        """Respond to CORS preflight requests."""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/queue":
            self.handle_get_queue()
        elif path == "/api/logs":
            self.handle_get_logs()
        elif path.startswith("/api/memory/"):
            brand = path.split("/", 3)[-1]
            self.handle_get_memory(brand)
        else:
            # serve static files from the frontend directory
            self.serve_static()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/chat":
            self.handle_post_chat()
        elif path == "/api/upload":
            self.handle_post_upload()
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")

    # Static file serving ----------------------------------------------------
    def serve_static(self):
        # Adjust the directory to serve the frontend
        self.directory = str(FRONTEND_DIR)
        super().do_GET()

    # API handlers -----------------------------------------------------------
    def handle_get_queue(self):
        queue_path = LOGS_DIR / "queue.json"
        queue = load_json(queue_path, default=[])
        self.respond_json(queue)

    def handle_get_logs(self):
        logs_path = LOGS_DIR / "tasklog.json"
        logs = load_json(logs_path, default=[])
        self.respond_json(logs)

    def handle_get_memory(self, brand):
        mem_file = MEMORY_DIR / brand / "memory.json"
        if mem_file.exists():
            mem = load_json(mem_file, default={})
            self.respond_json(mem)
        else:
            self.send_error(HTTPStatus.NOT_FOUND, f"Memory for '{brand}' not found")
        def handle_post_chat(self):
    try:        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode()
        self.respond_json({"status": "received", "echo": body})
    except Exception as e:
        self.send_error(500, f"Error handling request: {str(e)}")
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body or b'{}')
            command = data.get("command")
        except Exception:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON payload")
            return
        if not command:
            self.send_error(HTTPStatus.BAD_REQUEST, "Missing 'command' field")
            return
        # Append to queue with timestamp
        queue_path = LOGS_DIR / "queue.json"
        queue = load_json(queue_path, default=[])
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        queue.append({"task": command, "timestamp": timestamp})
        save_json(queue_path, queue)
        self.respond_json({"status": "queued", "timestamp": timestamp})

    def handle_post_upload(self):
        # Parse multipart form data
        ctype, pdict = cgi.parse_header(self.headers.get('Content-Type'))
        if ctype != 'multipart/form-data':
            self.send_error(HTTPStatus.BAD_REQUEST, "Content-Type must be multipart/form-data")
            return
        pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
        pdict['CONTENT-LENGTH'] = int(self.headers.get('Content-Length'))
        fs = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD': 'POST'}, keep_blank_values=True)
        # Determine the target brand from a form field; default to remote100k
        brand = fs.getvalue('brand') or 'remote100k'
        upload_dir = MEMORY_DIR / brand / 'uploads'
        upload_dir.mkdir(parents=True, exist_ok=True)
        uploaded_files = []
        for field in fs.list or []:
            if field.filename:
                filename = os.path.basename(field.filename)
                filepath = upload_dir / filename
                with open(filepath, 'wb') as f:
                    data = field.file.read()
                    f.write(data)
                uploaded_files.append(filename)
        self.respond_json({"status": "uploaded", "files": uploaded_files})

    # Helpers ---------------------------------------------------------------
    def respond_json(self, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def run_server():
    port = int(os.environ.get('PORT', '8000'))
    handler = AgentRequestHandler
    os.chdir(BASE_DIR)  # Serve static files relative to base directory
    # Start background worker thread to process queued tasks
    import threading
    def task_worker():
        queue_path = LOGS_DIR / "queue.json"
        log_path = LOGS_DIR / "tasklog.json"
        while True:
            # Load current queue
            queue = load_json(queue_path, default=[])
            if queue:
                # Pop first task
                task = queue.pop(0)
                # Simulate task execution (sleep for a short period)
                time.sleep(1)
                # Append to log
                log = load_json(log_path, default=[])
                # add status or result placeholder
                log.append({
                    "task": task.get("task"),
                    "timestamp": task.get("timestamp"),
                    "completed_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
                    "result": "success"
                })
                save_json(queue_path, queue)
                save_json(log_path, log)
            else:
                # Sleep longer when no tasks
                time.sleep(5)
    worker_thread = threading.Thread(target=task_worker, daemon=True)
    worker_thread.start()
    with http.server.ThreadingHTTPServer(('', port), handler) as httpd:
        print(f"Serving on port {port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Shutting down server…")

if __name__ == '__main__':
    run_server()