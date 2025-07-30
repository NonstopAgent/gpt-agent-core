"""
Primary AI orchestrator for the AJAX platform.

This module defines the dual personality system used by AJAX.  Depending
on whether the application is in Logan or Ajax mode, responses are
generated with different tones.  Additional logic (such as background
thinking) could be added here in the future.
"""

from __future__ import annotations

from typing import Dict
from core import memory


def respond(message: str) -> str:
    """Generate a reply based on the current personality mode.

    In Logan mode the response is direct, decisive and mirrors Logan’s
    thinking.  In Ajax mode the response is supportive and assistant‑like.
    This simplified implementation simply modifies the tone of the reply.
    """
    mode = memory.get_mode()
    if mode == 'Logan':
        # Logan speaks in the first person, direct and concise
        reply = f"[Logan] {message}"
    else:
        # Ajax mode is friendly and supportive
        reply = f"[Ajax] I understand! {message}"
    # Log the response generation as a completed task
    memory.add_task(description=f"Responded in {mode} mode", status='done')
    return reply


def current_mode() -> str:
    """Convenience wrapper around memory.get_mode."""
    return memory.get_mode()


def switch_mode(mode: str) -> None:
    """Convenience wrapper to switch the active mode."""
    memory.set_mode(mode)