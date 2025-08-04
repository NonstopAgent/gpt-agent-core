from __future__ import annotations

from typing import Optional

from .base_agent import BaseAgent


class OpsAgent(BaseAgent):
    """Operations agent for task queues and notifications."""

    def run(self, action: str, payload: Optional[str] = None) -> str:
        if action == "queue_task":
            return self.queue_task(payload)
        if action == "stats":
            return self.report_stats()
        if action == "notify":
            return self.send_notification(payload)
        return f"[OpsAgent] Unknown action: {action}"

    def queue_task(self, task: Optional[str]) -> str:
        return f"[OpsAgent] Queued task: {task or 'task'}"

    def report_stats(self) -> str:
        return "[OpsAgent] Reporting system stats"

    def send_notification(self, message: Optional[str]) -> str:
        return f"[OpsAgent] Sending notification: {message or 'message'}"

    def handle_task(self, task: str) -> str:
        return self.run(task)
