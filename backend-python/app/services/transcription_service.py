import os
import json
import subprocess
import asyncio
from .. import crud
from ..database import SessionLocal
from .openai_utils import client, extract_key_moments # Import from openai_utils
from .utils import format_timestamp # Import from utils
from typing import Optional, List as PyList, Any, Dict


async def transcribe_video_with_openai(video_filepath: str, video_id: int, db_session_factory):
    db = db_session_factory()
    default_error_transcript = {
        "key_moments": [{"label": "Processing error", "timestamp_start": "00:00:00.000"}],
        "segments": []
    }
    try:
        print(f"Starting transcription for video: {video_filepath}, ID: {video_id}")
        if not client: # client is now imported from openai_utils
            print("OpenAI client not initialized.")
            default_error_transcript["key_moments"] = [{"label": "OpenAI client not initialized", "timestamp_start": "00:00:00.000"}]
            crud.update_video_data(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
            return

        base_filename = os.path.splitext(os.path.basename(video_filepath))[0]
        audio_output_path = os.path.join(os.path.dirname(video_filepath), f"{base_filename}.mp3")
        
        ffmpeg_command = [
            "ffmpeg", "-y", "-i", video_filepath,
            "-vn", "-acodec", "mp3", "-ab", "192k",
            "-ar", "16000", "-ac", "1", audio_output_path
        ]
        
        process = await asyncio.to_thread(subprocess.run, ffmpeg_command, capture_output=True, text=True, check=False)

        if process.returncode != 0:
            error_details = process.stderr or "Unknown FFmpeg error"
            print(f"FFmpeg failed: {error_details}")
            default_error_transcript["key_moments"] = [{"label": "FFmpeg audio extraction failed", "timestamp_start": "00:00:00.000", "details": error_details[:500]}]
            crud.update_video_data(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
            return

        print(f"Audio extracted to: {audio_output_path}")

        try:
            with open(audio_output_path, "rb") as audio_file:
                whisper_response = await asyncio.to_thread(
                    client.audio.transcriptions.create,
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json", 
                    timestamp_granularities=["segment"] 
                )
            
            full_transcript_text = getattr(whisper_response, 'text', "")
            whisper_segments_objects = getattr(whisper_response, 'segments', [])
            
            formatted_segments_for_json = []
            if whisper_segments_objects:
                for seg_obj in whisper_segments_objects:
                    formatted_segments_for_json.append({
                        "timestamp_start": format_timestamp(getattr(seg_obj, 'start', 0.0)),
                        "timestamp_end": format_timestamp(getattr(seg_obj, 'end', 0.0)),
                        "text": getattr(seg_obj, 'text', "").strip()
                    })
            
            key_moments_data = []
            if not full_transcript_text.strip():
                print("Whisper did not return any transcript text. Skipping key moment extraction.")
            else:
                 key_moments_data = await extract_key_moments(full_transcript_text, whisper_segments_objects)

            combined_transcript_data = {
                "key_moments": key_moments_data,
                "segments": formatted_segments_for_json
            }

            final_transcript_json = json.dumps(combined_transcript_data)
            crud.update_video_data(db=db, video_id=video_id, status="completed", transcript=final_transcript_json)
            print(f"Transcription and key moment extraction completed for video ID: {video_id}.")

        except Exception as e:
            error_details = str(e)
            print(f"OpenAI API call or processing failed: {error_details}")
            default_error_transcript["key_moments"] = [{"label": "OpenAI API call or processing failed", "timestamp_start": "00:00:00.000", "details": error_details[:500]}]
            crud.update_video_data(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
        finally:
            if os.path.exists(audio_output_path):
                try: os.remove(audio_output_path)
                except Exception as e_clean: print(f"Error cleaning up audio file: {e_clean}")
    except Exception as e:
        error_details = str(e)
        print(f"Unexpected error during transcription for video ID {video_id}: {error_details}")
        db_video_check = crud.get_video(db=db, video_id=video_id)
        if db_video_check and db_video_check.status != "completed":
             default_error_transcript["key_moments"] = [{"label": "Unexpected transcription error", "timestamp_start": "00:00:00.000", "details": error_details[:500]}]
             crud.update_video_data(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
    finally:
        db.close()