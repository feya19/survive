import json

from pydantic import BaseModel

from app.ai.instructor_client import InstructorClient
from app.dashboards.schemas import DashboardSpec
from app.dashboards.validator import dashboard_sources, validate_dashboard_spec


class DashboardPlanner:
    def __init__(self, client: InstructorClient):
        self.client = client

    def generate(self, request: str, tool_results: list[dict]) -> DashboardSpec:
        evidence = []
        for source in dashboard_sources(tool_results).values():
            evidence.append({
                "result_id": source["result_id"],
                "tool": source["tool"],
                "fields": source["fields"],
                "row_count": len(source["rows"]),
                "sample_rows": source["rows"][:10],
            })
        messages = [
            {
                "role": "system",
                "content": (
                    "Create a movie DashboardSpec using only the supplied verified result IDs and fields. "
                    "Use only supported widget types in the schema. Never invent data_ref values or fields. "
                    "Do not generate HTML, JavaScript, SQL, or code. Keep insight_text descriptive and grounded in the supplied evidence."
                ),
            },
            {
                "role": "user",
                "content": "Request:\n" + request + "\nVerified result references and fields:\n" + json.dumps(evidence, default=str),
            },
        ]
        spec = self.client.generate_structured(messages, DashboardSpec)
        return validate_dashboard_spec(spec, tool_results)
