"""
Project and task management utilities.

This module contains helper functions to create new projects, list existing
projects and record tasks into the timeline.  Projects live under
`core/projects/` with several standard subfolders and a `project.json`
metadata file.  Tasks are recorded via the memory module.
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import List, Dict, Any

from core import memory


CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'core')
PROJECTS_DIR = os.path.join(CORE_DIR, 'projects')


def list_projects() -> List[str]:
    """Return the list of projects currently on disk."""
    if not os.path.isdir(PROJECTS_DIR):
        return []
    return [d for d in os.listdir(PROJECTS_DIR) if os.path.isdir(os.path.join(PROJECTS_DIR, d))]


def create_project(name: str) -> None:
    """Create a new project directory structure.

    The following subfolders are created for every project:
      - slides
      - captions
      - scripts
      - comments
      - drafts

    A `project.json` file is written with basic metadata.  Raises a
    FileExistsError if the project already exists.
    """
    project_path = os.path.join(PROJECTS_DIR, name)
    if os.path.exists(project_path):
        raise FileExistsError(f"Project '{name}' already exists")
    os.makedirs(project_path)
    for sub in ['slides', 'captions', 'scripts', 'comments', 'drafts']:
        os.makedirs(os.path.join(project_path, sub), exist_ok=True)
    # Write metadata
    metadata = {
        'name': name,
        'created_at': datetime.now().isoformat(),
        'description': '',
        'files': {
            'slides': [],
            'captions': [],
            'scripts': [],
            'comments': [],
            'drafts': []
        }
    }
    with open(os.path.join(project_path, 'project.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    memory.add_task(description=f"Created project '{name}'", status='done')


def add_task(description: str, status: str = 'pending') -> Dict[str, Any]:
    """Add a task to the timeline.  Wrapper around memory.add_task for
    clarity."""
    return memory.add_task(description, status)


def get_idle_behaviors() -> Dict[str, Any]:
    """Expose idle behaviours configuration through memory."""
    return memory.get_idle_behaviors()


def set_idle_behaviors(config: Dict[str, Any]) -> None:
    """Persist idle behaviours configuration."""
    memory.set_idle_behaviors(config)