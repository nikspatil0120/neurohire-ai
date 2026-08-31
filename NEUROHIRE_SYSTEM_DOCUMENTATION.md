# NeuroHire AI - Complete System Documentation for Question Generation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Workflows](#user-roles--workflows)
4. [Database Schema](#database-schema)
5. [Interview Process](#interview-process)
6. [Question Generation Context](#question-generation-context)
7. [API Endpoints](#api-endpoints)
8. [Integration Guidelines](#integration-guidelines)

---

## 🎯 System Overview

**NeuroHire AI** is an intelligent recruitment platform that conducts AI-powered technical interviews with multimodal analysis. The system evaluates candidates through:
- **Technical interviews** (coding problems, aptitude tests)
- **Behavioral interviews** (soft skills assessment)
- **Real-time multimodal analysis** (voice tone, emotions, facial expressions)
- **Adaptive questioning** (difficulty adjusts based on performance)

### Core Technologies
- **Backend**: FastAPI (Python) - REST API + WebSocket
- **Frontend**: React + TypeScript + Vite
- **Databases**: 
  - PostgreSQL (structured data: users, jobs, interviews)
  - MongoDB (unstructured data: sessions, transcripts, analytics)
  - Redis (caching & real-time data)
- **AI Models**:
  - OpenAI GPT for NLP (question generation, answer evaluation)
  - Whisper for Speech-to-Text
  - Coqui TTS for Text-to-Speech
  - DeepFace for emotion detection
  - Librosa for voice analysis

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ Admin    │ Recruiter│ Candidate│ Interview│ Real-time    │  │
│  │ Dashboard│ Portal   │ Portal   │ Interface│ Analytics    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────┴─────────────────────────────────────┐
│                    BACKEND (FastAPI)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API LAYER (REST + WebSocket)                │  │
│  │  /auth  /users  /jobs  /interviews  /ws  /problems       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│  ┌────────────────────┴─────────────────────────────────────┐  │
│  │              BUSINESS LOGIC LAYER                         │  │
│  │  - Authentication Service                                 │  │
│  │  - Interview Service (orchestration)                      │  │
│  │  - User Management Service                                │  │
│  │  - Job Posting Service                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│  ┌────────────────────┴─────────────────────────────────────┐  │
│  │              AI PROCESSING LAYER                          │  │
│  │  ┌────────────┬────────────┬──────────┬──────────────┐   │  │
│  │  │ NLP Engine │ Speech Eng.│ Vision   │ Scoring Eng. │   │  │
│  │  │ - Q.Gen    │ - STT      │ Eng.     │ - Adaptive   │   │  │
│  │  │ - Eval     │ - TTS      │ - Emotion│ - Analytics  │   │  │
│  │  │            │ - Voice    │ Analysis │              │   │  │
│  │  └────────────┴────────────┴──────────┴──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    DATA LAYER                                   │
│  ┌─────────────┬─────────────┬─────────────────────────────┐  │
│  │ PostgreSQL  │  MongoDB    │  Redis                      │  │
│  │ - Users     │  - Sessions │  - Cache                    │  │
│  │ - Jobs      │  - Transc.  │  - Real-time data           │  │
│  │ - Interviews│  - Analytics│  - Rate limiting            │  │
│  │ - Questions │             │                             │  │
│  └─────────────┴─────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & Workflows

### 1. **Admin**
**Capabilities:**
- Manage all users (view, create, update, delete, activate/deactivate)
- Manage DSA coding problems (CRUD operations)
- Manage aptitude questions (CRUD operations)
- View system analytics and reports
- Configure system settings

**Workflow:**
```
Admin Login → Dashboard → 
  → User Management (view all candidates, recruiters)
  → Problem Management (add/edit DSA problems)
  → Aptitude Test Management (add/edit MCQ questions)
  → System Reports & Analytics
```

### 2. **Recruiter**
**Capabilities:**
- Create and manage job postings
- View candidate applications
- Schedule interviews
- View interview reports and candidate evaluations
- Shortlist/reject candidates

**Workflow:**
```
Recruiter Login → Dashboard →
  → Create Job Posting (title, skills, experience, responsibilities) →
  → View Applications →
  → Schedule Interview (select candidate, job) →
  → Monitor Live Interview (optional) →
  → View Interview Report (scores, transcript, analysis) →
  → Make Hiring Decision
```

### 3. **Candidate**
**Capabilities:**
- Complete profile (skills, experience, resume)
- Browse job opportunities
- Apply for jobs
- Take practice interviews
- Participate in scheduled interviews
- View interview reports

**Workflow:**
```
Candidate Registration → Complete Profile →
  → Browse Jobs → Apply →
  → Practice Mode (optional: practice DSA, aptitude) →
  → Scheduled Interview Notification →
  → Join Interview →
    → Introduction
    → Technical Round (DSA coding problems)
    → Aptitude Round (MCQ questions)
    → Behavioral Round (soft skills)
  → Interview Completion →
  → View Report & Scores
```

---

## 🗄️ Database Schema

### **PostgreSQL (Relational Data)**

#### **Users Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'candidate', -- admin, recruiter, candidate
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);
```

#### **Jobs Table (MongoDB)**
```javascript
{
  _id: ObjectId,
  title: String,                    // e.g., "Senior Python Developer"
  experience: String,               // e.g., "3-5 years"
  required_skills: [String],        // ["Python", "Django", "REST API"]
  key_responsibilities: [String],   // ["Develop APIs", "Code reviews"]
  created_by: ObjectId,             // Reference to recruiter User ID
  recruiter_email: String,
  recruiter_name: String,
  organization_name: String,
  status: String,                   // "draft" or "published"
  is_active: Boolean,
  views: Number,
  applications: Number,
  created_at: ISODate,
  updated_at: ISODate
}
```

#### **Interviews Table**
```sql
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL,        -- Foreign key to users
    job_id INTEGER NOT NULL,              -- Foreign key to jobs
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    technical_score DECIMAL(5,2),         -- 0-100
    communication_score DECIMAL(5,2),     -- 0-100
    confidence_score DECIMAL(5,2),        -- 0-100
    overall_score DECIMAL(5,2),           -- 0-100
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Questions Table**
```sql
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,       -- "technical", "behavioral", "general"
    difficulty INTEGER NOT NULL,          -- 1 (easy) to 5 (hard)
    question_type VARCHAR(50) NOT NULL,   -- "coding", "mcq", "open-ended"
    expected_keywords TEXT[],             -- Array of keywords for evaluation
    expected_answer TEXT,
    created_by INTEGER,                   -- Foreign key to users
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Problems Table (DSA Coding Problems)**
```javascript
{
  _id: ObjectId,
  title: String,                    // e.g., "Two Sum"
  description: String,              // Problem statement
  difficulty: String,               // "Easy", "Medium", "Hard"
  tags: [String],                   // ["Array", "Hash Table"]
  constraints: String,              // Time/space complexity constraints
  examples: [
    {
      input: String,
      output: String,
      explanation: String
    }
  ],
  test_cases: [
    {
      input: String,
      expected_output: String,
      is_hidden: Boolean            // Hidden test cases for evaluation
    }
  ],
  starter_code: {
    python: String,
    javascript: String,
    java: String,
    cpp: String
  },
  solution: String,                 // Reference solution
  created_by: ObjectId,
  is_active: Boolean,
  created_at: ISODate
}
```

#### **Aptitude Questions (MongoDB)**
```javascript
{
  _id: ObjectId,
  question_text: String,
  options: [
    {
      option_id: String,            // "A", "B", "C", "D"
      option_text: String
    }
  ],
  correct_answer: String,           // "A", "B", "C", or "D"
  category: String,                 // "Logical", "Quantitative", "Verbal"
  difficulty: String,               // "Easy", "Medium", "Hard"
  explanation: String,              // Explanation of correct answer
  time_limit: Number,               // Time in seconds
  created_by: ObjectId,
  is_active: Boolean,
  created_at: ISODate
}
```

### **MongoDB Collections (Unstructured Data)**

#### **Interview Sessions**
```javascript
{
  _id: ObjectId,
  interview_id: String,             // Reference to PostgreSQL interview ID
  session_id: String,               // Unique session identifier
  candidate_id: String,
  job_id: String,
  status: String,                   // "active", "paused", "completed"
  current_round: String,            // "introduction", "technical", "aptitude", "behavioral"
  questions_asked: [
    {
      question_id: String,
      question_text: String,
      question_type: String,        // "coding", "mcq", "open-ended"
      asked_at: ISODate,
      answered_at: ISODate,
      candidate_answer: String,
      is_correct: Boolean,
      score: Number,
      time_taken: Number            // Seconds
    }
  ],
  real_time_metrics: {
    avg_confidence: Number,         // Voice analysis score
    dominant_emotion: String,       // From facial emotion detection
    emotion_timeline: [
      {
        timestamp: Number,
        emotion: String,            // "neutral", "happy", "confused", "stressed"
        confidence: Number
      }
    ],
    voice_metrics: {
      avg_pitch: Number,
      avg_energy: Number,
      speech_rate: Number           // Words per minute
    }
  },
  transcript: [
    {
      speaker: String,              // "ai" or "candidate"
      text: String,
      timestamp: ISODate,
      audio_url: String             // Path to audio file
    }
  ],
  started_at: ISODate,
  ended_at: ISODate
}
```

---

## 🎤 Interview Process

### Interview Structure
An interview consists of multiple rounds executed sequentially:

#### **Round 1: Introduction (2-3 minutes)**
- AI introduces itself and explains the process
- Candidate introduces themselves
- **Question Types**: Open-ended (e.g., "Tell me about yourself", "Why are you interested in this role?")

#### **Round 2: Technical Assessment (20-30 minutes)**
- **Coding Problems**: 2-3 DSA problems based on job requirements
  - Problems selected from database based on:
    - Job skills match (e.g., if job requires "algorithms", show algorithm problems)
    - Difficulty progression (starts medium, adapts based on performance)
  - Candidate writes code in browser-based IDE
  - Real-time code execution and test case validation
  
- **Technical MCQs**: 5-10 questions on technologies mentioned in job posting
  - Dynamically generated or selected from question bank
  - Categories: Data Structures, Algorithms, System Design, Language-specific

#### **Round 3: Aptitude Assessment (10-15 minutes)**
- **Logical Reasoning**: Pattern recognition, puzzles
- **Quantitative Aptitude**: Math, probability, statistics
- **Verbal Ability**: Comprehension, grammar (if required by job)

#### **Round 4: Behavioral Questions (10-15 minutes)**
- **Soft Skills**: Communication, teamwork, problem-solving approach
- **Situational Questions**: How would you handle specific scenarios?
- **Question Examples**:
  - "Describe a challenging project you worked on"
  - "How do you handle tight deadlines?"
  - "Tell me about a time you had a conflict with a team member"

### Adaptive Difficulty System
```python
# Simplified adaptive logic
def get_next_question_difficulty(current_difficulty, was_correct, time_taken, avg_time):
    if was_correct and time_taken < avg_time * 0.8:
        return min(current_difficulty + 1, 5)  # Increase difficulty
    elif not was_correct:
        return max(current_difficulty - 1, 1)  # Decrease difficulty
    else:
        return current_difficulty  # Keep same difficulty
```

### Scoring System
```javascript
{
  technical_score: {
    coding_problems: 40%,           // Based on test cases passed
    technical_mcqs: 20%,            // Correctness
    problem_solving_approach: 10%   // Code quality, time complexity
  },
  communication_score: {
    clarity: 30%,                   // Speech transcription analysis
    confidence: 40%,                // Voice tone analysis
    engagement: 30%                 // Emotion detection (attentiveness)
  },
  confidence_score: {
    voice_analysis: 50%,            // Pitch, energy, speech rate
    facial_emotions: 50%            // Stress vs. calm emotions
  },
  overall_score: {
    technical: 60%,
    communication: 20%,
    confidence: 20%
  }
}
```

---

## 🤖 Question Generation Context

### **What Questions Need to Be Generated?**

#### 1. **Technical Open-Ended Questions**
**Context Needed:**
- Job title (e.g., "Senior Python Developer")
- Required skills (e.g., ["Python", "Django", "PostgreSQL", "REST APIs"])
- Experience level (e.g., "3-5 years")
- Key responsibilities (e.g., ["Build scalable APIs", "Database optimization"])

**Question Types:**
- Conceptual understanding (e.g., "Explain how Django ORM handles database queries")
- Best practices (e.g., "How would you design a RESTful API for user authentication?")
- Problem-solving (e.g., "How would you optimize a slow PostgreSQL query?")
- Experience-based (e.g., "Describe your experience with microservices architecture")

**Example Generation Prompt:**
```
Job: Senior Python Developer
Skills: Python, Django, REST API, PostgreSQL
Experience: 3-5 years

Generate 5 technical questions that:
1. Test deep understanding of Python and Django
2. Are appropriate for 3-5 years experience level
3. Cover REST API design and database optimization
4. Include both conceptual and scenario-based questions
```

#### 2. **Technical MCQ Questions**
**Context Needed:**
- Technology/skill (e.g., "Python", "Data Structures")
- Difficulty level (Easy/Medium/Hard)
- Specific topic (e.g., "Dictionaries", "Sorting Algorithms")

**Question Format:**
```javascript
{
  question_text: "What is the time complexity of searching in a balanced BST?",
  options: [
    { id: "A", text: "O(n)" },
    { id: "B", text: "O(log n)" },
    { id: "C", text: "O(n log n)" },
    { id: "D", text: "O(1)" }
  ],
  correct_answer: "B",
  explanation: "In a balanced BST, search takes O(log n) time...",
  difficulty: "Medium",
  category: "Data Structures"
}
```

#### 3. **Behavioral Questions**
**Context Needed:**
- Job role characteristics (leadership, teamwork, individual contributor)
- Company culture (if available)
- Seniority level

**Question Types:**
- Teamwork: "Describe a time when you worked with a difficult team member"
- Leadership: "Have you ever led a project? What was your approach?"
- Problem-solving: "Tell me about a technical challenge you overcame"
- Adaptability: "How do you handle changing requirements?"

#### 4. **Follow-Up Questions**
**Context Needed:**
- Previous candidate answer
- Current topic being discussed
- Candidate's performance so far (to probe deeper or move on)

**Example:**
```
Candidate answered: "I use Django for building REST APIs"

Follow-up questions:
- "What authentication method do you typically use in Django REST Framework?"
- "How do you handle API rate limiting?"
- "Can you explain how you structure your Django project?"
```

### **Question Selection Logic**

```python
def select_questions(job, candidate_profile, current_performance):
    """
    Select appropriate questions based on context
    """
    questions = []
    
    # Round 1: Introduction (fixed questions)
    questions.extend(get_introduction_questions())
    
    # Round 2: Technical Assessment
    # Get coding problems matching job skills
    coding_problems = get_coding_problems(
        skills=job.required_skills,
        difficulty="medium",  # Start with medium
        count=2
    )
    
    # Get technical MCQs
    tech_mcqs = get_technical_mcqs(
        skills=job.required_skills,
        difficulty=calculate_difficulty(candidate_profile),
        count=10
    )
    
    # Round 3: Aptitude
    aptitude_questions = get_aptitude_questions(
        categories=["Logical", "Quantitative"],
        difficulty="medium",
        count=10
    )
    
    # Round 4: Behavioral
    behavioral_questions = get_behavioral_questions(
        role_level=job.experience_level,
        count=5
    )
    
    return questions
```

---

## 🔌 API Endpoints Reference

### **Authentication**
```
POST /api/v1/auth/register     - Register new user
POST /api/v1/auth/login        - Login (returns JWT token)
GET  /api/v1/auth/me           - Get current user info
```

### **Jobs**
```
GET    /api/v1/jobs/                    - List all active jobs
GET    /api/v1/jobs/?active_only=true   - Filter active jobs only
POST   /api/v1/jobs/                    - Create job (recruiter only)
GET    /api/v1/jobs/{job_id}            - Get job details
PUT    /api/v1/jobs/{job_id}            - Update job
DELETE /api/v1/jobs/{job_id}            - Soft delete job
GET    /api/v1/jobs/recruiter/{email}   - Get jobs by recruiter
PATCH  /api/v1/jobs/{job_id}/status     - Publish/unpublish job
```

### **Interviews**
```
POST /api/v1/interviews/              - Create interview
POST /api/v1/interviews/{id}/start    - Start interview session
POST /api/v1/interviews/{id}/complete - Complete interview
GET  /api/v1/interviews/{id}/report   - Get interview report
```

### **Problems (DSA Coding)**
```
GET    /api/v1/problems/           - List all problems
POST   /api/v1/problems/           - Create problem (admin only)
GET    /api/v1/problems/{id}       - Get problem details
PUT    /api/v1/problems/{id}       - Update problem
DELETE /api/v1/problems/{id}       - Delete problem
```

### **Aptitude Questions**
```
GET    /api/v1/aptitude/           - List aptitude questions
POST   /api/v1/aptitude/           - Create question (admin only)
GET    /api/v1/aptitude/{id}       - Get question details
PUT    /api/v1/aptitude/{id}       - Update question
DELETE /api/v1/aptitude/{id}       - Delete question
```

### **Real-Time WebSocket**
```
WS /api/v1/ws/interview/{session_id}  - Live interview connection
```

**WebSocket Message Types:**
```javascript
// Client → Server
{
  type: "audio_chunk",        // Send audio for transcription
  data: base64_audio
}
{
  type: "answer_submit",      // Submit answer
  question_id: "123",
  answer: "candidate's answer"
}

// Server → Client
{
  type: "question",           // New question
  question_id: "123",
  question_text: "...",
  question_type: "coding|mcq|open-ended"
}
{
  type: "transcription",      // Real-time transcript
  text: "candidate speech..."
}
{
  type: "feedback",           // Immediate feedback
  is_correct: true,
  score: 85
}
```

---

## 🔗 Integration Guidelines for Question Generation

### **How to Integrate Your Question Generation System**

#### **Option 1: API Integration**
Create an endpoint in your question generation system that NeuroHire can call:

```python
# Your Google AI Studio Question Generation API
POST https://your-api.com/generate-questions

Request:
{
  "job_context": {
    "title": "Senior Python Developer",
    "required_skills": ["Python", "Django", "PostgreSQL"],
    "experience_level": "3-5 years",
    "responsibilities": ["Build APIs", "Database optimization"]
  },
  "question_type": "technical_mcq",  // or "technical_open", "behavioral"
  "difficulty": "medium",
  "count": 5
}

Response:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "mcq",
      "options": [...],  // Only for MCQ
      "correct_answer": "B",
      "explanation": "...",
      "difficulty": "medium",
      "estimated_time": 120  // seconds
    }
  ]
}
```

#### **Option 2: Database Integration**
Generate questions in bulk and store them in NeuroHire's database:

```python
# Script to import generated questions
import requests

questions = generate_questions_batch(job_contexts)

for question in questions:
    response = requests.post(
        "http://localhost:8000/api/v1/aptitude/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=question
    )
```

#### **Option 3: Real-Time Generation During Interview**
Integrate with NeuroHire's interview orchestrator:

```python
# In app/ai/nlp/question_generator.py

async def generate_next_question(
    job_id: str,
    candidate_history: List[dict],
    current_performance: float
) -> dict:
    """
    Call your Google AI Studio API to generate next question
    based on real-time interview context
    """
    # Get job details
    job = await get_job(job_id)
    
    # Call your question generation API
    response = await call_google_ai_studio_api(
        job_context=job,
        candidate_history=candidate_history,
        performance=current_performance
    )
    
    return response.question
```

### **Data Flow for Question Generation**

```
Interview Start
      ↓
Get Job Details (skills, experience, responsibilities)
      ↓
Call Question Generator API
      ↓
Receive Generated Questions
      ↓
Store in Session (MongoDB)
      ↓
Present Question to Candidate
      ↓
Evaluate Answer
      ↓
Update Performance Metrics
      ↓
Generate Next Question (adaptive)
      ↓
Repeat until interview complete
```

### **Context Variables Available for Question Generation**

```javascript
{
  // Job Information
  job: {
    title: String,
    required_skills: [String],
    experience_level: String,
    key_responsibilities: [String],
    organization_name: String
  },
  
  // Candidate Information
  candidate: {
    name: String,
    skills: [String],
    experience_years: Number,
    previous_answers: [
      {
        question: String,
        answer: String,
        score: Number
      }
    ]
  },
  
  // Interview Context
  interview: {
    current_round: String,  // "technical", "aptitude", "behavioral"
    questions_asked: Number,
    time_elapsed: Number,   // seconds
    current_performance: {
      technical_score: Number,
      answered_correctly: Number,
      total_questions: Number
    }
  },
  
  // Adaptive Parameters
  adaptive: {
    current_difficulty: Number,  // 1-5
    suggested_next_difficulty: Number,
    focus_areas: [String]  // Skills to focus on based on weak performance
  }
}
```

---

## 📊 Sample Interview Flow

```
START INTERVIEW
  ↓
[ROUND 1: INTRODUCTION]
  Q1: "Hello! I'm your AI interviewer. Can you introduce yourself?"
  A1: Candidate responds...
  ↓
[ROUND 2: TECHNICAL - CODING]
  Q2: DSA Problem - "Two Sum" (Medium)
  A2: Candidate writes code... → Evaluate → Score: 80/100
  ↓
  Q3: DSA Problem - "Binary Search Tree Validation" (Hard) [Difficulty increased]
  A3: Candidate writes code... → Evaluate → Score: 60/100
  ↓
[ROUND 2: TECHNICAL - MCQ]
  Q4-Q13: 10 MCQ questions on Python, Django, PostgreSQL
  ↓
[ROUND 3: APTITUDE]
  Q14-Q23: 10 Logical + Quantitative questions
  ↓
[ROUND 4: BEHAVIORAL]
  Q24: "Tell me about a challenging project you worked on"
  Q25: "How do you handle conflicts in a team?"
  ↓
END INTERVIEW → Generate Report
```

---

## 🎯 Key Points for Google AI Studio Integration

1. **Job Context is Critical**: Always use job title, required skills, and experience level to generate relevant questions

2. **Adaptive Difficulty**: Questions should adjust based on candidate performance (track correct/incorrect answers)

3. **Question Variety**: Mix coding problems, MCQs, and open-ended questions

4. **Time Management**: Each question should have estimated completion time

5. **Explanation Required**: For MCQs, always provide explanation of correct answer for post-interview feedback

6. **Follow-Up Questions**: Generate contextual follow-ups based on previous answers

7. **Scoring Rubric**: Include expected keywords or answer patterns for automated evaluation

8. **Real-Time Generation**: Support both pre-generated question banks and dynamic generation during interviews

---

## 📞 Contact & API Access

- **Backend URL**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`
- **WebSocket URL**: `ws://localhost:8000/api/v1/ws`

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Author**: NeuroHire AI Team
