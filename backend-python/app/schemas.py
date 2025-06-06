from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Union, Literal
from datetime import datetime

class VideoBase(BaseModel):
    filename: str

class VideoCreate(VideoBase):
    pass

class QuizQuestionOption(BaseModel):
    text: str
    is_correct: bool 

class QuizQuestion(BaseModel):
    question_text: str
    question_type: Literal["single-choice", "multiple-choice"]
    options: List[QuizQuestionOption] 
    explanation: Optional[str] = None 

class Quiz(BaseModel):
    title: str
    questions: List[QuizQuestion]

class VideoTagUpdate(BaseModel):
    tags: List[str] = Field(default_factory=list)

class VideoSchema(VideoBase):
    id: int
    project_id: int
    filepath: str
    status: str
    transcript: Optional[Any] 
    summary: Optional[str]
    mindmap_data: Optional[str] 
    quiz_data: Optional[Any] 
    tags: Optional[List[str]] = Field(default_factory=list)
    is_public: bool = False
    public_slug: Optional[str] = None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)
    
class PublicVideoSchema(BaseModel): 
    filename: str
    filepath: str 
    transcript: Optional[Any]
    mindmap_data: Optional[str]
    quiz_data: Optional[Any]
    tags: Optional[List[str]] = Field(default_factory=list)
    project_name: str 
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