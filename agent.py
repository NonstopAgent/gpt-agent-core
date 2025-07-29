"""
Orchestrator entry point for the GPT Agent system.

This module simply exposes the Flask application created by the
``backend.create_app`` factory.  Railway and other deployment
platforms can point to this file to run the server.  Running
``python -m agent`` will start the server locally.

Use the ``backend`` package for the implementation details.
"""

from __future__ import annotations

import os

from backend.agent import create_app

import openai 
openai.api_key = os.getenv("OPENAI_API_KEY")

# Create the Flask application using the factory.  The ``create_app``
# function sets up basic authentication, registers API endpoints and
# serves the compiled frontend.
app = create_app()


if __name__ == "__main__":
    # When executed directly, run the server on the port defined by
    # the PORT environment variable or default to 8000.
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)
