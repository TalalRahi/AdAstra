"""Checking who is signed in.

Firebase Authentication handles sign-up, sign-in and passwords. After a user
signs in, the browser gets an "ID token": a signed pass saying "this is user X,
valid for 1 hour". The browser sends it with every request in the header
    Authorization: Bearer <token>
This file checks that pass. AdAstra never sees or stores passwords.

How the check works (Firebase's documented rules for ID tokens):
  1. The signature must match one of Google's public certificates
     (fetched from Google, kept for 1 hour).
  2. "aud" (audience) must be our Firebase project id.
  3. "iss" (issuer) must be https://securetoken.google.com/<project id>.
  4. It must not be expired, and "sub" (the user id) must not be empty.
"""

import threading
import time

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth import exceptions as google_exceptions
from google.auth import jwt
from pydantic import BaseModel

from .config import settings

CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
CERTS_MAX_AGE_S = 3600

_certs: dict[str, str] = {}
_certs_fetched_at = 0.0
_certs_lock = threading.Lock()

bearer = HTTPBearer(auto_error=False)  # reads the "Authorization: Bearer ..." header


class AuthUser(BaseModel):
    uid: str
    email: str | None = None
    email_verified: bool = False
    name: str | None = None


class AuthError(Exception):
    pass


def auth_enabled() -> bool:
    return bool(settings.firebase_project_id)


def _get_certs() -> dict[str, str]:
    """Google's public certificates, downloaded at most once an hour."""
    global _certs, _certs_fetched_at
    with _certs_lock:
        if not _certs or time.time() - _certs_fetched_at > CERTS_MAX_AGE_S:
            r = requests.get(CERTS_URL, timeout=10)
            r.raise_for_status()
            _certs, _certs_fetched_at = r.json(), time.time()
        return _certs


def verify_firebase_token(token: str) -> AuthUser:
    """Return the signed-in user, or raise AuthError if the pass is not valid."""
    project = settings.firebase_project_id
    try:
        claims = jwt.decode(token, certs=_get_certs(), audience=project, clock_skew_in_seconds=10)
    except (ValueError, google_exceptions.GoogleAuthError) as e:
        raise AuthError(f"invalid token: {e}") from e
    if claims.get("iss") != f"https://securetoken.google.com/{project}":
        raise AuthError("token was not issued for this project")
    if not claims.get("sub"):
        raise AuthError("token has no user id")
    return AuthUser(
        uid=claims["sub"],
        email=claims.get("email"),
        email_verified=bool(claims.get("email_verified", False)),
        name=claims.get("name"),
    )


def _user_from_header(creds: HTTPAuthorizationCredentials | None) -> AuthUser | None:
    if creds is None:
        return None
    if not auth_enabled():
        raise HTTPException(503, detail="Accounts are not set up on this server.")
    try:
        return verify_firebase_token(creds.credentials)
    except AuthError:
        raise HTTPException(401, detail="Your sign-in has expired. Please sign in again.")
    except requests.RequestException:
        raise HTTPException(503, detail="Could not reach Google to check your sign-in. Try again.")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> AuthUser:
    """For endpoints that REQUIRE sign-in."""
    user = _user_from_header(creds)
    if user is None:
        raise HTTPException(401, detail="Please sign in first.")
    return user


def optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> AuthUser | None:
    """For endpoints that work for everyone but do more when signed in."""
    return _user_from_header(creds)


def signed_in_if_enabled(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> AuthUser | None:
    """For the main features (classify, explain, chat).

    When accounts are switched on (FIREBASE_PROJECT_ID is set), a valid pass is
    REQUIRED, so only registered users can use the site and its Gemma quota.
    When accounts are switched off, the features stay open (local testing).
    """
    if not auth_enabled():
        return None
    return current_user(creds)