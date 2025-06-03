from pydantic import BaseModel, ConfigDict 
from typing import List, Optional, Any 
from datetime import datetime

class VideoBase(BaseModel):
    filename: str

class VideoCreate(VideoBase):
    pass

class VideoSchema(VideoBase):
    id: int
    project_id: int
    filepath: str
    status: str
    # Transcript will be parsed by the frontend from the JSON string
    transcript: Optional[Any] 
    summary: Optional[str]
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class ProjectSchema(ProjectBase):
    id: int
    created_at: datetime
    videos: List[VideoSchema] = []

    model_config = ConfigDict(from_attributes=True)