import requests
import json
from .utils import BASE_URL, get_auth_header, debug_print

class StateManager:
    @staticmethod
    def add_parsers(subparsers):
        list_states_parser = subparsers.add_parser("list", help="List Terraform states")
        list_states_parser.add_argument("--project", help="Filter states by project")

        get_state_parser = subparsers.add_parser("get", help="Get a specific Terraform state")
        get_state_parser.add_argument("project", help="Project name")
        get_state_parser.add_argument("state_path", help="State path")

        set_state_parser = subparsers.add_parser("set", help="Set a Terraform state")
        set_state_parser.add_argument("project", help="Project name")
        set_state_parser.add_argument("state_path", help="State path")
        set_state_parser.add_argument("file", help="Path to the state file")

        delete_state_parser = subparsers.add_parser("delete", help="Delete a Terraform state")
        delete_state_parser.add_argument("project", help="Project name")
        delete_state_parser.add_argument("state_path", help="State path")

        subparsers.add_parser("download", help="Download all Terraform states")

    @staticmethod
    def handle_action(args):
        if args.state_action == "list":
            StateManager.list_states(args.project, args.debug)
        elif args.state_action == "get":
            StateManager.get_state(args.project, args.state_path, args.debug)
        elif args.state_action == "set":
            StateManager.set_state(args.project, args.state_path, args.file, args.debug)
        elif args.state_action == "delete":
            StateManager.delete_state(args.project, args.state_path, args.debug)
        elif args.state_action == "download":
            StateManager.download_all_states(args.debug)

    @staticmethod
    def list_states(project=None, debug=False):
        url = f"{BASE_URL}/api/v1/states"
        headers = {
            "Authorization": get_auth_header()
        }
        params = {}
        if project:
            params['project'] = project

        debug_print(f"Sending request to {url}", debug)
        debug_print(f"Headers: {headers}", debug)
        debug_print(f"Params: {params}", debug)

        response = requests.get(url, headers=headers, params=params)
        debug_print(f"Response status code: {response.status_code}", debug)
        debug_print(f"Response content: {response.text}", debug)

        if response.status_code == 200:
            states = response.json()
            if states:
                print("States:")
                for state in states:
                    print(f"  {state}")
            else:
                print("No states found.")
        elif response.status_code == 401:
            print("Error: Unauthorized. Please check your authentication credentials.")
        else:
            print(f"Error listing states: {response.status_code}")
            print(json.dumps(response.json(), indent=2))

    @staticmethod
    def get_state(project, state_path, debug=False):
        url = f"{BASE_URL}/api/v1/states/{project}/{state_path}"
        headers = {
            "Authorization": get_auth_header()
        }
        debug_print(f"Sending request to {url}", debug)
        debug_print(f"Headers: {headers}", debug)

        response = requests.get(url, headers=headers)
        debug_print(f"Response status code: {response.status_code}", debug)

        if response.status_code == 200:
            print(response.text)
        else:
            print(f"Error: {response.status_code}")
            print(json.dumps(response.json(), indent=2))

    @staticmethod
    def set_state(project, state_path, file_path, debug=False):
        url = f"{BASE_URL}/api/v1/states/{project}/{state_path}"
        headers = {
            "Authorization": get_auth_header()
        }
        debug_print(f"Sending request to {url}", debug)
        debug_print(f"Headers: {headers}", debug)

        with open(file_path, 'r') as file:
            state_content = file.read()

        response = requests.post(url, data=state_content, headers=headers)
        debug_print(f"Response status code: {response.status_code}", debug)

        if response.status_code == 200:
            print("State updated successfully")
        else:
            print(f"Error: {response.status_code}")
            print(json.dumps(response.json(), indent=2))

    @staticmethod
    def delete_state(project, state_path, debug=False):
        url = f"{BASE_URL}/api/v1/states/{project}/{state_path}"
        headers = {
            "Authorization": get_auth_header()
        }
        debug_print(f"Sending request to {url}", debug)
        debug_print(f"Headers: {headers}", debug)

        response = requests.delete(url, headers=headers)
        debug_print(f"Response status code: {response.status_code}", debug)

        if response.status_code == 200:
            print("State deleted successfully")
        else:
            print(f"Error: {response.status_code}")
            print(json.dumps(response.json(), indent=2))

    @staticmethod
    def download_all_states(debug=False):
        url = f"{BASE_URL}/api/v1/backup/states"
        headers = {
            "Authorization": get_auth_header()
        }
        debug_print(f"Sending request to {url}", debug)
        debug_print(f"Headers: {headers}", debug)
        response = requests.get(url, headers=headers)
        debug_print(f"Response status code: {response.status_code}", debug)
        if response.status_code == 200:
            with open("terraform_states_backup.zip", "wb") as f:
                f.write(response.content)
            print("All states downloaded and saved as 'terraform_states_backup.zip'.")
        else:
            print(f"Download backup response: {response.status_code}")
            print(json.dumps(response.json(), indent=2))
