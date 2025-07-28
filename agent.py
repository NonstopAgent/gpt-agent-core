from flask import Flask, request, jsonify
from pathlib import Path
import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI()

BASE_DIR = Path(__file__).resolve().parent
MEMORY_FILE = BASE_DIR / 'memory' / 'chat_memory.json'

app = Flask(__name__)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    project = data.get('project')
    message = data.get('message')
    app.logger.info('POST /api/chat called for %s', project)
    if not project or not message:
        return jsonify({'error': 'Missing project or message'}), 400
    memory = {}
    if MEMORY_FILE.exists():
        with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
            memory = json.load(f)
    instructions = memory.get(project, {}).get('instructions', '')
    history = memory.get(project, {}).get('messages', [])
    messages = ([{'role': 'system', 'content': instructions}] +
                history + [{'role': 'user', 'content': message}])
    try:
        response = client.chat.completions.create(model='gpt-4', messages=messages)
        reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error('Error from OpenAI: %s', e)
        return jsonify({'error': str(e)}), 500
    memory.setdefault(project, {}).setdefault('messages', [])
    memory[project]['messages'] = history + [{'role': 'user', 'content': message}, {'role': 'assistant', 'content': reply}]
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(memory, f, indent=2)
    return jsonify({'reply': reply})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)
