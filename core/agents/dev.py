from __future__ import annotations

from typing import Optional

from .base_agent import BaseAgent


class DevAgent(BaseAgent):
    """Agent for code generation and editing."""

    def run(self, action: str, payload: Optional[str] = None) -> str:
        if action == "react_component":
            return self.write_react_component(payload)
        if action == "fix_backend_bug":
            return self.fix_backend_bug(payload)
        if action == "tailwind_card":
            return self.generate_tailwind_card(payload)
        return f"[DevAgent] Unknown action: {action}"

    def write_react_component(self, spec: Optional[str]) -> str:
        return f"[DevAgent] Writing React component for {spec or 'feature'}"

    def fix_backend_bug(self, description: Optional[str]) -> str:
        return f"[DevAgent] Fixing backend bug: {description or 'issue'}"

    def generate_tailwind_card(self, spec: Optional[str]) -> str:
        return f"[DevAgent] Generating Tailwind card for {spec or 'content'}"

    def handle_task(self, task: str) -> str:
        return self.run(task)
