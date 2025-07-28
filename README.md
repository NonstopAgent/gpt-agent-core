#!/usr/bin/env markdown

# GPT Agent Core

This repository contains a fully autonomous GPT‑powered business agent designed to manage multiple social media brands, automate content workflows, and evolve its own interface over time. The agent runs 24/7, handling tasks like creating slides, posting content, replying to DMs, analysing trends, and generating content across three projects: **Remote100K**, **Tradeview AI**, and **304 App**.

## Project Structure

```
gpt-agent-core/
├── frontend/                 # Dashboard UI built with vanilla HTML, CSS, and JS
├── memory/                   # Persistent memory files for each brand
│   ├── remote100k/
│   │   └── memory.json
│   ├── tradeviewai/
│   │   └── memory.json
│   └── 304app/
│       └── memory.json
├── logs/                     # Task history and queue
│   ├── tasklog.json
│   └── queue.json
├── agent.py                  # Minimal backend server handling API requests
├── .env                      # Environment variables (placeholder values only)
└── README.md                 # This file
```

## Frontend

The dashboard lives in the `frontend/` directory and is intentionally implemented without external build tools such as React or Vite.  This makes it lightweight and easy to run in any environment, even when package installation is restricted.  Tailwind CSS is included via CDN for rapid styling, and the interface is composed of vanilla HTML and JavaScript.

Key interface elements include:

- **Sidebar**: lists the three projects (Remote100K, Tradeview AI, and 304 App) with links to view slides, captions, saved prompts, and uploads.
- **Chat Interface**: lets you enter commands for the agent and displays responses.
- **Daily Task Panel**: shows the default schedule along with any scheduled tasks pulled from `queue.json`.
- **Task Queue and History**: displays tasks awaiting execution and completed tasks from `tasklog.json`.
- **Upload Panel**: drag‑and‑drop area for uploading images or files to each project folder (currently a stub; the backend accepts uploads but does not process them yet).
- **Activity Status**: shows whether the agent is idle, running, or encountered an error, plus the last and next task times.

Feel free to extend or replace the frontend with a React or Vite implementation.  The current version serves as a working baseline when no additional packages are available.

## Backend

The backend is implemented in `agent.py` using only the Python standard library.  It exposes a simple HTTP API for reading and writing task queues and logs, and it serves the files in the `frontend/` directory.  Because no third‑party dependencies are used, it can run in environments without network access to external package registries.

### Running the server

```bash
python3 agent.py
```

The server will start on port 8000 by default (or whatever value you set in the
`PORT` environment variable).  Visit `http://localhost:8000` in your browser to
load the dashboard.

### API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET  | `/api/queue` | Return the list of scheduled tasks from `logs/queue.json`. |
| GET  | `/api/logs` | Return the list of completed tasks from `logs/tasklog.json`. |
| GET  | `/api/memory/<brand>` | Return the memory file for a given brand (`remote100k`, `tradeviewai`, or `304app`). |
| POST | `/api/chat` | Accept a JSON payload containing `{ "command": "…" }`, append it to the task queue, and return a confirmation. |
| POST | `/api/upload` | Accept file uploads and return a placeholder response. |

## Environment Variables

Credentials and other secrets should be provided via `.env`.  Populate this file with the necessary values for your own deployments.  This example includes placeholders for social media and payment credentials:

```
INSTAGRAM_USERNAME_REMOTE100K=
INSTAGRAM_PASSWORD_REMOTE100K=
STRIPE_API_KEY_TRADEVIEW=
```

## Memory Files

Each brand has its own persistent memory file stored under the `memory/` directory.  These JSON files are initially empty and will accumulate design styles, caption templates, hashtag rules, content strategy notes, and post performance data over time.  The backend does not yet automatically update these files—it is your responsibility to integrate memory writes into your own task functions.

## Logs

Two log files track task history and scheduled tasks:

- `logs/tasklog.json` — completed tasks with timestamps and results.
- `logs/queue.json` — tasks awaiting execution with timestamps.

You can view and manage these logs directly through the dashboard or by editing the JSON files manually.  The backend reads and writes these files automatically when processing commands.

## License

This project is licensed under the MIT License.  See `LICENSE` for more information.