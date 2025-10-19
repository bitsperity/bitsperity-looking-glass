import json
import sys
from datetime import datetime


def log(event: str, **fields):
    rec = {"ts": datetime.utcnow().isoformat() + "Z", "event": event}
    rec.update(fields)
    sys.stdout.write(json.dumps(rec) + "\n")
    sys.stdout.flush()

