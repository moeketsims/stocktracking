# Google Play Release Checklist

This checklist is for the Potato Stock Android production release.

## Build

- Release backend URL: `https://stocktracker-0560a415bf9e.herokuapp.com`
- Development, preview, and production profiles currently use the same backend URL.
- Android package: `com.potatostock.mobile`
- Build profile: `production`
- Submit profile: `production` -> Google Play `internal` track
- Required Google Play target API level: Android 15 / API 35 or higher

## Required Before Submission

- Google Play Developer account is active.
- Google Play Console app exists for `com.potatostock.mobile`.
- First AAB upload is done manually if the Play API has not accepted this app before.
- EAS Android credentials are configured.
- Google service account JSON is uploaded to EAS credentials for Play submissions.
- GitHub secret `EXPO_TOKEN` is configured before using `.github/workflows/mobile-android-release.yml`.
- Play Console App access includes a valid reviewer login and PIN.
- Privacy Policy URL is published and entered in Play Console: `https://stocktracker-frontend-baaede6418cc.herokuapp.com/privacy`.
- Data Safety form declares account data, contact details, operational stock/delivery data, camera barcode scanning, and push notification usage.
- App content rating questionnaire is completed.
- Target audience is set to business/internal adult users, not children.
- If using a new personal Google Play developer account, closed testing has at least 12 opted-in testers for 14 continuous days before requesting production access.

## Internal Test Pass Criteria

- Driver can sign in with email/password and PIN.
- Driver sees only assigned trips.
- Driver accepts a pending request.
- Destination is locked to the requesting location.
- Pickup can be supplier or warehouse.
- Starting kilometers can be left blank.
- Pickup, barcode scan, dropoff, and manager delivery confirmation complete end to end.
- Bottom navigation remains above Android system navigation.
- App handles offline/read-only failures without crashing.
- Push token registration failure does not block login or trip flow.

## Rollout

- Start with Google Play internal testing.
- Move to closed testing after internal smoke passes.
- Move to production only after backend production is deployed and the same AAB passes closed testing.
