# Potato Stock Tracking Platform — Development Guide

## Architecture

This is a multi-tenant stock management platform for food franchises. One backend serves both web and mobile clients.

```
┌─────────────┐  ┌─────────────┐
│  Web App     │  │  Mobile App  │
│  React 19    │  │  Expo/RN     │
│  Vite + TS   │  │  TypeScript  │
└──────┬───────┘  └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────┐
│  FastAPI Backend (Python 3.12)  │
│  188 endpoints, 32 routers     │
│  5 background jobs (APScheduler)│
│  40+ email templates           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Supabase (PostgreSQL 17)       │
│  30 tables, 120+ RLS policies   │
│  Custom HTTP client (not SDK)   │
└─────────────────────────────────┘
```

## Critical Rules

### Mobile App
- **MUST talk to FastAPI backend** (`/api/*` endpoints), NOT Supabase directly
- Same JWT auth flow as web — Bearer token in Authorization header
- Previous scaffold in `apps/mobile/` was exploratory and is discarded
- Uses Expo Router (file-based routing), React Query, Zustand

### Backend
- Custom Supabase client in `app/config.py` — HTTP-based, not official SDK
- `get_supabase_client()` = anon key, `get_supabase_admin_client()` = service key
- All auth via `require_auth`, `require_manager` dependencies
- Role-based location filtering via `get_view_location_id()`
- Stock operations use FIFO — oldest batch deducted first
- Cursor-based pagination for large datasets (PostgREST 1000-row limit)

### Frontend (Web)
- Pages in `src/pages/`, components in `src/components/`
- API client in `src/lib/api.ts` (Axios, 32 API groups)
- Hooks in `src/hooks/useData.ts` (50+ React Query hooks)
- Auth store: Zustand with localStorage persist
- 6 user roles with different tab/page access

### Database
- All business logic enforced at backend level, RLS is defense-in-depth
- Audit logs are immutable (trigger prevents UPDATE/DELETE)
- Enums: user_role, location_type, batch_status, transaction_type, trip_status, trip_type, stop_type, barcode_format
- Stock balance calculated from transactions (no stored balance field)

## Paths

| Area | Path |
|---|---|
| Backend routers | `web-platform/backend-python/app/routers/` |
| Backend models | `web-platform/backend-python/app/models/` |
| Backend jobs | `web-platform/backend-python/app/jobs/` |
| Backend config | `web-platform/backend-python/app/config.py` |
| Backend main | `web-platform/backend-python/main.py` |
| Frontend pages | `web-platform/frontend/src/pages/` |
| Frontend components | `web-platform/frontend/src/components/` |
| Frontend API client | `web-platform/frontend/src/lib/api.ts` |
| Frontend hooks | `web-platform/frontend/src/hooks/` |
| Frontend stores | `web-platform/frontend/src/stores/` |
| Mobile app | `apps/mobile/` |
| DB migrations | `infra/supabase/migrations/` |
| CI/CD | `.github/workflows/` |
| Docker | `Dockerfile` (root) |
| Proposal docs | `docs/proposal/` |

## User Roles & Access

| Role | Scope | Key Actions |
|---|---|---|
| admin | All locations | Everything — users, locations, system config |
| zone_manager | Zone's locations | Approve requests, manage zone staff, view reports |
| location_manager | Own location | Manage stock, create requests, confirm deliveries |
| vehicle_manager | Fleet | Vehicles, driver assignments, trip management |
| driver | Assigned trips | Accept requests, scan deliveries, submit KM |
| staff | Own location | Kitchen tally only (withdraw/return bags) |

## Core Workflows

### Stock Request Flow
`pending → accepted → trip_created → in_delivery → completed`
- Location manager creates request
- Driver/manager accepts
- Trip created with vehicle + driver
- Driver delivers, scans barcodes
- Location manager confirms receipt

### Escalation Chain
- 48hr quiet period → Level 1 (zone manager) → Level 2 (daily reminders) → Level 3 (max 3 emails)
- Low stock: 15-min checks → 0hr (location mgr) → 4hr (zone mgr) → 8hr (admin)

### Loan Flow (8 steps)
`requested → accepted → confirmed → pickup_in_progress → pickup_complete → return_in_progress → returned → completed`

## Development Standards

- TypeScript strict mode for all new code
- React Query for server state, Zustand for client state
- No direct Supabase calls from any frontend (web or mobile)
- All API responses typed with Pydantic (backend) and TypeScript interfaces (frontend)
- Test before pushing — `ruff` for Python, `eslint` for TypeScript
- Commit messages: describe the "why", not the "what"
