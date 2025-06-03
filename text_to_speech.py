from gtts import gTTS
import os
import logging

logger = logging.getLogger(__name__)

def text_to_speech(answer: str) -> str:
    """Convert text to speech using gTTS and save as MP3 file.
    
    Args:
        answer (str): The text to convert to speech
        
    Returns:
        str: Path to the generated audio file
    """
    try:
        # Create output directory if it doesn't exist
        output_dir = "static"
        os.makedirs(output_dir, exist_ok=True)
        
        # Use a single fixed output file
        output_path = os.path.join(output_dir, "output.mp3")
        
        # Convert text to speech
        tts = gTTS(text=answer, lang='te', slow=False)
        tts.save(output_path)
        
        logger.info(f"Generated audio file at {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        raise 