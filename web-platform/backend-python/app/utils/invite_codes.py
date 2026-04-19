"""
Helpers for generating and normalising in-person invite short codes.

The alphabet excludes characters that look alike on a low-quality phone
screen or get misheard over the phone — `0/O`, `1/I/L`. This keeps the
code unambiguous for the in-person handoff use case.
"""

import secrets
import string

# 31 chars: digits 2-9 + uppercase A-Z minus O, I, L.
INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
INVITE_CODE_LENGTH = 6


def generate_short_code() -> str:
    """Return a fresh 6-character alphanumeric invite code."""
    return "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))


def normalise_short_code(raw: str) -> str:
    """
    Normalise user-typed code: uppercase + strip whitespace, dashes, and
    any character that isn't part of the alphabet. We deliberately do NOT
    try to auto-correct look-alikes (0↔O, 1↔I↔L) because the generator
    never emits those characters, so any of them in the input is a typo
    that we can't disambiguate — better to fail the lookup and let the
    recipient re-read the code than to silently substitute and look up a
    different valid code.
    """
    if not raw:
        return ""
    return "".join(ch for ch in raw.upper() if ch in INVITE_CODE_ALPHABET)
