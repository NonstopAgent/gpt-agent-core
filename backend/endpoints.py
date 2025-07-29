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


def register_api_endpoints(app: Flask, require_auth: Callable) -> None:
    """Register all API routes on the given Flask app."""
    # Tools available to Ajax
    tools = {
        'web': WebBrowserTool(),
        ImageGeneratorTool.name: ImageGeneratorTool(),
    }

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
