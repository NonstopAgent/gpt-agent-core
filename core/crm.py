from __future__ import annotations

import json
import os
from typing import Any, Dict, List


class CRM:
    """Simple CRM storage backed by a JSON file."""

    def __init__(self, path: str | None = None) -> None:
        self.path = path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "memory", "crm.json"
        )
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                self.data: Dict[str, Any] = json.load(f)
        else:
            self.data = {
                "remote100k": {"subs": []},
                "tradeview_ai": {"demos": []},
                "app_304": {"leads": []},
            }
            self._save()

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

    # --- Remote100K subscribers ---
    def add_remote100k_sub(self, email: str, plan: str, entry_point: str) -> None:
        self.data.setdefault("remote100k", {}).setdefault("subs", []).append(
            {"email": email, "plan": plan, "entry_point": entry_point}
        )
        self._save()

    # --- Tradeview demo requests ---
    def add_tradeview_demo(self, timestamp: str, contact: str) -> None:
        self.data.setdefault("tradeview_ai", {}).setdefault("demos", []).append(
            {"timestamp": timestamp, "contact": contact}
        )
        self._save()

    # --- TikTok DM leads for 304 App ---
    def add_tiktok_lead(self, name: str, account: str, source: str) -> None:
        self.data.setdefault("app_304", {}).setdefault("leads", []).append(
            {"name": name, "account": account, "source": source}
        )
        self._save()

    def get_brand(self, brand: str) -> Any:
        return self.data.get(brand, {})
