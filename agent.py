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
import openai
load_dotenv()
openai.api_key = os.environ.get("OPENAI_API_KEY", "")

# Resolve base directory relative to this script
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
LOGS_DIR = BASE_DIR / "logs"
MEMORY_DIR = BASE_DIR / "memory"
MEMORY_STORE_FILE = MEMORY_DIR / "chat_memory.json"

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

def load_memory_store():
    return load_json(MEMORY_STORE_FILE, default={
        "remote100k": {"messages": [], "instructions": ""},
        "tradeview_ai": {"messages": [], "instructions": ""},
        "app_304": {"messages": [], "instructions": ""}
    })

def save_memory_store(data):
    MEMORY_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
    save_json(MEMORY_STORE_FILE, data)

class AgentRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Request handler implementing API endpoints and static file serving."""

    def is_authorized(self) -> bool:
        """Placeholder authorization check."""
        return True

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
        store = load_memory_store()
        mem = store.get(brand, {"messages": [], "instructions": ""})
        self.respond_json(mem)

    def handle_post_chat(self):
        if not self.is_authorized():
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self.send_header("WWW-Authenticate", 'Basic realm="Login required"')
            self.end_headers()
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length).decode())
            project = body.get('project')
            messages = body.get('messages', [])
            if not project or not isinstance(messages, list):
                self.send_error(HTTPStatus.BAD_REQUEST, "Invalid payload")
                return

            store = load_memory_store()
            mem = store.get(project, {"messages": [], "instructions": ""})
            prompt_messages = []
            if mem.get("instructions"):
                prompt_messages.append({"role": "system", "content": mem["instructions"]})
            prompt_messages.extend(messages)

            reply_text = ""
            try:
                resp = openai.ChatCompletion.create(model=os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo"), messages=prompt_messages)
                reply_text = resp["choices"][0]["message"]["content"].strip()
            except Exception as api_err:
                reply_text = f"Error: {api_err}"

            # update memory with new conversation
            mem["messages"] = messages + [{"role": "assistant", "content": reply_text}]
            store[project] = mem
            save_memory_store(store)

            self.respond_json({"reply": reply_text})
        except Exception as e:
            self.send_error(500, f"Error handling request: {e}")

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
