"""
Ajax Dual-Personality AI System
================================

This module defines a dual‑mode AI agent called Ajax.  Ajax can operate
either as an assistant to Logan Alvarez (when Logan is present) or
as a proxy for Logan (when Logan is not present).  It is structured
to be modular so additional specialised agents can be registered and
managed by Ajax in the future.

The design goals for this module are:

* Provide a simple flag (`is_logan_present`) to switch between Ajax
  mode and Logan mode.
* Encode the distinct personalities and behaviours for each mode.
* Offer a `generate_response` method that adapts its tone and content
  based on the current mode.
* Establish a registry for future sub‑agents (e.g., investor, fanpage,
  support, growth agents) that Ajax can delegate tasks to.
* Be easily extensible and maintainable without entangling business logic
  with the core personality definitions.

Usage example:

    >>> ajax = AjaxAI()
    >>> ajax.is_logan_present = True  # Logan is currently interacting
    >>> print(ajax.generate_response("Can you send a follow‑up email?"))
    On it boss — I’ll draft that follow‑up email now.

    >>> ajax.is_logan_present = False  # Logan has stepped away
    >>> print(ajax.generate_response("Your product seems interesting."))
    Thanks for reaching out — DM me now and let’s make it happen.

Feel free to extend this class or register additional agents using
`register_agent()` to build a multi‑agent system.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Personality:
    """Defines the stylistic and behavioural attributes of a mode.

    Each personality contains a concise description and several
    example phrases that can be mixed into generated responses.  This
    structure makes it easy to adjust tone without modifying core
    logic.
    """
    description: str
    example_phrases: List[str]

    def choose_phrase(self) -> str:
        """Select a representative phrase from the examples.

        For simplicity, this method returns the first phrase in the list.
        In a more advanced implementation, this could rotate through
        phrases or use a random selection for variety.
        """
        return self.example_phrases[0] if self.example_phrases else ""


# Import the abstract base class and concrete agents from the agents package.
from .agents.base_agent import BaseAgent
from .agents.investor_agent import InvestorAgent
from .agents.fanpage_agent import FanpageAgent
from .agents.support_agent import SupportAgent
from .agents.growth_agent import GrowthAgent


class AjaxAI(BaseAgent):
    """The core dual‑personality AI agent.

    Ajax can operate in two modes:

    * **Ajax mode** – Logan is present.  The agent behaves like a loyal,
      energetic assistant.
    * **Logan mode** – Logan is absent.  The agent speaks on Logan’s
      behalf, adopting his confident, results‑driven tone.

    The agent also maintains a registry of subordinate agents to
    delegate tasks in future extensions.
    """

    def __init__(self, is_logan_present: bool = True) -> None:
        # Presence flag.  Set to True when Logan is actively engaging
        # with the agent, and False when the agent is acting on Logan’s
        # behalf.
        self.is_logan_present: bool = is_logan_present

        # Define personalities for each mode.
        # Personalities for each mode.  These reflect Logan’s voice
        # (direct, informal, confident) and the assistant’s tone
        # (helpful, smart, loyal).  Feel free to expand the phrases to
        # match Logan’s brand.  Avoid corporate jargon or apologetic
        # language and never reference being a language model.
        self.personalities: Dict[str, Personality] = {
            "ajax": Personality(
                description=(
                    "Helpful, confident best friend.  Casual, bold, smart and real —"
                    " acts like Logan’s right‑hand person when he’s present."
                ),
                example_phrases=[
                    "On it, boss!",  # casual acknowledgement
                    "Got you.",
                    "Here’s what we’ll do.",
                    "Let me handle that while you crush the big stuff.",
                    "I’ll make it happen.",
                ],
            ),
            "logan": Personality(
                description=(
                    "Direct, informal and competitive business owner.  Speaks with"
                    " authority, urgency and authenticity."
                ),
                example_phrases=[
                    "DM me now and let’s make it happen.",
                    "Here’s how we’ll hit that 10K/month.",
                    "I built this from zero — so can you.",
                    "No gimmicks.  Just results.",
                ],
            ),
        }

        # Agent registry for future specialised agents.  Keys are
        # agent names; values are callables that take a task string
        # and return a response string.
        self.agent_registry: Dict[str, BaseAgent] = {}

    def register_agent(self, name: str, agent: BaseAgent) -> None:
        """Register a subordinate agent for task delegation.

        Args:
            name: Unique identifier for the agent.
            agent: An instance of BaseAgent (or subclass).

        Raises:
            ValueError: If an agent with the same name is already registered.
        """
        if name in self.agent_registry:
            raise ValueError(f"Agent '{name}' is already registered.")
        self.agent_registry[name] = agent

    def delegate(self, name: str, task: str) -> str:
        """Delegate a task to a registered agent.

        Args:
            name: The name of the agent to handle the task.
            task: A string describing the task.

        Returns:
            The response from the delegated agent.

        Raises:
            KeyError: If the specified agent is not registered.
        """
        if name not in self.agent_registry:
            raise KeyError(f"No agent registered under name '{name}'.")
        # Use the agent's handle_task method to process the task
        return self.agent_registry[name].handle_task(task)

    def generate_response(self, prompt: str) -> str:
        """Generate a response based on the current mode and user prompt.

        This method embodies the core dual‑mode logic.  It selects
        appropriate starter phrases and constructs a reply that reflects
        either the Ajax personality or the Logan personality.  The
        prompt itself is not analysed for meaning; it is echoed back
        alongside the personality‑specific framing to illustrate how
        the system might wrap user input.

        Args:
            prompt: The user’s raw input string.

        Returns:
            A response string that reflects the current mode.
        """
        # Choose the appropriate personality based on presence
        if self.is_logan_present:
            personality = self.personalities["ajax"]
        else:
            personality = self.personalities["logan"]
        lead_in = personality.choose_phrase()
        # Construct a reply that echoes the user’s prompt in a friendly,
        # conversational manner.  Keep it succinct and avoid overly
        # formal language.  If Logan is away, the message should still
        # feel like him speaking directly.
        if self.is_logan_present:
            return f"{lead_in} — {prompt}"
        else:
            return f"{lead_in} {prompt}"

    # Implementation of BaseAgent interface
    def handle_task(self, task: str) -> str:
        """Process a task directed to Ajax itself.

        In this simple example, processing a task is equivalent to
        generating a response.  In a more sophisticated system, this
        method could parse tasks, determine whether to handle them
        directly or delegate to registered agents, and then compile
        a comprehensive reply.
        """
        return self.generate_response(task)


# Example skeletons for future specialised agents



def build_default_ajax() -> AjaxAI:
    """Factory function to build an AjaxAI instance with some agents.

    Registers placeholder agents to illustrate how the registry works.
    This function can be used by clients to instantiate a pre‑configured
    Ajax agent.
    """
    ajax = AjaxAI()
    ajax.register_agent("investor", InvestorAgent())
    ajax.register_agent("fanpage", FanpageAgent())
    ajax.register_agent("support", SupportAgent())
    ajax.register_agent("growth", GrowthAgent())
    return ajax


if __name__ == "__main__":
    # Demonstration when run directly.  This shows how the agent
    # switches modes and delegates tasks.
    ajax = build_default_ajax()

    # Logan is present: assistant mode
    ajax.is_logan_present = True
    print(ajax.generate_response("Schedule my meeting for tomorrow at 10 AM."))

    # Logan steps away: Logan mode
    ajax.is_logan_present = False
    print(ajax.generate_response("I appreciate your interest in our product."))

    # Delegating a task to a registered agent
    ajax.is_logan_present = True
    result = ajax.delegate("investor", "Analyse the latest earnings report for Tesla.")
    print(result)
