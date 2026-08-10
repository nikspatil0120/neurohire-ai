# ⚠️ BACKEND NOT RUNNING - Start It Now!

## The Problem

You're getting "Failed to create problem" because the **backend server is not running**.

The frontend is trying to call: `http://localhost:8000/api/v1/problems/`
But nothing is listening on port 8000!

---

## ✅ Quick Fix - Start Backend

### Open a NEW terminal/PowerShell and run:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### ⚠️ KEEP THIS TERMINAL OPEN!

Don't close it - the backend must stay running.

---

## 🧪 Test Backend

Once backend is running, test it:

### In browser, open:
```
http://localhost:8000/docs
```

You should see the Swagger UI documentation page.

### Or test with curl:
```bash
curl http://localhost:8000/api/v1/problems/
```

Should return: `[]` (empty array)

---

## 🔄 Then Try Creating Problem Again

1. Go back to admin page
2. Fill in the problem form
3. Click "Save"
4. ✅ Should work now!

---

## 🚀 Alternative: Use Auto-Start Script

Instead of starting manually, run:

```bash
# Windows Batch:
start-all.bat

# Or PowerShell:
.\start-all.ps1
```

This will:
1. Start MongoDB (if needed)
2. Start Backend in new window
3. Start Frontend in new window
4. Open browser

---

## 📍 What Needs to Run

For the system to work, you need **3 things running**:

1. ✅ **MongoDB** - Database (should be running as service)
2. ❌ **Backend** - FastAPI on port 8000 (NOT RUNNING - START IT!)
3. ✅ **Frontend** - Vite on port 5173 (already running)

---

## 🐛 If Backend Won't Start

### Error: "No module named 'uvicorn'"
```bash
cd backend
pip install -r requirements.txt
```

### Error: "Port 8000 already in use"
```bash
# Find what's using it:
Get-NetTCPConnection -LocalPort 8000

# Kill the process:
Stop-Process -Id <PID> -Force
```

### Error: "Cannot connect to MongoDB"
```bash
# Start MongoDB:
net start MongoDB

# Or start manually:
mongod
```

---

## ✅ Checklist

- [ ] Open new terminal
- [ ] Navigate to backend folder: `cd backend`
- [ ] Run: `python -m uvicorn app.main:app --reload --port 8000`
- [ ] See "Application startup complete"
- [ ] Keep terminal open
- [ ] Test: http://localhost:8000/docs
- [ ] Try creating problem again

---

**DO THIS NOW** → Start the backend server! 🚀
