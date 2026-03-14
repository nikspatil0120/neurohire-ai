import asyncio
from typing import Dict, Any, Optional
from app.ai.speech.stt import SpeechToText
from app.ai.speech.tts import TextToSpeech
from app.ai.nlp.question_generator import QuestionGenerator
from app.ai.nlp.answer_evaluator import AnswerEvaluator
from app.ai.vision.emotion_detector import EmotionDetector
from app.ai.speech.voice_analysis import VoiceAnalyzer
from app.ai.scoring.adaptive_engine import AdaptiveEngine
import logging

logger = logging.getLogger(__name__)

class InterviewOrchestrator:
    def __init__(self):
        self.stt = SpeechToText()
        self.tts = TextToSpeech()
        self.question_gen = QuestionGenerator()
        self.answer_eval = AnswerEvaluator()
        self.emotion_detector = EmotionDetector()
        self.voice_analyzer = VoiceAnalyzer()
        self.adaptive_engine = AdaptiveEngine()
        
    async def start_interview(self, session_id: str, job_data: Dict) -> Dict:
        """Initialize interview session"""
        try:
            # Initialize adaptive engine
            await self.adaptive_engine.initialize_session(
                session_id, 
                job_data.get("requirements", [])
            )
            
            # Generate first question
            first_question = await self.question_gen.generate_opening_question(
                job_data.get("requirements", [])
            )
            
            # Convert to speech
            audio_path = await self.tts.synthesize(first_question["text"])
            
            return {
                "question": first_question,
                "audio_url": audio_path,
                "session_initialized": True
            }
            
        except Exception as e:
            logger.error(f"Error starting interview: {e}")
            return {
                "error": str(e),
                "session_initialized": False
            }
    
    async def process_candidate_response(
        self, 
        session_id: str,
        audio_data: bytes,
        video_frame: bytes,
        current_question: Dict
    ) -> Dict:
        """Process multimodal candidate response"""
        
        try:
            # Parallel processing of different modalities
            tasks = []
            
            if audio_data:
                tasks.append(self.stt.transcribe(audio_data))
                tasks.append(self.voice_analyzer.analyze_audio(audio_data))
            
            if video_frame:
                tasks.append(self.emotion_detector.analyze_frame(video_frame))
            
            # Execute all tasks in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Parse results
            transcript = results[0] if len(results) > 0 and not isinstance(results[0], Exception) else {"text": "", "confidence": 0}
            voice_metrics = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else {"confidence": 0}
            emotions = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else {"emotions": {}}
            
            # Evaluate answer if we have text
            answer_score = {"score": 0, "feedback": "No answer provided"}
            if transcript.get("text"):
                answer_score = await self.answer_eval.evaluate(
                    transcript["text"],
                    current_question.get("expected_answer", ""),
                    current_question.get("expected_keywords", [])
                )
            
            # Determine next question
            next_question = await self.adaptive_engine.select_next_question(
                session_id,
                answer_score["score"],
                transcript.get("text", "")
            )
            
            # Generate audio for next question
            next_audio = None
            if next_question:
                next_audio = await self.tts.synthesize(next_question["text"])
            
            return {
                "transcript": transcript,
                "emotions": emotions,
                "voice_metrics": voice_metrics,
                "answer_score": answer_score,
                "next_question": next_question,
                "next_audio_url": next_audio,
                "should_continue": next_question is not None
            }
            
        except Exception as e:
            logger.error(f"Error processing candidate response: {e}")
            return {
                "error": str(e),
                "should_continue": False
            }
    
    async def calculate_final_scores(self, session_id: str, session_data: Dict) -> Dict:
        """Calculate final interview scores"""
        try:
            # Get session summary from adaptive engine
            session_summary = self.adaptive_engine.get_session_summary(session_id)
            
            # Extract behavioral metrics
            behavioral_metrics = session_data.get("behavioral_metrics", {})
            
            # Calculate component scores
            technical_score = session_summary.get("average_score", 0)
            
            # Communication score (based on speech clarity and coherence)
            communication_score = self._calculate_communication_score(session_data)
            
            # Confidence score (based on voice and emotion analysis)
            confidence_score = self._calculate_confidence_score(behavioral_metrics)
            
            # Weighted final score
            final_score = (
                0.60 * technical_score +
                0.25 * communication_score +
                0.15 * confidence_score
            )
            
            return {
                "technical_score": round(technical_score, 2),
                "communication_score": round(communication_score, 2),
                "confidence_score": round(confidence_score, 2),
                "final_score": round(final_score, 2),
                "session_summary": session_summary
            }
            
        except Exception as e:
            logger.error(f"Error calculating final scores: {e}")
            return {
                "technical_score": 0,
                "communication_score": 0,
                "confidence_score": 0,
                "final_score": 0,
                "error": str(e)
            }
    
    def _calculate_communication_score(self, session_data: Dict) -> float:
        """Calculate communication score from session data"""
        # Extract voice analysis data
        voice_analyses = session_data.get("voice_analysis", [])
        if not voice_analyses:
            return 0.0
        
        # Average speech clarity and consistency
        clarity_scores = [va.get("clarity", 0) for va in voice_analyses]
        consistency_scores = [va.get("consistency", 0) for va in voice_analyses]
        
        avg_clarity = sum(clarity_scores) / len(clarity_scores) if clarity_scores else 0
        avg_consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 0
        
        return (avg_clarity + avg_consistency) / 2
    
    def _calculate_confidence_score(self, behavioral_metrics: Dict) -> float:
        """Calculate confidence score from behavioral metrics"""
        # Extract confidence indicators
        voice_confidence = behavioral_metrics.get("avg_voice_confidence", 0)
        emotion_confidence = behavioral_metrics.get("avg_emotion_confidence", 0)
        
        # Weight voice confidence more heavily
        confidence_score = (0.7 * voice_confidence + 0.3 * emotion_confidence)
        
        return confidence_score