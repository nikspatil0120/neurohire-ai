# NeuroHire AI Backend

🧠 **AI-powered interview platform backend** built with FastAPI, featuring real-time multimodal AI analysis.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL
- MongoDB  
- Redis

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or venv\Scripts\activate  # Windows

# Install packages
pip install -r requirements.txt
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database URLs and API keys
```

### 3. Start Databases

```bash
# Using Docker (recommended)
docker-compose up -d

# Or install and start manually:
# - PostgreSQL on port 5432
# - MongoDB on port 27017  
# - Redis on port 6379
```

### 4. Start Backend

```bash
# Easy startup (recommended)
python start.py

# Or manually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify Installation

- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **System Info**: http://localhost:8000/api/v1/system/info

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI       │    │   AI Pipeline   │
│   (React)       │◄──►│   Backend       │◄──►│   (Whisper,     │
│                 │    │                 │    │    TTS, CV)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┴────────┐
                       │   Databases     │
                       │ PostgreSQL +    │
                       │ MongoDB +       │
                       │ Redis           │
                       └─────────────────┘
```

## 🤖 AI Features

### Speech Processing
- **Speech-to-Text**: Whisper for real-time transcription
- **Text-to-Speech**: Coqui TTS for AI question audio
- **Voice Analysis**: Librosa for confidence detection

### Computer Vision  
- **Emotion Detection**: DeepFace for facial emotion analysis
- **Face Tracking**: OpenCV for presence detection

### Natural Language Processing
- **Question Generation**: LLM-powered adaptive questions
- **Answer Evaluation**: Semantic similarity + keyword matching
- **Adaptive Engine**: Dynamic difficulty adjustment

### Real-time Features
- **WebSocket**: Live audio/video processing
- **Multimodal Analysis**: Simultaneous speech, emotion, voice analysis
- **Adaptive Questioning**: Dynamic interview flow

## 📁 Project Structure

```
backend/
├── app/
│   ├── ai/                    # AI modules
│   │   ├── speech/           # STT, TTS, voice analysis
│   │   ├── vision/           # Emotion detection
│   │   ├── nlp/              # Question generation, evaluation
│   │   ├── scoring/          # Adaptive engine
│   │   └── orchestrator.py   # Main AI coordinator
│   ├── api/                  # REST API endpoints
│   │   ├── auth.py           # Authentication
│   │   ├── users.py          # User management
│   │   ├── jobs.py           # Job postings
│   │   ├── interviews.py     # Interview management
│   │   └── websocket.py      # Real-time WebSocket
│   ├── core/                 # Core infrastructure
│   │   ├── database.py       # Database connections
│   │   ├── security.py       # Security utilities
│   │   └── websocket_manager.py # WebSocket management
│   ├── models/               # Database models
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic
│   ├── utils/                # Utilities
│   └── main.py               # FastAPI application
├── storage/                  # File storage
├── logs/                     # Application logs
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # Database services
├── Dockerfile               # Container build
└── start.py                 # Startup script
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Interviews
- `POST /api/v1/interviews/` - Create interview
- `POST /api/v1/interviews/{id}/start` - Start interview session
- `POST /api/v1/interviews/{id}/complete` - Complete interview
- `GET /api/v1/interviews/{id}/report` - Get interview report

### Real-time
- `WS /api/v1/ws/interview/{session_id}` - Live interview WebSocket

### Jobs & Users
- `GET /api/v1/jobs/` - List job postings
- `POST /api/v1/jobs/` - Create job posting
- `GET /api/v1/users/` - List users (admin)

## 🗄️ Database Schema

### PostgreSQL (Structured Data)
- **users** - User accounts and profiles
- **jobs** - Job postings and requirements  
- **interviews** - Interview sessions and scores
- **questions** - Question bank and metadata

### MongoDB (Unstructured Data)
- **interview_sessions** - Real-time session data
- **transcripts** - Audio transcriptions
- **video_analysis** - Frame-by-frame emotion data
- **behavioral_metrics** - Voice and emotion analytics

### Redis (Caching)
- Session management
- Real-time data caching
- Rate limiting

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database URLs
POSTGRES_URL=postgresql://user:pass@localhost/neurohire
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Models
OPENAI_API_KEY=your-openai-key
WHISPER_MODEL=base
TTS_MODEL=tts_models/en/ljspeech/tacotron2-DDC

# CORS
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test
pytest app/tests/test_main.py::test_health_check
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t neurohire-backend .

# Run with docker-compose
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### Logs
- **Application logs**: `logs/app.log`
- **Interview sessions**: `logs/interviews/{session_id}.log`
- **Security events**: `logs/security/security.log`

### Health Checks
- **Health endpoint**: `/health`
- **System stats**: `/api/v1/system/stats`
- **Database status**: Automatic connection monitoring

## 🛡️ Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (admin, recruiter, candidate)
- Password strength validation
- Rate limiting

### Data Protection
- Encrypted sensitive data storage
- CORS protection
- Input validation and sanitization
- SQL injection prevention

### Privacy & Ethics
- Consent management system
- Bias detection in scoring
- Explainable AI reports
- Data retention policies

## 🚀 Performance

### Optimizations
- **Async/await**: Non-blocking I/O operations
- **Connection pooling**: Efficient database connections
- **Caching**: Redis for frequently accessed data
- **Parallel processing**: Concurrent AI model inference

### Scalability
- **Horizontal scaling**: Multiple worker processes
- **Load balancing**: Nginx reverse proxy support
- **Database sharding**: MongoDB collection partitioning
- **CDN integration**: Static file delivery

## 🔍 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check if databases are running
docker-compose ps

# Restart databases
docker-compose restart postgres mongo redis
```

**AI Model Loading Error**
```bash
# Install missing AI dependencies
pip install torch torchvision torchaudio
pip install whisper deepface librosa sentence-transformers
```

**WebSocket Connection Issues**
```bash
# Check CORS settings in .env
# Verify frontend WebSocket URL matches backend
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=true python start.py

# Check logs
tail -f logs/app.log
```

## 📈 Monitoring & Analytics

### Metrics Tracked
- Interview completion rates
- Average session duration
- AI model performance
- User engagement metrics
- System resource usage

### Integration Options
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Sentry**: Error tracking
- **DataDog**: APM monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Setup
```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run pre-commit hooks
pre-commit install

# Run linting
flake8 app/
black app/
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full API Documentation](http://localhost:8000/docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ for BTech Final Year Project**

*NeuroHire AI - Revolutionizing technical interviews with ethical AI*