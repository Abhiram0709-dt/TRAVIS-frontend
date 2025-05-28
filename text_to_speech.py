from gtts import gTTS
import os

def text_to_speech(answer: str) -> str:
    tts = gTTS(text=answer, lang='te')
    output_path = "output.mp3"
    tts.save(output_path)
    return output_path 