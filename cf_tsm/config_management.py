import requests
import json
import getpass
from .utils import BASE_URL, get_auth_header

class ConfigManager:
    @staticmethod
    def add_parsers(subparsers):
        subparsers.add_parser("get", help="Get current configuration")
        set_config_parser = subparsers.add_parser("set", help="Set configuration")
        set_config_parser.add_argument("--max-backups", type=int, required=True, help="Maximum number of backups to keep")
        init_admin_parser = subparsers.add_parser("init-admin", help="Initialize admin user")
        init_admin_parser.add_argument("--username", required=True, help="Admin username")

    @staticmethod
    def handle_action(args):
        if args.config_action == "get":
            ConfigManager.get_config()
        elif args.config_action == "set":
            ConfigManager.set_config(args.max_backups)
        elif args.config_action == "init-admin":
            ConfigManager.init_admin(args.username)

    @staticmethod
    def get_config():
        url = f"{BASE_URL}/api/v1/config"
        headers = {
            "Authorization": get_auth_header()
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            config = response.json()
            print(json.dumps(config, indent=2))
        else:
            print(f"Get config response: {response.status_code} - {response.text}")

    @staticmethod
    def set_config(max_backups):
        url = f"{BASE_URL}/api/v1/config"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json"
        }
        data = {
            "maxBackups": max_backups
        }
        response = requests.post(url, headers=headers, json=data)
        print(f"Set config response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))

    @staticmethod
    def init_admin(username):
        password = getpass.getpass("Enter admin password: ")
        url = f"{BASE_URL}/api/v1/users"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json"
        }
        data = {
            "username": username,
            "password": password,
            "project": "all",
            "role": "admin"
        }
        response = requests.post(url, headers=headers, json=data)
        print(f"Init admin response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        if response.status_code != 201:
            print("Failed to initialize admin user. Please check your authentication token and try again.")
