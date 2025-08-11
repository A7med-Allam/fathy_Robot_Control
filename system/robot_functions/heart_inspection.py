"""
Heart Inspection API (FastAPI-compatible)
Returns plain dictionaries to be serialized by FastAPI.
"""

import random
import time


def execute(data: dict):
    heart_rate = random.randint(60, 100)
    blood_pressure_sys = random.randint(110, 140)
    blood_pressure_dia = random.randint(70, 90)

    if 60 <= heart_rate <= 80 and blood_pressure_sys < 130:
        status = "excellent"
        recommendation = "Your vital signs look great! Keep up the good work."
    elif heart_rate <= 100 and blood_pressure_sys < 140:
        status = "good"
        recommendation = "Your vital signs are within normal range."
    else:
        status = "attention_needed"
        recommendation = "Please consult with a healthcare professional."

    return {
        'success': True,
        'action': 'heart_inspection',
        'vital_signs': {
            'heart_rate': heart_rate,
            'blood_pressure': f"{blood_pressure_sys}/{blood_pressure_dia}",
            'inspection_time': time.strftime("%H:%M:%S"),
        },
        'health_status': status,
        'recommendation': recommendation,
        'scan_duration': '15 seconds',
    }


def history(data: dict):
    history_data = []
    for i in range(5):
        history_data.append({
            'date': f"2025-01-{7 - i:02d}",
            'heart_rate': random.randint(65, 85),
            'status': random.choice(['excellent', 'good']),
        })

    return {
        'success': True,
        'history': history_data,
        'total_inspections': len(history_data),
    }


