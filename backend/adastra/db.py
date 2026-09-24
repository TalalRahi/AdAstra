"""The database: MongoDB Atlas.

One collection so far, "users". One document per person, keyed by their
Firebase user id:

    {
      "_id": "<firebase uid>",
      "email": "amreen@example.com",
      "name": "Amreen",
      "email_updates": {"opted_in": false, "updated_at": <date>},
      "created_at": <date>,
      "last_seen_at": <date>
    }

No passwords are stored here; Firebase keeps them.
"""

import logging
import threading
from datetime import datetime, timezone

from .config import settings

log = logging.getLogger("adastra.db")

_client = None
_lock = threading.Lock()


def db_enabled() -> bool:
    return bool(settings.mongodb_uri)


def get_db():
    """Connect once per server process and reuse the connection."""
    global _client
    if not db_enabled():
        return None
    with _lock:
        if _client is None:
            from pymongo import MongoClient

            _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000, appname="adastra")
    return _client[settings.mongodb_db]


def ping() -> bool:
    """True if the database answers (used by /api/health)."""
    db = get_db()
    if db is None:
        return False
    try:
        db.command("ping")
        return True
    except Exception as e:  # network, auth, etc.
        log.warning("database ping failed: %s", e)
        return False


def now() -> datetime:
    return datetime.now(timezone.utc)


def get_user(uid: str) -> dict | None:
    return get_db()["users"].find_one({"_id": uid})


def save_user(uid: str, email: str | None, name: str, email_updates: bool) -> dict:
    """Create the user, or update their name and email preference.

    The time of the email-updates choice is stored, and only changes when
    the choice itself changes, so it records when consent was given.
    """
    users = get_db()["users"]
    existing = users.find_one({"_id": uid})
    t = now()
    update = {"email": email, "name": name, "last_seen_at": t}
    if existing is None or existing.get("email_updates", {}).get("opted_in") != email_updates:
        update["email_updates"] = {"opted_in": email_updates, "updated_at": t}
    users.update_one({"_id": uid}, {"$set": update, "$setOnInsert": {"created_at": t}}, upsert=True)
    return users.find_one({"_id": uid})


def touch_user(uid: str, email: str | None, name: str | None) -> dict:
    """Make sure a signed-in user has a document (e.g. first visit from a new device)."""
    users = get_db()["users"]
    t = now()
    users.update_one(
        {"_id": uid},
        {
            "$set": {"email": email, "last_seen_at": t},
            "$setOnInsert": {
                "name": name or (email.split("@")[0] if email else "User"),
                "email_updates": {"opted_in": False, "updated_at": t},
                "created_at": t,
            },
        },
        upsert=True,
    )
    return users.find_one({"_id": uid})


def delete_user(uid: str) -> None:
    get_db()["users"].delete_one({"_id": uid})