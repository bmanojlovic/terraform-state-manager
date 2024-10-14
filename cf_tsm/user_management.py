import requests
import getpass
import json
import os
from .utils import BASE_URL, get_auth_header, debug_print

class UserManager:
    @staticmethod
    def add_parsers(subparsers):
        add_parser = subparsers.add_parser("add", help="Add a new user")
        add_parser.add_argument("--username", required=True, help="Username for the new user")
        add_parser.add_argument("--project", required=True, help="Project for the user")
        add_parser.add_argument("--role", required=True, help="Role for the user")

        update_parser = subparsers.add_parser("update", help="Update an existing user")
        update_parser.add_argument("--username", required=True, help="Username of the user to update")
        update_parser.add_argument("--project", help="New project for the user")
        update_parser.add_argument("--role", help="New role for the user")

        delete_parser = subparsers.add_parser("delete", help="Delete a user")
        delete_parser.add_argument("--username", required=True, help="Username of the user to delete")

        subparsers.add_parser("list", help="List all users")

    @staticmethod
    def handle_action(args):
        if args.user_action == "add":
            UserManager.add_user(args.username, args.project, args.role)
        elif args.user_action == "update":
            UserManager.update_user(args.username, args.project, args.role)
        elif args.user_action == "delete":
            UserManager.delete_user(args.username)
        elif args.user_action == "list":
            UserManager.list_users(args.debug)

    @staticmethod
    def add_user(username, project, role):
        password = getpass.getpass("Enter password: ")
        url = f"{BASE_URL}/api/v1/users"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json"
        }
        data = {
            "username": username,
            "password": password,
            "project": project,
            "role": role
        }
        response = requests.post(url, headers=headers, json=data)
        print(f"Add user response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))

    @staticmethod
    def update_user(username, project, role):
        password = getpass.getpass("Enter new password (leave blank to keep current): ") or None
        url = f"{BASE_URL}/api/v1/users/{username}"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json"
        }
        data = {}
        if password:
            data["password"] = password
        if project:
            data["project"] = project
        if role:
            data["role"] = role
        response = requests.put(url, headers=headers, json=data)
        print(f"Update user response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))

    @staticmethod
    def delete_user(username):
        url = f"{BASE_URL}/api/v1/users/{username}"
        headers = {
            "Authorization": get_auth_header()
        }
        response = requests.delete(url, headers=headers)
        print(f"Delete user response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))

    @staticmethod
    def list_users(debug=False):
        url = f"{BASE_URL}/api/v1/users"
        headers = {
            "Authorization": get_auth_header()
        }
        debug_print(f"URL used: {url}", debug)
        debug_print(f"Headers used: {headers}", debug)
        response = requests.get(url, headers=headers)
        debug_print(f"Response status code: {response.status_code}", debug)
        debug_print(f"Response content: {json.dumps(response.json(), indent=2)}", debug)
        if response.status_code == 200:
            users = response.json()
            print(json.dumps(users, indent=2))
        elif response.status_code == 401:
            print("Error: Unauthorized. Please check your authentication token.")
        else:
            print(f"List users response: {response.status_code}")
            print(json.dumps(response.json(), indent=2))
