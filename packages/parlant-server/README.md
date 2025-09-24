# Parlant Server for Sim Integration

This package contains the Python-based Parlant server that integrates with Sim's existing Next.js + PostgreSQL platform to provide conversational AI agent capabilities.

## 🧪 Testing Framework

**Status:** ✅ **Production-Ready Testing Infrastructure**

A comprehensive testing framework has been implemented to validate all acceptance criteria and ensure production readiness. Run the complete test suite with:

```bash
npm test
```

### Test Coverage
- ✅ **Integration Tests** - Core server functionality validation
- ✅ **Database Tests** - PostgreSQL session persistence verification
- ✅ **Authentication Tests** - JWT integration with Sim's Better Auth
- ✅ **Health Monitoring** - Production monitoring endpoints
- ✅ **API Endpoint Tests** - Complete agent management API validation
- ✅ **Performance Tests** - Load testing and stress validation

### Quick Test Commands
```bash
npm run test:integration    # Core functionality
npm run test:database      # Database integration
npm run test:auth          # Authentication bridge
npm run test:health        # Health monitoring
npm run test:api           # API endpoints
npm run test:performance   # Load testing
```

**See `TESTING_VALIDATION_REPORT.md` for complete testing documentation.**

## Overview

The Parlant server acts as a microservice that:
- Provides REST API endpoints for agent management
- Integrates with Sim's PostgreSQL database for session persistence
- Handles authentication and workspace isolation
- Supports health monitoring and observability

## Installation

### Prerequisites

- Python 3.8 or higher
- PostgreSQL database (shared with Sim)
- OpenAI API key (or other supported AI provider)

### Quick Setup

1. **Run the installation script:**
   ```bash
   ./install.sh
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration
   ```

3. **Start the server:**
   ```bash
   python server.py
   ```

### Manual Installation

1. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost/sim_dev` |
| `PARLANT_HOST` | Server host address | `localhost` |
| `PARLANT_PORT` | Server port | `8001` |
| `OPENAI_API_KEY` | OpenAI API key for AI models | Required |
| `AI_PROVIDER` | AI provider (openai, anthropic, etc.) | `openai` |
| `AI_MODEL` | AI model to use | `gpt-4` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Database Configuration

The Parlant server shares the same PostgreSQL database as the main Sim application. Ensure your `DATABASE_URL` points to the same database instance.

## API Endpoints

### Health Monitoring

- `GET /health` - Basic health check
- `GET /ready` - Readiness check for deployments

### Agent Management

- `GET /agents` - List all agents
- `POST /agents` - Create new agent
- `GET /agents/{agent_id}` - Get specific agent
- `PUT /agents/{agent_id}` - Update agent
- `DELETE /agents/{agent_id}` - Delete agent

### Documentation

- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## Development

### Running in Development Mode

```bash
# Activate virtual environment
source venv/bin/activate

# Start server with auto-reload
python server.py
# or
DEBUG=true python server.py
```

### Testing

```bash
# Run tests (when implemented)
python -m pytest tests/

# Type checking
python -m mypy server.py

# Code formatting
python -m black .

# Linting
python -m pylint server.py
```

## Architecture

### Integration with Sim

The Parlant server integrates with Sim's existing architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Sim Frontend  │    │   Sim Backend    │    │ Parlant Server  │
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│   (Python)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          │
                       ┌──────────────────┐              │
                       │   PostgreSQL     │◄─────────────┘
                       │   Database       │
                       └──────────────────┘
```

### Key Components

1. **FastAPI Server**: Modern Python web framework for APIs
2. **Parlant Engine**: Core conversational AI engine
3. **PostgreSQL Integration**: Session persistence and data storage
4. **Health Monitoring**: Kubernetes-ready health checks
5. **CORS Support**: Frontend integration support

## Deployment

### Docker Support

The server can be containerized and deployed alongside the main Sim application:

```dockerfile
# Example Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8001

CMD ["python", "server.py"]
```

### Environment-Specific Configuration

- **Development**: Uses local PostgreSQL, debug logging enabled
- **Staging**: Shared database, structured logging
- **Production**: Optimized for scale, comprehensive monitoring

## Monitoring and Observability

### Health Checks

- `/health` - Basic service health
- `/ready` - Service readiness for load balancers

### Logging

Structured logging with configurable levels:
- Request/response logging
- Error tracking and alerting
- Performance metrics

### Metrics

Integration points for monitoring tools:
- Response times
- Request rates
- Error rates
- Resource utilization

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure virtual environment is activated and dependencies installed
2. **Database Connection**: Verify `DATABASE_URL` and database accessibility
3. **Port Conflicts**: Check if port 8001 is available or change `PARLANT_PORT`
4. **AI Provider Issues**: Verify API key configuration and network access

### Debug Mode

Enable debug mode for detailed logging:
```bash
DEBUG=true LOG_LEVEL=DEBUG python server.py
```

## Contributing

1. Follow Python best practices and PEP 8 style guidelines
2. Add type hints for all functions and methods
3. Include comprehensive docstrings
4. Write tests for new functionality
5. Update documentation for changes

## License

This project is licensed under the same terms as the main Sim project.

## Support

For issues and questions:
- Check existing GitHub issues
- Review logs with debug mode enabled
- Consult Parlant documentation for engine-specific issues