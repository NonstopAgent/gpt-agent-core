"""
InvestorAgent
=============

This module defines a placeholder investor agent.  It currently echoes
the requested task and notes that the stock research functionality has
not yet been implemented.  In a future iteration this agent could
integrate with financial APIs to analyse stocks, generate trading
recommendations, and evaluate investment opportunities.
"""

from .base_agent import BaseAgent


class InvestorAgent(BaseAgent):
    """Agent responsible for handling stock analysis and trading ideas."""

    def handle_task(self, task: str) -> str:
        """Echo the task with a placeholder stock research response.

        Args:
            task: A description of the investment‑related task.

        Returns:
            A string placeholder indicating that the task has been received.
        """
        return (
            f"[InvestorAgent] Processing task: {task} "
            "(stock research functionality not yet implemented)"
        )
