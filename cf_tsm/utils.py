import os
import base64
from typing import Optional

BASE_URL = os.environ.get("TSM_BASE_URL", "http://localhost:8787")

def debug_print(message, debug_enabled=False):
    if debug_enabled:
        print(f"Debug: {message}")

def get_auth_header() -> Optional[str]:
    tsm_auth_token = os.environ.get("TSM_AUTH_TOKEN")
    if tsm_auth_token:
        return f"Bearer {tsm_auth_token}"
    elif os.environ.get("TSM_USERNAME") and os.environ.get("TSM_PASSWORD"):
        username = os.environ.get("TSM_USERNAME")
        password = os.environ.get("TSM_PASSWORD")
        auth_string = f"{username}:{password}"
        auth_bytes = auth_string.encode('ascii')
        base64_bytes = base64.b64encode(auth_bytes)
        base64_auth = base64_bytes.decode('ascii')
        return f"Basic {base64_auth}"
    else:
        print("Debug: Neither TSM_AUTH_TOKEN nor TSM_USERNAME and TSM_PASSWORD are set.")
        return None
