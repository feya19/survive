"""Backward-compatible import for the Instructor-backed OpenRouter client."""

from app.ai.instructor_client import InstructorClient, OpenRouterClient

__all__ = ["InstructorClient", "OpenRouterClient"]
