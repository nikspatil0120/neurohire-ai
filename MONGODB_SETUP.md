# MongoDB Setup Guide for NeuroHire AI

## Overview
This guide will help you set up MongoDB for the NeuroHire AI application, including user authentication, data storage, and database management.

## Prerequisites
- Node.js installed
- MongoDB installed locally or access to MongoDB Atlas
- Basic knowledge of database concepts

## Step 1: MongoDB Installation

### Option A: Local MongoDB Installation

#### Windows:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Install MongoDB Compass (GUI tool)
4. Start MongoDB service

#### macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux:
```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier is sufficient)
4. Create a database user
5. Get your connection string

## Step 2: Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update your `.env` file with your MongoDB configuration:

### For Local MongoDB:
```env
VITE_MONGODB_URI=mongodb://localhost:27017
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### For MongoDB Atlas:
```env
VITE_MONGODB_URI=mongodb+srv://username:password@cluster-url/neurohire_ai?retryWrites=true&w=majority
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Step 3: Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  password: "hashed_password",
  name: "John Doe",
  role: "candidate" | "recruiter" | "admin",
  avatar: "https://example.com/avatar.jpg",
  createdAt: Date,
  updatedAt: Date,
  isActive: true,
  lastLogin: Date,
  profile: {
    phone: "+1234567890",
    location: "New York, USA",
    bio: "Software developer...",
    skills: ["JavaScript", "React", "Node.js"],
    experience: "5 years",
    education: "Bachelor's in Computer Science"
  }
}
```

### Jobs Collection
```javascript
{
  _id: ObjectId,
  title: "Senior Frontend Developer",
  description: "Job description...",
  requirements: ["React", "TypeScript", "5+ years"],
  recruiterId: ObjectId,
  status: "active" | "closed" | "draft",
  createdAt: Date,
  updatedAt: Date,
  salary: "$80,000 - $120,000",
  location: "Remote",
  type: "full-time" | "part-time" | "contract"
}
```

### Interviews Collection
```javascript
{
  _id: ObjectId,
  candidateId: ObjectId,
  recruiterId: ObjectId,
  jobId: ObjectId,
  status: "scheduled" | "completed" | "cancelled",
  scheduledAt: Date,
  completedAt: Date,
  type: "technical" | "behavioral" | "final",
  notes: "Interview notes...",
  score: Number,
  feedback: "Detailed feedback..."
}
```

### Reports Collection
```javascript
{
  _id: ObjectId,
  candidateId: ObjectId,
  interviewId: ObjectId,
  type: "technical" | "behavioral" | "emotion",
  score: Number,
  details: {
    technicalScore: 85,
    behavioralScore: 90,
    emotionScore: 75,
    overallScore: 83
  },
  recommendations: ["Strong technical skills", "Good communication"],
  createdAt: Date
}
```

## Step 4: Database Features

### Security Features
- **Password Hashing**: Using bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Email format validation and password requirements
- **Role-Based Access**: Different permissions for candidates, recruiters, and admins

### Performance Features
- **Database Indexes**: Optimized queries for email, role, and dates
- **Connection Pooling**: Efficient database connection management
- **Soft Deletes**: Users are deactivated rather than deleted
- **Caching**: Token verification and user session management

### Data Integrity
- **Unique Email Constraint**: No duplicate email addresses
- **Required Fields**: Essential data validation
- **Type Safety**: TypeScript interfaces for all data structures
- **Error Handling**: Comprehensive error management

## Step 5: Testing the Setup

1. Start MongoDB (if local):
```bash
# Windows
net start MongoDB

# macOS/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

2. Start your application:
```bash
npm run dev
```

3. Test user registration:
   - Go to `http://localhost:3000/login`
   - Click "Sign Up"
   - Fill in the form and submit

4. Verify data in MongoDB:
   - Open MongoDB Compass
   - Connect to your database
   - Check the `users` collection for new records

## Step 6: Common Issues & Solutions

### Connection Issues
**Error**: "Database connection failed"
**Solution**: 
- Verify MongoDB is running
- Check connection string in `.env`
- Ensure firewall allows MongoDB port (27017)

### Authentication Issues
**Error**: "Invalid credentials"
**Solution**:
- Check email/password combination
- Verify user is active (not soft-deleted)
- Check JWT secret is consistent

### Performance Issues
**Error**: Slow queries
**Solution**:
- Ensure database indexes are created
- Check query execution plans
- Consider adding compound indexes

## Step 7: Production Considerations

### Security
- Use environment variables for sensitive data
- Implement rate limiting for authentication
- Use HTTPS in production
- Regularly update dependencies

### Scalability
- Consider MongoDB Atlas for cloud scaling
- Implement database sharding if needed
- Use read replicas for high-traffic applications
- Monitor database performance

### Backup Strategy
- Regular database backups
- Point-in-time recovery setup
- Test backup restoration process
- Document recovery procedures

## Step 8: Database Management

### Using MongoDB Compass
1. Connect to your database
2. Browse collections
3. Run queries and aggregations
4. Monitor database performance

### Using MongoDB Shell
```bash
# Connect to database
mongo neurohire_ai

# List collections
show collections

# Find users
db.users.find().pretty()

# Create index
db.users.createIndex({ email: 1 }, { unique: true })
```

### Monitoring
- Monitor connection counts
- Track query performance
- Set up alerts for unusual activity
- Regular maintenance and optimization

## Troubleshooting Checklist

- [ ] MongoDB service is running
- [ ] Connection string is correct
- [ ] Environment variables are set
- [ ] Database indexes are created
- [ ] Network connectivity is working
- [ ] Authentication credentials are valid
- [ ] Firewall rules are configured

## Support Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB University](https://university.mongodb.com/)
- [MongoDB Community Forums](https://community.mongodb.com/)
- [Node.js MongoDB Driver](https://mongodb.github.io/node-mongodb-native/)

## Next Steps

1. Set up your MongoDB instance
2. Configure environment variables
3. Test the authentication system
4. Explore the database schema
5. Implement additional features as needed

Your NeuroHire AI application is now ready to use MongoDB for all data storage needs! 🚀
