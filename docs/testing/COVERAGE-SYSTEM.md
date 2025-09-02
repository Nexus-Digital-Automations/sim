# 📊 Test Coverage System & CI/CD Integration

Comprehensive guide to the test coverage reporting system, quality gates, and CI/CD integration for the Sim project.

## 🎯 Overview

The Sim project implements a robust test coverage system that ensures code quality through:

- **Automated coverage reporting** with detailed metrics
- **Quality gates** that enforce coverage thresholds  
- **CI/CD integration** with GitHub Actions
- **Visual dashboards** and trend analysis
- **Coverage badges** for real-time status

## 📈 Coverage Targets & Quality Standards

### Coverage Thresholds

| Component Type | Minimum Coverage | Target Coverage |
|----------------|------------------|-----------------|
| **UI Components** | 95% | 98% |
| **Authentication** | 90% | 95% |
| **API Endpoints** | 85% | 90% |
| **Business Logic** | 80% | 85% |
| **Utilities** | 80% | 85% |
| **Overall Project** | 80% | 85% |

### Quality Gate Criteria

✅ **PASS Criteria:**
- Overall coverage ≥ 80%
- Critical components ≥ 95%
- No failing tests
- Build succeeds
- Linting passes

❌ **FAIL Criteria:**
- Overall coverage < 80%
- Any test failures
- Build failures
- Linting errors

## 🛠️ Configuration

### Vitest Configuration (`apps/sim/vitest.config.ts`)

The coverage system is configured with:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'clover', 'lcov'],
  reportsDirectory: './coverage',
  
  // Coverage thresholds by component type
  thresholds: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    'components/ui/*.{ts,tsx}': { branches: 95, functions: 95, lines: 95, statements: 95 },
    'lib/auth*.{ts,tsx}': { branches: 90, functions: 90, lines: 90, statements: 90 },
    'app/api/**/*.{ts,tsx}': { branches: 85, functions: 85, lines: 85, statements: 85 }
  },
  
  // Include all source files for comprehensive reporting
  all: true,
  include: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    // ... other source directories
  ]
}
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `COVERAGE_THRESHOLD` | Minimum overall coverage | 80 |
| `CRITICAL_COVERAGE_THRESHOLD` | Minimum for critical components | 95 |
| `CI` | Enables CI-specific reporting | false |
| `NODE_ENV` | Environment mode | development |

## 🚀 Usage

### Local Development

```bash
# Run tests with coverage
bun run test:coverage

# Generate coverage report with dashboard
bun run test:coverage:report

# Watch mode with coverage
bun run test:coverage:watch

# Full dashboard with trends
bun run test:coverage:dashboard
```

### CI/CD Commands

```bash
# CI-optimized coverage run
bun run test:coverage:ci

# Generate coverage badge
node scripts/coverage-dashboard.js --badge

# Analyze coverage trends
node scripts/coverage-dashboard.js --trend
```

## 🔄 CI/CD Integration

### GitHub Actions Workflows

#### 1. **Continuous Integration** (`.github/workflows/ci.yml`)

Runs on every push and PR:

```yaml
- name: Run tests with coverage
  run: bun run test:coverage

- name: Coverage analysis and quality gates
  run: |
    # Analyze coverage metrics
    # Enforce 80% minimum threshold
    # Generate summary reports
```

#### 2. **Test Coverage & Quality Gates** (`.github/workflows/test-coverage.yml`)

Comprehensive coverage analysis on PRs to main:

```yaml
jobs:
  - quality-gates: Code quality, linting, type checking
  - test-coverage: Comprehensive coverage analysis with quality gates
  - performance-tests: Test execution performance monitoring
  - security-scan: Security vulnerability scanning
  - deployment-gate: Final approval for deployment
```

### Coverage Reporting Flow

1. **Test Execution**: Vitest runs tests with V8 coverage provider
2. **Data Collection**: Coverage metrics collected from all source files
3. **Analysis**: Coverage dashboard script processes metrics
4. **Quality Gates**: Thresholds enforced, CI fails if below limits
5. **Artifacts**: Reports uploaded to GitHub Actions artifacts
6. **Notifications**: PR comments with coverage status

## 📊 Coverage Dashboard

### Features

The coverage dashboard (`scripts/coverage-dashboard.js`) provides:

- **📈 Real-time metrics** - Lines, functions, statements, branches coverage
- **🎯 Quality gate status** - Pass/fail indicators with thresholds
- **📁 File breakdown** - Per-file coverage analysis
- **📛 Badge generation** - SVG badges for README display
- **📊 Trend analysis** - Historical coverage data tracking
- **🎨 HTML reports** - Beautiful, detailed coverage reports

### Dashboard Options

```bash
# Generate all reports (default)
node scripts/coverage-dashboard.js

# Generate only coverage badge
node scripts/coverage-dashboard.js --badge

# Generate HTML report
node scripts/coverage-dashboard.js --report

# Analyze and save trends
node scripts/coverage-dashboard.js --trend

# Combined options
node scripts/coverage-dashboard.js --report --badge --trend
```

### Output Files

- `coverage/index.html` - Interactive coverage report
- `coverage-reports/coverage-report.html` - Enhanced dashboard
- `apps/sim/public/badges/coverage.svg` - Coverage badge
- `coverage-reports/coverage-trend.json` - Historical data

## 📋 Quality Gate Enforcement

### Local Enforcement

Quality gates are enforced locally through:

```bash
# Pre-commit hooks
bun run test:coverage  # Must pass for commits

# Pre-push hooks  
bun run test:coverage:report  # Generates reports before push
```

### CI/CD Enforcement

In CI/CD, quality gates:

1. **Block deployments** if coverage below threshold
2. **Fail PR checks** preventing merge
3. **Generate detailed reports** for investigation
4. **Post PR comments** with coverage analysis

### Override Procedures

For emergency deployments when quality gates fail:

1. **Document justification** in PR description
2. **Create follow-up issues** to address coverage
3. **Manual approval** required from maintainers
4. **Temporary threshold adjustment** (rare cases)

## 🔍 Monitoring & Alerts

### Coverage Regression Detection

The system automatically detects:

- **Coverage drops** below previous levels
- **New uncovered code** in critical paths
- **Test failures** affecting coverage
- **Performance degradation** in test execution

### Alerting

Coverage alerts are sent via:

- **GitHub PR comments** for coverage status
- **Slack notifications** (if configured)
- **Email alerts** for critical failures
- **Dashboard indicators** in coverage reports

## 📈 Trend Analysis

### Historical Tracking

Coverage trends are tracked over time:

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "overall": 85.2,
  "lines": 87.1,
  "functions": 84.3,
  "statements": 86.8,
  "branches": 82.6,
  "filesAnalyzed": 247
}
```

### Trend Metrics

- **Coverage evolution** over commits
- **Component-level trends** for specific areas
- **Performance metrics** (test execution time)
- **Quality improvements** over releases

## 🎨 Coverage Badge

The coverage badge displays real-time coverage status:

![Coverage Badge](../apps/sim/public/badges/coverage.svg)

### Badge Colors

| Coverage | Color | Status |
|----------|-------|---------|
| 95%+ | ![#4c1](https://via.placeholder.com/15/4c1/000000?text=+) | Excellent |
| 85-94% | ![#97CA00](https://via.placeholder.com/15/97CA00/000000?text=+) | Good |
| 80-84% | ![#dfb317](https://via.placeholder.com/15/dfb317/000000?text=+) | Acceptable |
| 60-79% | ![#fe7d37](https://via.placeholder.com/15/fe7d37/000000?text=+) | Poor |
| <60% | ![#e05d44](https://via.placeholder.com/15/e05d44/000000?text=+) | Failing |

## 🛡️ Security Considerations

### Coverage Data Security

- **No sensitive data** in coverage reports
- **Sanitized file paths** in public reports
- **Access controls** on detailed coverage data
- **Secure artifact storage** in CI/CD

### CI/CD Security

- **Encrypted secrets** for external services
- **Limited permissions** for coverage jobs
- **Audit trails** for quality gate overrides
- **Secure token handling** for badge generation

## 🔧 Troubleshooting

### Common Issues

#### Coverage Not Generated

```bash
# Check vitest configuration
cd apps/sim
bun run test:coverage

# Verify coverage directory exists
ls -la coverage/

# Check file permissions
chmod +r coverage/coverage-final.json
```

#### Quality Gates Failing

```bash
# Check current coverage
node scripts/coverage-dashboard.js

# Identify uncovered files
cat coverage/coverage-final.json | jq '.[] | select(.lines.total > 0 and .lines.covered == 0)'

# Run specific test files
bun test components/ui/button.test.tsx
```

#### CI/CD Issues

```bash
# Check workflow logs
gh run list --workflow=ci.yml

# Review coverage artifacts
gh run download [RUN_ID] --name coverage-reports

# Validate configuration
yamllint .github/workflows/ci.yml
```

### Performance Optimization

If coverage collection is slow:

1. **Exclude unnecessary files** in vitest config
2. **Use coverage include patterns** instead of exclude
3. **Optimize test parallelization** settings
4. **Cache coverage data** between runs

## 📚 Best Practices

### Writing Testable Code

- **Keep functions small** and focused
- **Minimize dependencies** for easier mocking
- **Use dependency injection** where appropriate
- **Separate business logic** from UI components

### Test Coverage Strategy

- **Focus on critical paths** first
- **Test edge cases** and error scenarios
- **Include integration tests** for workflows
- **Mock external dependencies** appropriately

### Maintaining Coverage

- **Regular coverage reviews** in PR process
- **Automated coverage trending** analysis
- **Proactive test updates** with code changes
- **Coverage debt tracking** for technical debt

## 🎯 Future Enhancements

### Planned Features

- **Code coverage heatmaps** in IDE integration
- **Intelligent test suggestions** based on code changes
- **Coverage-based test prioritization** in CI
- **Advanced trend analytics** with predictions

### Integration Roadmap

- **SonarQube integration** for quality gates
- **Codecov integration** for external reporting
- **IDE plugins** for real-time coverage
- **Slack/Teams notifications** for coverage updates

---

## 📞 Support

For coverage system support:

1. **Check this documentation** for common solutions
2. **Review workflow logs** in GitHub Actions
3. **Open GitHub issues** for bugs or feature requests
4. **Contact maintainers** for urgent coverage problems

**Maintainers:** Development Team  
**Last Updated:** January 2025  
**Version:** 1.0.0