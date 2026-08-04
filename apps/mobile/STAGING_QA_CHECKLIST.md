# Mobile Staging QA Checklist

Run this checklist on a real Android device using an internal preview build.

## Build Gate

- `npx tsc --noEmit` passes.
- `npx jest --runInBand --watchAll=false` passes.
- `npx expo install --check` passes.
- `npx expo export --platform android --output-dir .expo/export-readiness-android` passes.
- `npx expo-doctor` has no failures, except the known `.expo` warning until tracked `.expo` files are removed from Git.

## Device Matrix

- Fresh install opens the login screen.
- Existing authenticated install with a configured PIN opens the PIN screen after app kill/reopen.
- Correct PIN unlocks to tabs.
- Wrong PIN decrements attempts and locks out after the configured limit.
- Forgot PIN signs out and returns to login.
- Access-token expiry refreshes without signing the user out.
- Invalid refresh token signs out cleanly.

## Role Smoke Tests

- `admin`: dashboard, stock, users, locations, reports.
- `location_manager`: create request, confirm pending delivery, stock take.
- `driver`: accept request, start trip, scan/manual delivery, submit KM.
- `staff`: withdraw bag, undo return, view today's log.

## Network Tests

- Offline banner appears when the device is disconnected.
- Stock issue is blocked offline before an API call.
- Request accept is blocked offline before an API call.
- Delivery confirmation is blocked offline before an API call.
- Trip stop completion is blocked offline before an API call.
- After reconnect, reads refetch and mutations work normally.

## Native Capability Tests

- Camera permission prompt appears on scanner.
- Barcode scan records unique codes and rejects duplicates.
- Manual delivery entry works when camera cannot be used.
- Push notification permission and token registration work on a physical device.
- Notification taps deep-link to the expected screen.
- Excel export downloads and opens the native share sheet.

## Release Decision

Promote to production candidate only after all checklist items pass on at least one manager device and one driver/staff device.
