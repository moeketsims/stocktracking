"""Tests for authentication endpoint validation."""


def test_login_missing_email(client):
    """Login rejects requests without email."""
    response = client.post("/api/auth/login", json={"password": "test123456"})
    assert response.status_code == 422


def test_login_missing_password(client):
    """Login rejects requests without password."""
    response = client.post("/api/auth/login", json={"email": "test@example.com"})
    assert response.status_code == 422


def test_login_short_password(client):
    """Login rejects passwords shorter than 6 characters."""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "short"
    })
    assert response.status_code == 422


def test_login_invalid_email_format(client):
    """Login rejects invalid email formats."""
    response = client.post("/api/auth/login", json={
        "email": "not-an-email",
        "password": "validpassword"
    })
    assert response.status_code == 422


def test_auth_me_no_token(client):
    """GET /auth/me without token returns unauthenticated."""
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
