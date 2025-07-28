"""
BaseAgent Interface for Modular Agents
=====================================

This module defines an abstract base class that all specialised agents
within the Ajax system must extend.  Each agent must implement the
``handle_task`` method, which accepts a natural language task description
and returns a string response.  Using a common interface allows Ajax
to delegate tasks to registered agents without knowing their internal
details.
"""

from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Abstract base class for specialised agents.

    Derived agents should implement the :meth:`handle_task` method.  This
    method receives a human task description and should return a string
    response.  Raising :class:`NotImplementedError` in subclasses will
    make it clear when the interface has not been properly extended.
    """

    @abstractmethod
    def handle_task(self, task: str) -> str:
        """Process a task and return a response.

        Args:
            task: A natural language description of the task to perform.

        Returns:
            A string containing the result of the task.
        """
        raise NotImplementedError("Subclasses must implement handle_task().")
