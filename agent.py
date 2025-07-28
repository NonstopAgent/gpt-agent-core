from flask import Flask, send_from_directory, request, jsonify, Response
import os
import json
import asyncio
from datetime import datetime
from openai import OpenAI
from functools import wraps
from werkzeug.utils import secure_filename
from tools.web_browser import WebBrowserTool

# Path to the frontend files. Originally this project expected a Vite build in
# ``frontend/dist`` but the repository only contains plain HTML and JS directly
# inside ``frontend``.  Point the static folder there so Flask can serve it.
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend/dist')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
BASIC_USER = os.getenv("BASIC_USER", "logan")
BASIC_PASS = os.getenv("BASIC_PASS", "AllDay21!!!")

def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.authorization
        if not auth or auth.username != BASIC_USER or auth.password != BASIC_PASS:
            return Response("Authentication required", 401, {"WWW-Authenticate": "Basic realm=Login"})
        return fn(*args, **kwargs)
    return wrapper



CHAT_MEMORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'memory', 'chat_memory.json')

def _load_memory():
    if os.path.exists(CHAT_MEMORY_FILE):
        with open(CHAT_MEMORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def _save_memory(data):
    os.makedirs(os.path.dirname(CHAT_MEMORY_FILE), exist_ok=True)
    with open(CHAT_MEMORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

class Agent:
    """Simple container for registered tools."""

    def __init__(self) -> None:
        self.tools = {'web': WebBrowserTool()}

    async def use_tool(self, name: str, params: dict) -> dict:
        tool = self.tools.get(name)
        if not tool:
            raise ValueError(f'Unknown tool: {name}')
        return await asyncio.to_thread(tool.run, params)

chat_memory = _load_memory()
agent = Agent()


@app.route('/api/chat', methods=['POST'])
def chat() -> 'flask.Response':
    """Chat endpoint using OpenAI with conversation memory."""
    data = request.get_json(force=True)
    user_message = (data.get('message') or '').strip()
    project = data.get('project', 'general')
    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    mem = chat_memory.get(project, {"messages": [], "instructions": "You are Logan's custom business assistant Agent."})
    conversation = mem.get('messages', [])
    conversation.append({'role': 'user', 'content': user_message})

    if any(k in user_message.lower() for k in ['search', 'look up', 'get latest info']):
        try:
            result = asyncio.run(agent.use_tool('web', {'query': user_message}))
            snippet = result.get('body', '')[:1000]
            tool_msg = f"Web result for {result['url']}\nTitle: {result['title']}\n{snippet}"
            conversation.append({'role': 'system', 'content': tool_msg})
        except Exception as e:
            conversation.append({'role': 'system', 'content': f'Web tool error: {e}'})

    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{'role': 'system', 'content': mem.get('instructions', '')}] + conversation[-10:],
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    conversation.append({'role': 'assistant', 'content': reply})
    mem['messages'] = conversation[-20:]
    chat_memory[project] = mem
    _save_memory(chat_memory)

    if any(user_message.lower().startswith(k) for k in ['generate', 'analyze', 'create']):
        queue_path = os.path.join('logs', 'queue.json')
        if os.path.exists(queue_path):
            with open(queue_path, 'r', encoding='utf-8') as f:
                queue = json.load(f)
        else:
            queue = []
        queue.append({
            'id': len(queue) + 1,
            'project': project,
            'task': user_message,
            'status': 'pending',
            'timestamp': datetime.now().isoformat()
        })
        with open(queue_path, 'w', encoding='utf-8') as f:
            json.dump(queue, f, indent=2)

    history_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat_history.json')
    record = {
        'timestamp': datetime.now().isoformat(),
        'user': user_message,
        'agent': reply,
    }
    try:
        with open(history_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass

    return jsonify({'response': reply, 'timestamp': record['timestamp']})


@app.route('/api/queue', methods=['GET'])
def get_queue() -> 'flask.Response':
    """Return queued tasks."""
    path = os.path.join('logs', 'queue.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = []
    return jsonify(data)


@app.route('/api/logs', methods=['GET'])
def get_logs() -> 'flask.Response':
    """Return completed task logs."""
    path = os.path.join('logs', 'tasklog.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = []
    return jsonify(data)


@app.route('/api/upload', methods=['POST'])
def upload() -> 'flask.Response':
    """Handle file uploads for a project."""
    project = request.form.get('project', 'general')
    files = request.files.getlist('file')
    if not files:
        return jsonify({'error': 'no file provided'}), 400
    target_dir = os.path.join('memory', project, 'uploads')
    os.makedirs(target_dir, exist_ok=True)
    saved = []
    for f in files:
        name = secure_filename(f.filename)
        f.save(os.path.join(target_dir, name))
        saved.append(name)
    return jsonify({'project': project, 'files': saved})


@app.route('/api/task/status', methods=['GET'])
def task_status() -> 'flask.Response':
    """Return simple status of the latest queued task."""
    queue_path = os.path.join('logs', 'queue.json')
    status = {'status': 'idle'}
    if os.path.exists(queue_path):
        with open(queue_path, 'r', encoding='utf-8') as f:
            q = json.load(f)
        if q:
            latest = q[-1]
            status = {
                'task': latest.get('task'),
                'project': latest.get('project'),
                'timestamp': latest.get('timestamp'),
                'status': latest.get('status', 'pending')
            }
    return jsonify(status)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@require_auth
def serve_frontend(path: str):
    """Serve the frontend app and its static assets."""
    target = os.path.join(app.static_folder, path)
    if path and os.path.exists(target):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    # Allow the port to be configured via the ``PORT`` environment variable.
    # Default to 8000 so we don't clash with other services that often use
    # port 8080.
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)
