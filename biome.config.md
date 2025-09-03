# Biome Configuration Documentation

## Overview

This document explains the Biome configuration (`biome.json`) for the Sim AI platform. Biome is a fast toolchain for web projects that provides formatting, linting, and import organization.

## Configuration Structure

### Schema and VCS Integration

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0-beta.5/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": false }
}
```

- **$schema**: Provides IDE autocomplete and validation for the configuration
- **vcs.enabled**: Enables version control system integration for better diffs
- **vcs.clientKind**: Specifies Git as the version control system
- **vcs.useIgnoreFile**: Disabled to use explicit include/exclude patterns

### File Processing Rules

The `files` section defines which files Biome should process:

#### Included Patterns
- `"**"`: Process all files by default

#### Excluded Patterns
- Build outputs: `.next`, `out`, `dist`, `build`
- Dependencies: `node_modules`, `.bun`  
- Cache directories: `.cache`, `.turbo`
- Environment files: `.env*`
- Platform files: `.DS_Store`
- Deployment: `.vercel`
- Generated content: `coverage`, service workers, documentation source

### Formatter Configuration

```json
"formatter": {
  "enabled": true,
  "useEditorconfig": true,
  "formatWithErrors": false,
  "indentStyle": "space",
  "indentWidth": 2,
  "lineEnding": "lf",
  "lineWidth": 100,
  "attributePosition": "auto",
  "bracketSpacing": true
}
```

#### Key Settings
- **useEditorconfig**: Respects `.editorconfig` settings for consistency
- **formatWithErrors**: Disabled to prevent formatting files with syntax errors
- **lineWidth: 100**: Balances readability with modern screen sizes
- **indentWidth: 2**: Matches project-wide spacing standards
- **lineEnding: "lf"**: Unix-style line endings for cross-platform compatibility
- **bracketSpacing**: Adds spaces inside object braces for readability

### Import Organization

```json
"assist": {
  "actions": {
    "source": {
      "organizeImports": {
        "level": "on",
        "options": {
          "groups": [
            [":NODE:", "react", "react/**"],
            ":PACKAGE:",
            "@/components/**",
            "@/lib/**", 
            "@/app/**",
            ":ALIAS:",
            ":RELATIVE:"
          ]
        }
      }
    }
  }
}
```

#### Import Group Priority
1. **Node.js built-ins and React**: Core runtime dependencies
2. **External packages**: Third-party npm modules
3. **Internal modules**: Application-specific imports by domain
4. **Path aliases**: Custom path shortcuts
5. **Relative imports**: Local file imports

### Linting Rules

The linter configuration balances code quality with practical development needs:

#### Enabled Rule Categories
- **recommended**: Biome's recommended rule set
- **nursery.useSortedClasses**: Enforces consistent CSS class ordering
- **style rules**: Code style and consistency enforcement
- **performance rules**: Runtime performance optimizations

#### Strategically Disabled Rules

**Accessibility (a11y)**
- Most a11y rules disabled due to dynamic content and complex UI patterns
- Manual accessibility testing preferred for this application type

**Suspicious Patterns**
- `noExplicitAny`: Disabled to allow gradual TypeScript adoption
- `noArrayIndexKey`: Disabled for performance in large lists
- `noImplicitAnyLet`: Disabled for development flexibility

**Correctness**
- `useExhaustiveDependencies`: Disabled to avoid React Hook false positives
- `noUnusedVariables`: Disabled during active development

### Language-Specific Settings

#### JavaScript/TypeScript
```json
"javascript": {
  "formatter": {
    "jsxQuoteStyle": "single",
    "quoteProperties": "asNeeded", 
    "trailingCommas": "es5",
    "semicolons": "asNeeded",
    "arrowParentheses": "always"
  }
}
```

- **jsxQuoteStyle: "single"**: Consistent with JavaScript string quotes
- **trailingCommas: "es5"**: Compatible with older environments
- **semicolons: "asNeeded"**: Minimal semicolon usage (ASI-safe)
- **arrowParentheses: "always"**: Consistent function parameter formatting

#### CSS and JSON
- **indentWidth: 2**: Consistent with overall project formatting
- **enabled: true**: Full formatting support for stylesheets and configuration

## Performance Characteristics

### Why Biome Over Other Tools

1. **Speed**: 10-100x faster than ESLint + Prettier combinations
2. **Single Tool**: Replaces multiple tools (ESLint, Prettier, import sorters)
3. **Better Errors**: More actionable error messages and suggestions
4. **Memory Efficiency**: Lower memory usage in large codebases
5. **Consistency**: Single source of truth for code style decisions

### Integration Points

- **Pre-commit hooks**: Formats code before Git commits
- **CI/CD pipelines**: Validates formatting in automated builds
- **IDE integration**: Real-time formatting and linting feedback
- **Turbo tasks**: Integrated with monorepo build system

## Migration Notes

This configuration represents a migration from ESLint + Prettier to Biome:

- Rule adjustments made for existing codebase compatibility
- Gradual migration strategy with selective rule enforcement
- Maintains existing code style preferences while improving performance
- Preserves team workflow patterns and development practices

## Maintenance

### Regular Updates
- Monitor Biome releases for new rules and improvements
- Gradually enable additional rules as codebase quality improves
- Review disabled rules periodically for potential re-enablement
- Update schema reference for latest IDE support

### Team Coordination
- Document any rule changes in pull requests
- Coordinate formatting updates to minimize diff noise
- Provide migration guides for significant configuration changes
- Maintain consistent formatting across all team members