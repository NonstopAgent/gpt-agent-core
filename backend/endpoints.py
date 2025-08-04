"""
API endpoint definitions for the GPT Agent backend.

This module centralises all HTTP routes.  Endpoints are grouped into
chat handling, task queue management, file uploads and status
reporting.  Logging is performed for both chat messages and tasks to
facilitate a live command log on the frontend.
"""

from __future__ import annotations

import os
import json
import asyncio
from datetime import datetime
from flask import Flask, request, jsonify
from typing import Callable, Any, Dict, List

from tools.image_generator import ImageGeneratorTool
from tools.web_browser import WebBrowserTool
from core.crm import CRM


def register_api_endpoints(app: Flask, require_auth: Callable) -> None:
    """Register all API routes on the given Flask app."""
    # Tools available to Ajax
    tools = {
        'web': WebBrowserTool(),
        ImageGeneratorTool.name: ImageGeneratorTool(),
    }

    crm = CRM()

    # Persistent storage for chat and tasks
    memory_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'memory', 'chat_memory.json')
    os.makedirs(os.path.dirname(memory_file), exist_ok=True)
    if os.path.exists(memory_file):
        with open(memory_file, 'r', encoding='utf-8') as f:
            chat_memory = json.load(f)
    else:
        chat_memory = {}

    def save_memory() -> None:
        with open(memory_file, 'w', encoding='utf-8') as f:
            json.dump(chat_memory, f, indent=2)

    logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    queue_path = os.path.join(logs_dir, 'queue.json')
    tasklog_path = os.path.join(logs_dir, 'tasklog.json')

    def load_queue() -> List[Dict[str, Any]]:
        if os.path.exists(queue_path):
            with open(queue_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    def save_queue(queue: List[Dict[str, Any]]) -> None:
        with open(queue_path, 'w', encoding='utf-8') as f:
            json.dump(queue, f, indent=2)

    def append_task_log(entry: Dict[str, Any]) -> None:
        if os.path.exists(tasklog_path):
            with open(tasklog_path, 'r', encoding='utf-8') as f:
                log = json.load(f)
        else:
            log = []
        log.append(entry)
        with open(tasklog_path, 'w', encoding='utf-8') as f:
            json.dump(log, f, indent=2)

    # Real‑time status dictionary exposed via /api/status
    status_info: Dict[str, Any] = {
        'mode': 'ajax',
        'current_task': '',
        'history': [],
        'live_status': 'idle',
    }

    # Directory for storing project metadata and files.  Projects live
    # under the memory folder to group related uploads, chat history
    # and configuration.  Each subdirectory represents a single
    # project.  A project.json file is created when a new project is
    # registered via the /api/projects POST endpoint.
    projects_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'memory')

    @app.route('/api/agent/run', methods=['POST'])
    @require_auth
    def api_agent_run() -> Any:
        data = request.get_json(force=True)
        agent_name = (data.get('agent') or '').strip()
        action = (data.get('action') or '').strip()
        payload = data.get('input')
        ajax_agent = app.config['ajax_agent']
        agent = ajax_agent.agent_registry.get(agent_name)
        if not agent:
            return jsonify({'error': 'unknown agent'}), 400
        try:
            result = agent.run(action or 'chat', payload)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        timestamp = datetime.now().isoformat()
        append_task_log({'timestamp': timestamp, 'task': f'{agent_name}:{action}', 'response': result})
        return jsonify({'response': result, 'timestamp': timestamp})

    @app.route('/api/crm/<string:brand>', methods=['GET', 'POST'])
    @require_auth
    def api_crm(brand: str) -> Any:
        if request.method == 'GET':
            return jsonify(crm.get_brand(brand))
        data = request.get_json(force=True)
        if brand == 'remote100k':
            crm.add_remote100k_sub(
                data.get('email', ''),
                data.get('plan', ''),
                data.get('entry_point', ''),
            )
        elif brand == 'tradeview_ai':
            crm.add_tradeview_demo(
                data.get('timestamp', ''),
                data.get('contact', ''),
            )
        elif brand == 'app_304':
            crm.add_tiktok_lead(
                data.get('name', ''),
                data.get('account', ''),
                data.get('source', ''),
            )
        else:
            return jsonify({'error': 'unknown brand'}), 400
        return jsonify({'status': 'ok'})

    # Handle chat messages with presence, slash commands and memory
    def process_chat_message(message: str, ajax_agent) -> str:
        lowered = message.strip().lower()
        # Slash commands for presence
        if lowered.startswith('/loganin'):
            ajax_agent.is_logan_present = True
            status_info['mode'] = 'ajax'
            return "Logan is present. Switching to assistant mode."
        if lowered.startswith('/loganout'):
            ajax_agent.is_logan_present = False
            status_info['mode'] = 'logan'
            return "Logan is away. Speaking on his behalf."
        # Delegate command
        if lowered.startswith('/delegate'):
            parts = message.split(None, 2)
            if len(parts) < 3:
                return 'Usage: /delegate <agent> <task>'
            _, agent_name, task = parts
            try:
                status_info['current_task'] = task
                status_info['live_status'] = 'working'
                result = ajax_agent.delegate(agent_name, task)
                status_info['live_status'] = 'idle'
                status_info['history'].append(result)
                status_info['history'] = status_info['history'][-5:]
                return result
            except Exception as e:
                status_info['live_status'] = 'idle'
                return f'Delegation error: {e}'
        # Greetings and basic queries
        if lowered in {'hey', 'hi', 'hello', "what's up", 'sup'}:
            return 'Hey there! How can I help you today?'
        if lowered in {"what can you do", "what can you do?"}:
            return 'I can help with business automation, content creation, research, task tracking and more.'
        if lowered.startswith('log a task'):
            return 'Sure! Please provide the task details so I can log it.'
        # Normal conversation: generate response and remember last 10 messages
        ajax_agent_response = ajax_agent.generate_response(message)
        return ajax_agent_response

    @app.route('/api/loganin', methods=['POST'])
    @require_auth
    def api_loganin() -> Any:
        """Explicitly set the agent to assistant (Ajax) mode.

        This endpoint mirrors the `/loganin` slash command but
        provides a more RESTful interface for the UI.  When
        invoked, Logan is marked as present and the agent adopts
        the assistant persona.
        """
        ajax_agent = app.config['ajax_agent']
        ajax_agent.is_logan_present = True
        status_info['mode'] = 'ajax'
        return jsonify({'message': 'Logan is present. Switching to assistant mode.'})

    @app.route('/api/loganout', methods=['POST'])
    @require_auth
    def api_loganout() -> Any:
        """Explicitly set the agent to Logan mode.

        This endpoint mirrors the `/loganout` slash command but
        provides a more RESTful interface for the UI.  When invoked,
        Logan is marked as absent and the agent speaks on his behalf.
        """
        ajax_agent = app.config['ajax_agent']
        ajax_agent.is_logan_present = False
        status_info['mode'] = 'logan'
        return jsonify({'message': 'Logan is away. Speaking on his behalf.'})

    @app.route('/api/projects', methods=['GET', 'POST'])
    @require_auth
    def api_projects() -> Any:
        """List existing projects or create a new project.

        * GET: returns an array of project keys.  A project is
          represented by a subdirectory within the memory folder.
        * POST: accepts a JSON payload with `name` and `key`.
          Creates a corresponding subdirectory and writes a
          project.json metadata file.  If the project already exists
          the metadata file is updated but no error is thrown.
        """
        if request.method == 'GET':
            try:
                dirs = []
                for entry in os.listdir(projects_dir):
                    path = os.path.join(projects_dir, entry)
                    if os.path.isdir(path):
                        dirs.append(entry)
                return jsonify(dirs)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        # POST request: create a project
        try:
            data = request.get_json(force=True)
        except Exception:
            data = {}
        name = (data.get('name') or '').strip()
        key = (data.get('key') or '').strip()
        if not name or not key:
            return jsonify({'error': 'name and key fields required'}), 400
        proj_path = os.path.join(projects_dir, key)
        try:
            os.makedirs(proj_path, exist_ok=True)
            # write metadata
            meta = {
                'name': name,
                'key': key,
                'created': datetime.now().isoformat(),
            }
            with open(os.path.join(proj_path, 'project.json'), 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2)
            return jsonify(meta)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/agents', methods=['GET', 'POST'])
    @require_auth
    def api_agents() -> Any:
        """List or create AI sub‑agents.

        * GET: returns a list of agent names currently registered
          with the Ajax agent.  These are keys from the agent
          registry.
        * POST: accepts JSON payload with `name`, `role` and
          `base_behavior`.  Creates a folder under core/agents with
          a config.json and an empty training.md.  The agent is not
          auto‑registered; this endpoint simply scaffolds the
          directories so that administrators can later supply
          training materials.
        """
        ajax_agent = app.config['ajax_agent']
        if request.method == 'GET':
            return jsonify(list(ajax_agent.agent_registry.keys()))
        try:
            data = request.get_json(force=True)
        except Exception:
            data = {}
        name = (data.get('name') or '').strip()
        role = (data.get('role') or '').strip()
        base_behavior = (data.get('base_behavior') or '').strip()
        if not name:
            return jsonify({'error': 'name field required'}), 400
        # Normalise agent name to lower‑case directory name
        agent_key = name.lower().replace(' ', '_')
        agents_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'core', 'agents')
        path = os.path.join(agents_dir, agent_key)
        try:
            os.makedirs(path, exist_ok=True)
            # Write config.json
            cfg = {
                'name': name,
                'role': role,
                'base_behavior': base_behavior,
            }
            with open(os.path.join(path, 'config.json'), 'w', encoding='utf-8') as f:
                json.dump(cfg, f, indent=2)
            # Create empty training file if missing
            training_path = os.path.join(path, 'training.md')
            if not os.path.exists(training_path):
                with open(training_path, 'w', encoding='utf-8') as f:
                    f.write('')
            return jsonify({'name': name, 'role': role, 'base_behavior': base_behavior})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/agents/<string:name>/train', methods=['POST'])
    @require_auth
    def api_agent_train(name: str) -> Any:
        """Upload training files for a given sub‑agent.

        Files submitted here are stored under core/knowledge/{name}/.
        The endpoint responds with the list of saved filenames and
        logs a message indicating that the training file was
        received.  No parsing or embedding is performed server‑side.
        """
        files = request.files.getlist('file')
        if not files:
            return jsonify({'error': 'no file provided'}), 400
        # Normalise agent name to match directory name
        agent_key = name.lower().replace(' ', '_')
        knowledge_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'core', 'knowledge', agent_key)
        os.makedirs(knowledge_dir, exist_ok=True)
        saved = []
        for f in files:
            filename = f.filename
            f.save(os.path.join(knowledge_dir, filename))
            saved.append(filename)
        # Log the upload in status history
        msg = f"Training file received: {', '.join(saved)}"
        status_info['history'].append(msg)
        status_info['history'] = status_info['history'][-5:]
        return jsonify({'files': saved, 'message': msg})

    @app.route('/api/chat', methods=['POST'])
    @require_auth
    def api_chat():
        data = request.get_json(force=True)
        message = (data.get('message') or '').strip()
        if not message:
            return jsonify({'error': 'Empty message'}), 400
        ajax_agent = app.config['ajax_agent']
        reply = process_chat_message(message, ajax_agent)
        timestamp = datetime.now().isoformat()
        # Append to conversation memory per project (single project for now)
        conversation = chat_memory.get('general', [])
        conversation.append({'role': 'user', 'content': message, 'timestamp': timestamp})
        conversation.append({'role': 'assistant', 'content': reply, 'timestamp': timestamp})
        # Keep only the last 10 messages in memory for brevity
        chat_memory['general'] = conversation[-10:]
        save_memory()
        # Log conversation in tasklog
        append_task_log({'timestamp': timestamp, 'task': message, 'response': reply})
        status_info['history'].append(reply)
        status_info['history'] = status_info['history'][-5:]
        status_info['current_task'] = message
        return jsonify({'response': reply, 'timestamp': timestamp})

    @app.route('/api/image', methods=['POST'])
    @require_auth
    def api_image():
        data = request.get_json(force=True)
        prompt = (data.get('prompt') or '').strip()
        if not prompt:
            return jsonify({'error': 'Empty prompt'}), 400
        try:
            status_info['live_status'] = 'working'
            url = asyncio.run(tools[ImageGeneratorTool.name].run({'prompt': prompt}))
            status_info['live_status'] = 'idle'
            status_info['history'].append(f'Generated image: {url}')
            status_info['history'] = status_info['history'][-5:]
            return jsonify({'url': url})
        except Exception as e:
            status_info['live_status'] = 'idle'
            return jsonify({'error': str(e)}), 500

    @app.route('/api/queue', methods=['GET'])
    @require_auth
    def api_queue():
        return jsonify(load_queue())

    @app.route('/api/task', methods=['POST'])
    @require_auth
    def api_task():
        """Log a new task into the queue."""
        data = request.get_json(force=True)
        task = (data.get('task') or '').strip()
        if not task:
            return jsonify({'error': 'Empty task'}), 400
        queue = load_queue()
        entry = {
            'id': len(queue) + 1,
            'task': task,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending',
        }
        queue.append(entry)
        save_queue(queue)
        append_task_log({'timestamp': entry['timestamp'], 'task': task, 'response': 'queued'})
        return jsonify(entry)

    @app.route('/api/upload', methods=['POST'])
    @require_auth
    def api_upload():
        files = request.files.getlist('file')
        if not files:
            return jsonify({'error': 'no file provided'}), 400
        saved = []
        project = request.form.get('project', 'general')
        target = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'memory', project, 'uploads')
        os.makedirs(target, exist_ok=True)
        for f in files:
            name = f.filename
            f.save(os.path.join(target, name))
            saved.append(name)
        status_info['history'].append(f'Uploaded files: {", ".join(saved)}')
        status_info['history'] = status_info['history'][-5:]
        return jsonify({'files': saved})

    @app.route('/api/status', methods=['GET'])
    @require_auth
    def api_status():
        return jsonify(status_info)
