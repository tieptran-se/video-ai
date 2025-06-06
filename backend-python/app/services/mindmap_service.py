import os
import json
import asyncio
from .. import crud
from ..database import SessionLocal
from .openai_utils import generate_mindmap_data_from_transcript 
from typing import Optional, List as PyList, Any, Dict


async def process_mindmap_generation(video_id: int, db_session_factory):
    db = db_session_factory()
    print(f"[MindmapService] Video ID {video_id}: Starting mind map generation process.")
    try:
        video = crud.get_video(db, video_id=video_id)
        if not video: 
            print(f"[MindmapService] Video ID {video_id}: Not found."); return
        if not video.transcript:
            print(f"[MindmapService] Video ID {video_id}: No transcript available.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Failed\n- No transcript.", status="completed")
            return
        
        try:
            transcript_data = json.loads(video.transcript)
            full_text = " ".join([seg['text'] for seg in transcript_data.get("segments", [])])
            key_moments = transcript_data.get("key_moments", [])
        except json.JSONDecodeError:
            print(f"[MindmapService] Video ID {video_id}: Could not parse transcript.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Failed\n- Parse transcript error.", status="completed")
            return

        if not full_text.strip():
            print(f"[MindmapService] Video ID {video_id}: Transcript text empty.")
            crud.update_video_data(db=db, video_id=video_id, mindmap_data="# Mind Map Failed\n- Empty transcript text.", status="completed")
            return

        mindmap_markdown = await generate_mindmap_data_from_transcript(full_text, key_moments)
        print(f"[MindmapService] Video ID {video_id}: Mind map generated, updating status to 'completed'.")
        crud.update_video_data(db=db, video_id=video_id, mindmap_data=mindmap_markdown, status="completed")
        print(f"[MindmapService] Video ID {video_id}: Mind map saved.")

    except Exception as e:
        print(f"[MindmapService] Video ID {video_id}: Error in process_mindmap_generation: {str(e)}")
        crud.update_video_data(db=db, video_id=video_id, mindmap_data=f"# Mind Map Error\n- {str(e)}", status="completed")
    finally:
        print(f"[MindmapService] Video ID {video_id}: Mindmap task finished, closing DB session.")
        db.close()