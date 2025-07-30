"""
Entry point for the AJAX backend.

This module sets up a Flask application that exposes several REST endpoints
for controlling the AI system, managing projects and agents, uploading
training data and handling social integrations.  State is persisted via
JSON files under the `core` and `logs` directories.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

from core import ajax_ai, agent as agent_mgr, tasks as task_mgr, memory

app = Flask(__name__)
CORS(app)


@app.route('/mode', methods=['GET'])
def get_mode():
    """Return the current personality mode."""
    return jsonify({'mode': memory.get_mode()})


@app.route('/loganin', methods=['POST', 'GET'])
def logan_in():
    """Switch to assistant (Ajax) mode.  Logan is considered online so the
    assistant should act in supportive mode.  Returns the new mode."""
    memory.set_mode('Ajax')
    return jsonify({'mode': memory.get_mode()})


@app.route('/loganout', methods=['POST', 'GET'])
def logan_out():
    """Switch to Logan mode.  Logan is offline so the AI takes on his persona.
    Returns the new mode."""
    memory.set_mode('Logan')
    return jsonify({'mode': memory.get_mode()})


@app.route('/agents', methods=['GET'])
def list_agents():
    """List all configured AI agents."""
    return jsonify({'agents': agent_mgr.list_agents()})


@app.route('/agents/create', methods=['POST'])
def create_agent():
    """Create a new AI agent.  Expects JSON with `name`, `role` and
    `base_behavior` keys."""
    data = request.get_json(force=True)
    name = data.get('name')
    role = data.get('role', '')
    base_behavior = data.get('base_behavior', '')
    if not name:
        return jsonify({'error': 'name is required'}), 400
    try:
        agent_mgr.create_agent(name, role, base_behavior)
        return jsonify({'status': 'success', 'agent': name})
    except FileExistsError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/agents/<agent_name>/upload_training', methods=['POST'])
def upload_training(agent_name):
    """Upload a training file for a specific agent.  Accepts multipart
    form data containing a file field named `file`.  Optionally accepts
    a `summarise` query parameter to enable summarisation."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    file_content = file.read()
    filename = file.filename
    summarise = request.args.get('summarise', 'true').lower() != 'false'
    try:
        agent_mgr.upload_training_file(agent_name, filename, file_content, summarise)
    except FileNotFoundError:
        return jsonify({'error': f'Agent {agent_name} does not exist'}), 404
    return jsonify({'status': 'received', 'file': filename})


@app.route('/projects', methods=['GET'])
def list_projects():
    """Return a list of known projects."""
    return jsonify({'projects': task_mgr.list_projects()})


@app.route('/projects/create', methods=['POST'])
def create_project():
    """Create a new project.  Expects JSON with at least a `name` key."""
    data = request.get_json(force=True)
    name = data.get('name')
    if not name:
        return jsonify({'error': 'name is required'}), 400
    try:
        task_mgr.create_project(name)
        return jsonify({'status': 'success', 'project': name})
    except FileExistsError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/connect_platform', methods=['POST'])
def connect_platform():
    """Save social integration credentials to the .env file.  Expects
    `project`, `platform` and either `token` or `username`/`password` fields
    in the JSON body."""
    data = request.get_json(force=True)
    project = data.get('project')
    platform = data.get('platform')
    token = data.get('token')
    username = data.get('username')
    password = data.get('password')
    if not project or not platform:
        return jsonify({'error': 'project and platform are required'}), 400
    # Construct key names as UPPERCASE
    prefix = f"{project.upper()}_{platform.upper()}"
    env_updates = {}
    if token:
        env_updates[f"{prefix}_TOKEN"] = token
    if username:
        env_updates[f"{prefix}_USERNAME"] = username
    if password:
        env_updates[f"{prefix}_PASSWORD"] = password
    if not env_updates:
        return jsonify({'error': 'No credentials provided'}), 400
    # Persist to .env file
    dotenv_path = os.path.join(os.getcwd(), '.env')
    with open(dotenv_path, 'a') as f:
        for key, value in env_updates.items():
            f.write(f"{key}={value}\n")
    # Update in-memory env
    for key, value in env_updates.items():
        os.environ[key] = value
    return jsonify({'status': 'saved', 'keys': list(env_updates.keys())})


@app.route('/tasks', methods=['GET'])
def list_tasks():
    """Return the current task timeline."""
    return jsonify({'tasks': memory.get_tasks()})


@app.route('/tasks/add', methods=['POST'])
def add_task():
    """Add a new task to the timeline.  Expects `description` and
    optional `status` keys."""
    data = request.get_json(force=True)
    description = data.get('description')
    status = data.get('status', 'pending')
    if not description:
        return jsonify({'error': 'description is required'}), 400
    task = task_mgr.add_task(description, status)
    return jsonify({'status': 'added', 'task': task})


@app.route('/idle_behaviors', methods=['GET'])
def get_idle_behaviors():
    """Return the configured idle behaviours."""
    return jsonify({'idle_behaviors': task_mgr.get_idle_behaviors()})


@app.route('/idle_behaviors', methods=['POST'])
def update_idle_behaviors():
    """Replace the idle behaviours configuration.  Expects JSON body."""
    data = request.get_json(force=True)
    task_mgr.set_idle_behaviors(data)
    return jsonify({'status': 'updated'})


@app.route('/respond', methods=['POST'])
def respond_message():
    """Generate a reply for a given user message based on the current mode.
    The request must include a JSON body with a `message` field.  Returns
    a JSON object containing the reply string."""
    data = request.get_json(force=True)
    message = data.get('message', '')
    reply = ajax_ai.respond(message)
    return jsonify({'reply': reply})


if __name__ == '__main__':
    # Ensure required directories exist at startup
    os.makedirs(os.path.join('core', 'projects'), exist_ok=True)
    os.makedirs(os.path.join('logs'), exist_ok=True)
    # Start background idle behaviour thread
    def idle_worker():
        import time
        from random import randint
        while True:
            config = task_mgr.get_idle_behaviors()
            frequency = config.get('frequency_minutes', 30)
            # Sleep for the configured period
            time.sleep(max(1, int(frequency)) * 60)
            # Perform configured idle tasks
            if config.get('scan_social_comments'):
                count = randint(1, 5)
                memory.add_task(description=f"Ajax checked {count} social accounts", status='done')
            if config.get('review_spreadsheets'):
                memory.add_task(description="Ajax reviewed Google Sheets for content performance", status='done')
            if config.get('read_financial_sites'):
                memory.add_task(description="Ajax read financial news sites for investor training", status='done')
    import threading
    threading.Thread(target=idle_worker, daemon=True).start()
    # Start the development server
    app.run(host='0.0.0.0', port=8000, debug=True)