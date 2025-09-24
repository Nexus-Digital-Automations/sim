# Parlant Server Setup Guide

This guide walks you through setting up the Parlant server for integration with your Sim application.

## Quick Start

1. **Run the setup script** (recommended):
   ```bash
   cd packages/parlant-server
   python setup.py
   ```

2. **Edit the .env file** with your configuration:
   ```bash
   nano .env
   ```

3. **Start the server**:
   ```bash
   python parlant_server.py
   ```

## Detailed Setup

### Prerequisites

- Python 3.10 or higher
- PostgreSQL database (same as your Sim application)
- OpenAI API key or Anthropic API key
- Access to your Sim application's environment variables

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure the following required variables:

```bash
# Database (use same as your Sim app)
DATABASE_URL="postgresql://username:password@localhost:5432/sim_database"

# AI Provider (at least one required)
OPENAI_API_KEY="sk-your-openai-key-here"
# OR
ANTHROPIC_API_KEY="your-anthropic-key-here"

# Sim Integration
BETTER_AUTH_SECRET="your-sim-auth-secret"  # Must match Sim app
ALLOWED_ORIGINS="http://localhost:3000"    # Your Sim app URL
```

### 2. Install Dependencies

If you didn't run the setup script:

```bash
pip install -r requirements.txt
```

### 3. Verify Installation

Test that everything is configured correctly:

```bash
python -c "from parlant_server import SimParlantServerConfig; print('✅ Configuration OK')"
```

### 4. Start the Server

Choose one of the following methods:

#### Option A: Standalone Parlant Server
```bash
python parlant_server.py
```
This runs the Parlant server directly on port 8800.

#### Option B: FastAPI Integration Bridge
```bash
python main.py
```
This runs the FastAPI bridge server on port 8001 (integrates with existing Sim auth).

### 5. Verify Server is Running

- Parlant API: http://localhost:8800/docs
- FastAPI Bridge: http://localhost:8001/docs
- Health Check: http://localhost:8800/health (or 8001/health for bridge)

## Configuration Options

### Database Configuration

The server uses the same PostgreSQL database as your Sim application:

```bash
# Local development
DATABASE_URL="postgresql://user:password@localhost:5432/sim_dev"

# Production (Vercel format)
POSTGRES_URL="postgresql://user:password@host:5432/sim_prod?sslmode=require"
```

### AI Provider Configuration

Configure at least one AI provider:

```bash
# OpenAI (recommended)
OPENAI_API_KEY="sk-your-key-here"

# Anthropic Claude
ANTHROPIC_API_KEY="your-key-here"
```

### Server Configuration

```bash
# Server settings
PARLANT_HOST="0.0.0.0"          # Listen on all interfaces
PARLANT_PORT="8800"             # Parlant server port
DEBUG="false"                   # Set to true for development

# CORS (allow your Sim frontend)
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
```

### Sim Integration

```bash
# Authentication (must match your Sim app exactly)
BETTER_AUTH_SECRET="your-shared-secret"
BETTER_AUTH_URL="http://localhost:3000"  # Optional

# JWT settings
JWT_ALGORITHM="HS256"
JWT_EXPIRE_HOURS="24"
```

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Sim Frontend  │    │  FastAPI Bridge  │    │ Parlant Server  │
│   (port 3000)   │◄───┤   (port 8001)    │◄───┤   (port 8800)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  PostgreSQL DB   │    │  AI Providers   │
                       │  (shared)        │    │  (OpenAI/etc)   │
                       └──────────────────┘    └─────────────────┘
```

### Component Responsibilities

1. **Sim Frontend**: Your existing React/Next.js application
2. **FastAPI Bridge**: Authentication bridge and API gateway (port 8001)
3. **Parlant Server**: Core AI agent engine (port 8800)
4. **PostgreSQL DB**: Shared database for sessions, agents, and user data
5. **AI Providers**: External AI services (OpenAI, Anthropic, etc.)

## Usage Examples

### Creating an Agent

```python
from agent_utils import create_agent_config, get_agent_manager

# Create agent configuration
config = create_agent_config(
    name="Customer Support Agent",
    description="Helps customers with common questions",
    workspace_id="workspace_123",
    user_id="user_456",
    model_provider=ModelProvider.OPENAI,
    model_name="gpt-4",
    temperature=0.7,
    system_prompt="You are a helpful customer support agent..."
)

# Create the agent
agent_manager = get_agent_manager()
agent = await agent_manager.create_agent(config)
```

### Starting a Conversation

```python
# Create a session for the agent
session_id = await agent_manager.create_session(
    workspace_id="workspace_123",
    agent_name="Customer Support Agent",
    user_id="user_456"
)

# Session is now ready for conversation via the API
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns server health status and configuration info.

### Agent Management
```http
GET /api/v1/agents                    # List agents
POST /api/v1/agents                   # Create agent
GET /api/v1/agents/{agent_id}         # Get agent details
PUT /api/v1/agents/{agent_id}         # Update agent
DELETE /api/v1/agents/{agent_id}      # Delete agent
```

### Session Management
```http
POST /api/v1/sessions                 # Create session
GET /api/v1/sessions/{session_id}     # Get session
POST /api/v1/sessions/{session_id}/messages  # Send message
```

## Troubleshooting

### Common Issues

1. **"DATABASE_URL is required"**
   - Set DATABASE_URL or POSTGRES_URL in your .env file
   - Use the same database URL as your Sim application

2. **"No AI provider configured"**
   - Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file
   - Verify your API key is valid

3. **"Failed to connect to database"**
   - Ensure PostgreSQL is running
   - Verify database credentials and connectivity
   - Check if the database exists

4. **CORS errors in browser**
   - Add your frontend URL to ALLOWED_ORIGINS
   - Include both HTTP and HTTPS versions if needed

### Debug Mode

Enable debug mode for development:

```bash
DEBUG=true python parlant_server.py
```

This enables:
- Verbose logging
- Auto-reload on code changes
- Detailed error messages

### Logs

Server logs include:
- Startup and shutdown events
- Agent creation and management
- Session lifecycle
- Error details and stack traces

## Production Deployment

### Environment Variables

Ensure these are set in production:

```bash
# Database with SSL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Strong auth secret (same as Sim)
BETTER_AUTH_SECRET="your-production-secret"

# Production origins
ALLOWED_ORIGINS="https://yourdomain.com"

# Disable debug
DEBUG="false"
```

### Performance Tuning

```bash
# Connection pooling
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30

# Rate limiting
DEFAULT_RATE_LIMIT=100
PREMIUM_RATE_LIMIT=500

# Session limits
MAX_SESSIONS_PER_AGENT=1000
SESSION_TIMEOUT_HOURS=24
```

### Monitoring

The server provides health check endpoints for monitoring:

- `/health` - Comprehensive health check
- `/ready` - Kubernetes readiness probe

Set up monitoring alerts for:
- Server availability
- Database connectivity
- AI provider API limits
- Error rates and response times

## Development

### Running Tests

```bash
python -m pytest tests/
```

### Code Quality

```bash
# Format code
black .
isort .

# Type checking
mypy .

# Linting
ruff check .
```

### Contributing

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation
4. Ensure all health checks pass

## Support

For issues and questions:

1. Check the logs for error details
2. Verify environment configuration
3. Test database and AI provider connectivity
4. Check CORS and authentication settings

The setup script (`python setup.py`) can help diagnose common configuration issues.