"""
Entry point for the GPT Agent backend.

This module builds a Flask application, configures middleware,
registers API endpoints and serves the compiled frontend.  It
coordinates between the Ajax AI core, task logging and the React UI.

To run the server locally:

    python -m backend.agent

The app reads basic authentication credentials from the environment
variables ``BASIC_USER`` and ``BASIC_PASS`` and persists task and
conversation history in the ``logs/`` folder.
"""

from __future__ import annotations

import os
import json
from flask import Flask, request, jsonify, Response, send_from_directory
from functools import wraps
from datetime import datetime
from typing import List

from core.ajax_ai import build_default_ajax
from .endpoints import register_api_endpoints

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')


def create_app() -> Flask:
    """Factory to create and configure the Flask app."""
    app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')

    # Basic auth credentials from env or defaults
    BASIC_USER = os.getenv('BASIC_USER', 'logan')
    BASIC_PASS = os.getenv('BASIC_PASS', 'AllDay21!!!')

    def require_auth(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.authorization
            if not auth or auth.username != BASIC_USER or auth.password != BASIC_PASS:
                return Response(
                    'Authentication required',
                    401,
                    {'WWW-Authenticate': 'Basic realm=Login'},
                )
            return fn(*args, **kwargs)
        return wrapper

    # Expose the Ajax AI instance and status globally on the app
    ajax_agent = build_default_ajax()
    app.config['ajax_agent'] = ajax_agent

    # Register API endpoints
    register_api_endpoints(app, require_auth)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    @require_auth
    def serve_frontend(path: str):
        """Serve the compiled React app from the dist directory."""
        target = os.path.join(app.static_folder, path)
        if path and os.path.exists(target):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    create_app().run(host='0.0.0.0', port=port)