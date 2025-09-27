# Firebase Setup Guide

## Current Issue
Your application is showing Firebase authentication errors because the service account credentials are not configured.

## Quick Fix (Development)
The application will now work without Firebase credentials, but resource submission won't be persisted. To enable full functionality:

### Option 1: Use Firebase CLI (Recommended for Development)
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Set the project:
   ```bash
   firebase use storm-5d762
   ```

### Option 2: Service Account Key (Production)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `storm-5d762`
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Add to your `.env.local`:

```env
# Add this to your .env.local file
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"storm-5d762",...}'
```

Or set the file path:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/service-account-key.json
```

### Option 3: Environment Variable (Production)
Set the path to your service account key:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## Current Status
- ✅ Add resources feature works (coordinates are now included)
- ✅ Google Places API integration for food banks/clinics
- ✅ Comprehensive seed data for shelters
- ✅ Graceful fallback when Firebase is not configured
- ⚠️ Resource persistence requires Firebase credentials

## What Works Without Firebase
- All map functionality
- Google Places data
- Seed shelter data
- Resource submission UI (but data won't persist)
- Admin interface (but no data to show)

## What Requires Firebase
- Persistent storage of user-submitted resources
- Admin approval workflow
- Community-contributed resources on map
