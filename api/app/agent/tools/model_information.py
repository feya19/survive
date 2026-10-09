from sqlalchemy.orm import Session

from app.pipeline import active_movie_model_metadata


def get_active_movie_model_tool(db: Session, args) -> dict:
    return active_movie_model_metadata(db)
