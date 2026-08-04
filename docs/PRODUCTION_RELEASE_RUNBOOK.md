# Potato Stock Production Release Runbook

This runbook describes the production path for the backend/web platform and Android mobile app.

## Environments

| Environment | Branch | Heroku app | URL |
|---|---|---|---|
| Staging | `develop` | `stocktracker` | `https://stocktracker-0560a415bf9e.herokuapp.com` |
| Production | `main` | `stocktracker-frontend` | `https://stocktracker-frontend-baaede6418cc.herokuapp.com` |

Production Android builds must use `https://stocktracker-frontend-baaede6418cc.herokuapp.com` as `EXPO_PUBLIC_API_URL`.

## Release Flow

1. Open a pull request into `develop`.
2. Wait for CI and Review App checks to pass.
3. Merge to `develop`.
4. Confirm `Deploy to Staging` succeeds.
5. Run a staging smoke test.
6. Open a pull request from `develop` or a promotion branch into `main`.
7. Wait for production PR CI to pass.
8. Merge to `main`.
9. Approve the `production` GitHub environment deployment when ready.
10. Confirm `Deploy to Production` succeeds.
11. Confirm `https://stocktracker-frontend-baaede6418cc.herokuapp.com/health` returns `status: ok`.

## Android Release Flow

1. Confirm production backend/web deploy is healthy.
2. Confirm GitHub secret `EXPO_TOKEN` exists.
3. Run GitHub Actions workflow `Mobile Android Release` on `main`.
4. Use `submit_to_play=false` for a build-only internal test artifact.
5. Upload the generated AAB to Google Play internal testing.
6. Run mobile smoke tests from the Play-installed app.
7. Use `submit_to_play=true` only after Google Play API credentials are configured and the first app upload has been accepted by Play Console.

## Mobile Smoke Test

- Sign in with a driver account.
- Complete PIN unlock.
- Confirm request list loads.
- Accept a pending request.
- Confirm destination is locked to the requesting location.
- Select supplier or warehouse pickup as appropriate.
- Leave starting kilometers blank and continue.
- Create trip.
- Complete pickup, scan, delivery, and manager confirmation.
- Confirm bottom navigation remains above Android system navigation.

## Play Console Requirements

- App package: `com.potatostock.mobile`.
- Privacy Policy URL: `https://stocktracker-frontend-baaede6418cc.herokuapp.com/privacy`.
- App access reviewer credentials must include email, password, and PIN.
- Data Safety must disclose account data, operational stock/delivery data, camera barcode scanning, and notification token use.
- Target audience should be business/internal adult users.
- New personal developer accounts may require at least 12 opted-in closed testers for 14 continuous days before production access.

## Rollback

### Backend/Web

1. Identify the previous healthy Heroku release:
   `heroku releases --app stocktracker-frontend`
2. Roll back:
   `heroku rollback vNN --app stocktracker-frontend`
3. Verify:
   `curl -sf https://stocktracker-frontend-baaede6418cc.herokuapp.com/health`

### Android

- For internal/closed testing: remove the bad release from the track or upload a fixed higher version code.
- For staged production rollout: halt the rollout in Play Console, then upload a fixed higher version code.

## Monitoring Checklist

- Heroku deploy status and logs.
- `/health` endpoint.
- Login failures.
- Trip creation failures.
- Delivery completion failures.
- Supabase availability and backups.
- Google Play crash and ANR reports after internal testing begins.
