"""Shared test fixtures for backend tests."""

import os
from unittest.mock import MagicMock, patch

# Set test environment variables BEFORE importing the app
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402

# Patch the scheduler before importing the app so it doesn't start real jobs
with patch("app.scheduler.start_scheduler"), patch("app.scheduler.shutdown_scheduler"):
    from fastapi.testclient import TestClient  # noqa: E402
    from main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _disable_scheduler():
    """Prevent the background scheduler from running during tests."""
    with patch("main.start_scheduler"), patch("main.shutdown_scheduler"):
        yield


@pytest.fixture
def client():
    """FastAPI test client."""
    with TestClient(app) as c:
        yield c
