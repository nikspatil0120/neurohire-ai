# 🐛 Known Issues & Quick Fixes

## Issues You Encountered

### 1. ❌ 503 Service Unavailable on Profile Data
**Error:** `Failed to load resource: the server responded with a status of 503`

**Cause:** Backend might have crashed or MongoDB connection issue

**Fix:**
```bash
# Just restart the backend
cd backend
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. ❌ "No authentication token found" After Login
**Error:** Quick Start Interview fails even after Google login

**Cause:** Token not being saved properly to localStorage after Google auth

**Fix Options:**

**Option A - Use Regular Login (Recommended for Testing):**
Instead of Google login, create a test account:
1. Go to `/login`
2. Use email/password login
3. Or register a new account

**Option B - Check Token Manually:**
After Google login, open browser DevTools (F12) → Console:
```javascript
// Check if token exists
localStorage.getItem("token")

// If null, manually login via API
fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: 'username=YOUR_EMAIL&password=YOUR_PASSWORD'
})
.then(r => r.json())
.then(data => {
  localStorage.setItem("token", data.access_token);
  console.log("Token saved!");
  window.location.reload();
});
```

---

## 🔧 Quick Fixes Summary

### Before Testing Tomorrow:

1. **Start Services in Order:**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend (wait 5 seconds after starting)
   cd backend
   py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 3: Simli Agent (wait for backend to be ready)
   cd backend
   py simli_agent.py start
   ```

2. **Verify Backend is Running:**
   - Open: http://localhost:8000/docs
   - Should see FastAPI documentation page
   - If 503 errors, backend didn't start properly

3. **Login Process:**
   - **Don't use Google login for now** (has token issue)
   - Use regular email/password login
   - Or create new account first

4. **Test Quick Start:**
   - After login, go to dashboard
   - Click "🚀 Quick Start Interview (DEV)"
   - Should create interview and redirect

---

## 🚨 Errors You Can Ignore

These are normal and don't affect functionality:

### ✅ Safe to Ignore:
```
- Chrome extension errors (couponCollection.js)
- React Router Future Flag warnings
- Redis connection failed (we're not using Redis)
- PostgreSQL not available (we're using MongoDB)
- Cross-Origin-Opener-Policy (Google OAuth issue)
```

### ⚠️ Need to Fix:
```
- 503 Service Unavailable (backend not running)
- "No authentication token found" (login issue)
- MongoDB connection failed (need to check .env)
```

---

## 🔍 Troubleshooting Steps

### Issue: Backend Won't Start

**Check 1: Port Already in Use**
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

**Check 2: Python Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

**Check 3: MongoDB Connection**
```bash
# Check .env has MONGODB_URL
# Should be: mongodb+srv://...
```

### Issue: Frontend Can't Connect to Backend

**Check 1: CORS Settings**
Backend `.env` should have:
```
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

**Check 2: Backend Running on Correct Port**
```bash
# Should see this in backend logs:
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### Issue: Google Login Not Working

**Temporary Solution:**
Use email/password login instead:
1. Create account at `/login`
2. Use those credentials
3. Google OAuth can be fixed later

**Permanent Fix (Later):**
- Update Google OAuth credentials
- Configure callback URLs
- Update CORS settings

---

## 📝 Testing Workflow (Recommended)

### Day 1 Testing (Tomorrow):

1. **Skip Google Login**
   - Create a test account with email/password
   - Save credentials for future testing

2. **Test Core Features:**
   - Login works ✅
   - Dashboard loads ✅
   - Quick Start Interview creates session ✅
   - Interview room loads ✅
   - Avatar connects ✅
   - Can speak to avatar ✅

3. **Document Issues:**
   - Note any crashes
   - Check console for errors
   - Screenshot any problems

### Day 2 Testing (After Fixes):

1. **Fix Token Issue:**
   - Update AuthContext to save token properly
   - Test Google login flow
   - Verify token persists

2. **Test Full Flow:**
   - Complete interview
   - Check data saved to database
   - Generate report
   - Review metrics

---

## 🛠️ Quick Commands Reference

### Restart Everything:
```bash
# Stop all (Ctrl+C in each terminal)

# Start in order:
npm run dev                                              # Terminal 1
cd backend && py -m uvicorn app.main:app --reload       # Terminal 2
cd backend && py simli_agent.py start                   # Terminal 3
```

### Check Service Status:
```bash
# Frontend
curl http://localhost:3000

# Backend
curl http://localhost:8000/docs

# MongoDB
# Check backend logs for "MongoDB connected successfully"
```

### Clear Browser Cache:
```javascript
// In browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📞 When to Ask for Help

Ask if you see:
- ❌ Backend crashes on startup
- ❌ MongoDB connection fails
- ❌ Simli agent can't connect to LiveKit
- ❌ Avatar video doesn't load
- ❌ Complete silence (no audio)

Don't worry about:
- ✅ Extension errors (browser extension issues)
- ✅ React warnings (future flags)
- ✅ Redis errors (not using it)
- ✅ PostgreSQL warnings (using MongoDB)

---

## 🎯 Priority Fixes for Tomorrow

### HIGH Priority:
1. Fix token saving after login
2. Ensure backend starts successfully
3. Test Quick Start flow end-to-end

### MEDIUM Priority:
1. Fix Google OAuth (or disable for now)
2. Add better error messages
3. Handle 503 errors gracefully

### LOW Priority:
1. Clean up console warnings
2. Add loading states
3. Improve error UI

---

**Note:** The core Simli integration is working! These are just authentication/setup issues that are quick to fix.

**Main Working Features:**
- ✅ Simli avatar video generation
- ✅ Google Gemini 2.5 Flash responses
- ✅ LiveKit Cloud WebRTC connection
- ✅ Real-time audio/video streaming
- ✅ Database integration
- ✅ Interview room UI

**Just need to:**
- Fix login token issue
- Ensure services start properly
- Test the complete flow

Good luck with tomorrow's testing! 🚀
