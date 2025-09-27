#!/bin/bash

echo "🔥 Firebase Setup Script for storm-5d762"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 To complete Firebase setup, you need to:"
echo ""
echo "1. Go to Firebase Console: https://console.firebase.google.com/project/storm-5d762/settings/serviceaccounts/adminsdk"
echo "2. Click 'Generate new private key'"
echo "3. Download the JSON file"
echo "4. Save it as 'firebase-service-account.json' in this directory"
echo "5. Add it to your .env.local file"
echo ""

# Check if service account file exists
if [ -f "firebase-service-account.json" ]; then
    echo "✅ Service account file found!"
    echo "📝 Adding to .env.local..."
    
    # Create or update .env.local
    if [ -f ".env.local" ]; then
        # Remove existing FIREBASE_SERVICE_ACCOUNT_PATH if it exists
        grep -v "FIREBASE_SERVICE_ACCOUNT_PATH" .env.local > .env.local.tmp
        mv .env.local.tmp .env.local
    fi
    
    # Add the service account path
    echo "FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json" >> .env.local
    
    echo "✅ Firebase configuration complete!"
    echo "🚀 Your app should now work with full Firebase functionality"
    echo ""
    echo "⚠️  Don't forget to add firebase-service-account.json to .gitignore"
    
    # Add to gitignore if not already there
    if ! grep -q "firebase-service-account.json" .gitignore; then
        echo "firebase-service-account.json" >> .gitignore
        echo "✅ Added firebase-service-account.json to .gitignore"
    fi
    
else
    echo "⏳ Waiting for service account file..."
    echo "   Please download it from the Firebase Console and save as 'firebase-service-account.json'"
    echo "   Then run this script again."
fi

echo ""
echo "🔗 Useful links:"
echo "   Firebase Console: https://console.firebase.google.com/project/storm-5d762"
echo "   Service Accounts: https://console.firebase.google.com/project/storm-5d762/settings/serviceaccounts/adminsdk"
