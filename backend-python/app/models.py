from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    videos = relationship("Video", back_populates="project")

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    filename = Column(String)
    filepath = Column(String) # Path where the video is stored
    status = Column(String, default="uploaded") # e.g., uploaded, processing, completed, failed
    # Transcript will now store a JSON object: {"key_topics": [...], "segments": [...]}
    transcript = Column(Text, nullable=True) 
    summary = Column(Text, nullable=True) # Optional: if you generate a summary
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="videos")