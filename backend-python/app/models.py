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

    videos = relationship("Video", back_populates="project", cascade="all, delete-orphan") # Added cascade delete

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    filename = Column(String)
    filepath = Column(String) 
    status = Column(String, default="uploaded") 
    transcript = Column(Text, nullable=True) 
    summary = Column(Text, nullable=True) 
    mindmap_data = Column(Text, nullable=True) 
    quiz_data = Column(Text, nullable=True) # New field for quiz (JSON string)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="videos")