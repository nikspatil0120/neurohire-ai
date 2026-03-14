from typing import List, Dict, Optional
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(self):
        # Make OpenAI optional
        self.client = None
        if settings.OPENAI_API_KEY:
            try:
                import openai
                self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized")
            except ImportError:
                logger.warning("OpenAI package not installed, using fallback questions")
        else:
            logger.info("No OpenAI API key provided, using fallback questions")
        
        # Fallback questions for different categories
        self.fallback_questions = {
            "introduction": {
                "text": "Please introduce yourself and tell me about your background in software development.",
                "difficulty": 1,
                "expected_keywords": ["experience", "background", "skills", "projects"],
                "category": "introduction",
                "expected_answer": "Brief introduction with relevant experience"
            },
            "technical": [
                {
                    "text": "Explain the difference between synchronous and asynchronous programming.",
                    "difficulty": 2,
                    "expected_keywords": ["blocking", "non-blocking", "callback", "promise", "async"],
                    "category": "technical",
                    "expected_answer": "Synchronous blocks execution, asynchronous allows concurrent operations"
                },
                {
                    "text": "How would you optimize a slow database query?",
                    "difficulty": 3,
                    "expected_keywords": ["index", "query", "optimization", "performance", "database"],
                    "category": "technical",
                    "expected_answer": "Add indexes, optimize query structure, analyze execution plan"
                },
                {
                    "text": "What are the principles of object-oriented programming?",
                    "difficulty": 2,
                    "expected_keywords": ["encapsulation", "inheritance", "polymorphism", "abstraction"],
                    "category": "technical",
                    "expected_answer": "Four main principles: encapsulation, inheritance, polymorphism, and abstraction"
                },
                {
                    "text": "Explain the concept of RESTful APIs and their benefits.",
                    "difficulty": 3,
                    "expected_keywords": ["REST", "HTTP", "stateless", "resources", "API"],
                    "category": "technical",
                    "expected_answer": "REST uses HTTP methods for stateless communication with resources"
                }
            ]
        }
        
    async def generate_opening_question(self, job_requirements: List[str]) -> Dict:
        """Generate opening interview question"""
        if not self.client:
            return self.fallback_questions["introduction"]
            
        try:
            prompt = f"""
            Generate an opening interview question for a candidate applying for a role requiring: {', '.join(job_requirements)}.
            
            The question should be:
            - Welcoming and professional
            - Allow the candidate to introduce themselves
            - Relevant to the role
            
            Return JSON format:
            {{
                "text": "question text",
                "difficulty": 1,
                "expected_keywords": ["keyword1", "keyword2"],
                "category": "introduction",
                "expected_answer": "brief expected answer"
            }}
            """
            
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Error generating opening question: {e}")
            return self.fallback_questions["introduction"]
    
    async def generate_follow_up_question(
        self, 
        previous_answer: str,
        difficulty_level: int,
        job_requirements: List[str],
        question_count: int
    ) -> Optional[Dict]:
        """Generate adaptive follow-up question"""
        
        # End interview after 5-8 questions
        if question_count >= 8:
            return None
            
        if not self.client:
            # Use fallback questions
            if question_count - 1 < len(self.fallback_questions["technical"]):
                return self.fallback_questions["technical"][question_count - 1]
            return None
        
        try:
            prompt = f"""
            Based on the candidate's previous answer: "{previous_answer}"
            
            Generate a follow-up technical question with difficulty level {difficulty_level} (1-5) 
            for a role requiring: {', '.join(job_requirements)}.
            
            This is question #{question_count} in the interview.
            
            Return JSON format:
            {{
                "text": "question text",
                "difficulty": {difficulty_level},
                "expected_keywords": ["keyword1", "keyword2"],
                "category": "technical",
                "expected_answer": "brief expected answer"
            }}
            
            Return "END_INTERVIEW" if the interview should end (after 5-8 questions).
            """
            
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            
            result = response.choices[0].message.content.strip()
            if result == "END_INTERVIEW":
                return None
                
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error generating follow-up question: {e}")
            # Use fallback
            if question_count - 1 < len(self.fallback_questions["technical"]):
                return self.fallback_questions["technical"][question_count - 1]
            return None