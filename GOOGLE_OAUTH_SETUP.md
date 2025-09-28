# Google OAuth Setup for Admin Authentication

## Overview
The admin panel is now secured with Google OAuth. Only authorized email addresses can access the admin interface.

## Setup Steps

### 1. Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project** (or create a new one)
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" 
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

5. **Copy your credentials**:
   - Client ID
   - Client Secret

### 2. Environment Variables

Update your `.env.local` file:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console
```

### 3. Configure Admin Emails

Edit `pages/api/auth/[...nextauth].ts` and update the admin emails:

```typescript
const adminEmails = [
  'your-admin-email@gmail.com',
  'another-admin@gmail.com',
  // Add more admin emails as needed
]
```

### 4. Generate NextAuth Secret

For production, generate a secure secret:

```bash
openssl rand -base64 32
```

## How It Works

### Authentication Flow
1. User visits `/admin`
2. If not authenticated → Redirected to `/admin/signin`
3. User clicks "Sign in with Google"
4. Google OAuth flow
5. If email is in admin list → Access granted
6. If email not authorized → Redirected to `/admin/error`

### Admin Panel Features
- ✅ **Secure Access**: Only authorized Google accounts
- ✅ **User Info**: Shows logged-in admin email
- ✅ **Sign Out**: Clean logout functionality
- ✅ **Session Management**: Automatic redirects

### URLs
- **Admin Panel**: `/admin` (requires auth)
- **Sign In**: `/admin/signin`
- **Access Denied**: `/admin/error`

## Testing

1. **Start your dev server**: `npm run dev`
2. **Go to**: `http://localhost:3000/admin`
3. **You should be redirected to sign-in page**
4. **Sign in with an authorized Google account**
5. **Access should be granted to admin panel**

## Security Notes

- Only emails in the `adminEmails` array can access admin panel
- Sessions are JWT-based for security
- Unauthorized users get clear error messages
- All admin actions are logged to console

## Troubleshooting

### "Configuration Error"
- Check your Google Client ID/Secret
- Verify redirect URIs in Google Console
- Ensure NEXTAUTH_URL matches your domain

### "Access Denied"
- Add your email to the `adminEmails` array
- Restart your dev server after changes

### "Sign In Failed"
- Check Google Cloud Console API quotas
- Verify Google+ API is enabled
- Check browser console for errors
