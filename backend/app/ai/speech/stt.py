from typing import Dict
import logging

logger = logging.getLogger(__name__)

class SpeechToText:
    def __init__(self):
        # Mock implementation for development
        logger.info("SpeechToText initialized (mock mode)")
        
    async def transcribe(self, audio_data: bytes) -> Dict:
        """Convert audio to text (mock implementation)"""
        try:
            # Mock transcription result
            return {
                "text": "This is a mock transcription of the audio input.",
                "confidence": 0.85,
                "language": "en",
                "segments": [
                    {
                        "start": 0.0,
                        "end": 3.0,
                        "text": "This is a mock transcription of the audio input.",
                        "avg_logprob": -0.2
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"STT Error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": str(e)
            }
    
    def is_available(self) -> bool:
        """Check if the model is available"""
        return True