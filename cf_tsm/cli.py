from .user_management import UserManager
from .config_management import ConfigManager
from .state_management import StateManager
import argparse

def main():
    parser = argparse.ArgumentParser(description="Terraform State Manager Admin CLI")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")
    subparsers = parser.add_subparsers(dest="action", help="Action to perform", required=True)

    # User management subparser
    user_parser = subparsers.add_parser("user", help="User management commands")
    user_subparsers = user_parser.add_subparsers(dest="user_action", required=True)
    UserManager.add_parsers(user_subparsers)

    # Config management subparser
    config_parser = subparsers.add_parser("config", help="Configuration management commands")
    config_subparsers = config_parser.add_subparsers(dest="config_action", required=True)
    ConfigManager.add_parsers(config_subparsers)

    # State management subparser
    state_parser = subparsers.add_parser("state", help="State management commands")
    state_subparsers = state_parser.add_subparsers(dest="state_action", required=True)
    StateManager.add_parsers(state_subparsers)

    # Add --username argument to the state list command
    state_list_parser = state_subparsers.choices.get('list')
    if state_list_parser:
        state_list_parser.add_argument("--username", help="Filter states by username")

    args = parser.parse_args()

    if args.action == "user":
        UserManager.handle_action(args)
    elif args.action == "config":
        ConfigManager.handle_action(args)
    elif args.action == "state":
        StateManager.handle_action(args)

if __name__ == "__main__":
    main()
