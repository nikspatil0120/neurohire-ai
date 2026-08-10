# Admin Login Configuration

## Admin Credentials

The admin account has been configured with the following hardcoded credentials:

- **Email:** `admin@xyz.com`
- **Password:** `admin@123`

## Features

### 1. **Hardcoded Admin Authentication**
   - Admin login bypasses the regular authentication API
   - Credentials are validated directly in the `AuthContext`
   - Admin token is generated locally with format: `admin_token_[timestamp]`

### 2. **Google OAuth Disabled for Admin**
   - Google Sign-In button is **not shown** when Admin role is selected
   - If someone tries to use Google OAuth with admin role programmatically, it will be blocked with an error message
   - Only Candidates can use Google OAuth for authentication

### 3. **Admin Registration Disabled**
   - Users cannot create new admin accounts through the signup form
   - Attempting to sign up as Admin shows an error: "Admin account creation is not available. Please contact system administrator."

## Implementation Details

### Files Modified:

1. **`src/contexts/AuthContext.tsx`**
   - Added hardcoded admin credential check in `login()` function
   - Blocks Google OAuth for admin role in `loginWithGoogle()` function
   - Creates a mock admin user object when credentials match

2. **`src/pages/Login.tsx`**
   - Updated UI text to indicate "Email/Password only" for Admin
   - Blocks admin registration in signup flow
   - Google Sign-In section only renders for "Candidate" role

3. **`src/pages/LoginWithGoogle.tsx`**
   - Added hardcoded admin credential check
   - Updated UI text for Admin role
   - Maintains same behavior as main Login component

## How to Use

1. Navigate to the login page
2. Select the **"Admin"** role tab
3. Enter credentials:
   - Email: `admin@xyz.com`
   - Password: `admin@123`
4. Click "Sign In"
5. You will be redirected to `/admin/dashboard`

## Security Notes

⚠️ **Important:** This is a basic implementation suitable for development/demo purposes. For production:

1. **Never hardcode credentials** - Store admin credentials securely in a database
2. **Hash passwords** - Use bcrypt or similar for password hashing
3. **Use environment variables** - For sensitive configuration
4. **Implement proper session management** - With secure tokens and expiration
5. **Add multi-factor authentication (MFA)** - For admin accounts
6. **Audit logging** - Track all admin login attempts and actions
7. **Rate limiting** - Prevent brute force attacks

## Admin User Object Structure

```typescript
{
  id: "admin_001",
  name: "Admin User",
  email: "admin@xyz.com",
  role: "admin",
  avatar: undefined,
  isActive: true,
  lastLogin: "2026-08-06T..." // ISO timestamp
}
```
