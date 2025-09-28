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

# Hurricane & Weather API Configuration
# Get your AccuWeather API key from: https://developer.accuweather.com/
ACCUWEATHER_API_KEY=your_accuweather_api_key_here

# Get your OpenWeather API key from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_openweather_api_key_here

# XWeather API Key
# Get your XWeather API key from: https://account.xweather.com/data/apps
XWEATHER_API_KEY=your_xweather_api_key_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret_here

# Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Weather API Configuration (All Sources)
# Using AccuWeather, OpenWeather, and XWeather for comprehensive coverage
# Government data sources (NHC, NOAA) are free and don't require API keys

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
  console.log('   4. AccuWeather API Key (ACCUWEATHER_API_KEY) - for weather & hurricane data');
  console.log('   5. OpenWeather API Key (OPENWEATHER_API_KEY) - for weather & hurricane data');
  console.log('   6. XWeather API Key (XWEATHER_API_KEY) - for professional weather & hurricane data');
  console.log('');
  console.log('🔧 Optional: Firebase Service Account (for Add Resource feature)');
  console.log('   - Get from Firebase Console > Project Settings > Service Accounts');
  console.log('');
  console.log('🌪️ Weather & Hurricane Data Sources:');
  console.log('   - NHC/NOAA (free) - Official hurricane tracking data (primary)');
  console.log('   - AccuWeather (requires API key) - Professional weather & hurricane data');
  console.log('   - OpenWeather (requires API key) - Global weather & storm detection');
  console.log('   - XWeather (requires API key) - Professional meteorological data');
  console.log('   - NASA (free) - Alternative storm data (fallback)');
  console.log('   - National Weather Service (free) - Weather alerts');
  console.log('');
  console.log('📖 See README.md for detailed setup instructions');
} else {
  console.log('⚠️  .env.local already exists');
}
