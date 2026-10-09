from decimal import Decimal

from sqlalchemy.orm import Session

from app.agent.schemas import BudgetShockArguments
from app.pipeline import predict_movie_revenue


def simulate_budget_shock_tool(db: Session, args: BudgetShockArguments) -> dict:
    base = {
        "budget": float(args.budget),
        "genres": args.genres,
        "currency": args.currency,
        "planned_duration": float(args.planned_duration) if args.planned_duration is not None else None,
        "marketing_budget": float(args.marketing_budget) if args.marketing_budget is not None else None,
    }
    modified_budget = args.budget * (Decimal("1") + args.budget_change_percent / Decimal("100"))
    if modified_budget < 0:
        raise ValueError("The budget change produces a negative budget")
    changed = {**base, "budget": float(modified_budget)}
    baseline_prediction = predict_movie_revenue(db, base)
    changed_prediction = predict_movie_revenue(db, changed, expected_model_version=baseline_prediction["model_version"])
    return {
        "domain": "movie",
        "scenario_type": "model_based_budget_what_if",
        "causal_estimate": False,
        "budget_change_percent": float(args.budget_change_percent),
        "baseline_inputs": {"budget": base["budget"], "genres": base["genres"], "currency": base["currency"]},
        "modified_inputs": {"budget": changed["budget"], "genres": changed["genres"], "currency": changed["currency"]},
        "baseline": baseline_prediction,
        "modified": changed_prediction,
        "revenue_change": changed_prediction["prediction"]["revenue"] - baseline_prediction["prediction"]["revenue"],
        "model_version": baseline_prediction["model_version"],
        "assumptions": ["All inputs except budget are held constant."],
        "warnings": ["This model-based what-if comparison is not a causal estimate of the effect of changing budget."],
    }
