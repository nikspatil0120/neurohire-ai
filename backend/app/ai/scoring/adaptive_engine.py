from typing import Dict, List, Optional
import logging
from app.ai.nlp.question_generator import QuestionGenerator

logger = logging.getLogger(__name__)

class AdaptiveEngine:
    def __init__(self):
        self.question_gen = QuestionGenerator()
        self.sessions = {}  # In-memory session storage
        
    async def initialize_session(self, session_id: str, job_requirements: List[str]):
        """Initialize adaptive session"""
        self.sessions[session_id] = {
            "job_requirements": job_requirements,
            "question_count": 0,
            "scores": [],
            "difficulty_level": 2,  # Start at medium difficulty
            "answers": [],
            "total_score": 0
        }
        
    async def select_next_question(
        self, 
        session_id: str, 
        last_score: float, 
        last_answer: str
    ) -> Optional[Dict]:
        """Select next question based on adaptive logic"""
        
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            return None
        
        session = self.sessions[session_id]
        session["question_count"] += 1
        session["scores"].append(last_score)
        session["answers"].append(last_answer)
        session["total_score"] += last_score
        
        # Check if interview should end
        if self._should_end_interview(session):
            return None
        
        # Adjust difficulty based on performance
        new_difficulty = self._calculate_new_difficulty(session)
        session["difficulty_level"] = new_difficulty
        
        # Generate next question
        try:
            next_question = await self.question_gen.generate_follow_up_question(
                last_answer,
                new_difficulty,
                session["job_requirements"],
                session["question_count"]
            )
            
            return next_question
            
        except Exception as e:
            logger.error(f"Error generating next question: {e}")
            return None
    
    def _should_end_interview(self, session: Dict) -> bool:
        """Determine if interview should end"""
        question_count = session["question_count"]
        scores = session["scores"]
        
        # End after 8 questions maximum
        if question_count >= 8:
            return True
        
        # End early if candidate is consistently failing (3+ questions with score < 30)
        if len(scores) >= 3:
            recent_scores = scores[-3:]
            if all(score < 30 for score in recent_scores):
                logger.info(f"Ending interview early due to low scores: {recent_scores}")
                return True
        
        # End early if candidate is doing exceptionally well (5+ questions with score > 85)
        if len(scores) >= 5:
            recent_scores = scores[-5:]
            if all(score > 85 for score in recent_scores):
                logger.info(f"Ending interview early due to high scores: {recent_scores}")
                return True
        
        return False
    
    def _calculate_new_difficulty(self, session: Dict) -> int:
        """Calculate new difficulty level based on performance"""
        scores = session["scores"]
        current_difficulty = session["difficulty_level"]
        
        if not scores:
            return current_difficulty
        
        # Use last 2 scores for adaptation
        recent_scores = scores[-2:] if len(scores) >= 2 else scores
        avg_recent_score = sum(recent_scores) / len(recent_scores)
        
        # Adaptive logic
        if avg_recent_score > 75:
            # Increase difficulty
            new_difficulty = min(5, current_difficulty + 1)
        elif avg_recent_score < 50:
            # Decrease difficulty
            new_difficulty = max(1, current_difficulty - 1)
        else:
            # Maintain current difficulty
            new_difficulty = current_difficulty
        
        logger.info(f"Difficulty adjustment: {current_difficulty} -> {new_difficulty} (avg score: {avg_recent_score})")
        return new_difficulty
    
    def get_session_summary(self, session_id: str) -> Dict:
        """Get session summary for final scoring"""
        if session_id not in self.sessions:
            return {
                "average_score": 0,
                "question_count": 0,
                "difficulty_progression": [],
                "performance_trend": "unknown"
            }
        
        session = self.sessions[session_id]
        scores = session["scores"]
        
        if not scores:
            return {
                "average_score": 0,
                "question_count": 0,
                "difficulty_progression": [],
                "performance_trend": "no_data"
            }
        
        average_score = sum(scores) / len(scores)
        
        # Calculate performance trend
        performance_trend = self._calculate_performance_trend(scores)
        
        # Track difficulty progression
        difficulty_progression = self._get_difficulty_progression(session_id)
        
        return {
            "average_score": round(average_score, 2),
            "question_count": len(scores),
            "scores": scores,
            "difficulty_progression": difficulty_progression,
            "performance_trend": performance_trend,
            "final_difficulty": session["difficulty_level"]
        }
    
    def _calculate_performance_trend(self, scores: List[float]) -> str:
        """Calculate if performance is improving, declining, or stable"""
        if len(scores) < 3:
            return "insufficient_data"
        
        # Compare first half vs second half
        mid_point = len(scores) // 2
        first_half_avg = sum(scores[:mid_point]) / mid_point if mid_point > 0 else 0
        second_half_avg = sum(scores[mid_point:]) / (len(scores) - mid_point)
        
        difference = second_half_avg - first_half_avg
        
        if difference > 10:
            return "improving"
        elif difference < -10:
            return "declining"
        else:
            return "stable"
    
    def _get_difficulty_progression(self, session_id: str) -> List[int]:
        """Get difficulty level progression throughout interview"""
        # This would ideally be tracked throughout the session
        # For now, return current difficulty
        if session_id in self.sessions:
            return [self.sessions[session_id]["difficulty_level"]]
        return []
    
    def cleanup_session(self, session_id: str):
        """Clean up session data"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Cleaned up session {session_id}")
    
    def get_session_stats(self) -> Dict:
        """Get overall system statistics"""
        total_sessions = len(self.sessions)
        active_sessions = sum(1 for s in self.sessions.values() if s["question_count"] > 0)
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "avg_questions_per_session": sum(s["question_count"] for s in self.sessions.values()) / total_sessions if total_sessions > 0 else 0
        }