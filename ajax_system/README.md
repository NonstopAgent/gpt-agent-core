# AJAX Platform

This repository contains the source code for **AJAX**, a multi‑agent platform designed to assist with content creation, project management and autonomous tasks.  AJAX is built as a full stack application composed of a Flask backend and a Vite/React frontend.  The system is designed to switch between two personalities (Logan and Ajax), manage multiple projects and agents, and perform automated actions when idle.

## Repository Structure

```
.
├── core/               # Backend logic
│   ├── ajax_ai.py      # Dual personality controller
│   ├── agent.py        # Agent management (creation/loading)
│   ├── memory.py       # Persistent state and logging helpers
│   ├── tasks.py        # Background task scheduler and tracking
│   ├── agents/         # Predefined agents
│   │   ├── investor/
│   │   │   ├── config.json
│   │   │   └── training.md
│   │   ├── content/
│   │   └── growth/
│   └── knowledge/      # Uploaded training files live here
├── frontend/           # Vite/React application
│   ├── index.html
│   ├── vite.config.js
│   └── components/
│       ├── Sidebar.jsx
│       ├── ChatBox.jsx
│       └── Dashboard.jsx
├── logs/               # JSON and text logs created by the backend
├── public/             # Static assets served by the frontend
├── .env                # Local environment variables (never commit secrets)
├── main.py             # Entry point for the Flask application
├── requirements.txt    # Python backend dependencies
├── package.json        # Frontend dependencies and build scripts
└── README.md           # This file
```

## Getting Started

1. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node dependencies** (for the frontend)

   ```bash
   npm install
   ```

3. **Run the Flask backend**

   ```bash
   python main.py
   ```

4. **Run the frontend**

   In a separate terminal, start Vite:

   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` by default.

## Key Features

- **Dual Personality Mode** – AJAX can switch between Logan (decisive and direct) and Ajax (supportive and assistant‑like) modes via `/loganin` and `/loganout` endpoints.  The current mode is persisted on disk.
- **Project Management** – Users can create projects from the sidebar.  Each project creates a folder under `core/projects/` and maintains its own data, including slides, captions, scripts, comments and drafts.
- **Sub‑Agent System** – Individual AI agents live in their own subfolders under `core/agents/`.  Each agent defines its role, skills and permissions in a `config.json` and can be trained via uploaded files stored in `core/knowledge/{agent}/`.
- **Training Uploads** – Through the frontend, training files (`.txt`, `.md` or `.docx`) can be uploaded and will be parsed and stored.  The backend includes a simple summarisation routine to embed key ideas into the agent’s memory.
- **Social Integrations** – Projects can connect to TikTok, Instagram, Facebook or Gmail accounts.  OAuth tokens or manual credentials are stored in the `.env` file using project‑specific keys.
- **Real‑Time Task WebView** – A dashboard panel shows live tasks being executed by the system, with a timeline, status icons and Chicago timestamps.  Dark mode and mobile responsiveness are supported.
- **Background Thinking and Self‑Training** – When idle, AJAX follows behaviours defined in `idle_behaviors.json` (e.g. scanning comments, reviewing spreadsheets or reading financial news).  All actions are timestamped and logged.

## Contributing

This codebase is still under active development.  Feel free to open issues and submit pull requests to improve the system.