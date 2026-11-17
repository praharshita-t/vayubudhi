"""Trigger the Render ingestion job and wait for its result without DB access."""
import json
import os
import time
import urllib.request
import urllib.error


def main():
    base = os.environ["INGESTION_API_URL"].rstrip("/")
    secret = os.environ.get("INGESTION_TRIGGER_SECRET", "")
    if not base.startswith("https://") or len(secret) < 32:
        raise RuntimeError("An HTTPS backend and ingestion trigger secret are required")
    headers = {"X-Ingestion-Key": secret, "Content-Type": "application/json"}

    def request(path, method="GET"):
        req = urllib.request.Request(base + path, headers=headers, method=method,
                                     data=b"{}" if method == "POST" else None)
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)

    run = request("/api/ingestion/scheduled-refresh", "POST")
    deadline = time.monotonic() + 20 * 60
    while time.monotonic() < deadline:
        result = request("/api/ingestion/scheduled-refresh/" + run["run_id"])
        state = result["status"]
        if state == "succeeded":
            print(json.dumps(result))
            return
        if state == "failed":
            print(json.dumps(result))
            raise RuntimeError("Backend Station refresh failed")
        print("Station refresh: " + state, flush=True)
        time.sleep(15)
    raise TimeoutError("Station refresh did not finish within 20 minutes")


if __name__ == "__main__":
    main()
