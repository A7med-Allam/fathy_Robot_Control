"""
Shake Hand API (FastAPI-compatible)
Returns plain dictionaries to be serialized by FastAPI.
"""

import random


def execute(data: dict):
    intensity = data.get('intensity', 'normal')

    steps = [
        "🔧 Positioning robotic arm",
        "🤖 Detecting hand presence",
        "🤝 Engaging handshake motion",
        "✅ Handshake completed",
    ]

    return {
        'success': True,
        'action': 'shake_hand',
        'intensity': intensity,
        'steps': steps,
        'duration': '3.2 seconds',
        'message': f'Handshake completed with {intensity} intensity',
    }


def status(data: dict):
    return {
        'success': True,
        'mechanism': 'operational',
        'last_handshake': '2 minutes ago',
        'total_handshakes': random.randint(50, 200),
    }


