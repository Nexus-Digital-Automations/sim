# Turbo Configuration Documentation

## Overview

This document explains the Turbo configuration (`turbo.json`) for the Sim AI platform monorepo. Turbo is a high-performance build system that optimizes task execution through intelligent caching and parallelization.

## Configuration Structure

### Schema and Environment Variables

```json
{
  "$schema": "https://turbo.build/schema.json",
  "envMode": "loose"
}
```

- **$schema**: Enables IDE autocomplete and validation for Turbo configuration
- **envMode: "loose"**: Allows environment variables to be passed to tasks without explicit declaration, providing development flexibility

### Task Pipeline Configuration

The `tasks` object defines build tasks, their dependencies, caching behavior, and outputs. This optimizes monorepo builds through intelligent caching and parallelization.

#### Key Concepts

- **dependsOn**: Task execution dependencies (`^build` means upstream workspaces must build first)
- **inputs**: Files that affect task output (used for cache invalidation)
- **outputs**: Generated files/directories (cached and restored between builds)
- **cache**: Whether task results should be cached (`false` for dev servers)
- **persistent**: Long-running tasks (dev servers, watchers)

### Task Definitions

#### Build Task
```json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**", "dist/**"]
}
```

**Purpose**: Compiles applications for production deployment
- **dependsOn**: Waits for upstream workspace builds to complete
- **inputs**: Includes environment files in cache key for proper invalidation
- **outputs**: Caches build outputs while excluding runtime cache directories

#### Development Server Task
```json
"dev": {
  "persistent": true,
  "cache": false
}
```

**Purpose**: Long-running development server with hot reloading
- **persistent**: Marks as long-running process (dev server)
- **cache**: Disabled due to real-time nature and continuous updates

#### Production Start Task
```json
"start": {
  "cache": false
}
```

**Purpose**: Starts production build server
- **cache**: Disabled as it's a runtime operation, not a build step

#### Test Execution Task
```json
"test": {
  "dependsOn": ["^build"],
  "outputs": []
}
```

**Purpose**: Runs test suites after dependencies are built
- **dependsOn**: Ensures dependencies are built before testing
- **outputs**: Empty array - test results not cached (always run fresh)

#### Code Formatting Task
```json
"format": {
  "outputs": []
}
```

**Purpose**: Applies consistent code formatting across codebase
- **outputs**: Empty - formatting modifies source files in place

#### Format Validation Task
```json
"format:check": {
  "outputs": []
}
```

**Purpose**: Checks code formatting without making changes
- Used in CI/CD to ensure code style compliance
- **outputs**: Empty - check operation produces no output files

#### Linting Task
```json
"lint": {
  "outputs": []
}
```

**Purpose**: Static code analysis for code quality and standards
- **outputs**: Empty - linting reports to console, no files generated

#### Type Checking Task
```json
"type-check": {
  "outputs": []
}
```

**Purpose**: TypeScript type validation across the monorepo
- **outputs**: Empty - type checking reports to console, no files generated

## Performance Benefits

### Intelligent Caching
- **Content-based hashing**: Only rebuilds when actual inputs change
- **Shared cache**: Team members share build artifacts
- **Remote caching**: Optional cloud-based cache for CI/CD acceleration

### Parallel Execution
- **Dependency graph**: Builds tasks in optimal order
- **CPU utilization**: Maximizes available cores for concurrent tasks
- **Pipeline optimization**: Overlaps dependent task execution when possible

### Incremental Builds
- **Change detection**: Only processes modified parts of the monorepo
- **Selective execution**: Skips unchanged workspaces entirely
- **Dependency propagation**: Efficiently handles downstream effects

## Development Workflow

### Common Commands
```bash
# Build all applications
turbo run build

# Run development servers
turbo run dev

# Execute tests across monorepo
turbo run test

# Format all code
turbo run format

# Validate formatting
turbo run format:check

# Lint all code
turbo run lint

# Type check all TypeScript
turbo run type-check
```

### Workspace Filtering
```bash
# Build specific workspace
turbo run build --filter=sim

# Run tests for specific scope
turbo run test --filter=@sim/*

# Development server for single app
turbo run dev --filter=docs
```

## CI/CD Integration

### Pipeline Optimization
- **Parallel task execution**: Multiple tasks run simultaneously when possible
- **Cache utilization**: Restores previous build artifacts when inputs unchanged
- **Early termination**: Stops pipeline on first failure for faster feedback

### Environment Configuration
- **Environment variable passing**: Loose mode allows flexible env var usage
- **Build reproducibility**: Consistent builds across different environments
- **Deployment preparation**: Optimized output structure for containerization

## Maintenance

### Cache Management
- **Cache invalidation**: Automatic based on input file changes
- **Cache pruning**: Regular cleanup of unused cache entries
- **Cache debugging**: Tools for understanding cache hits/misses

### Configuration Updates
- **Schema validation**: Automatic validation against Turbo schema
- **Performance monitoring**: Track task execution times and cache effectiveness
- **Team synchronization**: Coordinate configuration changes across team members

## Migration Notes

This configuration represents best practices for:
- Large-scale Next.js applications
- TypeScript monorepos
- High-performance development workflows
- Production deployment optimization

The task pipeline is designed to:
- Minimize build times through aggressive caching
- Ensure consistent code quality through automated checks
- Support both development and production workflows
- Scale efficiently as the monorepo grows