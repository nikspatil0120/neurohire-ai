from typing import Dict, Optional
import logging
import random
import base64

logger = logging.getLogger(__name__)

class EmotionDetector:
    def __init__(self):
        self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        logger.info("EmotionDetector initialized (mock mode)")
        
    async def analyze_frame(self, frame_data: bytes) -> Dict:
        """Analyze emotion from video frame (mock implementation)"""
        try:
            # Mock emotion analysis results
            dominant_emotion = random.choice(self.emotion_labels)
            confidence = random.uniform(0.6, 0.95)
            
            # Generate mock emotion scores
            emotions = {}
            for emotion in self.emotion_labels:
                if emotion == dominant_emotion:
                    emotions[emotion] = confidence * 100
                else:
                    emotions[emotion] = random.uniform(0, 30)
            
            return {
                "face_detected": True,
                "emotions": emotions,
                "dominant_emotion": dominant_emotion,
                "confidence": confidence,
                "face_coordinates": {
                    "x": random.randint(50, 200),
                    "y": random.randint(50, 150),
                    "w": random.randint(100, 200),
                    "h": random.randint(120, 220)
                }
            }
                
        except Exception as e:
            logger.error(f"Error analyzing frame: {e}")
            return {
                "error": str(e),
                "face_detected": False,
                "emotions": {},
                "dominant_emotion": "unknown",
                "confidence": 0
            }
    
    def calculate_stress_level(self, emotion_history: list) -> float:
        """Calculate stress level from emotion history"""
        if not emotion_history:
            return 0.0
        
        # Mock stress calculation
        return random.uniform(0.2, 0.8)
    
    def calculate_engagement_level(self, emotion_history: list) -> float:
        """Calculate engagement level from emotion history"""
        if not emotion_history:
            return 0.0
        
        # Mock engagement calculation
        return random.uniform(0.4, 0.9)