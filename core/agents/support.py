from __future__ import annotations

from typing import Optional

from .base_agent import BaseAgent


class SupportAgent(BaseAgent):
    """Agent for customer service interactions."""

    def run(self, action: str, payload: Optional[str] = None) -> str:
        if action == "reply_dm":
            return self.reply_dm(payload)
        if action == "reply_comment":
            return self.reply_comment(payload)
        return f"[SupportAgent] Unknown action: {action}"

    def reply_dm(self, message: Optional[str]) -> str:
        return f"[SupportAgent] Replying to DM: {message or 'message'}"

    def reply_comment(self, message: Optional[str]) -> str:
        return f"[SupportAgent] Replying to comment: {message or 'comment'}"

    def handle_task(self, task: str) -> str:
        return self.run(task)
