# Terraform State Management System

This project implements a Terraform state management system using Cloudflare Workers, D1 database, and R2 storage. It provides a secure and scalable solution for managing Terraform state files across multiple projects.

## Features

- Secure storage of Terraform state files
- Locking mechanism to prevent concurrent modifications
- User authentication and authorization
- Project-based access control
- State file versioning and backups
- Configuration management
- RESTful API for Terraform operations

## Architecture

The system is built using the following components:

- **Cloudflare Workers**: Serverless compute platform for handling API requests
- **D1 Database**: SQL database for storing metadata, locks, and user information
- **R2 Storage**: Object storage for Terraform state files and backups
- **Hono**: Lightweight web framework for building the API

## API Endpoints

### Terraform Operations

- `GET /api/v1/states`: List all Terraform states
- `GET /api/v1/states/:projectName/*`: Retrieve a state file
- `POST /api/v1/states/:projectName/*`: Update a state file
- `DELETE /api/v1/states/:projectName/*`: Delete a state file
- `POST /api/v1/lock/:projectName/*`: Acquire a lock
- `DELETE /api/v1/lock/:projectName/*`: Release a lock
- `GET /api/v1/lock/:projectName/*`: Get lock information
- `LOCK /api/v1/lock/:projectName/*`: Acquire a lock (alternative method)
- `UNLOCK /api/v1/lock/:projectName/*`: Release a lock (alternative method)

### User Management

- `GET /api/v1/users`: List all users
- `POST /api/v1/users`: Add a new user
- `PUT /api/v1/users/:username`: Update an existing user
- `DELETE /api/v1/users/:username`: Delete a user

### Configuration Management

- `GET /api/v1/config`: Retrieve current configuration
- `POST /api/v1/config`: Update configuration

### Initial Admin User Creation

- `POST /config/init`: Initialize admin user (requires Bearer token authentication)

Note: All routes except `/config/init` require Basic authentication and project-based authorization.

### Backup

- `GET /api/v1/backup/states`: Create and download a backup of all state files
- `GET /api/v1/backup/users`: Create and download a backup of user information

Note: Health check and version endpoints are not implemented in the current version.

## Security

- Bearer token authentication for admin operations
- Basic authentication for Terraform operations
- Project-based authorization
- Password hashing using SHA-256
- Secure storage of sensitive information in environment variables
- CORS (Cross-Origin Resource Sharing) enabled for API endpoints

## Setup and Deployment

1. Clone this repository
2. Install dependencies: `npm install`
3. Configure your Cloudflare account and create a D1 database and R2 bucket
4. Update `wrangler.toml` with your Cloudflare account details and environment bindings
5. Add the AUTH_TOKEN secret to your worker:
   ```
   wrangler secret put AUTH_TOKEN
   ```
   You will be prompted to enter the secret value. This should be a secure, randomly generated string.

6. Deploy the worker: `wrangler deploy`

## Usage

### Configuring cf_tsm (tsm-admin)

1. Install cf_tsm:
   ```
   pip install cf_tsm
   ```

2. Set up environment variables:
   - `TSM_AUTH_TOKEN`: This is the authentication token for admin operations. Set it in your environment:
     ```
     export TSM_AUTH_TOKEN=your_secret_token_here
     ```
   - `TSM_BASE_URL`: The URL of your deployed Terraform State Management system:
     ```
     export TSM_BASE_URL=https://your-tsm-instance.workers.dev
     ```

3. Configure user passwords:
   - Users are managed through the CLI. To add a new user:
     ```
     tsm-admin user add --username john_doe --project my_project --role developer
     ```
   - You will be prompted to enter a password for the user.

### Interacting with cf_tsm (tsm-admin)

The `tsm-admin` CLI provides several commands for managing the Terraform State Management system:

1. User Management:
   - Add a user: `tsm-admin user add --username <username> --project <project> --role <role>`
   - Update a user: `tsm-admin user update --username <username> --project <new_project> --role <new_role>`
   - Delete a user: `tsm-admin user delete --username <username>`
   - List users: `tsm-admin user list`

2. Configuration Management:
   - Get current configuration: `tsm-admin config get`
   - Set configuration: `tsm-admin config set --max-backups <number>`

3. State Management:
   - List states: `tsm-admin state list [--username <username>] [--project <project>]`
   - Download all states: `tsm-admin state download-all`

4. Debugging:
   - Most commands support a `--debug` flag for verbose output.

### Configuring Terraform to use the State Management System

Update your Terraform configuration to use the HTTP backend, pointing to your deployed TSM instance:

```hcl
terraform {
  backend "http" {
    address = "https://your-tsm-instance.workers.dev/api/v1/states/your_project_name/your_state_name"
    lock_address = "https://your-tsm-instance.workers.dev/api/v1/lock/your_project_name/your_state_name"
    unlock_address = "https://your-tsm-instance.workers.dev/api/v1/lock/your_project_name/your_state_name"
  }
}
```

Terraform will prompt for username and password. Use the credentials you set up with the `tsm-admin user add` command.

## Development

To run the project locally:

1. Install dependencies: `npm install`
2. Create a `.dev.vars` file in the project root and define your `AUTH_TOKEN`:
   ```
   AUTH_TOKEN=your_secret_token_here
   ```
3. Start the development server: `wrangler dev`

The `.dev.vars` file allows you to set environment variables for local development without exposing sensitive information in your code or version control.

For local development of cf_tsm (tsm-admin):

1. Clone the cf_tsm repository
2. Install dependencies: `pip install -e .`
3. Set up environment variables as described in the Configuration section
4. Run commands with `python -m cf_tsm.cli` instead of `tsm-admin`

## Testing

Run tests using the command: `npm test`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[GNU Affero General Public License v3.0](LICENSE)
