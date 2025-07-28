from flask import Flask, send_from_directory, request, jsonify, Response
import os
import json
import asyncio
from datetime import datetime
from openai import OpenAI
from tools.image_generator import ImageGeneratorTool
from functools import wraps
from werkzeug.utils import secure_filename
from tools.web_browser import WebBrowserTool

# Path to the frontend files. Originally this project expected a Vite build in
# ``frontend/dist`` but the repository only contains plain HTML and JS directly
from core.ajax_ai import build_default_ajax

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


def _is_image_request(text: str) -> bool:
    """Return True if the user text looks like an image generation request."""
    lowered = text.lower()
    triggers = ['generate image', 'draw', 'create image']
    return any(t in lowered for t in triggers)

class Agent:
    """Manage available tools and provide a unified async interface."""

    def __init__(self) -> None:
        self.tools = {
            'web': WebBrowserTool(),
            ImageGeneratorTool.name: ImageGeneratorTool(),
        }

    async def use_tool(self, name: str, params: dict):
        tool = self.tools.get(name)
        if not tool:
            raise ValueError(f"Unknown tool: {name}")
        if hasattr(tool, "run"):
            return await asyncio.to_thread(tool.run, params)
        return await tool(**params)


chat_memory = _load_memory()
agent = Agent()
ajax_agent = build_default_ajax()

# Presence override flag.  When ``None``, Ajax falls back to the username
# provided by basic auth to determine whether Logan is present.  When
# ``True`` or ``False``, Ajax will operate in assistant (Ajax) or
# business owner (Logan) mode respectively regardless of who is
# authenticated.  This can be controlled via chat commands or UI toggle.
presence_override: bool | None = None

# Real‑time status information for the web view panel.  The ``mode``
# field reflects whether Ajax is operating in assistant mode (``ajax``)
# or acting as Logan (``logan``).  ``last_command`` records the most
# recent user command, ``delegating`` contains the name of the
# subordinate agent currently handling a task (or ``None``),
# ``task_progress`` indicates whether the agent is idle or working, and
# ``history`` retains the last few responses for display in the panel.
status_info = {
    'mode': 'ajax' if ajax_agent.is_logan_present else 'logan',
    'last_command': '',
    'delegating': None,
    'task_progress': 'idle',
    'history': [],
}



def handle_post_chat(data: dict) -> dict:
    """Process a chat request and return a response payload.

    This function implements dynamic presence detection, slash commands
    for toggling modes and delegating tasks, and status tracking for
    display in the web view panel.

    Supported slash commands:

    - ``/loganin``: mark Logan as present (assistant mode).
    - ``/loganout``: mark Logan as away (Logan mode).
    - ``/delegate <agent> <task>``: delegate the task to a registered
      sub‑agent (``investor``, ``fanpage``, ``support``, ``growth``).
    """
    global presence_override, status_info
    user_message = (data.get('message') or '').strip()

    # Determine presence based on override or authenticated username.
    # If presence_override is None, infer from the basic auth username:
    # Logan or NonstopAgent indicates that Logan is present.
    auth = request.authorization
    if presence_override is None:
        user = (auth.username.lower() if auth and auth.username else '')
        # Recognise common variants of Logan’s username
        if user in {'logan', 'logan alvarez', 'nonstopagent'}:
            ajax_agent.is_logan_present = True
        else:
            ajax_agent.is_logan_present = False
    else:
        # Use the override value directly
        ajax_agent.is_logan_present = bool(presence_override)

    # Precompute timestamp for responses
    timestamp = datetime.now().isoformat()

    # Handle presence toggle commands
    lowered = user_message.lower()
    if lowered.startswith('/loganin'):
        presence_override = True
        ajax_agent.is_logan_present = True
        status_info['mode'] = 'ajax'
        status_info['last_command'] = '/loganin'
        status_info['delegating'] = None
        status_info['task_progress'] = 'idle'
        response = 'Logan presence activated. Ajax will speak like a helpful assistant.'
        status_info['history'].append(response)
        status_info['history'] = status_info['history'][-5:]
        return {'response': response, 'timestamp': timestamp}

    if lowered.startswith('/loganout'):
        presence_override = False
        ajax_agent.is_logan_present = False
        status_info['mode'] = 'logan'
        status_info['last_command'] = '/loganout'
        status_info['delegating'] = None
        status_info['task_progress'] = 'idle'
        response = 'Logan marked as away. I will speak on Logan’s behalf.'
        status_info['history'].append(response)
        status_info['history'] = status_info['history'][-5:]
        return {'response': response, 'timestamp': timestamp}

    # Handle delegation command: /delegate agent_name task description
    if lowered.startswith('/delegate'):
        # Split into at most three parts: command, agent name, remainder of task
        parts = user_message.split(None, 2)
        if len(parts) < 3:
            response = 'Invalid delegate command. Usage: /delegate <agent> <task>'
            return {'response': response, 'timestamp': timestamp}
        _, agent_name, task = parts
        try:
            status_info['mode'] = 'ajax' if ajax_agent.is_logan_present else 'logan'
            status_info['last_command'] = user_message
            status_info['delegating'] = agent_name
            status_info['task_progress'] = 'working'
            result = ajax_agent.delegate(agent_name, task)
            status_info['task_progress'] = 'idle'
            status_info['history'].append(result)
            status_info['history'] = status_info['history'][-5:]
            return {'response': result, 'timestamp': timestamp}
        except Exception as e:
            status_info['task_progress'] = 'idle'
            error = f"Delegation error: {e}"
            status_info['history'].append(error)
            status_info['history'] = status_info['history'][-5:]
            return {'response': error, 'timestamp': timestamp}

    # Normal chat flow: update status and generate response
    status_info['mode'] = 'ajax' if ajax_agent.is_logan_present else 'logan'
    status_info['last_command'] = user_message
    status_info['delegating'] = None
    status_info['task_progress'] = 'working'

    # Use AjaxAI to generate a response based on presence
    reply = ajax_agent.generate_response(user_message)

    status_info['task_progress'] = 'idle'
    status_info['history'].append(reply)
    status_info['history'] = status_info['history'][-5:]

    return {'response': reply, 'timestamp': timestamp}

   

    if not user_message:
        return {'error': 'Empty message'}

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
        return {'error': str(e)}

    if _is_image_request(user_message):
        prompt = user_message
        for key in ['generate image', 'draw', 'create image']:
            if key in user_message.lower():
                after = user_message.lower().split(key, 1)[1].strip()
                if after:
                    prompt = after
                break
        try:
            image_url = asyncio.run(agent.use_tool(ImageGeneratorTool.name, {'prompt': prompt}))
            reply = f"{reply}\n\nImage URL: {image_url}"
        except Exception as e:
            reply = f"{reply}\n\nFailed to generate image: {e}"

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

    return {'response': reply, 'timestamp': record['timestamp']}


@app.route('/api/chat', methods=['POST'])
def chat() -> 'flask.Response':
    """Chat endpoint using OpenAI with conversation memory."""
    data = request.get_json(force=True)
    result = handle_post_chat(data)
    if 'error' in result:
        return jsonify({'error': result['error']}), 400
    return jsonify(result)


@app.route('/api/image', methods=['POST'])
def generate_image_api() -> 'flask.Response':
    """Generate an image from a prompt."""
    data = request.get_json(force=True)
    prompt = (data.get('prompt') or '').strip()
    if not prompt:
        return jsonify({'error': 'Empty prompt'}), 400
    try:
        url = asyncio.run(agent.use_tool(ImageGeneratorTool.name, {'prompt': prompt}))
        return jsonify({'url': url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@app.route('/api/status', methods=['GET'])
@require_auth
def get_status() -> 'flask.Response':
    """Return the real‑time status information for the agent.

    This endpoint exposes the current mode (ajax or logan), the last
    command issued by the user, any ongoing delegation, the current
    progress state, and the recent history of responses.  It can be
    polled by the frontend to populate a status panel.
    """
    return jsonify(status_info)


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
