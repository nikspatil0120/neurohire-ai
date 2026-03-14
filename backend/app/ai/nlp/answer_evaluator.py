from typing import List, Dict
import logging
import re
import random

logger = logging.getLogger(__name__)

class AnswerEvaluator:
    def __init__(self):
        logger.info("AnswerEvaluator initialized (mock mode)")
        
    async def evaluate(
        self, 
        candidate_answer: str,
        expected_answer: str,
        expected_keywords: List[str]
    ) -> Dict:
        """Evaluate candidate's answer (mock implementation)"""
        
        if not candidate_answer.strip():
            return {
                "score": 0, 
                "feedback": "No answer provided",
                "similarity": 0,
                "keyword_coverage": 0,
                "technical_depth": 0,
                "keywords_found": []
            }
        
        try:
            # Mock semantic similarity
            similarity = random.uniform(0.4, 0.9)
            
            # Mock keyword coverage
            candidate_keywords = self._extract_keywords(candidate_answer)
            keywords_found = []
            keyword_coverage = 0
            
            if expected_keywords:
                keywords_found = [kw for kw in expected_keywords if kw.lower() in candidate_answer.lower()]
                keyword_coverage = len(keywords_found) / len(expected_keywords)
            
            # Length appropriateness (not too short/long)
            length_score = self._evaluate_length(candidate_answer)
            
            # Technical depth
            technical_score = self._evaluate_technical_depth(candidate_answer)
            
            # Combined score
            final_score = (
                0.4 * similarity +
                0.3 * keyword_coverage +
                0.2 * technical_score +
                0.1 * length_score
            ) * 100
            
            return {
                "score": round(final_score, 2),
                "similarity": round(similarity * 100, 2),
                "keyword_coverage": round(keyword_coverage * 100, 2),
                "technical_depth": round(technical_score * 100, 2),
                "keywords_found": keywords_found,
                "feedback": self._generate_feedback(final_score, keyword_coverage)
            }
            
        except Exception as e:
            logger.error(f"Error evaluating answer: {e}")
            return {
                "score": 50,  # Default score on error
                "feedback": "Error evaluating answer",
                "similarity": 0,
                "keyword_coverage": 0,
                "technical_depth": 0,
                "keywords_found": []
            }
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract technical keywords from text"""
        # Simple word extraction
        words = re.findall(r'\b\w+\b', text.lower())
        return [w for w in words if len(w) > 3]
    
    def _evaluate_length(self, text: str) -> float:
        """Evaluate if answer length is appropriate"""
        word_count = len(text.split())
        if word_count < 10:
            return 0.3  # Too short
        elif word_count > 200:
            return 0.7  # Too long
        else:
            return 1.0  # Appropriate length
    
    def _evaluate_technical_depth(self, text: str) -> float:
        """Evaluate technical depth of answer"""
        technical_indicators = [
            'implement', 'algorithm', 'complexity', 'performance',
            'architecture', 'design', 'pattern', 'framework',
            'database', 'api', 'security', 'scalability',
            'function', 'method', 'class', 'object', 'variable',
            'loop', 'condition', 'array', 'string', 'integer'
        ]
        
        text_lower = text.lower()
        found_indicators = sum(1 for indicator in technical_indicators 
                             if indicator in text_lower)
        
        return min(1.0, found_indicators / 5)  # Normalize to 0-1
    
    def _generate_feedback(self, score: float, keyword_coverage: float) -> str:
        """Generate feedback based on score"""
        if score >= 80:
            return "Excellent answer with good technical depth"
        elif score >= 60:
            return "Good answer, could include more technical details"
        elif keyword_coverage < 0.3:
            return "Answer lacks key technical concepts"
        else:
            return "Answer needs more clarity and technical depth"