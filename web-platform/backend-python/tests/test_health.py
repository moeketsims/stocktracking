"""Tests for the health check endpoint."""

from unittest.mock import patch, MagicMock


def test_health_check_connected(client):
    """Health check returns 'ok' when database is reachable."""
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"id": "test"}], error=None
    )

    with patch("app.config.get_supabase_client", return_value=mock_client):
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "potato-stock-api"
    assert data["database"] == "connected"


def test_health_check_degraded(client):
    """Health check returns 'degraded' when database is unreachable."""
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception(
        "Connection refused"
    )

    with patch("app.config.get_supabase_client", return_value=mock_client):
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["database"] == "error"
