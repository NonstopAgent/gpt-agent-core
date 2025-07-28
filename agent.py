from flask import Flask, send_from_directory, request, jsonify
import os
import json
from datetime import datetime
from openai import OpenAI

# Path to the frontend files. Originally this project expected a Vite build in
# ``frontend/dist`` but the repository only contains plain HTML and JS directly
# inside ``frontend``.  Point the static folder there so Flask can serve it.
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')


@app.route('/api/chat', methods=['POST'])
def chat() -> 'flask.Response':
    """Chat endpoint that proxies messages to OpenAI and returns the reply."""
    data = request.get_json(force=True)
    user_message = (data.get('message') or '').strip()
    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    'role': 'system',
                    'content': "You are Logan's custom business assistant Agent."
                },
                {'role': 'user', 'content': user_message},
            ],
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

    return jsonify({'response': reply})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
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
