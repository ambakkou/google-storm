import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

// Initialize Firebase Admin
export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    const config: any = {
      projectId: 'storm-5d762',
    };

    // Try to use service account key if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        config.credential = cert(serviceAccount);
      } catch (error) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      }
    }

    // Try to use service account file if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        config.credential = cert(require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
      } catch (error) {
        console.warn('Failed to load service account from file:', error);
      }
    }

    // For development, try to use default credentials (if Firebase CLI is authenticated)
    if (!config.credential) {
      console.log('No service account credentials found. Using default credentials (requires Firebase CLI authentication)');
      // This will use default credentials if Firebase CLI is authenticated
      // or environment variables like GOOGLE_APPLICATION_CREDENTIALS are set
    }

    app = initializeApp(config);
    console.log('Firebase Admin initialized with project:', config.projectId);
  } else {
    app = getApps()[0];
  }
  
  return app;
}

// Get Firestore instance with error handling
export function getFirestoreInstance() {
  if (!getApps().length) {
    initializeFirebaseAdmin();
  }
  
  try {
    return getFirestore();
  } catch (error) {
    console.error('Failed to get Firestore instance:', error);
    throw new Error('Firebase not properly configured. Please check your service account credentials.');
  }
}
