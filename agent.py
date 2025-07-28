from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/')
def index() -> str:
    """Default route used as a health check."""
    return "GPT Agent is running"


@app.route('/api/chat', methods=['POST'])
def chat():
    """Return a dummy chat response."""
    data = request.get_json(force=True)
    message = data.get('message')
    if not message:
        return jsonify({'error': 'Missing message'}), 400
    return jsonify({'reply': 'This is a test response.'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
