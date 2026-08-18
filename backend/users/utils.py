"""Helpers for representing users in the UI."""

from django.contrib.auth.models import User


def get_initials(user: User) -> str:
    """Return a short (max 2 char) uppercase identifier for a user.

    "Alireza Goldoust" -> "AG"
    "alice" (no names)  -> "AL"
    Falls back to "?" only when nothing usable exists.
    """
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()

    if first and last:
        return f"{first[0]}{last[0]}".upper()
    if first:
        return first[:2].upper()
    if last:
        return last[:2].upper()

    username = (user.username or "").strip()
    if username:
        return username[:2].upper()

    return "?"


def display_name(user: User) -> str:
    """Return the best human-readable name for a user."""
    full = user.get_full_name().strip()
    return full or user.username
