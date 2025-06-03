from pydantic import BaseModel, ConfigDict # Import ConfigDict for Pydantic V2+
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
    transcript: Optional[Any] # Can be a JSON string or parsed object
    summary: Optional[str]
    uploaded_at: datetime

    # Updated for Pydantic V2+
    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class ProjectSchema(ProjectBase):
    id: int
    created_at: datetime
    videos: List[VideoSchema] = []

    # Updated for Pydantic V2+
    model_config = ConfigDict(from_attributes=True)