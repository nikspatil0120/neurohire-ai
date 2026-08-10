# 🚀 Start System - Quick Guide

## 🔄 Complete Restart (Recommended)

Follow these steps in order:

### Step 1: Start MongoDB
```bash
# Windows:
net start MongoDB

# Or check if already running:
sc query MongoDB
```

### Step 2: Start Backend
```bash
# Open a new terminal/PowerShell
cd backend

# Start the FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open!** Backend must stay running.

### Step 3: Restart Frontend
```bash
# Open another terminal in project root
# Stop current dev server if running (Ctrl+C)

# Start fresh
npm run dev

# You should see:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

**Keep this terminal open too!**

### Step 4: Test the System

1. **Open browser**: http://localhost:5173
2. **Login as admin**: 
   - Email: `admin@xyz.com`
   - Password: `admin@123`
3. **Navigate**: Admin → DSA Problems
4. **Should see**: The admin interface (not blank!)

---

## ✅ Verification Checklist

Before logging in, verify all services are running:

### Check MongoDB:
```bash
mongosh
# Should connect successfully
> show dbs
> exit
```

### Check Backend API:
Open browser: http://localhost:8000/docs
- ✅ Should see Swagger UI documentation
- ✅ Try GET /api/v1/problems/ endpoint

### Check Frontend:
Open browser: http://localhost:5173
- ✅ Should see login page
- ✅ No console errors (press F12)

---

## 🐛 Common Issues

### Issue: "MongoDB is not running"
**Solution**:
```bash
# Windows:
net start MongoDB

# If fails, MongoDB might not be installed as service:
mongod --dbpath C:\data\db
```

### Issue: "Port 8000 already in use"
**Solution**:
```bash
# Find what's using port 8000:
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number):
taskkill /PID <PID> /F

# Then restart backend
```

### Issue: "Module not found" (Backend)
**Solution**:
```bash
cd backend
pip install -r requirements.txt
```

### Issue: Frontend won't start
**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📁 Three Terminals Setup

You should have 3 terminals open:

### Terminal 1: MongoDB (optional - if not running as service)
```bash
mongod
```

### Terminal 2: Backend ⚠️ REQUIRED
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Frontend ⚠️ REQUIRED
```bash
npm run dev
```

---

## 🎯 Quick Test Workflow

Once everything is running:

### 1. Create a Problem (Admin)
- Login as admin
- Go to DSA Problems
- Click "Add New Problem"
- Fill in:
  - Title: "Test Problem"
  - Difficulty: Easy
  - Description: "A simple test"
  - Add 1 test case
  - Toggle "Published" ON
- Click Save
- ✅ Should save successfully

### 2. View Problem (Candidate)
- Logout
- Login as candidate (any email/password or use Google)
- Go to Problem List
- ✅ Should see "Test Problem"

### 3. Verify Persistence
- Refresh the page (F5)
- ✅ Problem still there
- Close browser completely
- Reopen and login
- ✅ Problem still there!

---

## 🔍 Monitoring

### Watch Backend Logs:
The backend terminal will show all API requests:
```
INFO:     127.0.0.1:xxxxx - "GET /api/v1/problems/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /api/v1/problems/ HTTP/1.1" 201 Created
```

### Watch Frontend Logs:
The browser console (F12) will show:
```
Loading problems from API...
Published problems loaded: [...]
```

### Watch MongoDB:
```bash
# In another terminal:
mongosh
> use neurohire
> db.problems.find().pretty()
# Shows all problems in database
```

---

## ⚡ Quick Restart (if something breaks)

```bash
# Stop everything (Ctrl+C in each terminal)

# Terminal 1 - Backend:
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend:
npm run dev

# That's it! Both restarted.
```

---

## 🎉 Success Indicators

Everything is working when you see:

### Backend Terminal:
```
✅ INFO:     Started server process
✅ INFO:     Waiting for application startup.
✅ INFO:     Application startup complete.
✅ INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Frontend Terminal:
```
✅ VITE v5.x.x  ready in xxx ms
✅ ➜  Local:   http://localhost:5173/
✅ ➜  Network: use --host to expose
```

### Browser:
```
✅ No red errors in console (F12)
✅ Admin page loads (not blank)
✅ Can create problems
✅ Problems save to database
✅ Candidates see published problems
```

---

## 📞 Still Having Issues?

### Check Environment File:
```bash
cat .env
# Should show:
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Check Backend Environment:
```bash
cat backend/.env
# Should have:
# MONGODB_URL=mongodb://localhost:27017
# MONGODB_DB=neurohire
```

### Test API Directly:
```bash
# Using curl:
curl http://localhost:8000/api/v1/problems/

# Should return: [] (empty array) or list of problems
```

### Check Database:
```bash
mongosh
> use neurohire
> show collections
# Should show: problems (and other collections)
> db.problems.countDocuments()
# Shows number of problems
```

---

## 💡 Pro Tips

1. **Keep terminals visible** - You can see errors immediately
2. **Check backend logs first** - Most issues show there
3. **Use browser DevTools** - F12 → Console for frontend errors
4. **Test API endpoints** - Use http://localhost:8000/docs
5. **Verify .env changes** - Always restart after editing .env

---

## 🔄 Daily Startup Routine

Every time you start working:

```bash
# 1. Start MongoDB (if not auto-starting)
net start MongoDB

# 2. Start Backend (Terminal 1)
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 3. Start Frontend (Terminal 2)
npm run dev

# 4. Open Browser
http://localhost:5173

# Done! 🎉
```

---

**Last Updated**: August 7, 2026  
**Next**: Follow the steps above to start the system!
