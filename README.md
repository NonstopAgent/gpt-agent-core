#!/usr/bin/env markdown

# GPT Agent Core

This repository contains a fully autonomous GPT‑powered business agent designed to manage multiple social media brands, automate content workflows, and evolve its own interface over time.  The agent runs 24/7, handling tasks like creating slides, posting content, replying to DMs, analysing trends, and generating content across three projects: **Remote100K**, **Tradeview AI**, and **304 App**.

At its core is **Ajax**, a dual‑personality AI that can either act as Logan Alvarez’s tactical assistant or speak on Logan’s behalf when he’s away.  The mode is determined dynamically by presence detection, which reads the authenticated username, a UI toggle, or slash commands.  Ajax also supports delegating specialised tasks to modular sub‑agents.

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

The dashboard lives in the `frontend/` directory and is a [React](https://react.dev/) application styled with Tailwind via [Vite](https://vitejs.dev/).  The repository already contains the compiled files under `frontend/dist`, so you can run the server without installing any Node tooling.  If you want to modify the UI, install the dependencies in `frontend/` and rebuild:

```bash
cd frontend
npm install
npm run build
```

The build output will be placed in `frontend/dist` and served by the Python backend.

### Key interface elements

- **Accordion Sidebar** – A collapsible sidebar listing all brands (Remote100K, Tradeview AI, 304 App).  Each brand expands to show links for *Slides*, *Captions*, *Media Uploads* and *Chat Logs*.  Only one brand can be open at a time, and the sidebar collapses into a hamburger drawer on mobile.
- **Header** – Greets the user with a friendly “Welcome Logan 👋” at the top of the sidebar.
- **Chat UI** – A split chat interface where user messages appear on the right in grey bubbles and Ajax/Logan messages appear on the left in branded bubbles.  A sticky input bar at the bottom supports `Enter` to send and displays a loading spinner (“Ajax is working…”) while processing.
- **Presence Toggle** – A switch labelled “Logan is Present” in the sidebar.  Toggling it sends `/loganin` or `/loganout` to the backend and flips the mode between assistant (Ajax) and proxy (Logan).  The presence can also be set automatically based on the authenticated username or via slash commands in chat.
- **Dark Mode** – A theme toggle in the sidebar header and in the mobile header switches between light and dark themes.  The state is saved to `localStorage`.
- **WebView Panel** – A floating status box on the right displays the current mode (ajax or logan), the last chat command, any delegated sub‑agent, the current task progress, and a list of the most recent responses.
- **Task Queue & History** – Panels showing tasks awaiting execution (`queue.json`) and completed tasks (`tasklog.json`).
- **Upload & Image Generation** – Interfaces for uploading files to the current brand and generating images from prompts via the `/api/image` endpoint.

Feel free to extend or replace the frontend with a React or Vite implementation.  The current version serves as a working baseline when no additional packages are available.

## Backend

The backend is implemented in `agent.py` and exposes a simple HTTP API for reading and writing task queues and logs.  It now relies on a few Python packages, including [Playwright](https://playwright.dev/python/) for the built‑in `WebBrowserTool` that lets the agent fetch live web pages.  The backend also orchestrates the dual‑personality logic and registers sub‑agents.

### Dual Personality & Presence Detection

Ajax operates in one of two modes:

- **Ajax mode** (assistant) – when Logan is present.  In this mode the agent speaks like an energetic sidekick, using phrases like “On it boss” and “Got you”.
- **Logan mode** (proxy) – when Logan is away.  Here the agent adopts Logan’s confident, results‑driven voice (“DM me now and let’s make it happen”).

Presence is determined dynamically:

- **Automatic detection** – When the user authenticates using the username `logan`, `logan alvarez`, or `nonstopagent`, Ajax assumes Logan is present.
- **UI toggle** – A switch labelled “Logan is Present” in the sidebar toggles presence on the fly.  Toggling sends `/loganin` or `/loganout` commands to the backend.
- **Slash commands** – Typing `/loganin` or `/loganout` in chat will switch modes programmatically.

The current mode, last command, delegated agent and recent responses are exposed via `/api/status` for live display in the WebView panel.

### Modular Agent System

Ajax is designed to delegate specialised tasks to subordinate agents.  Each sub‑agent implements a `handle_task(task)` method and lives in the `core/agents/` folder.  The default implementation registers the following agents:

| Agent name | File | Description |
| --- | --- | --- |
| `investor` | `core/agents/investor_agent.py` | Provides basic responses to stock analysis and trade ideas. |
| `fanpage` | `core/agents/fanpage_agent.py` | Handles daily content generation for fan pages. |
| `support` | `core/agents/support_agent.py` | Responds to common customer questions or FAQs. |
| `growth` | `core/agents/growth_agent.py` | Analyses social metrics and generates calls‑to‑action or captions. |

To delegate a task, send `/delegate <agent> <task>` in chat (e.g., `/delegate investor Analyse the latest earnings report for Tesla`).  Ajax will route the task to the specified sub‑agent and return the result.  Delegation actions are logged in the WebView panel.

Adding new agents is straightforward: create a new class in `core/agents/` that inherits from `BaseAgent` and implements `handle_task()`, then call `ajax.register_agent(name, MyAgent())` in `build_default_ajax()`.

### Running the server

```bash
python3 agent.py
```

The server will start on port 8000 by default (or whatever value you set in the
`PORT` environment variable).  Visit `http://localhost:8000` in your browser to
load the dashboard.

### Running 24/7

If you want the agent to run continuously on a server you can install it as a
`systemd` service.  A sample unit file is provided in `deploy/agent.service`.
Edit the paths and user, copy it to `/etc/systemd/system/`, then enable and
start the service:

```bash
sudo cp deploy/agent.service /etc/systemd/system/gpt-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now gpt-agent.service
```

The dashboard will then be accessible on the configured port whenever the
machine is running.

### API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET  | `/api/queue` | Return the list of scheduled tasks from `logs/queue.json`. |
| GET  | `/api/logs` | Return the list of completed tasks from `logs/tasklog.json`. |
| GET  | `/api/memory/<brand>` | Return the memory file for a given brand (`remote100k`, `tradeviewai`, or `304app`). |
| POST | `/api/chat` | Accept a JSON payload containing `{ "message": "…" }` and return a generated response.  Slash commands beginning with `/loganin`, `/loganout`, or `/delegate` are handled specially: `/loganin` sets Logan as present (assistant mode), `/loganout` sets Logan as away (Logan mode), and `/delegate <agent> <task>` routes the task to a registered sub‑agent. |
| POST | `/api/upload` | Accept file uploads for the current project and store them in the `memory/<brand>/uploads` directory. |
| GET  | `/api/status` | Return the real‑time status for the agent (mode, last command, delegation, progress and recent history).  Requires basic authentication. |

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