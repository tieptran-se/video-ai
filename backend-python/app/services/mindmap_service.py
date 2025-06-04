import os
import json
import asyncio
from .. import crud
from ..database import SessionLocal
from .openai_utils import generate_mindmap_data_from_transcript # Import from openai_utils
from typing import Optional, List as PyList, Any, Dict


async def process_mindmap_generation(video_id: int, db_session_factory):
    db = db_session_factory()
    try:
        video = crud.get_video(db, video_id=video_id)
        if not video:
            print(f"Video with ID {video_id} not found for mind map generation.")
            return
        if not video.transcript:
            print(f"Video with ID {video_id} has no transcript. Cannot generate mind map.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Generation Failed\n- No transcript available.", status="completed") # Revert status
            return
        
        try:
            transcript_data = json.loads(video.transcript)
            full_text = " ".join([seg['text'] for seg in transcript_data.get("segments", [])])
            key_moments_from_transcript = transcript_data.get("key_moments", [])
        except json.JSONDecodeError:
            print(f"Could not parse transcript for video ID {video_id} to extract text for mind map.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Generation Failed\n- Could not parse transcript.", status="completed") # Revert status
            return

        if not full_text.strip():
            print(f"Transcript text is empty for video ID {video_id}. Cannot generate mind map.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Generation Failed\n- Transcript text empty.", status="completed") # Revert status
            return

        mindmap_markdown = await generate_mindmap_data_from_transcript(full_text, key_moments_from_transcript)
        crud.update_video_data(db=db, video_id=video_id, mindmap_data=mindmap_markdown, status="completed")
        print(f"Mind map generated and saved for video ID: {video_id}")

    except Exception as e:
        print(f"Error in process_mindmap_generation for video ID {video_id}: {str(e)}")
        crud.update_video_data(db=db, video_id=video_id, mindmap_data=f"# Mind Map Generation Error\n- {str(e)}", status="completed") # Revert status
    finally:
        db.close()