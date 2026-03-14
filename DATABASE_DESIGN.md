# Database Schema Design

## PostgreSQL Tables

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'candidate');
```

### candidate_profiles
```sql
CREATE TABLE candidate_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    resume_url TEXT,
    skills TEXT[],
    experience_years INTEGER,
    education TEXT,
    profile_completion INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### recruiter_profiles
```sql
CREATE TABLE recruiter_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_website VARCHAR(255),
    jobs_posted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### jobs
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[],
    job_type VARCHAR(100),
    status job_status DEFAULT 'active',
    interview_config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE job_status AS ENUM ('active', 'closed', 'draft');
```

### interviews
```sql
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    type interview_type NOT NULL,
    status interview_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    session_id UUID UNIQUE,
    final_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE interview_type AS ENUM ('practice', 'actual');
CREATE TYPE interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'terminated', 'cancelled');
```

### questions
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    category VARCHAR(100),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    type question_type,
    expected_keywords TEXT[],
    expected_answer TEXT,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE question_type AS ENUM ('technical', 'behavioral', 'aptitude', 'coding');
```

## MongoDB Collections

### interview_sessions
```json
{
  "_id": "ObjectId",
  "session_id": "UUID",
  "interview_id": "UUID",
  "transcript": [
    {
      "timestamp": "ISO8601",
      "speaker": "ai|candidate",
      "text": "string",
      "confidence": 0.95
    }
  ],
  "audio_chunks": [
    {
      "timestamp": "ISO8601",
      "file_path": "string",
      "duration": 5.2
    }
  ],
  "video_analysis": [
    {
      "timestamp": "ISO8601",
      "emotions": {
        "confidence": 78,
        "stress": 25,
        "engagement": 82
      },
      "face_detected": true,
      "eye_contact": true
    }
  ],
  "voice_analysis": [
    {
      "timestamp": "ISO8601",
      "confidence": 86,
      "speech_rate": 145,
      "pause_duration": 2.1,
      "pitch_stability": 0.8
    }
  ]
}
```

### system_logs
```json
{
  "_id": "ObjectId",
  "timestamp": "ISO8601",
  "level": "info|warning|error",
  "service": "string",
  "message": "string",
  "interview_id": "UUID",
  "user_id": "UUID",
  "metadata": {}
}
```