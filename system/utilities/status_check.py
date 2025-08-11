"""
System Status Check API (FastAPI-compatible)
Returns plain dictionaries to be serialized by FastAPI.
"""

import random
import time


def execute(data: dict):
    system_health = random.choice(['excellent', 'good', 'fair'])
    battery_level = random.randint(70, 100)
    temperature = random.randint(35, 45)

    return {
        'success': True,
        'action': 'status_check',
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
        'system_health': system_health,
        'battery_level': f"{battery_level}%",
        'cpu_temperature': f"{temperature}°C",
        'active_functions': [
            'Voice recognition',
            'Motor controls',
            'Sensor array',
        ],
        'last_maintenance': '2025-01-01',
        'uptime': '2 days, 14 hours',
    }


