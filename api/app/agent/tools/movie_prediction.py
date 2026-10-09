from sqlalchemy.orm import Session

from app.agent.schemas import MoviePredictionArguments
from app.pipeline import predict_movie_revenue


def predict_movie_revenue_tool(db: Session, args: MoviePredictionArguments) -> dict:
    return predict_movie_revenue(
        db,
        {
            "budget": float(args.budget),
            "genres": args.genres,
            "currency": args.currency,
            "planned_duration": float(args.planned_duration) if args.planned_duration is not None else None,
            "marketing_budget": float(args.marketing_budget) if args.marketing_budget is not None else None,
        },
    )
