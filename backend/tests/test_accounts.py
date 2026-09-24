"""Accounts: pass (ID token) checking and the users collection.

Uses a test RSA key to sign real tokens the same way Google does, and
mongomock (an in-memory fake MongoDB). No internet, no real accounts.
"""

import dataclasses
import time
from datetime import datetime, timedelta, timezone

import mongomock
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from fastapi.testclient import TestClient
from google.auth import crypt, jwt

from adastra import auth, db
from adastra.config import settings
from main import app

PROJECT = "adastra-test"


def make_key_and_cert():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
        .serial_number(1).not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    key_pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption())
    return key_pem, cert.public_bytes(serialization.Encoding.PEM).decode()


KEY_PEM, CERT_PEM = make_key_and_cert()
SIGNER = crypt.RSASigner.from_string(KEY_PEM, key_id="k1")


def token(uid="user-1", aud=PROJECT, iss=f"https://securetoken.google.com/{PROJECT}",
          expires_in=3600, email="amreen@example.com", signer=SIGNER):
    t = int(time.time())
    payload = {"iss": iss, "aud": aud, "sub": uid, "iat": t, "exp": t + expires_in,
               "email": email, "email_verified": True, "name": "Amreen"}
    return jwt.encode(signer, payload).decode()


def bearer(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def client(monkeypatch):
    """Accounts switched on, Google's certificates replaced by our test cert,
    and an empty in-memory database."""
    test_settings = dataclasses.replace(settings, firebase_project_id=PROJECT, mongodb_uri="mongodb://fake")
    monkeypatch.setattr(auth, "settings", test_settings)
    monkeypatch.setattr(db, "settings", test_settings)
    monkeypatch.setattr(auth, "_get_certs", lambda: {"k1": CERT_PEM})
    fake_db = mongomock.MongoClient()["adastra"]
    monkeypatch.setattr(db, "get_db", lambda: fake_db)
    return TestClient(app)


def test_first_visit_creates_profile(client):
    r = client.get("/api/me", headers=bearer(token()))
    assert r.status_code == 200
    body = r.json()
    assert body["uid"] == "user-1" and body["email"] == "amreen@example.com"
    assert body["email_updates"]["opted_in"] is False        # default: no emails


def test_sign_up_saves_name_and_email_choice(client):
    r = client.post("/api/me", json={"name": "Amreen", "email_updates": True}, headers=bearer(token()))
    assert r.status_code == 200
    first = r.json()["email_updates"]
    assert first["opted_in"] is True
    # same choice again: the consent time must NOT change
    again = client.post("/api/me", json={"name": "Amreen R", "email_updates": True}, headers=bearer(token())).json()
    assert again["email_updates"]["updated_at"] == first["updated_at"]
    assert again["name"] == "Amreen R"
    # changed choice: new time recorded
    changed = client.post("/api/me", json={"name": "Amreen R", "email_updates": False}, headers=bearer(token())).json()
    assert changed["email_updates"]["opted_in"] is False


def test_no_pass_is_rejected(client):
    r = client.get("/api/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_signed_in"


@pytest.mark.parametrize("bad", [
    token(aud="someone-elses-project"),                       # wrong project
    token(iss="https://securetoken.google.com/other"),        # wrong issuer
    token(expires_in=-600),                                   # expired
    token(signer=crypt.RSASigner.from_string(make_key_and_cert()[0], key_id="k1")),  # forged signature
    "not-a-token",
])
def test_bad_passes_are_rejected(client, bad):
    r = client.get("/api/me", headers=bearer(bad))
    assert r.status_code == 401


def test_delete_removes_stored_data(client):
    client.post("/api/me", json={"name": "Amreen", "email_updates": True}, headers=bearer(token()))
    assert client.delete("/api/me", headers=bearer(token())).json() == {"deleted": True}
    # next visit starts fresh with the default choice
    assert client.get("/api/me", headers=bearer(token())).json()["email_updates"]["opted_in"] is False


def test_name_is_required(client):
    r = client.post("/api/me", json={"name": "", "email_updates": False}, headers=bearer(token()))
    assert r.status_code == 422


def test_accounts_switched_off_gives_clear_error(monkeypatch):
    # Switch accounts OFF for this test only, whatever backend/.env says.
    monkeypatch.setattr(auth, "settings", dataclasses.replace(settings, firebase_project_id=""))
    r = TestClient(app).get("/api/me", headers=bearer("anything"))
    assert r.status_code == 503 and r.json()["error"]["code"] == "unavailable"


def test_health_reports_every_part(monkeypatch):
    slots = TestClient(app).get("/api/health").json()["slots"]
    assert set(slots) == {"classifier", "knowledge_base", "accounts", "database", "llm"}
    assert slots["llm"]["status"] == "missing"            # tests hide the key (conftest.py)
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    assert TestClient(app).get("/api/health").json()["slots"]["llm"]["status"] == "live"


# ---------------------------------------------------------------- the gate
def small_png() -> bytes:
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


def test_main_features_need_sign_in(client):
    """With accounts on, classify / explain / chat refuse requests without a pass."""
    r = client.post("/api/classify", files={"file": ("a.png", small_png())})
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_signed_in"
    assert client.post("/api/rag-query", json={"question": "What is a star?"}).status_code == 401
    assert client.get("/api/health").status_code == 200          # status stays public


def test_main_features_work_when_signed_in(client):
    r = client.post("/api/classify", files={"file": ("a.png", small_png())}, headers=bearer(token()))
    assert r.status_code == 200
    classification = r.json()["classification"]
    r = client.post("/api/explain", json={"classification": classification, "level": "advanced"},
                    headers=bearer(token()))
    assert r.status_code == 200
    r = client.post("/api/rag-query", json={"question": "What is a star?"}, headers=bearer(token()))
    assert r.status_code == 200