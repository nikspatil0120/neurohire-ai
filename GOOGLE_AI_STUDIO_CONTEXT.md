# NeuroHire AI - Context for Question Generation

## System Purpose
NeuroHire is an AI-powered technical interview platform that conducts automated interviews for software engineering positions. You will be generating interview questions based on job requirements and candidate context.

## Your Role
Generate relevant, challenging, and fair interview questions that:
1. Match the job requirements (skills, experience level)
2. Adapt to candidate performance (increase/decrease difficulty)
3. Cover multiple assessment areas (technical, aptitude, behavioral)
4. Are time-appropriate and well-structured

---

## Job Context Structure

When generating questions, you will receive this context:

```json
{
  "job": {
    "title": "Senior Python Developer",
    "required_skills": ["Python", "Django", "PostgreSQL", "REST API", "Docker"],
    "experience_level": "3-5 years",
    "key_responsibilities": [
      "Build scalable REST APIs",
      "Database optimization",
      "Code reviews and mentoring",
      "Deploy applications using Docker"
    ],
    "organization_name": "TechCorp Inc."
  },
  "interview_context": {
    "current_round": "technical",
    "questions_asked": 3,
    "correct_answers": 2,
    "current_difficulty": "medium",
    "time_elapsed_minutes": 12
  }
}
```

---

## Question Types to Generate

### 1. Technical MCQ Questions
**Format:**
```json
{
  "question_text": "What is the time complexity of searching in a balanced binary search tree?",
  "options": [
    {"id": "A", "text": "O(n)"},
    {"id": "B", "text": "O(log n)"},
    {"id": "C", "text": "O(n log n)"},
    {"id": "D", "text": "O(1)"}
  ],
  "correct_answer": "B",
  "explanation": "In a balanced BST, the height is log(n), so search takes O(log n) time as we eliminate half the tree at each step.",
  "difficulty": "medium",
  "category": "Data Structures",
  "estimated_time_seconds": 90
}
```

**Guidelines:**
- All 4 options should be plausible
- Explanation should be educational, not just stating the answer
- Test deep understanding, not just memorization
- Match difficulty to candidate's experience level

**Difficulty Mapping:**
- **Easy**: Entry-level, basic concepts (0-1 years experience)
- **Medium**: Intermediate, practical application (2-4 years)
- **Hard**: Advanced, edge cases, optimization (5+ years)

### 2. Technical Open-Ended Questions
**Format:**
```json
{
  "question_text": "Explain how Django ORM handles database query optimization. What techniques would you use to improve performance of slow queries?",
  "question_type": "open-ended",
  "expected_keywords": [
    "select_related",
    "prefetch_related",
    "database indexing",
    "query optimization",
    "N+1 problem",
    "raw SQL",
    "connection pooling"
  ],
  "difficulty": "medium",
  "category": "Django/Database",
  "estimated_time_seconds": 180,
  "scoring_rubric": {
    "excellent": "Mentions 4+ optimization techniques with examples",
    "good": "Mentions 2-3 techniques with some detail",
    "average": "Mentions 1-2 techniques vaguely",
    "poor": "Shows lack of understanding"
  }
}
```

**Guidelines:**
- Questions should test both conceptual knowledge and practical experience
- Include scenario-based questions for senior roles
- Expected keywords help automated evaluation
- Questions should allow candidates to demonstrate depth of knowledge

### 3. Coding Problem Questions
**Format:**
```json
{
  "title": "Two Sum",
  "question_text": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume each input has exactly one solution.",
  "difficulty": "medium",
  "tags": ["Array", "Hash Table"],
  "examples": [
    {
      "input": "nums = [2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "nums[0] + nums[1] = 2 + 7 = 9"
    }
  ],
  "constraints": [
    "2 <= nums.length <= 10^4",
    "Time complexity should be O(n)",
    "Space complexity should be O(n)"
  ],
  "hints": [
    "Consider using a hash map to store seen numbers",
    "For each number, check if target - number exists in the map"
  ],
  "estimated_time_minutes": 20
}
```

**Guidelines:**
- Problem should match job's technical focus (e.g., more array/string problems for frontend, system design for backend)
- Include clear examples and constraints
- Hints should guide without giving away solution
- Consider time limits appropriate for interview setting (15-30 min per problem)

### 4. Behavioral Questions
**Format:**
```json
{
  "question_text": "Tell me about a time when you had to debug a critical production issue under time pressure. How did you approach it?",
  "question_type": "behavioral",
  "category": "Problem Solving Under Pressure",
  "evaluation_criteria": [
    "Structured approach (explain situation, action, result)",
    "Shows technical competence",
    "Demonstrates calm under pressure",
    "Mentions collaboration/communication",
    "Shows learning from experience"
  ],
  "follow_up_questions": [
    "What would you do differently if faced with a similar situation?",
    "How did this experience change your approach to production deployments?"
  ],
  "estimated_time_seconds": 240
}
```

**Guidelines:**
- Use STAR method framework (Situation, Task, Action, Result)
- Match questions to experience level (junior: learning experiences, senior: leadership)
- Focus on real-world scenarios relevant to the job
- Include follow-up questions to probe deeper

### 5. Aptitude Questions

#### Logical Reasoning
```json
{
  "question_text": "If all Bloops are Razzies and all Razzies are Lazzies, which statement must be true?\n\nA) All Bloops are Lazzies\nB) All Lazzies are Bloops\nC) Some Bloops are not Lazzies\nD) No Bloops are Lazzies",
  "correct_answer": "A",
  "explanation": "This follows the transitive property: If A→B and B→C, then A→C",
  "category": "Logical Reasoning",
  "difficulty": "easy",
  "estimated_time_seconds": 60
}
```

#### Quantitative Aptitude
```json
{
  "question_text": "A train travels 60 km in 45 minutes. What is its speed in km/hr?",
  "options": [
    {"id": "A", "text": "60 km/hr"},
    {"id": "B", "text": "70 km/hr"},
    {"id": "C", "text": "80 km/hr"},
    {"id": "D", "text": "90 km/hr"}
  ],
  "correct_answer": "C",
  "explanation": "Speed = Distance/Time = 60/(45/60) = 60/(3/4) = 80 km/hr",
  "category": "Quantitative Aptitude",
  "difficulty": "easy",
  "estimated_time_seconds": 90
}
```

---

## Adaptive Difficulty Logic

```
Current Performance = (Correct Answers / Total Questions) * 100

If Performance > 80% → Increase difficulty by 1 level
If Performance < 50% → Decrease difficulty by 1 level
Otherwise → Keep same difficulty

Example:
- Started with "medium" questions
- Candidate answered 4/5 correctly (80%)
- Next question should be "hard"
```

---

## Question Generation Prompts for Different Scenarios

### Scenario 1: Start of Technical Round
```
Generate 10 technical MCQ questions for a Senior Python Developer role.

Job Requirements:
- Skills: Python, Django, REST API, PostgreSQL, Redis
- Experience: 3-5 years
- Focus: Backend development, API design, database optimization

Requirements:
- 3 easy, 5 medium, 2 hard questions
- Cover all mentioned skills
- Include both conceptual and practical questions
- Each question should have 4 plausible options
- Provide clear explanations
```

### Scenario 2: Adaptive Question Generation (Mid-Interview)
```
Generate the next technical question for ongoing interview.

Context:
- Job: Senior Python Developer
- Questions asked so far: 5
- Correct answers: 4 (80% success rate)
- Current difficulty: medium
- Weak area identified: Database optimization (1/2 incorrect)

Requirements:
- Difficulty: hard (since candidate is performing well)
- Focus: Database optimization (to probe weak area deeper)
- Format: Open-ended question that requires explanation
- Time: 3 minutes
```

### Scenario 3: Behavioral Round
```
Generate 5 behavioral questions for a Senior Developer position.

Context:
- Experience level: 3-5 years
- Role type: Individual contributor with some mentoring
- Company culture: Fast-paced startup, collaborative

Requirements:
- Questions should assess: teamwork, problem-solving, adaptability, technical leadership
- Use STAR format
- Include follow-up questions
- Each question: 3-4 minutes estimated time
```

---

## Quality Checklist for Generated Questions

### Technical MCQ:
- [ ] All 4 options are grammatically consistent
- [ ] Only ONE option is clearly correct
- [ ] Distractors (wrong answers) are plausible, not obviously wrong
- [ ] Question tests understanding, not trivia
- [ ] Explanation teaches the concept
- [ ] Difficulty matches experience level
- [ ] Skill category is clearly tagged

### Open-Ended Questions:
- [ ] Question is specific and clear
- [ ] Expected keywords capture key concepts
- [ ] Scoring rubric is objective
- [ ] Question allows candidate to demonstrate expertise
- [ ] Time estimate is realistic
- [ ] Follow-ups probe deeper understanding

### Coding Problems:
- [ ] Problem statement is unambiguous
- [ ] Examples clarify the problem
- [ ] Constraints are clearly stated
- [ ] Difficulty matches candidate level
- [ ] Problem relates to job requirements
- [ ] Time limit is appropriate (15-30 min typical)

### Behavioral Questions:
- [ ] Question is open-ended, not yes/no
- [ ] Encourages STAR format response
- [ ] Relevant to job responsibilities
- [ ] Appropriate for experience level
- [ ] Evaluation criteria are clear

---

## Common Mistakes to Avoid

1. **Too Easy or Too Hard**: Match difficulty to experience level
   - ❌ Asking senior developer about basic syntax
   - ✅ Asking about system design, optimization, best practices

2. **Vague Questions**: Be specific
   - ❌ "Tell me about Python"
   - ✅ "Explain Python's GIL and its impact on multi-threading"

3. **Multiple Correct Answers**: Ensure only one option is correct for MCQs
   - ❌ Options where two could arguably be correct
   - ✅ Clear distinction between correct and incorrect

4. **Unrealistic Time Estimates**: 
   - ❌ 5 minutes for complex system design question
   - ✅ 15-20 minutes for complex questions, 1-2 min for MCQs

5. **Irrelevant Questions**: Always tie to job requirements
   - ❌ Asking about React when job is pure backend Python
   - ✅ Focus on skills listed in job posting

6. **Biased or Discriminatory Questions**: Keep questions professional
   - ❌ Any questions about age, gender, religion, personal life
   - ✅ Focus purely on skills and work-related scenarios

---

## Example Generation Request Format

```json
{
  "request_type": "generate_questions",
  "parameters": {
    "job_context": {
      "title": "Senior Python Developer",
      "required_skills": ["Python", "Django", "REST API", "PostgreSQL"],
      "experience_level": "3-5 years"
    },
    "question_specifications": {
      "type": "technical_mcq",
      "count": 10,
      "difficulty_distribution": {
        "easy": 2,
        "medium": 6,
        "hard": 2
      },
      "skill_focus": ["Django", "REST API"]
    }
  }
}
```

---

## Expected Output Format

```json
{
  "questions": [
    {
      "id": "auto-generated",
      "question_text": "...",
      "question_type": "mcq | open-ended | coding | behavioral",
      "options": [...],  // Only for MCQ
      "correct_answer": "...",  // Only for MCQ
      "explanation": "...",
      "expected_keywords": [...],  // For open-ended
      "difficulty": "easy | medium | hard",
      "category": "...",
      "estimated_time_seconds": 120,
      "scoring_rubric": {...}  // For open-ended/behavioral
    }
  ],
  "metadata": {
    "total_questions": 10,
    "total_estimated_time_minutes": 25,
    "skill_coverage": ["Django", "REST API", "PostgreSQL"]
  }
}
```

---

## Integration Notes

- Questions will be stored in **MongoDB** (collection: `aptitude_questions` or `questions`)
- Questions can be pre-generated in bulk or generated dynamically during interview
- Real-time generation should respond within 2-3 seconds
- Questions should be tagged with `created_by: "google_ai_studio"` for tracking
- Include `is_active: true` flag for enabling/disabling questions

---

## Testing Your Questions

Before deploying, test your questions with:
1. **Clarity Test**: Can the question be understood without ambiguity?
2. **Fairness Test**: Is the question free from bias and culturally neutral?
3. **Validity Test**: Does it actually test what it claims to test?
4. **Difficulty Test**: Is it appropriate for the target experience level?
5. **Time Test**: Can it be answered within the estimated time?

---

**Ready to Generate!** 🚀

Use this context to understand the NeuroHire system and generate high-quality interview questions that help assess candidates fairly and effectively.
