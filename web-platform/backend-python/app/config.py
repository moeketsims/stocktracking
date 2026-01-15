from pydantic_settings import BaseSettings
from functools import lru_cache
import httpx


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str = ""
    port: int = 3001

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


class SupabaseClient:
    """HTTP-based Supabase client compatible with new key format."""

    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

    def table(self, table_name: str) -> "TableQuery":
        return TableQuery(self, table_name)

    def rpc(self, function_name: str, params: dict = None) -> "QueryResult":
        """Call a stored procedure/function via RPC."""
        url = f"{self.url}/rest/v1/rpc/{function_name}"
        with httpx.Client(timeout=60.0) as http:
            response = http.post(url, headers=self.headers, json=params or {})
            if response.status_code >= 400:
                return QueryResult(data=None, error=response.text)
            return QueryResult(data=response.json(), error=None)

    @property
    def auth(self) -> "AuthClient":
        return AuthClient(self)


class TableQuery:
    """Simple table query builder."""

    def __init__(self, client: SupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        self._select_columns = "*"
        self._filters = []
        self._single = False
        self._order = None
        self._limit = None

    def select(self, columns: str = "*") -> "TableQuery":
        self._select_columns = columns
        return self

    def eq(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=eq.{value}")
        return self

    def neq(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=neq.{value}")
        return self

    def gt(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=gt.{value}")
        return self

    def gte(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=gte.{value}")
        return self

    def lt(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=lt.{value}")
        return self

    def lte(self, column: str, value) -> "TableQuery":
        self._filters.append(f"{column}=lte.{value}")
        return self

    def in_(self, column: str, values: list) -> "TableQuery":
        vals = ",".join(str(v) for v in values)
        self._filters.append(f"{column}=in.({vals})")
        return self

    def order(self, column: str, desc: bool = False) -> "TableQuery":
        direction = "desc" if desc else "asc"
        self._order = f"{column}.{direction}"
        return self

    def limit(self, count: int) -> "TableQuery":
        self._limit = count
        return self

    def single(self) -> "TableQuery":
        self._single = True
        return self

    def execute(self) -> "QueryResult":
        url = f"{self.client.url}/rest/v1/{self.table_name}"
        # Use list of tuples to allow multiple filters on same column
        params = [("select", self._select_columns)]

        for f in self._filters:
            key, val = f.split("=", 1)
            params.append((key, val))

        if self._order:
            params.append(("order", self._order))

        if self._limit:
            params.append(("limit", str(self._limit)))

        headers = self.client.headers.copy()
        if self._single:
            headers["Accept"] = "application/vnd.pgrst.object+json"

        with httpx.Client() as http:
            response = http.get(url, headers=headers, params=params)

            if response.status_code >= 400:
                print(f"[SUPABASE ERROR] {self.table_name}: {response.status_code} - {response.text[:200]}")
                return QueryResult(data=None, error=response.text)

            data = response.json()
            row_count = len(data) if isinstance(data, list) else 1
            print(f"[SUPABASE] {self.table_name}: {row_count} rows")
            return QueryResult(data=data, error=None)

    def insert(self, data) -> "QueryResult":
        """Insert one or more records. Accepts dict or list of dicts."""
        url = f"{self.client.url}/rest/v1/{self.table_name}"
        headers = self.client.headers.copy()
        headers["Prefer"] = "return=representation"

        with httpx.Client(timeout=60.0) as http:
            response = http.post(url, headers=headers, json=data)

            if response.status_code >= 400:
                return QueryResult(data=None, error=response.text)

            result = response.json()
            # Return as-is for batch inserts, wrap single for consistency
            if isinstance(data, list):
                return QueryResult(data=result, error=None)
            return QueryResult(data=result[0] if isinstance(result, list) and result else result, error=None)

    def update(self, data: dict) -> "QueryResult":
        url = f"{self.client.url}/rest/v1/{self.table_name}"
        params = {}

        for f in self._filters:
            key, val = f.split("=", 1)
            params[key] = val

        headers = self.client.headers.copy()
        headers["Prefer"] = "return=representation"

        with httpx.Client() as http:
            response = http.patch(url, headers=headers, params=params, json=data)

            if response.status_code >= 400:
                return QueryResult(data=None, error=response.text)

            result = response.json()
            return QueryResult(data=result[0] if isinstance(result, list) and result else result, error=None)


class QueryResult:
    def __init__(self, data, error):
        self.data = data
        self.error = error


class AuthClient:
    """Auth operations via REST API."""

    def __init__(self, client: SupabaseClient):
        self.client = client

    def sign_in_with_password(self, credentials: dict) -> "AuthResponse":
        url = f"{self.client.url}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": self.client.key,
            "Content-Type": "application/json"
        }

        with httpx.Client() as http:
            response = http.post(url, headers=headers, json=credentials)

            if response.status_code >= 400:
                return AuthResponse(user=None, session=None, error=response.text)

            data = response.json()
            user = AuthUser(
                id=data["user"]["id"],
                email=data["user"]["email"],
                user_metadata=data["user"].get("user_metadata", {})
            )
            session = AuthSession(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"]
            )
            return AuthResponse(user=user, session=session, error=None)

    def get_user(self, token: str) -> "AuthResponse":
        url = f"{self.client.url}/auth/v1/user"
        headers = {
            "apikey": self.client.key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        with httpx.Client() as http:
            response = http.get(url, headers=headers)

            if response.status_code >= 400:
                return AuthResponse(user=None, session=None, error=response.text)

            data = response.json()
            user = AuthUser(
                id=data["id"],
                email=data["email"],
                user_metadata=data.get("user_metadata", {})
            )
            return AuthResponse(user=user, session=None, error=None)

    def refresh_session(self, refresh_token: str) -> "AuthResponse":
        url = f"{self.client.url}/auth/v1/token?grant_type=refresh_token"
        headers = {
            "apikey": self.client.key,
            "Content-Type": "application/json"
        }

        with httpx.Client() as http:
            response = http.post(url, headers=headers, json={"refresh_token": refresh_token})

            if response.status_code >= 400:
                return AuthResponse(user=None, session=None, error=response.text)

            data = response.json()
            session = AuthSession(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"]
            )
            return AuthResponse(user=None, session=session, error=None)

    def sign_out(self):
        pass  # No-op for now


class AuthUser:
    def __init__(self, id: str, email: str, user_metadata: dict = None):
        self.id = id
        self.email = email
        self.user_metadata = user_metadata or {}


class AuthSession:
    def __init__(self, access_token: str, refresh_token: str):
        self.access_token = access_token
        self.refresh_token = refresh_token


class AuthResponse:
    def __init__(self, user: AuthUser = None, session: AuthSession = None, error: str = None):
        self.user = user
        self.session = session
        self.error = error


def get_supabase_client() -> SupabaseClient:
    settings = get_settings()
    return SupabaseClient(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin_client() -> SupabaseClient:
    settings = get_settings()
    key = settings.supabase_service_key or settings.supabase_anon_key
    return SupabaseClient(settings.supabase_url, key)
