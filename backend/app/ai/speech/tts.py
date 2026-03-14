from typing import Optional
import uuid
import os
from pathlib import Path
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class TextToSpeech:
    def __init__(self):
        self.output_dir = Path(settings.STORAGE_PATH) / "audio" / "questions"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info("TextToSpeech initialized (mock mode)")
        
    async def synthesize(self, text: str) -> Optional[str]:
        """Convert text to speech (mock implementation)"""
        try:
            # Generate unique filename
            filename = f"{uuid.uuid4()}.wav"
            output_path = self.output_dir / filename
            
            # Create a dummy audio file (empty file for mock)
            output_path.touch()
            
            logger.info(f"Mock TTS generated: {filename}")
            return f"static/audio/questions/{filename}"
            
        except Exception as e:
            logger.error(f"TTS Error: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if TTS is available"""
        return True