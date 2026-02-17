# NeuroHire AI - Next-Generation Recruitment Platform

![NeuroHire AI](https://img.shields.io/badge/NeuroHire-AI%20Powered-00d9ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)

A cutting-edge AI recruitment platform featuring adaptive interviews, real-time emotion detection, voice analysis, and predictive candidate scoring.

## 🎓 Final Year Project

This is an academic project focused on building an AI-powered interview system with:
- Custom AI models (Speech-to-Text, Emotion Recognition, Voice Analysis)
- Multimodal analysis (audio + video + text)
- Adaptive question generation
- Real-time behavioral assessment
- Automated report generation

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Adaptive Questioning**: Real-time question adjustment based on candidate responses
- **Emotion Detection**: Live facial analysis and sentiment tracking
- **Voice Analysis**: Confidence, clarity, and tone metrics from vocal patterns
- **Predictive Scoring**: AI-driven candidate evaluation and ranking

### 🔒 Security & Monitoring
- Tab switch detection and monitoring
- Face verification and presence detection
- Anti-cheat systems
- Encrypted data channels
- Secure interview environment

### 📊 Analytics & Insights
- Comprehensive performance reports
- Emotion and sentiment tracking
- Voice pattern analysis
- Technical skill assessment
- Behavioral evaluation metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components
│   ├── ui/             # Shadcn UI components
│   └── ...             # Custom components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
│   ├── api.ts         # API client
│   ├── constants.ts   # App constants
│   ├── utils.ts       # Utility functions
│   └── validators.ts  # Zod schemas
├── pages/              # Page components
│   ├── admin/         # Admin dashboard pages
│   ├── candidate/     # Candidate portal pages
│   ├── recruiter/     # Recruiter portal pages
│   └── ...            # Public pages
├── types/              # TypeScript definitions
└── App.tsx            # Main app component
```

## 🎭 User Roles

### 👤 Candidate
- Personal dashboard with performance metrics
- Practice mode for interview preparation
- Company interview scheduling
- Technical coding challenges
- Aptitude tests
- AI-powered interview room
- Detailed performance reports

### 💼 Recruiter
- Hiring pipeline dashboard
- Job posting and management
- Question database
- Candidate rankings and filtering
- Messaging system
- Analytics and insights

### 🛡️ Admin
- System monitoring and control
- User management
- AI performance metrics
- System logs and alerts
- Platform analytics

## 🛣️ Routes

### Public Routes
- `/` - Landing page
- `/login` - Authentication

### Candidate Routes
- `/candidate/dashboard` - Main dashboard
- `/candidate/profile` - Profile management
- `/candidate/practice` - Practice mode
- `/candidate/interviews` - Interview list
- `/candidate/aptitude-test` - Aptitude test
- `/candidate/technical-coding` - Coding challenges
- `/candidate/interview-room` - Live interview
- `/candidate/reports` - Performance reports

### Recruiter Routes
- `/recruiter/dashboard` - Dashboard
- `/recruiter/create-job` - Create job posting
- `/recruiter/questions` - Question database
- `/recruiter/rankings` - Candidate rankings
- `/recruiter/messages` - Messaging

### Admin Routes
- `/admin/dashboard` - Control center
- `/admin/monitoring` - System monitoring

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Components**: Shadcn UI (Radix UI)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build           # Production build
npm run build:dev       # Development build

# Testing
npm run test            # Run tests once
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Lint code
npm run preview         # Preview production build
```

## 🎨 Design System

The platform features a futuristic cyberpunk aesthetic with:
- Neon gradients (cyan/teal primary colors)
- Glass morphism effects
- Particle backgrounds
- Holographic elements
- Smooth animations and transitions

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENV=development
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_EMOTION_DETECTION=true
VITE_ENABLE_VOICE_ANALYSIS=true
```

## 📦 Key Dependencies

- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching
- `@radix-ui/*` - Headless UI components
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `zod` - Schema validation
- `react-hook-form` - Form handling

## 🤝 Contributing

This project was built with [Lovable](https://lovable.dev). Changes can be made via:
1. Lovable's web interface
2. Local development with your IDE
3. GitHub Codespaces
4. Direct GitHub file editing

## 📄 License

© 2026 NeuroHire AI. All rights reserved.

## 🏗️ Current Implementation Status

### ✅ Completed
- Frontend application (React + TypeScript)
- User authentication system
- Admin/Recruiter/Candidate dashboards
- Interview room UI
- Report visualization pages
- API client structure
- Type definitions
- Validation schemas

### 🚧 In Development
- Backend API (FastAPI)
- AI Models:
  - Speech-to-Text (ASR)
  - Emotion Recognition
  - Voice Confidence Analyzer
  - Gesture Detection
  - Answer Evaluation (NLP)
  - Adaptive Question Engine
- Database integration
- Real-time WebSocket communication
- Video/Audio processing pipeline

## 🔗 Links

- **Project URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

---

Built with ❤️ using React, TypeScript, and AI
