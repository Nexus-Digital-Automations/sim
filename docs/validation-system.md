# Automated Documentation Validation System

Comprehensive validation system for maintaining high-quality, accurate, and up-to-date documentation.

## 📋 Table of Contents

- [Validation Overview](#validation-overview)
- [Automated Checks](#automated-checks)
- [Quality Metrics](#quality-metrics)
- [Continuous Integration](#continuous-integration)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Implementation Guide](#implementation-guide)

## 🎯 Validation Overview

The documentation validation system ensures consistency, accuracy, and quality across all Sim platform documentation through automated checks, quality metrics, and continuous monitoring.

### Validation Goals

**Quality Assurance:**
- Consistent formatting and structure
- Accurate and current information
- Working code examples and links
- Accessible and inclusive content

**Automation Benefits:**
- Catch issues before they reach users
- Maintain standards across contributors
- Reduce manual review overhead
- Enable confident documentation updates

**Continuous Improvement:**
- Track documentation health over time
- Identify areas needing attention
- Monitor user engagement and satisfaction
- Optimize content based on analytics

## 🔍 Automated Checks

### Content Validation

**Markdown Linting:**
```yaml
# .markdownlint.json
{
  "MD001": true,  # Header levels increment by one
  "MD003": { "style": "atx" },  # Use # style headers
  "MD004": { "style": "dash" }, # Use - for unordered lists
  "MD007": { "indent": 2 },     # Unordered list indentation
  "MD009": { "br_spaces": 2 },  # Trailing spaces for line breaks
  "MD012": { "maximum": 1 },    # Multiple consecutive blank lines
  "MD013": false,  # Line length (disabled for flexibility)
  "MD025": true,   # Multiple top level headers in same doc
  "MD026": true,   # Trailing punctuation in headers
  "MD029": { "style": "ordered" }, # Ordered list item prefix
  "MD033": false,  # Allow inline HTML
  "MD041": true    # First line should be top level header
}
```

**Spell Checking:**
```javascript
// spell-check.config.js
module.exports = {
  files: ['docs/**/*.md'],
  dictionaries: ['en_US', 'technical-terms', 'sim-specific'],
  ignoreWords: [
    'API', 'GraphQL', 'TypeScript', 'JavaScript', 'PostgreSQL',
    'Docker', 'Kubernetes', 'webhook', 'OAuth', 'HTTPS',
    'sim', 'workflow', 'microservices', 'SaaS', 'DevOps'
  ],
  skipPatterns: [
    /```[\s\S]*?```/g,  // Code blocks
    /`[^`]*`/g,         // Inline code
    /https?:\/\/[^\s]*/g, // URLs
    /<[^>]*>/g          // HTML tags
  ]
};
```

### Link Validation

**Internal Link Checker:**
```javascript
// scripts/check-internal-links.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function checkInternalLinks() {
  const markdownFiles = glob.sync('docs/**/*.md');
  const issues = [];
  
  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const links = content.match(/\[([^\]]*)\]\(([^)]*)\)/g) || [];
    
    for (const link of links) {
      const [, , url] = link.match(/\[([^\]]*)\]\(([^)]*)\)/);
      
      if (url.startsWith('./') || url.startsWith('../')) {
        const targetPath = path.resolve(path.dirname(file), url);
        
        if (!fs.existsSync(targetPath)) {
          issues.push({
            file,
            link,
            target: targetPath,
            type: 'broken-internal-link'
          });
        }
      }
    }
  }
  
  return issues;
}
```

**External Link Validation:**
```javascript
// scripts/check-external-links.js
const axios = require('axios');
const cheerio = require('cheerio');

async function validateExternalLinks(urls) {
  const results = [];
  
  for (const url of urls) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Sim-Docs-Validator/1.0'
        }
      });
      
      results.push({
        url,
        status: response.status,
        valid: response.status < 400
      });
    } catch (error) {
      results.push({
        url,
        status: error.response?.status || 'ERROR',
        valid: false,
        error: error.message
      });
    }
  }
  
  return results;
}
```

### Code Example Validation

**TypeScript/JavaScript Validation:**
```javascript
// scripts/validate-code-examples.js
const ts = require('typescript');
const vm = require('vm');

function validateTypeScriptExample(code) {
  const program = ts.createProgram(['example.ts'], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
    noEmit: true
  }, {
    getSourceFile: (fileName) => {
      if (fileName === 'example.ts') {
        return ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2020);
      }
      return undefined;
    },
    writeFile: () => {},
    getCurrentDirectory: () => process.cwd(),
    getDirectories: () => [],
    fileExists: () => false,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n'
  });
  
  const diagnostics = ts.getPreEmitDiagnostics(program);
  return diagnostics.map(diagnostic => ({
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    line: diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start || 0).line,
    severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning'
  }));
}

function validateJavaScriptExample(code) {
  try {
    new vm.Script(code);
    return [];
  } catch (error) {
    return [{
      message: error.message,
      line: error.lineNumber,
      severity: 'error'
    }];
  }
}
```

**Shell Command Validation:**
```bash
#!/bin/bash
# scripts/validate-shell-commands.sh

# Extract shell commands from markdown files
grep -n -A 1000 '```bash' docs/**/*.md | 
grep -v '```' | 
while IFS=':' read -r file line command; do
    # Basic syntax checking
    if ! bash -n <<< "$command" 2>/dev/null; then
        echo "ERROR: Invalid bash syntax in $file:$line - $command"
    fi
    
    # Check for dangerous commands
    if echo "$command" | grep -E "(rm -rf|sudo|passwd|dd)" >/dev/null; then
        echo "WARNING: Potentially dangerous command in $file:$line - $command"
    fi
done
```

### Structure Validation

**Documentation Structure Check:**
```javascript
// scripts/validate-structure.js
const fs = require('fs');
const path = require('path');

const REQUIRED_STRUCTURE = {
  'docs/': {
    'README.md': 'required',
    'index.md': 'required',
    'contributing.md': 'required',
    'api/': {
      'README.md': 'required'
    },
    'architecture/': {
      'README.md': 'required'
    },
    'deployment/': {
      'README.md': 'required'
    },
    'development/': {
      'README.md': 'required'
    },
    'troubleshooting/': {
      'README.md': 'required'
    },
    'user/': {
      'README.md': 'required'
    },
    'testing/': {
      'README.md': 'optional'
    }
  }
};

function validateStructure(basePath, structure) {
  const issues = [];
  
  for (const [itemName, requirement] of Object.entries(structure)) {
    const itemPath = path.join(basePath, itemName);
    
    if (typeof requirement === 'string') {
      // File requirement
      if (requirement === 'required' && !fs.existsSync(itemPath)) {
        issues.push({
          type: 'missing-required-file',
          path: itemPath
        });
      }
    } else if (typeof requirement === 'object') {
      // Directory requirement
      if (!fs.existsSync(itemPath)) {
        issues.push({
          type: 'missing-directory',
          path: itemPath
        });
      } else {
        issues.push(...validateStructure(itemPath, requirement));
      }
    }
  }
  
  return issues;
}
```

## 📊 Quality Metrics

### Content Quality Metrics

**Readability Assessment:**
```javascript
// scripts/assess-readability.js
const textstat = require('textstat');

function assessReadability(content) {
  // Remove code blocks and markdown formatting
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/[#*_\[\]()]/g, '');
  
  return {
    fleschReading: textstat.fleschReadingEase(plainText),
    fleschKincaid: textstat.fleschKincaidGrade(plainText),
    gunningFog: textstat.gunningFog(plainText),
    smogIndex: textstat.smogIndex(plainText),
    automatedReadability: textstat.automatedReadabilityIndex(plainText)
  };
}

// Target scores for different document types
const READABILITY_TARGETS = {
  'user': { fleschReading: 70 }, // Fairly easy to read
  'development': { fleschReading: 60 }, // Standard
  'architecture': { fleschReading: 50 }, // Fairly difficult
  'api': { fleschReading: 55 } // Standard to fairly difficult
};
```

**Content Completeness Check:**
```javascript
// scripts/check-completeness.js
const REQUIRED_SECTIONS = {
  'user': [
    'getting-started',
    'creating-workflows',
    'using-templates',
    'troubleshooting',
    'examples'
  ],
  'development': [
    'environment-setup',
    'coding-standards',
    'testing-guidelines',
    'contributing-process',
    'examples'
  ],
  'api': [
    'authentication',
    'endpoints',
    'examples',
    'error-handling',
    'rate-limits'
  ]
};

function checkCompleteness(filePath, content) {
  const documentType = path.dirname(filePath).split('/').pop();
  const requiredSections = REQUIRED_SECTIONS[documentType] || [];
  
  const issues = [];
  for (const section of requiredSections) {
    const sectionPattern = new RegExp(`##.*${section}`, 'i');
    if (!sectionPattern.test(content)) {
      issues.push({
        type: 'missing-section',
        file: filePath,
        section
      });
    }
  }
  
  return issues;
}
```

### Maintenance Health Metrics

**Staleness Detection:**
```javascript
// scripts/detect-stale-content.js
const git = require('simple-git')();

async function detectStaleContent() {
  const files = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD', 'docs/']);
  const fileList = files.split('\n').filter(f => f.endsWith('.md'));
  
  const staleFiles = [];
  
  for (const file of fileList) {
    const lastModified = await git.raw(['log', '-1', '--format=%ct', file]);
    const daysSinceModified = (Date.now() - parseInt(lastModified) * 1000) / (1000 * 60 * 60 * 24);
    
    // Consider files stale if not modified in 90 days
    if (daysSinceModified > 90) {
      staleFiles.push({
        file,
        daysSinceModified: Math.round(daysSinceModified),
        priority: daysSinceModified > 180 ? 'high' : 'medium'
      });
    }
  }
  
  return staleFiles;
}
```

**Version Synchronization Check:**
```javascript
// scripts/check-version-sync.js
const packageJson = require('../package.json');

function checkVersionSync() {
  const issues = [];
  const currentVersion = packageJson.version;
  
  // Check if API documentation mentions correct version
  const apiDocs = fs.readFileSync('docs/api/README.md', 'utf8');
  if (!apiDocs.includes(`API Version**: v${currentVersion}`)) {
    issues.push({
      type: 'version-mismatch',
      file: 'docs/api/README.md',
      expected: currentVersion
    });
  }
  
  // Check other version references
  const versionPattern = /version[:\s]+v?(\d+\.\d+\.\d+)/gi;
  const files = glob.sync('docs/**/*.md');
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(versionPattern);
    
    for (const match of matches) {
      if (match[1] !== currentVersion) {
        issues.push({
          type: 'outdated-version',
          file,
          found: match[1],
          expected: currentVersion
        });
      }
    }
  }
  
  return issues;
}
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

**Documentation CI Pipeline:**
```yaml
# .github/workflows/docs-validation.yml
name: Documentation Validation

on:
  push:
    paths:
      - 'docs/**'
  pull_request:
    paths:
      - 'docs/**'

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Markdown linting
        run: |
          npx markdownlint docs/**/*.md
          echo "✅ Markdown linting passed"
      
      - name: Spell checking
        run: |
          npm run docs:spell-check
          echo "✅ Spell checking passed"
      
      - name: Link validation
        run: |
          npm run docs:check-links
          echo "✅ Link validation passed"
      
      - name: Code example validation
        run: |
          npm run docs:validate-code
          echo "✅ Code examples validated"
      
      - name: Structure validation
        run: |
          npm run docs:validate-structure
          echo "✅ Documentation structure validated"
      
      - name: Build documentation
        run: |
          npm run docs:build
          echo "✅ Documentation builds successfully"
      
      - name: Generate validation report
        run: |
          npm run docs:generate-report > validation-report.md
          echo "✅ Validation report generated"
      
      - name: Upload validation report
        uses: actions/upload-artifact@v4
        with:
          name: validation-report
          path: validation-report.md

  accessibility-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build and serve docs
        run: |
          npm ci
          npm run docs:build
          npm run docs:serve &
          sleep 10
      
      - name: Run accessibility tests
        run: |
          npx @axe-core/cli http://localhost:3000/docs --exit
          echo "✅ Accessibility tests passed"

  performance-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.js'
          urls: |
            http://localhost:3000/docs
            http://localhost:3000/docs/api
            http://localhost:3000/docs/user
          uploadArtifacts: true
```

### Pre-commit Hooks

**Git Hooks Setup:**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "docs/**/*.md": [
      "markdownlint --fix",
      "npm run docs:spell-check",
      "npm run docs:validate-links-staged",
      "git add"
    ]
  }
}
```

### Automated Reporting

**Daily Health Check:**
```javascript
// scripts/daily-health-check.js
const { generateReport } = require('./validation-utils');

async function runDailyHealthCheck() {
  const report = await generateReport({
    checkLinks: true,
    checkSpelling: true,
    checkStructure: true,
    checkStaleness: true,
    checkVersions: true
  });
  
  // Send report to team channel
  if (report.issues.length > 0) {
    await sendSlackNotification({
      channel: '#docs-health',
      message: `📊 Daily Documentation Health Check\n\n${formatReport(report)}`,
      severity: report.criticalIssues.length > 0 ? 'error' : 'warning'
    });
  }
  
  // Update dashboard metrics
  await updateHealthDashboard(report);
}

// Run via GitHub Actions cron job
if (require.main === module) {
  runDailyHealthCheck().catch(console.error);
}
```

## 📈 Monitoring and Alerts

### Health Dashboard

**Documentation Metrics Dashboard:**
```javascript
// dashboard/docs-health.js
const metrics = {
  coverage: {
    totalFiles: 0,
    completeFiles: 0,
    percentage: 0
  },
  quality: {
    averageReadability: 0,
    linkHealth: 0,
    codeExampleHealth: 0
  },
  maintenance: {
    staleFiles: 0,
    outdatedVersions: 0,
    brokenLinks: 0
  },
  engagement: {
    pageViews: 0,
    searchQueries: 0,
    feedbackScore: 0
  }
};

function updateMetrics(validationResults) {
  // Update coverage metrics
  metrics.coverage.totalFiles = validationResults.files.length;
  metrics.coverage.completeFiles = validationResults.files.filter(f => f.complete).length;
  metrics.coverage.percentage = (metrics.coverage.completeFiles / metrics.coverage.totalFiles) * 100;
  
  // Update quality metrics
  metrics.quality.averageReadability = validationResults.averageReadability;
  metrics.quality.linkHealth = ((validationResults.totalLinks - validationResults.brokenLinks) / validationResults.totalLinks) * 100;
  metrics.quality.codeExampleHealth = ((validationResults.totalCodeExamples - validationResults.brokenCodeExamples) / validationResults.totalCodeExamples) * 100;
  
  // Update maintenance metrics
  metrics.maintenance.staleFiles = validationResults.staleFiles.length;
  metrics.maintenance.outdatedVersions = validationResults.versionMismatches.length;
  metrics.maintenance.brokenLinks = validationResults.brokenLinks;
}
```

### Alert System

**Critical Issue Alerts:**
```javascript
// alerts/critical-alerts.js
const CRITICAL_THRESHOLDS = {
  brokenLinksPercent: 5,      // > 5% broken links
  staleFilesPercent: 20,      // > 20% files stale
  readabilityScore: 40,       // < 40 average readability
  buildFailures: 1,           // Any build failures
  accessibilityErrors: 0      // Zero tolerance for a11y errors
};

function checkCriticalIssues(metrics) {
  const alerts = [];
  
  if (metrics.brokenLinksPercent > CRITICAL_THRESHOLDS.brokenLinksPercent) {
    alerts.push({
      type: 'critical',
      category: 'links',
      message: `${metrics.brokenLinksPercent}% of links are broken`,
      action: 'Fix broken links immediately'
    });
  }
  
  if (metrics.staleFilesPercent > CRITICAL_THRESHOLDS.staleFilesPercent) {
    alerts.push({
      type: 'warning',
      category: 'maintenance',
      message: `${metrics.staleFilesPercent}% of files are stale`,
      action: 'Review and update stale documentation'
    });
  }
  
  return alerts;
}
```

## 🛠️ Implementation Guide

### Setup Instructions

**1. Install Dependencies:**
```bash
# Core validation tools
npm install --save-dev markdownlint-cli textstat axios cheerio typescript

# Git hooks and automation
npm install --save-dev husky lint-staged

# Testing and accessibility
npm install --save-dev @axe-core/cli lighthouse-ci

# Reporting and monitoring
npm install --save-dev slack-webhook prometheus-client
```

**2. Configure package.json Scripts:**
```json
{
  "scripts": {
    "docs:dev": "next dev docs",
    "docs:build": "next build docs",
    "docs:lint": "markdownlint docs/**/*.md",
    "docs:lint:fix": "markdownlint --fix docs/**/*.md",
    "docs:spell-check": "node scripts/spell-check.js",
    "docs:check-links": "node scripts/check-links.js",
    "docs:validate-code": "node scripts/validate-code.js",
    "docs:validate-structure": "node scripts/validate-structure.js",
    "docs:health-check": "node scripts/health-check.js",
    "docs:generate-report": "node scripts/generate-report.js",
    "docs:validate-all": "npm run docs:lint && npm run docs:spell-check && npm run docs:check-links && npm run docs:validate-code"
  }
}
```

**3. Set Up GitHub Actions:**
- Copy the workflow files to `.github/workflows/`
- Configure secrets for Slack notifications
- Set up branch protection rules requiring validation

**4. Configure Monitoring:**
- Set up health check dashboard
- Configure alert notifications
- Schedule regular health checks

### Usage Examples

**Run Full Validation:**
```bash
# Run all validation checks
npm run docs:validate-all

# Generate comprehensive report
npm run docs:generate-report

# Check specific aspects
npm run docs:check-links
npm run docs:validate-code
npm run docs:health-check
```

**Fix Common Issues:**
```bash
# Auto-fix markdown formatting
npm run docs:lint:fix

# Check for stale content
node scripts/detect-stale-content.js

# Validate version synchronization
node scripts/check-version-sync.js
```

### Customization Options

**Adjust Validation Rules:**
- Modify `.markdownlint.json` for formatting rules
- Update `READABILITY_TARGETS` for different standards
- Customize `CRITICAL_THRESHOLDS` for alerts

**Add Custom Checks:**
- Create new validation scripts
- Add to GitHub Actions workflow
- Include in daily health check

**Configure Reporting:**
- Set up custom dashboard
- Configure notification channels
- Adjust reporting frequency

---

**The validation system ensures documentation remains high-quality, accurate, and valuable to all users of the Sim platform.**

---

**Last Updated**: 2025-09-04 | **Version**: 1.0 | **Maintained by**: Documentation Team