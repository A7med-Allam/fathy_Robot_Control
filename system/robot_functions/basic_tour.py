"""
Basic Tour API (FastAPI-compatible)
Returns plain dictionaries to be serialized by FastAPI.
"""

import random


def execute(data: dict):
    tour_type = data.get('type', 'standard')

    tour_routes = {
        'standard': [
            "🏠 Welcome area introduction",
            "🛋️ Living room tour",
            "🍳 Kitchen demonstration",
            "📚 Study room overview",
            "🌿 Garden walkthrough",
        ],
        'detailed': [
            "🏠 Welcome area with history",
            "🛋️ Living room with features explanation",
            "🍳 Kitchen with appliance demonstration",
            "📚 Study room with technology showcase",
            "🌿 Garden with plant identification",
            "🔧 Utility room tour",
        ],
        'quick': [
            "🏠 Welcome area",
            "🛋️ Living room",
            "🍳 Kitchen",
        ],
    }

    selected_route = tour_routes.get(tour_type, tour_routes['standard'])
    estimated_time_minutes = len(selected_route) * 3

    return {
        'success': True,
        'action': 'basic_tour',
        'tour_type': tour_type,
        'route': selected_route,
        'estimated_time': f"{estimated_time_minutes} minutes",
        'current_position': 'Starting point',
        'tour_id': f"tour_{random.randint(1000, 9999)}",
    }


def pause(data: dict):
    return {
        'success': True,
        'status': 'paused',
        'message': 'Tour has been paused. Use resume to continue.'
    }


def resume(data: dict):
    return {
        'success': True,
        'status': 'resumed',
        'message': 'Tour has been resumed.'
    }


