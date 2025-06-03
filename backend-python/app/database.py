from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/video_processor_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from .models import Base # Import Base to be used by other modules if needed

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()