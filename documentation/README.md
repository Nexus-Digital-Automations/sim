# Sim API Documentation

This directory contains comprehensive documentation for the Sim workflow platform API.

## Structure

- **[Core API](./core-api/README.md)** - Documentation for existing core API endpoints
- **[Registry API](./registry-api/README.md)** - Dynamic tool and block registration system
- **[Versioning API](./versioning-api/README.md)** - Workflow versioning and history management
- **[Collaboration API](./collaboration-api/README.md)** - User permissions and collaboration features
- **[Testing & Debugging API](./testing-api/README.md)** - Workflow testing, dry-run, and debugging endpoints
- **[Examples](./examples/README.md)** - Code examples and integration samples
- **[SDK](./sdk/README.md)** - SDK documentation and implementation guides

## Quick Start

For developers looking to get started quickly:

1. **Basic Usage**: Start with [Core API](./core-api/README.md)
2. **Custom Tools**: See [Registry API](./registry-api/README.md) for extending platform capabilities
3. **Collaboration**: Check [Collaboration API](./collaboration-api/README.md) for team workflows
4. **Testing**: Use [Testing API](./testing-api/README.md) for workflow validation

## API Reference

Complete OpenAPI/Swagger specification available at:
- Development: `http://localhost:3000/api/docs`
- Production: `https://your-domain.com/api/docs`

## Authentication

All API endpoints require authentication via:
- Bearer token in `Authorization` header
- API key in `x-api-key` header (for programmatic access)

## Rate Limits

- **Standard endpoints**: 100 requests/minute per user
- **Registry endpoints**: 20 requests/minute per user (due to validation complexity)
- **Execution endpoints**: 10 concurrent executions per user

## Support

- GitHub Issues: [Report bugs and feature requests](https://github.com/your-org/sim/issues)
- Documentation: This directory and inline API docs
- Community: [Discord/Slack channel]