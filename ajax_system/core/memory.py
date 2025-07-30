"""
Persistent state and logging utilities for the AJAX platform.

This module provides helper functions for reading and writing JSON files
that store the AI's current mode, the task timeline and other bits of
configuration.  Using a central location for persistence keeps the rest
of the codebase simple and avoids duplicate logic.
"""

from __future__ import annotations

import os
import json
from typing import Any, Dict, List
from datetime import datetime
try:
    # Python 3.9+ includes zoneinfo
    from zoneinfo import ZoneInfo  # type: ignore
except ImportError:
    from tzdata import ZoneInfo  # type: ignore[assignment]


# Base directories
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE_DIR = os.path.join(ROOT_DIR, 'core')
LOGS_DIR = os.path.join(ROOT_DIR, 'logs')

# Paths to persistent files
STATE_FILE = os.path.join(CORE_DIR, 'agent_state.json')
TASKS_FILE = os.path.join(LOGS_DIR, 'tasks.json')
IDLE_BEHAVIORS_FILE = os.path.join(CORE_DIR, 'idle_behaviors.json')


def _read_json(path: str, default: Any) -> Any:
    """Read JSON data from a file.  Returns default if file does not exist or
    cannot be parsed."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _write_json(path: str, data: Any) -> None:
    """Write JSON data to a file, creating parent directories if needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_state() -> Dict[str, Any]:
    """Return the current state dictionary.  If the file doesn't exist a
    default state is created with Ajax mode."""
    state = _read_json(STATE_FILE, {})
    if 'mode' not in state:
        state['mode'] = 'Ajax'
    return state


def set_mode(mode: str) -> None:
    """Persist the current personality mode."""
    state = get_state()
    state['mode'] = mode
    _write_json(STATE_FILE, state)
    # Record the mode change as a task for the timeline
    add_task(description=f"Switched mode to {mode}", status='done')


def get_mode() -> str:
    """Retrieve the current personality mode (Ajax or Logan)."""
    return get_state().get('mode', 'Ajax')


def add_task(description: str, status: str = 'pending') -> Dict[str, Any]:
    """Append a new task to the tasks timeline and return it.  Each task
    includes an ID, description, status and timestamp in America/Chicago."""
    tasks = get_tasks()
    task_id = len(tasks) + 1
    timestamp = datetime.now(ZoneInfo('America/Chicago')).isoformat()
    task = {
        'id': task_id,
        'description': description,
        'status': status,
        'timestamp': timestamp,
    }
    tasks.append(task)
    _write_json(TASKS_FILE, tasks)
    return task


def get_tasks() -> List[Dict[str, Any]]:
    """Return the list of all logged tasks."""
    return _read_json(TASKS_FILE, [])


def get_idle_behaviors() -> Dict[str, Any]:
    """Load the idle behaviours configuration."""
    return _read_json(IDLE_BEHAVIORS_FILE, {})


def set_idle_behaviors(config: Dict[str, Any]) -> None:
    """Persist the idle behaviours configuration."""
    _write_json(IDLE_BEHAVIORS_FILE, config)
    add_task(description="Updated idle behaviours configuration", status='done')