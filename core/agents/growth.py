from __future__ import annotations

from typing import Optional

from .base_agent import BaseAgent


class GrowthAgent(BaseAgent):
    """Automation agent for social media growth."""

    def run(self, action: str, payload: Optional[str] = None) -> str:
        if action == "slideshow":
            return self.generate_slideshow(payload)
        if action == "dm":
            return self.send_follow_up_dm(payload)
        if action == "scrape":
            return self.scrape_competitor(payload)
        return f"[GrowthAgent] Unknown action: {action}"

    def generate_slideshow(self, topic: Optional[str]) -> str:
        return f"[GrowthAgent] Creating slideshow for {topic or 'general topic'}"

    def send_follow_up_dm(self, account: Optional[str]) -> str:
        return f"[GrowthAgent] Sending follow-up DM to {account or 'target'}"

    def scrape_competitor(self, account: Optional[str]) -> str:
        return f"[GrowthAgent] Scraping competitor {account or 'profile'}"

    def handle_task(self, task: str) -> str:
        return self.run(task)
