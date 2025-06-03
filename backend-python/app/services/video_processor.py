import os
import json
import subprocess
import asyncio
from openai import OpenAI
from .. import crud 
from ..database import SessionLocal 
from typing import Optional, List as PyList, Any, Dict

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

async def extract_key_moments(full_transcript_text: str, whisper_segments_objects: PyList[Any]) -> PyList[Dict[str, str]]:
    """
    Uses an OpenAI chat model to identify key moments/chapters, suggest labels, 
    and their starting phrases. Then maps these to timestamps from Whisper segments.
    Ensures more distinct timestamps by processing sequentially.
    """
    key_moments_final: PyList[Dict[str, str]] = []
    if not client:
        print("OpenAI client not initialized. Cannot extract key moments.")
        return [] 
    
    if not full_transcript_text.strip():
        print("Transcript text is empty. Cannot extract key moments.")
        return []

    try:
        # Improved prompt for identifying distinct key moments/chapters
        # The video duration can be estimated from the last segment's end time if available
        estimated_duration_minutes = 0
        if whisper_segments_objects and hasattr(whisper_segments_objects[-1], 'end'):
            estimated_duration_minutes = whisper_segments_objects[-1].end / 60
        
        # Suggest a number of chapters based on duration
        num_chapters_suggestion = "7-10"
        if estimated_duration_minutes > 20:
            num_chapters_suggestion = "10-13"
        elif estimated_duration_minutes < 5:
            num_chapters_suggestion = "5-7"

        extraction_prompt = f"""
        Analyze the following transcript and identify {num_chapters_suggestion} significant and distinct key moments or chapters that are well-distributed throughout the content.
        For each key moment:
        1. Provide a concise descriptive 'label' (5-10 words) that summarizes the section.
        2. Provide the 'starting_phrase' which is the first few words (approx. 10-20 words) of the sentence where this new section or topic begins in the transcript. 
           Ensure each 'starting_phrase' is unique and clearly marks the beginning of a different part of the discussion.

        Return the result *only* as a JSON object with a single key "key_moments". 
        The value of "key_moments" should be a list of objects, where each object contains a "label" and a "starting_phrase".
        The list of key_moments should ideally be in chronological order based on their appearance in the transcript.
        Example: 
        {{
          "key_moments": [
            {{"label": "Introduction", "starting_phrase": "Welcome everyone to today's session where we will..."}},
            {{"label": "Core Feature X", "starting_phrase": "Now, let's dive into the core feature X..."}},
            {{"label": "User Benefits", "starting_phrase": "The primary benefit for users here is..."}}
          ]
        }}
        If no distinct key moments can be found, or if the transcript is too short, return an empty list for "key_moments": 
        {{"key_moments": []}}

        Transcript:
        {full_transcript_text}
        """

        print("Requesting key moment extraction from OpenAI chat model...")
        chat_model_to_use = "gpt-3.5-turbo-0125" 
        
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "You are an assistant that identifies distinct key moments/chapters in a transcript. You return a JSON object with a 'key_moments' key, which is a list of objects, each with 'label' and 'starting_phrase'. The moments should be chronologically ordered and distinct."},
                {"role": "user", "content": extraction_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"} 
        )

        raw_response_content = response.choices[0].message.content
        print(f"Raw key moments JSON object string: {raw_response_content}")
        
        extracted_moments_data = []
        if raw_response_content:
            try:
                data = json.loads(raw_response_content)
                if isinstance(data, dict) and "key_moments" in data and isinstance(data["key_moments"], list):
                    extracted_moments_data = data["key_moments"]
                else:
                    print(f"Warning: Parsed JSON does not match expected structure: {data}")
            except json.JSONDecodeError as json_e:
                print(f"Error decoding JSON from key moments response: {json_e}")
            except Exception as e:
                print(f"An unexpected error occurred while processing key moments response: {e}")

        if not extracted_moments_data:
             print("No key moments were extracted or the response was not in the expected format.")
             return []

        print(f"Extracted moments (label & phrase): {extracted_moments_data}")

        if not whisper_segments_objects or not isinstance(whisper_segments_objects, list):
            print("Warning: Whisper segments not available or invalid for timestamp mapping. Returning moments without precise timestamps.")
            return [{"label": moment.get("label", "Unknown Topic"), "timestamp_start": "00:00:00.000"} for moment in extracted_moments_data]

        # To ensure distinct timestamps and chronological order from mapping
        used_segment_indices = set()
        last_found_timestamp_seconds = -1.0 

        for moment_info in extracted_moments_data:
            label = moment_info.get("label")
            starting_phrase = moment_info.get("starting_phrase")

            if not label or not starting_phrase or not isinstance(label, str) or not isinstance(starting_phrase, str):
                print(f"Skipping invalid moment data: {moment_info}")
                continue

            found_timestamp_str = "00:00:00.000" 
            current_best_match_start_seconds = -1.0
            
            # Search for the phrase, ensuring it's after the previously found moment
            for i, seg_obj in enumerate(whisper_segments_objects):
                segment_text = getattr(seg_obj, 'text', "")
                segment_start_seconds = getattr(seg_obj, 'start', 0.0)

                if segment_start_seconds <= last_found_timestamp_seconds: # Ensure we are moving forward
                    continue
                
                # A more robust search for phrase might be needed (e.g., fuzzy matching or checking start of segment)
                # For simplicity, we use 'in'. Consider making this case-insensitive.
                if starting_phrase.lower() in segment_text.lower():
                    # This is a potential match. We want the earliest one after the last_found_timestamp.
                    if current_best_match_start_seconds == -1.0 or segment_start_seconds < current_best_match_start_seconds :
                        # Check if this specific segment start time has already been used by a previous key moment
                        # to avoid multiple key moments pointing to the exact same start of a segment.
                        # This is a simple check; more complex logic might be needed if phrases are very close.
                        is_timestamp_used = any(km['timestamp_start'] == format_timestamp(segment_start_seconds) for km in key_moments_final)

                        if not is_timestamp_used:
                            current_best_match_start_seconds = segment_start_seconds
                            found_timestamp_str = format_timestamp(segment_start_seconds)
                            # Don't break immediately, find the earliest possible match for *this* phrase
                            # that is after the last *key moment's* timestamp.
            
            if current_best_match_start_seconds > -1.0 : # A valid, new timestamp was found
                key_moments_final.append({
                    "label": label.strip(),
                    "timestamp_start": found_timestamp_str
                })
                last_found_timestamp_seconds = current_best_match_start_seconds # Update for the next iteration
            else:
                print(f"Could not find a suitable distinct timestamp for moment: '{label}' with phrase '{starting_phrase}'. Skipping.")
        
        # Sort by timestamp as a final measure, as LLM might not return in perfect order
        key_moments_final.sort(key=lambda x: x['timestamp_start'])
        
        # Filter out duplicates again if any slipped through (e.g. if LLM gave same phrase for different labels)
        final_unique_moments = []
        seen_timestamps = set()
        for moment in key_moments_final:
            if moment['timestamp_start'] not in seen_timestamps:
                final_unique_moments.append(moment)
                seen_timestamps.add(moment['timestamp_start'])
        
        return final_unique_moments

    except Exception as e:
        print(f"Error during key moment extraction process: {str(e)}")
        return []


async def transcribe_video_with_openai(video_filepath: str, video_id: int, db_session_factory):
    db = db_session_factory()
    default_error_transcript = {
        "key_moments": [{"label": "Processing error", "timestamp_start": "00:00:00.000"}],
        "segments": []
    }
    try:
        print(f"Starting transcription for video: {video_filepath}, ID: {video_id}")
        if not client:
            print("OpenAI client not initialized.")
            default_error_transcript["key_moments"] = [{"label": "OpenAI client not initialized", "timestamp_start": "00:00:00.000"}]
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
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
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
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
            crud.update_video_status(db=db, video_id=video_id, status="completed", transcript=final_transcript_json)
            print(f"Transcription and key moment extraction completed for video ID: {video_id}.")

        except Exception as e:
            error_details = str(e)
            print(f"OpenAI API call or processing failed: {error_details}")
            default_error_transcript["key_moments"] = [{"label": "OpenAI API call or processing failed", "timestamp_start": "00:00:00.000", "details": error_details[:500]}]
            crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
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
             crud.update_video_status(db=db, video_id=video_id, status="failed", transcript=json.dumps(default_error_transcript))
    finally:
        db.close()