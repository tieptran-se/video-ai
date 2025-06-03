import os
import json
import subprocess
import asyncio
from openai import OpenAI
from .. import crud # Adjusted import for crud
from ..database import SessionLocal # Adjusted import for SessionLocal

try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY environment variable not set. OpenAI calls will fail.")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}. OpenAI calls will fail.")
    client = None

def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{milliseconds:03}"

async def transcribe_video_with_openai(video_filepath: str, video_id: int, db_session_factory):
    db = db_session_factory()
    try:
        print(f"Starting transcription for video: {video_filepath}, ID: {video_id}")
        if not client:
            print("OpenAI client not initialized. Skipping transcription.")
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps({"error": "OpenAI client not initialized"}))
            return

        base_filename = os.path.splitext(os.path.basename(video_filepath))[0]
        audio_output_path = os.path.join(os.path.dirname(video_filepath), f"{base_filename}.mp3")
        
        ffmpeg_command = [
            "ffmpeg", "-y", "-i", video_filepath,
            "-vn", "-acodec", "mp3", "-ab", "192k",
            "-ar", "16000", "-ac", "1", audio_output_path
        ]
        
        print(f"Running ffmpeg command: {' '.join(ffmpeg_command)}")
        process = await asyncio.to_thread(subprocess.run, ffmpeg_command, capture_output=True, text=True, check=False)

        if process.returncode != 0:
            error_message = f"FFmpeg failed: {process.stderr}"
            print(error_message)
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps({"error": "FFmpeg audio extraction failed", "details": process.stderr}))
            return

        print(f"Audio extracted to: {audio_output_path}")

        try:
            with open(audio_output_path, "rb") as audio_file:
                transcription_response = await asyncio.to_thread(
                    client.audio.transcriptions.create,
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"] 
                )
            
            processed_transcript = []
            if transcription_response.segments: # Access segments directly
                for segment in transcription_response.segments:
                    processed_transcript.append({
                        "timestamp_start": format_timestamp(segment.get("start", 0.0)),
                        "timestamp_end": format_timestamp(segment.get("end", 0.0)),
                        "text": segment.get("text", "").strip()
                    })
            
            transcript_json = json.dumps(processed_transcript)
            crud.update_video_status(db=db, video_id=video_id, status="completed", transcript=transcript_json)
            print(f"Transcription completed successfully for video ID: {video_id}")

        except Exception as e:
            error_message = f"OpenAI API call failed: {str(e)}"
            print(error_message)
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps({"error": "OpenAI API call failed", "details": str(e)}))
        finally:
            if os.path.exists(audio_output_path):
                try:
                    os.remove(audio_output_path)
                    print(f"Cleaned up temporary audio file: {audio_output_path}")
                except Exception as e:
                    print(f"Error cleaning up audio file {audio_output_path}: {e}")
    except Exception as e:
        error_message = f"Unexpected error during transcription for video ID {video_id}: {str(e)}"
        print(error_message)
        db_video_check = crud.get_video(db=db, video_id=video_id)
        if db_video_check and db_video_check.status != "completed":
             crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps({"error": "Unexpected transcription error", "details": str(e)}))
    finally:
        db.close()