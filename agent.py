from flask import Flask, send_from_directory, request, jsonify
import os

# Path to the frontend files. Originally this project expected a Vite build in
# ``frontend/dist`` but the repository only contains plain HTML and JS directly
# inside ``frontend``.  Point the static folder there so Flask can serve it.
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')


@app.route('/api/chat', methods=['POST'])
def chat() -> 'flask.Response':
    """Simple chat endpoint returning a fake response."""
    data = request.get_json(force=True)
    message = data.get('message', '')
    if not message:
        return jsonify({'error': 'Missing message'}), 400
    return jsonify({'reply': f'You said: {message}'})


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
