# Google Storm - Crisis Resource Finder

A Next.js application that helps people find emergency resources like shelters, food banks, and clinics during crisis situations.

## Features

- 🔍 **Smart Search**: AI-powered intent recognition for finding emergency resources
- 🗺️ **Interactive Maps**: Google Maps integration with custom markers
- 📍 **Location Services**: Automatic user location detection
- 🏠 **Shelter Data**: Pre-loaded shelter information for Miami area
- 🍽️ **Food Banks**: Real-time food bank lookups via Google Places API
- 🏥 **Clinics**: Medical clinic discovery with hours information
- 🚨 **Emergency Mode**: Quick access to emergency shelters only
- ➕ **Community Resources**: Users can submit new resources for review
- 👨‍💼 **Admin Panel**: Approve/reject community-submitted resources

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Google Maps API Keys (Required)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GCP_SERVER_MAPS_KEY=your_server_maps_api_key_here

# Gemini AI API Key (Required for intent processing)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (Optional - for data persistence)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### 2. Get API Keys

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the key to your domain for security

#### Gemini AI API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your environment variables

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

- `POST /api/intent` - Process user queries and return resource categories
- `GET /api/places` - Search for food banks and clinics via Google Places
- `POST /api/pending` - Submit new resources for review
- `GET /api/list-pending` - Get pending resources for admin review
- `POST /api/approve` - Approve community-submitted resources
- `GET /api/geocode` - Convert addresses to coordinates

## Usage

1. **Search for Resources**: Type your query in the chat (e.g., "I need a shelter" or "Find food banks near me")
2. **Emergency Mode**: Toggle emergency mode for immediate shelter-only results
3. **Add Resources**: Click "Add Resource" to submit new emergency resources
4. **Admin Panel**: Visit `/admin` to review and approve community submissions

## Troubleshooting

### "This page can't load Google Maps correctly"
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your `.env.local` file
- Verify the API key has the correct APIs enabled (Maps JavaScript API, Places API)
- Check that the API key is not restricted to a different domain
- Restart your development server after adding environment variables

### Firestore Errors
- Ensure Firebase credentials are properly configured
- Check that Firestore is enabled in your Firebase project
- Verify the service account has the correct permissions

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Maps**: Google Maps JavaScript API
- **AI**: Google Gemini API
- **Database**: Firebase Firestore
- **UI Components**: Radix UI, Lucide React Icons
