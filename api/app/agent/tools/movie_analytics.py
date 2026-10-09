from sqlalchemy.orm import Session

from app.agent.schemas import MovieAnalyticsArguments, MovieDatasetStatisticsArguments
from app.analytics.movie_analytics import AnalyticsError, dataset_statistics, query_movie_analytics


def get_movie_dataset_statistics_tool(db: Session, args: MovieDatasetStatisticsArguments) -> dict:
    if not args.dataset_id:
        raise AnalyticsError("missing_dataset_context", "Select an approved historical dataset first.", 422)
    return dataset_statistics(db, args.dataset_id)


def query_movie_analytics_tool(db: Session, args: MovieAnalyticsArguments) -> dict:
    if not args.dataset_id:
        raise AnalyticsError("missing_dataset_context", "Select an approved historical dataset first.", 422)
    return query_movie_analytics(
        db,
        args.dataset_id,
        args.operation,
        args.genre,
        args.budget_bucket_size,
        args.max_points,
    )
