import requests
import threading
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
BASE_URL = os.environ.get("TSM_BASE_URL", "http://localhost:8787")
USERNAME = os.environ.get("TSM_USERNAME", "your_username")
PASSWORD = os.environ.get("TSM_PASSWORD", "your_password")

# Function to attempt acquiring a lock
def attempt_lock(project, state):
    lock_info = {
        "ID": "test-lock-id",
        "Operation": "test-operation",
        "Info": "test-info",
        "Who": f"{USERNAME}@localhost",
        "Version": "test-version",
        "Created": "2023-01-01T00:00:00Z",
        "Path": ""  # This will be set by the server
    }
    response = requests.post(f"{BASE_URL}/api/v1/lock/{project}/{state}", auth=(USERNAME, PASSWORD), json=lock_info, headers={"Content-Type": "application/json"})
    print(f"Lock attempt for {project}/{state}: Status {response.status_code}, Response: {response.text}")
    if response.status_code == 500:
        print(f"Full response content: {response.content}")
    if response.status_code == 404:
        print(f"Lock endpoint not found for {project}/{state}")
        return False, None
    return response.status_code == 200, response.json() if response.status_code in [200, 423] else None

# Function to release a lock
def release_lock(project, state, lock_id):
    response = requests.delete(f"{BASE_URL}/api/v1/lock/{project}/{state}", auth=(USERNAME, PASSWORD), json={"ID": lock_id}, headers={"Content-Type": "application/json"})
    print(f"Release lock for {project}/{state}: Status {response.status_code}, Response: {response.text}")
    return response.status_code == 200

# Function to ensure no locks are held
def ensure_no_locks(project, state):
    max_attempts = 3
    for attempt in range(max_attempts):
        success, lock_info = attempt_lock(project, state)
        if success:
            print(f"No lock held for {project}/{state}")
            if lock_info and 'ID' in lock_info:
                release_lock(project, state, lock_info['ID'])
            return True
        else:
            print(f"Warning: Lock still held for {project}/{state}. Attempting to release... (Attempt {attempt + 1}/{max_attempts})")
            if lock_info and 'ID' in lock_info:
                release_lock(project, state, lock_info['ID'])
                time.sleep(1)  # Give some time for the release to take effect
            else:
                print(f"No lock information available for {project}/{state}")
                # Try to release with a default lock ID
                release_lock(project, state, "test-lock-id")
                time.sleep(1)
    
    print(f"Error: Unable to release lock for {project}/{state} after {max_attempts} attempts")
    return False

# Test concurrent lock attempts
def test_concurrent_locks(num_attempts=5):
    project = "test-project"
    state = "test-state"

    try:
        ensure_no_locks(project, state)

        with ThreadPoolExecutor(max_workers=num_attempts) as executor:
            futures = [executor.submit(attempt_lock, project, state) for _ in range(num_attempts)]
            results = [future.result() for future in as_completed(futures)]

        successful_locks = sum(result[0] for result in results)
        print(f"Concurrent lock test results: {successful_locks} out of {num_attempts} attempts succeeded")
        assert successful_locks == 1, f"Expected only one successful lock acquisition, got {successful_locks}"

        # Release the lock
        success, lock_info = attempt_lock(project, state)
        assert not success, "Expected lock to be held"
        assert release_lock(project, state, lock_info['ID']), "Failed to release the lock"

        # Verify lock is released
        success, _ = attempt_lock(project, state)
        assert success, "Expected lock to be released"
        release_lock(project, state, "test-lock-id")  # Release the lock we just acquired
    finally:
        # Always try to clean up, even if the test fails
        ensure_no_locks(project, state)

# Test lock release
def test_lock_release():
    project = "projectname"
    state = "state.tfstate"

    ensure_no_locks(project, state)

    # Acquire lock
    success, lock_info = attempt_lock(project, state)
    print(f"Initial lock acquisition result: {success}, Lock info: {lock_info}")
    print(f"Debug: Lock ID = {lock_info['ID'] if lock_info and 'ID' in lock_info else 'Not found'}")
    assert success, "Failed to acquire initial lock"

    # Try to acquire again (should fail)
    success, held_lock_info = attempt_lock(project, state)
    assert not success, "Unexpectedly acquired already held lock"
    assert held_lock_info['ID'] == lock_info['ID'], "Lock ID mismatch"

    # Release lock
    assert release_lock(project, state, lock_info['ID']), "Failed to release lock"

    # Acquire again (should succeed now)
    success, _ = attempt_lock(project, state)
    assert success, "Failed to acquire lock after release"

    # Clean up
    release_lock(project, state, lock_info['ID'])
    ensure_no_locks(project, state)

if __name__ == "__main__":
    print("Running concurrent lock test...")
    test_concurrent_locks()
    print("Concurrent lock test completed successfully")

    print("\nRunning lock release test...")
    test_lock_release()
    print("Lock release test completed successfully")

    print("\nAll tests passed successfully!")
