# Google OAuth Setup Guide

## Overview
This guide will help you set up Google OAuth authentication for NeuroHire AI.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API

## Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure the consent screen:
   - Application type: **Web application**
   - Application name: **NeuroHire AI**
   - User support email: Your email
   - Developer contact information: Your email
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://your-domain.com` (for production)
5. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://your-domain.com` (for production)
6. Click **Create**

## Step 3: Update Configuration

✅ **COMPLETED** - Your Client ID has been configured:

```typescript
// src/components/GoogleOAuthProvider.tsx
const GOOGLE_CLIENT_ID = '350713133141-br0vv28l85i8jm1ir5d66lmt2u8edibr.apps.googleusercontent.com';
```

## Step 4: Environment Variables (Optional)

For better security, you can use environment variables:

1. Create `.env` file in root directory:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   ```

2. Update `src/components/GoogleOAuthProvider.tsx`:
   ```typescript
   const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'fallback-client-id';
   ```

## Step 5: Test the Integration

1. Restart your development server: `npm run dev`
2. Navigate to `http://localhost:3001/login`
3. Click "Continue with Google"
4. Complete the Google authentication flow

## Features Implemented

### ✅ Role-Based Authentication
- **Candidates**: Full authentication with email/password AND Google OAuth
- **Recruiters**: Email/password authentication only
- **Admins**: Email/password authentication only

### ✅ Login/Signup Toggle
- Seamless switching between login and signup modes
- Form validation and error handling
- Password visibility toggle

### ✅ Google OAuth (Candidates Only)
- One-tap sign-in for Candidate accounts
- Secure token handling
- Fallback for development

### ✅ Enhanced UX
- Loading states with spinners
- Error messages with proper styling
- Form validation with visual feedback
- Responsive design

### ✅ Security Features
- LocalStorage persistence
- Token-based authentication
- Role-based access control

## Troubleshooting

### Common Issues

1. **"Invalid client" error**
   - Check your Client ID is correct
   - Verify authorized origins in Google Cloud Console

2. **"Origin mismatch" error**
   - Add your current domain to authorized JavaScript origins
   - For local development, use `http://localhost:5173`

3. **Google button not showing**
   - Ensure Google OAuth Provider is properly configured
   - Check browser console for errors

4. **Authentication not persisting**
   - Check localStorage is enabled
   - Verify user data is being saved correctly

## Production Deployment

1. Update authorized origins to your production domain
2. Enable HTTPS (required for OAuth in production)
3. Set up proper domain verification
4. Test thoroughly before going live

## Security Considerations

- Never expose your Client Secret in frontend code
- Use HTTPS in production
- Implement proper session management
- Consider implementing refresh tokens for long sessions
- Add CSRF protection for additional security

## Next Steps

- Implement email verification
- Add password reset functionality
- Set up user profile management
- Add two-factor authentication
- Implement audit logging for security events
