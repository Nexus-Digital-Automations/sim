# Parlant Database Testing Suite

Comprehensive testing infrastructure for validating Parlant database integration with the existing Sim platform.

## Overview

This testing suite provides complete validation coverage for the Parlant database extension, ensuring seamless integration with existing Sim functionality while maintaining data integrity, performance, and compatibility.

## Test Suite Components

### 1. Migration Tests (`migration.test.ts`)
**Purpose**: Validates database schema migrations and rollback procedures

**Coverage**:
- Schema structure validation
- Foreign key constraint verification
- Index creation and optimization
- Data type compatibility
- Migration rollback procedures
- Cross-schema relationship validation

**Key Features**:
- Automated migration up/down testing
- Constraint validation
- Performance impact assessment
- Data integrity checks

### 2. Integration Tests (`integration.test.ts`)
**Purpose**: Tests complete Parlant functionality workflows

**Coverage**:
- Agent lifecycle management
- Session and conversation handling
- Journey execution and state transitions
- Tool integration and execution
- Variable management across scopes
- Complex multi-table operations

**Key Features**:
- End-to-end workflow testing
- Business logic validation
- Multi-tenant workspace isolation
- Realistic scenario simulation

### 3. Performance Tests (`performance.test.ts`)
**Purpose**: Validates system performance under various load conditions

**Coverage**:
- Bulk operation performance
- Query optimization validation
- Memory usage monitoring
- Concurrent access patterns
- Scalability benchmarks
- Response time thresholds

**Key Features**:
- Configurable load testing
- Performance metric collection
- Bottleneck identification
- Scalability analysis

### 4. Sim Compatibility Tests (`sim-compatibility.test.ts`)
**Purpose**: Ensures existing Sim functionality remains operational

**Coverage**:
- Core Sim operations validation
- Database table accessibility
- Cross-system integration points
- Data format compatibility
- API endpoint functionality
- User workflow preservation

**Key Features**:
- Comprehensive Sim operation testing
- Non-interference validation
- Backward compatibility assurance

### 5. Concurrent Access Tests (`concurrent.test.ts`)
**Purpose**: Tests system behavior under concurrent access conditions

**Coverage**:
- Multi-user concurrent operations
- Transaction isolation and consistency
- Race condition prevention
- Deadlock detection and recovery
- Resource contention handling
- Data consistency under load

**Key Features**:
- Concurrent operation simulation
- Transaction boundary testing
- Consistency verification
- Error handling validation

### 6. Automated Compatibility Checks (`compatibility-checks.test.ts`)
**Purpose**: Provides ongoing automated compatibility validation

**Coverage**:
- Schema compatibility monitoring
- Data type compatibility verification
- Transaction behavior validation
- Query performance analysis
- System health checks

**Key Features**:
- Automated report generation
- Compatibility scoring
- Issue identification and recommendations
- Performance monitoring

### 7. Data Seeding Utilities (`seed-data.ts`)
**Purpose**: Provides realistic test data generation

**Features**:
- Comprehensive test data creation
- Realistic conversation scenarios
- Multi-tenant data separation
- Configurable data volumes
- Automated cleanup procedures

## Test Runner (`run-all-tests.ts`)

Orchestrates the entire test suite with flexible execution options.

### Usage

```bash
# Run all tests sequentially (recommended for development)
bun run __tests__/parlant/run-all-tests.ts

# Run tests in parallel (faster execution)
bun run __tests__/parlant/run-all-tests.ts --parallel

# Run only critical tests (essential compatibility checks)
bun run __tests__/parlant/run-all-tests.ts --critical-only

# Verbose output with detailed results
bun run __tests__/parlant/run-all-tests.ts --verbose
```

### Options

- `--parallel`: Execute tests concurrently for faster completion
- `--critical-only`: Run only essential compatibility tests
- `--verbose`: Show detailed output and continue on failures
- `--help`: Display usage information

## Test Categories

### Critical Tests (Must Pass)
- Migration Tests
- Integration Tests
- Sim Compatibility Tests
- Automated Compatibility Checks

### Performance Tests (Advisory)
- Performance Tests
- Concurrent Access Tests

## Environment Setup

### Prerequisites

```bash
# Install dependencies
bun install

# Ensure database connection is available
export POSTGRES_URL="your_database_connection_string"
# OR
export DATABASE_URL="your_database_connection_string"
```

### Test Database

Tests require a dedicated test database to avoid affecting production data. Configure a separate database instance for testing:

```bash
# Example test database setup
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/sim_test"
```

## Running Individual Tests

Each test file can be run independently using Vitest:

```bash
# Run specific test suite
bunx vitest run __tests__/parlant/migration.test.ts

# Run with watch mode for development
bunx vitest __tests__/parlant/integration.test.ts

# Run with coverage
bunx vitest run --coverage __tests__/parlant/performance.test.ts
```

## Test Configuration

### Vitest Configuration

Tests use the existing Vitest configuration in `vitest.config.ts` with:
- Node.js environment for database access
- Database aliases configured (`@sim/db`)
- Extended timeout for long-running tests
- Coverage reporting enabled

### Database Aliases

Tests use the `@sim/db` alias configured in `vitest.config.ts`:

```typescript
alias: {
  '@sim/db': resolve(__dirname, '../../packages/db'),
}
```

## Test Data Management

### Cleanup Strategy

All tests implement proper cleanup procedures:
- `beforeEach`: Clean test data before each test
- `afterEach`: Clean test data after each test
- Workspace-scoped isolation
- Automatic rollback on failures

### Data Seeding

The `ParlantTestDataSeeder` class provides:
- Realistic test data generation
- Configurable data volumes
- Relationship management
- Automated cleanup

Example usage:

```typescript
const seeder = new ParlantTestDataSeeder(db)
await seeder.seedFoundationalData(workspaceId)
const agent = await seeder.createTestAgent(workspaceId, 'customer_support')
await seeder.cleanup(workspaceId)
```

## Monitoring and Reporting

### Test Reports

The test runner generates comprehensive reports including:
- Test execution summary
- Performance metrics
- Compatibility analysis
- Recommendations for improvements
- Environment information

### Continuous Integration

For CI/CD integration:

```yaml
# Example GitHub Actions step
- name: Run Parlant Tests
  run: |
    bun run __tests__/parlant/run-all-tests.ts --critical-only
```

### Performance Monitoring

Key performance metrics tracked:
- Query execution times
- Memory usage patterns
- Concurrent operation throughput
- Database connection utilization
- Transaction success rates

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```
   Error: Missing POSTGRES_URL or DATABASE_URL environment variable
   ```
   Solution: Set the appropriate database environment variable

2. **Import Resolution Issues**
   ```
   Error: Cannot find package 'drizzle-orm'
   ```
   Solution: Run `bun install` to install dependencies

3. **Test Timeout Errors**
   ```
   Error: Test timeout exceeded
   ```
   Solution: Increase timeout in test configuration or optimize database performance

4. **Schema Compatibility Issues**
   ```
   Error: Table does not exist
   ```
   Solution: Run database migrations or check schema setup

### Debug Mode

Enable verbose logging for debugging:

```bash
# Run with detailed output
bun run __tests__/parlant/run-all-tests.ts --verbose

# Run specific test with debug info
DEBUG=* bunx vitest run __tests__/parlant/integration.test.ts
```

## Best Practices

### Test Writing Guidelines

1. **Use descriptive test names** that clearly indicate what is being tested
2. **Implement proper cleanup** in beforeEach and afterEach hooks
3. **Use workspace-scoped isolation** to prevent test interference
4. **Test both success and failure scenarios**
5. **Include performance assertions** for critical operations
6. **Document complex test scenarios** with inline comments

### Performance Considerations

1. **Use transactions** for multi-operation tests
2. **Implement proper indexing** for test queries
3. **Monitor memory usage** in long-running tests
4. **Use connection pooling** appropriately
5. **Clean up test data** promptly

### Security Considerations

1. **Never use production data** in tests
2. **Use test-specific database** instances
3. **Implement proper data isolation** between tests
4. **Avoid hardcoded credentials** in test files
5. **Clean up sensitive test data** thoroughly

## Contributing

When adding new tests:

1. Follow existing patterns and naming conventions
2. Add tests to appropriate categories (critical vs advisory)
3. Update this README with new test descriptions
4. Include performance benchmarks where applicable
5. Ensure proper cleanup and isolation

## Integration Status

This testing suite validates:
- ✅ Database schema compatibility
- ✅ Data integrity preservation
- ✅ Performance benchmarks
- ✅ Concurrent access handling
- ✅ Transaction consistency
- ✅ Sim functionality preservation
- ✅ Multi-tenant isolation
- ✅ Error handling robustness

## Next Steps

1. **CI/CD Integration**: Add tests to automated deployment pipeline
2. **Production Monitoring**: Implement real-time compatibility monitoring
3. **Performance Baselines**: Establish performance benchmarks for regression detection
4. **Load Testing**: Extend performance tests with higher concurrency levels
5. **Documentation**: Keep test documentation updated with system changes