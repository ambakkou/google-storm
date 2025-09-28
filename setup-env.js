#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envTemplate = `# Google Maps API Keys
# Get these from: https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GCP_SERVER_MAPS_KEY=your_server_maps_api_key_here

# Gemini AI API Key
# Get this from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (Optional - for database features)
# Option 1: Service Account Key (recommended for production)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your_project_id",...}
# Option 2: Service Account File Path (alternative)
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
`;

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local file with template');
  console.log('📝 Please edit .env.local and add your API keys');
  console.log('');
  console.log('🔑 Required API Keys:');
  console.log('   1. Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
  console.log('   2. Google Places API Key (GCP_SERVER_MAPS_KEY)');
  console.log('   3. Gemini AI API Key (GEMINI_API_KEY)');
  console.log('');
  console.log('🔧 Optional: Firebase Service Account (for Add Resource feature)');
  console.log('   - Get from Firebase Console > Project Settings > Service Accounts');
  console.log('');
  console.log('📖 See README.md for detailed setup instructions');
} else {
  console.log('⚠️  .env.local already exists');
}
