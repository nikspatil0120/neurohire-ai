# NeuroHire AI - System Flow Diagrams

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │    Admin     │  │  Recruiter   │  │      Candidate           │ │
│  │  Dashboard   │  │   Portal     │  │       Portal             │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────────┤ │
│  │ • Users Mgmt │  │ • Post Jobs  │  │ • Browse Jobs            │ │
│  │ • Problems   │  │ • Schedule   │  │ • Apply                  │ │
│  │ • Questions  │  │   Interviews │  │ • Take Interviews        │ │
│  │ • Analytics  │  │ • View Reports│ │ • Practice Mode          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                    HTTP/WebSocket API
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                      FASTAPI BACKEND                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    API ENDPOINTS                               │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ /auth   /users   /jobs   /interviews   /problems   /aptitude │ │
│  │                    /ws (WebSocket)                            │ │
│  └─────────────────────────┬─────────────────────────────────────┘ │
│                            │                                         │
│  ┌─────────────────────────┴─────────────────────────────────────┐ │
│  │              AI ORCHESTRATOR (Brain)                          │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │ │
│  │  │   NLP       │  │   Speech    │  │      Vision          │ │ │
│  │  │   Engine    │  │   Engine    │  │      Engine          │ │ │
│  │  ├─────────────┤  ├─────────────┤  ├──────────────────────┤ │ │
│  │  │ • Question  │  │ • STT       │  │ • Emotion Detection  │ │ │
│  │  │   Generator │  │   (Whisper) │  │   (DeepFace)         │ │ │
│  │  │ • Answer    │  │ • TTS       │  │ • Face Tracking      │ │ │
│  │  │   Evaluator │  │   (Coqui)   │  │   (OpenCV)           │ │ │
│  │  │ • LLM       │  │ • Voice     │  │                      │ │ │
│  │  │   (GPT-4)   │  │   Analysis  │  │                      │ │ │
│  │  │             │  │   (Librosa) │  │                      │ │ │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │            Scoring & Adaptive Engine                  │  │ │
│  │  ├───────────────────────────────────────────────────────┤  │ │
│  │  │ • Real-time Performance Tracking                      │  │ │
│  │  │ • Adaptive Difficulty Adjustment                      │  │ │
│  │  │ • Multi-modal Score Calculation                       │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                        DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │  PostgreSQL    │  │   MongoDB      │  │       Redis          │ │
│  ├────────────────┤  ├────────────────┤  ├──────────────────────┤ │
│  │ • users        │  │ • jobs         │  │ • Session cache      │ │
│  │ • interviews   │  │ • sessions     │  │ • Real-time data     │ │
│  │ • questions    │  │ • transcripts  │  │ • Rate limiting      │ │
│  │                │  │ • analytics    │  │ • Queue management   │ │
│  │                │  │ • problems     │  │                      │ │
│  └────────────────┘  └────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Interview Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERVIEW LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

   [Recruiter] ──┐
                 │
                 ▼
          ┌──────────────┐
          │  Create Job  │
          │   Posting    │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Candidate  │
          │    Applies   │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │  Recruiter   │◄────── Schedule Interview
          │  Schedules   │
          └──────┬───────┘
                 │
                 ▼
   ╔═════════════════════════════════════════════════════╗
   ║         INTERVIEW SESSION BEGINS                    ║
   ╚═════════════════════════════════════════════════════╝
                 │
                 ▼
   ┌─────────────────────────────────────────────────────┐
   │   ROUND 1: Introduction (2-3 minutes)               │
   ├─────────────────────────────────────────────────────┤
   │  • AI introduces itself                             │
   │  • Explains interview structure                     │
   │  • Candidate introduces themselves                  │
   │  • Q: "Tell me about yourself"                      │
   │  • Q: "Why this role?"                              │
   └──────────────────────┬──────────────────────────────┘
                          │
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │   ROUND 2: Technical (20-30 minutes)                │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │  Part A: Coding Problems (15-20 min)               │
   │  ┌─────────────────────────────────────────┐      │
   │  │  Problem 1: Medium Difficulty           │      │
   │  │  • Candidate reads problem              │      │
   │  │  • Writes code in browser IDE           │      │
   │  │  • Submits solution                     │      │
   │  │  • AI evaluates (test cases)            │      │
   │  │  • Score: 85/100 ✓ → INCREASE DIFFICULTY│      │
   │  └─────────────────────────────────────────┘      │
   │           │                                        │
   │           ▼                                        │
   │  ┌─────────────────────────────────────────┐      │
   │  │  Problem 2: Hard Difficulty             │      │
   │  │  • Candidate attempts                   │      │
   │  │  • Score: 60/100 ✓ → KEEP DIFFICULTY   │      │
   │  └─────────────────────────────────────────┘      │
   │                                                     │
   │  Part B: Technical MCQs (5-10 min)                │
   │  ┌─────────────────────────────────────────┐      │
   │  │  Q1: "What is Django ORM?" (Medium)     │      │
   │  │  Q2: "Explain REST API..." (Medium)     │      │
   │  │  Q3: "PostgreSQL indexing..." (Hard)    │      │
   │  │  ... (10 questions total)               │      │
   │  │  Adaptive: 7/10 correct → Good score    │      │
   │  └─────────────────────────────────────────┘      │
   └──────────────────────┬──────────────────────────────┘
                          │
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │   ROUND 3: Aptitude (10-15 minutes)                 │
   ├─────────────────────────────────────────────────────┤
   │  • Logical Reasoning (5 questions)                  │
   │  • Quantitative Aptitude (5 questions)              │
   │  • Timed questions (90 seconds each)                │
   │  • Auto-submit on timeout                           │
   └──────────────────────┬──────────────────────────────┘
                          │
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │   ROUND 4: Behavioral (10-15 minutes)               │
   ├─────────────────────────────────────────────────────┤
   │  Q: "Tell me about a challenging project..."        │
   │  • Candidate responds verbally                      │
   │  • AI transcribes (Speech-to-Text)                  │
   │  • Evaluates: clarity, structure, keywords          │
   │                                                     │
   │  Q: "How do you handle tight deadlines?"            │
   │  • Voice analysis: confidence, pitch, energy        │
   │  • Emotion detection: stress vs calm                │
   │                                                     │
   │  Follow-up: "Can you elaborate on..."              │
   └──────────────────────┬──────────────────────────────┘
                          │
                          ▼
   ╔═════════════════════════════════════════════════════╗
   ║         INTERVIEW SESSION ENDS                      ║
   ╚═════════════════════════════════════════════════════╝
                          │
                          ▼
          ┌───────────────────────────┐
          │   AI Processing           │
          ├───────────────────────────┤
          │ • Calculate scores        │
          │ • Analyze transcripts     │
          │ • Generate insights       │
          │ • Create report           │
          └───────────┬───────────────┘
                      │
                      ▼
          ┌───────────────────────────┐
          │   Report Generated        │
          ├───────────────────────────┤
          │ • Technical Score: 75/100 │
          │ • Communication: 80/100   │
          │ • Confidence: 70/100      │
          │ • Overall: 75/100         │
          │ • Strengths & Weaknesses  │
          │ • Recommendation          │
          └───────────┬───────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    [Recruiter]             [Candidate]
    Views Report            Views Report
    Makes Decision          Gets Feedback
```

---

## 🤖 Question Generation Flow

```
┌────────────────────────────────────────────────────────────────┐
│              QUESTION GENERATION SYSTEM                         │
└────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐
   │  Interview      │
   │  Starts         │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Fetch Job Details                      │
   ├─────────────────────────────────────────┤
   │  • Title: "Senior Python Developer"     │
   │  • Skills: ["Python", "Django", ...]    │
   │  • Experience: "3-5 years"              │
   │  • Responsibilities: [...]              │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Call Google AI Studio API              │
   │  (Question Generator)                   │
   ├─────────────────────────────────────────┤
   │  POST /generate-questions               │
   │  {                                      │
   │    job_context: {...},                  │
   │    specs: {                             │
   │      type: "technical_mcq",             │
   │      count: 10,                         │
   │      difficulty: "medium"               │
   │    }                                    │
   │  }                                      │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Receive Generated Questions            │
   ├─────────────────────────────────────────┤
   │  [                                      │
   │    {question_text, options, correct},   │
   │    {question_text, options, correct},   │
   │    ...                                  │
   │  ]                                      │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Store in Interview Session             │
   │  (MongoDB)                              │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Present Question to Candidate          │
   │  (via WebSocket)                        │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Candidate Answers                      │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Evaluate Answer                        │
   ├─────────────────────────────────────────┤
   │  • Check if correct                     │
   │  • Calculate score                      │
   │  • Update performance metrics           │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Adaptive Logic                         │
   ├─────────────────────────────────────────┤
   │  Performance = Correct / Total          │
   │  If > 80% → Increase difficulty         │
   │  If < 50% → Decrease difficulty         │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Generate NEXT Question                 │
   │  (with adjusted difficulty)             │
   ├─────────────────────────────────────────┤
   │  POST /generate-questions               │
   │  {                                      │
   │    job_context: {...},                  │
   │    current_performance: 0.8,            │
   │    difficulty: "hard",  ← ADAPTED       │
   │    focus_area: "Database"  ← WEAK AREA  │
   │  }                                      │
   └────────┬────────────────────────────────┘
            │
            ▼
         [Repeat until round complete]
```

---

## 📊 Real-Time Multimodal Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│              DURING LIVE INTERVIEW                               │
└─────────────────────────────────────────────────────────────────┘

   Candidate Speaking
         │
         ├──────────────────┬──────────────────┬───────────────────┐
         │                  │                  │                   │
         ▼                  ▼                  ▼                   ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
   │  Audio   │      │  Video   │      │  Text    │      │  Answer  │
   │  Stream  │      │  Stream  │      │  Input   │      │  Submit  │
   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                  │                  │
        ▼                 ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Speech-  │      │ Emotion  │      │   NLP    │      │ Correct? │
   │ to-Text  │      │ Detection│      │ Analysis │      │  Check   │
   │(Whisper) │      │(DeepFace)│      │  (GPT)   │      │          │
   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                  │                  │
        ▼                 ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Voice     │      │Emotion   │      │Clarity & │      │Technical │
   │Analysis  │      │Timeline  │      │Structure │      │Score     │
   │(Librosa) │      │          │      │          │      │          │
   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                  │                  │
        └─────────────────┴──────────────────┴──────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  SCORING ENGINE               │
                    ├───────────────────────────────┤
                    │  • Aggregate all metrics      │
                    │  • Calculate weighted scores  │
                    │  • Update in real-time        │
                    │  • Store in MongoDB           │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Live Dashboard (Optional)    │
                    │  Recruiter can monitor:       │
                    │  • Current question           │
                    │  • Candidate emotions         │
                    │  • Performance graph          │
                    └───────────────────────────────┘
```

---

## 💾 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE STRATEGY                         │
└─────────────────────────────────────────────────────────────────┘

   USER ACTION → API ENDPOINT → DATA STORAGE
   
   1. User Registration
      POST /auth/register → PostgreSQL.users
      
   2. Job Posting
      POST /jobs/ → MongoDB.jobs
      
   3. Interview Scheduling
      POST /interviews/ → PostgreSQL.interviews
      
   4. Interview Session
      WS /ws/interview/{id} → MongoDB.interview_sessions
      
   5. Question Asked
      → MongoDB.sessions.questions_asked[]
      
   6. Audio Transcription
      → MongoDB.transcripts[]
      
   7. Emotion Detection
      → MongoDB.sessions.real_time_metrics.emotion_timeline[]
      
   8. Voice Analysis
      → MongoDB.sessions.real_time_metrics.voice_metrics
      
   9. Answer Submission
      → MongoDB.sessions.questions_asked[].candidate_answer
      
   10. Score Calculation
       → PostgreSQL.interviews.{technical_score, ...}
       
   11. Report Generation
       → MongoDB.reports (optional)
       → Send to Frontend

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE RELATIONSHIPS                        │
└─────────────────────────────────────────────────────────────────┘

PostgreSQL:
   users (id) ←──┐
                 │
   jobs (created_by) ──→ users.id
                 │
   interviews (candidate_id) ──→ users.id
   interviews (job_id) ──→ jobs.id
                 │
MongoDB:
   jobs._id ←── (reference in frontend)
   interview_sessions.interview_id ──→ PostgreSQL.interviews.id
   interview_sessions.candidate_id ──→ PostgreSQL.users.id
   interview_sessions.job_id ──→ MongoDB.jobs._id
```

---

## 🔐 Authentication Flow

```
   [User]
     │
     │ 1. Login with email/password
     ▼
   POST /api/v1/auth/login
   { email, password }
     │
     ▼
   [Backend validates]
   • Check user exists
   • Verify password hash
     │
     ├── Invalid → 401 Unauthorized
     │
     └── Valid ──→ Generate JWT Token
                   │
                   ▼
                 Response:
                 {
                   access_token: "jwt_token_here",
                   token_type: "bearer",
                   user: {
                     id, email, name, role
                   }
                 }
                   │
                   ▼
              [Frontend stores]
              • localStorage.user
              • localStorage.token
                   │
                   ▼
              Subsequent requests:
              Header: Authorization: Bearer <token>
                   │
                   ▼
              [Backend validates JWT]
              • Decode token
              • Check expiration
              • Extract user_id
                   │
                   ├── Invalid → 401 Unauthorized
                   │
                   └── Valid ──→ Process request
```

---

**Use these diagrams to understand the complete system flow!** 🚀
