"""
Password hashing for the `users` table.

PBKDF2-HMAC-SHA256 out of the standard library, so signing in needs no
dependency beyond what the API already ships with. A stored value looks like

    pbkdf2_sha256$240000$<salt hex>$<derived key hex>

— the parameters travel with the hash, so raising the iteration count later
does not invalidate passwords already stored under the old one.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 240_000


def hash_password(password: str) -> str:
    """Hash a plaintext password with a fresh random salt."""
    salt = secrets.token_hex(16)
    return f"{ALGORITHM}${ITERATIONS}${salt}${_derive(password, salt, ITERATIONS)}"


def verify_password(password: str, stored: str) -> bool:
    """
    Check a password against a stored hash.

    Any hash this module did not write — a malformed value, or one from an
    algorithm we no longer understand — fails closed rather than raising.
    """
    try:
        algorithm, iterations, salt, expected = stored.split("$")
        if algorithm != ALGORITHM:
            return False
        candidate = _derive(password, salt, int(iterations))
    except (AttributeError, ValueError):
        return False
    # Constant time, so a wrong password cannot be narrowed down by timing.
    return hmac.compare_digest(candidate, expected)


def _derive(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations
    ).hex()
