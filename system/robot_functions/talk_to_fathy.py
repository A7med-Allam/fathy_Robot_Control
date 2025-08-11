def execute(data: dict):
    print(f"[Talk to Fathy - Generic] Function called with data: {data}")
    message = data.get("message", "Voice interaction initiated.")
    return {
        "status": "info",
        "message": f"Talk to Fathy initiated via generic API call. Message was: '{message}'",
        "details": data,
    }


def listen(data: dict):
    import time
    time.sleep(0.1)
    return {
        "status": "info",
        "message": "Listening mode activated (simulated).",
        "details": {"mode": "listening"},
    }


