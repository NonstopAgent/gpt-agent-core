"""
Agent management utilities.

This module exposes functions to create and manage individual AI agents.
Each agent lives in its own subfolder under `core/agents/` and has an
associated `config.json` describing its role and behaviour as well as a
`training.md` file for human‑readable notes.  Uploaded training files are
stored under `core/knowledge/{agent}/` and may be summarised into the
agent’s training file.
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import List, Dict, Any

from core import memory

try:
    import docx  # type: ignore
except ImportError:
    docx = None  # fallback if python-docx is not installed


CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'core')
AGENTS_DIR = os.path.join(CORE_DIR, 'agents')
KNOWLEDGE_DIR = os.path.join(CORE_DIR, 'knowledge')


def list_agents() -> List[str]:
    """Return the names of all configured agents."""
    if not os.path.isdir(AGENTS_DIR):
        return []
    return [d for d in os.listdir(AGENTS_DIR) if os.path.isdir(os.path.join(AGENTS_DIR, d))]


def create_agent(name: str, role: str, base_behavior: str) -> None:
    """Create a new agent on disk with the given name, role and behaviour.

    Raises a FileExistsError if the agent already exists.
    """
    agent_path = os.path.join(AGENTS_DIR, name)
    if os.path.exists(agent_path):
        raise FileExistsError(f"Agent '{name}' already exists")
    # Create directories
    os.makedirs(agent_path, exist_ok=True)
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
    os.makedirs(os.path.join(KNOWLEDGE_DIR, name), exist_ok=True)
    # Write config
    created_at = datetime.now().isoformat()
    config = {
        'name': name,
        'role': role,
        'base_behavior': base_behavior,
        'created_at': created_at,
        'permissions': []
    }
    with open(os.path.join(agent_path, 'config.json'), 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    # Write an empty training.md file
    with open(os.path.join(agent_path, 'training.md'), 'w', encoding='utf-8') as f:
        f.write(f"# Training for {name}\n\n")
        if base_behavior:
            f.write(f"Base behaviour: {base_behavior}\n")
    memory.add_task(description=f"Created agent '{name}'", status='done')


def _extract_text_from_docx(content: bytes) -> str:
    """Extract plain text from a DOCX file.  Requires python-docx.  If
    python-docx is not available, returns an empty string."""
    if docx is None:
        return ''
    from io import BytesIO
    document = docx.Document(BytesIO(content))
    paragraphs = [p.text for p in document.paragraphs]
    return '\n'.join(paragraphs)


def _summarise_text(text: str, max_words: int = 200) -> str:
    """Very simple summarisation: return the first `max_words` words from
    the provided text."""
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return ' '.join(words[:max_words]).strip() + '...'


def upload_training_file(agent_name: str, filename: str, content: bytes, summarise: bool = True) -> None:
    """Store an uploaded training file for an agent.

    The raw file is written into `core/knowledge/{agent}/`.  For supported
    text formats (`.txt`, `.md`, `.docx`) the file is parsed into plain
    text and optionally summarised.  The resulting summary is appended to
    the agent’s `training.md` file under a heading with the filename.
    """
    agent_path = os.path.join(AGENTS_DIR, agent_name)
    knowledge_path = os.path.join(KNOWLEDGE_DIR, agent_name)
    if not os.path.isdir(agent_path):
        raise FileNotFoundError(f"Agent {agent_name} not found")
    os.makedirs(knowledge_path, exist_ok=True)
    # Save the raw file
    file_path = os.path.join(knowledge_path, filename)
    with open(file_path, 'wb') as f:
        f.write(content)
    # Determine text content
    ext = os.path.splitext(filename)[1].lower()
    text = ''
    try:
        if ext in {'.txt', '.md'}:
            text = content.decode('utf-8', errors='ignore')
        elif ext == '.docx':
            text = _extract_text_from_docx(content)
    except Exception:
        text = ''
    # Summarise if requested
    summary = ''
    if text and summarise:
        summary = _summarise_text(text)
    # Append summary to training.md
    training_md_path = os.path.join(agent_path, 'training.md')
    if summary:
        with open(training_md_path, 'a', encoding='utf-8') as f:
            f.write(f"\n## Summary of {filename}\n\n")
            f.write(summary + '\n')
    # Log the upload event
    memory.add_task(description=f"Training file received: {filename}", status='done')