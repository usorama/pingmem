# Contributing to Claude Memory Intelligence

Thank you for your interest in contributing to Claude Memory Intelligence! This document provides guidelines and instructions for contributing to the project.

## 🎯 Ways to Contribute

There are many ways to contribute to Claude Memory Intelligence:

- 🐛 **Report bugs** and issues
- 💡 **Suggest new features** or improvements
- 📝 **Improve documentation**
- 🧪 **Write tests** to improve coverage
- 🔧 **Fix bugs** and implement features
- 🎨 **Create new project templates**
- 🌍 **Translate documentation** (i18n)
- 💬 **Help others** in discussions

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- Git
- npm or yarn
- Basic understanding of JavaScript/Node.js

### Development Setup

1. **Fork the repository**

   Click the "Fork" button on the [Claude Memory Intelligence repository](https://github.com/yourusername/pingmem)

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/pingmem.git
   cd pingmem
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/yourusername/pingmem.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Create a test project**

   ```bash
   cd ..
   mkdir test-project
   cd test-project
   node ../pingmem/core/scripts/init-memory.js
   ```

## 📋 Development Workflow

### 1. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions/changes
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments where needed
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Test in a sample project
cd ../test-project
node ../pingmem/core/scripts/init-memory.js
node .claude/scripts/health-check.js
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: Add amazing new feature"
```

Commit message format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

Examples:
```
feat(templates): Add Vue.js project template
fix(boundary-validator): Correct glob pattern matching
docs(readme): Update installation instructions
test(decision-query): Add tests for deprecation checking
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Select your feature branch
4. Fill out the PR template
5. Submit the PR

## 🧪 Testing Guidelines

### Writing Tests

Tests should be placed in the `tests/` directory:

```javascript
// tests/boundary-validator.test.js
const assert = require('assert');
const BoundaryValidator = require('../core/lib/boundary-validator');

describe('BoundaryValidator', () => {
  describe('validate()', () => {
    it('should block writes to protected paths', () => {
      const result = BoundaryValidator.validate(
        'src/protected-core/file.ts',
        'write'
      );
      assert.strictEqual(result.allowed, false);
      assert.match(result.reason, /protected/i);
    });

    it('should allow reads to protected paths', () => {
      const result = BoundaryValidator.validate(
        'src/protected-core/file.ts',
        'read'
      );
      assert.strictEqual(result.allowed, true);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/boundary-validator.test.js

# Run with coverage
npm test -- --coverage
```

### Test Coverage Goals

- Core libraries: >90%
- Scripts: >80%
- Hooks: >85%

## 📝 Documentation Guidelines

### Code Documentation

Use JSDoc comments for public APIs:

```javascript
/**
 * Validates a file operation against protected boundaries
 * @param {string} filePath - Absolute path to the file
 * @param {string} operation - Operation type (read, write, delete)
 * @returns {Object} Validation result with allowed and reason properties
 * @example
 * const result = BoundaryValidator.validate('/src/core/file.ts', 'write');
 * if (!result.allowed) {
 *   console.error(result.reason);
 * }
 */
function validate(filePath, operation) {
  // Implementation
}
```

### README Updates

When adding new features, update:
- Main README.md with feature description
- Relevant section documentation
- Quick Start guide if needed
- Template documentation if applicable

### Changelog

Add entries to CHANGELOG.md under "Unreleased":

```markdown
## [Unreleased]

### Added
- New Vue.js project template (#123)
- Support for Python type hints in codebase scanner (#124)

### Fixed
- Boundary validator now correctly handles symlinks (#125)

### Changed
- Updated decision query performance by 50% (#126)
```

## 🎨 Code Style

### JavaScript Style

- Use ES6+ features where appropriate
- Use `const` by default, `let` when needed, avoid `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring where it improves readability

Example:
```javascript
// Good
const { projectRoot, memoryDir } = config;
const decisionsPath = path.join(projectRoot, memoryDir, 'decisions');

// Not ideal
var decisionsPath = config.projectRoot + '/' + config.memoryDir + '/decisions';
```

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Private methods**: `_prefixWithUnderscore`
- **Files**: `kebab-case.js`

### File Structure

```javascript
// 1. Imports
const fs = require('fs');
const path = require('path');

// 2. Constants
const DEFAULT_TIMEOUT = 2000;
const MAX_RETRIES = 3;

// 3. Helper functions
function helperFunction() {
  // Implementation
}

// 4. Main exports
class MainClass {
  // Implementation
}

// 5. Module exports
module.exports = MainClass;
```

## 🏗️ Adding New Features

### Creating a New Template

1. Create template directory:
   ```bash
   mkdir -p templates/your-template
   ```

2. Create configuration file:
   ```bash
   touch templates/your-template/.memory-config.json
   ```

3. Create README:
   ```bash
   touch templates/your-template/README.md
   ```

4. Update template index:
   ```bash
   # Add entry to templates/README.md
   ```

5. Test with real project:
   ```bash
   cd ../test-your-framework-project
   cp ../pingmem/templates/your-template/.memory-config.json .
   node ../pingmem/core/scripts/init-memory.js
   ```

### Adding a New Script

1. Create script file:
   ```bash
   touch core/scripts/your-script.js
   ```

2. Add shebang and imports:
   ```javascript
   #!/usr/bin/env node

   const fs = require('fs');
   const path = require('path');
   ```

3. Add CLI argument parsing:
   ```javascript
   const args = process.argv.slice(2);
   const verbose = args.includes('--verbose');
   ```

4. Implement functionality

5. Add to package.json scripts:
   ```json
   {
     "scripts": {
       "your-command": "node core/scripts/your-script.js"
     }
   }
   ```

6. Document in README.md

### Adding a New Hook

1. Create hook file:
   ```bash
   touch core/hooks/your-hook.js
   ```

2. Load configuration:
   ```javascript
   const configLoader = require('../lib/config-loader');
   const config = configLoader.loadConfig();
   ```

3. Implement hook logic:
   ```javascript
   async function handleYourEvent(eventData) {
     // Implementation
   }

   module.exports = handleYourEvent;
   ```

4. Document hook behavior:
   - Add to HOOK-QUICK-REFERENCE.md
   - Update README.md
   - Add usage examples

## 🐛 Reporting Bugs

### Before Reporting

1. Check existing issues
2. Update to latest version
3. Test in a clean environment
4. Gather reproduction steps

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Run command '...'
2. See error '...'

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. macOS 12.0]
- Node.js version: [e.g. 16.14.0]
- Package version: [e.g. 1.0.0]

**Configuration:**
```json
{
  // Your .memory-config.json
}
```

**Additional context**
Any other context about the problem.
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Use cases**
Specific examples of how this feature would be used.

**Additional context**
Any other context or screenshots.
```

## 🏆 Recognition

Contributors will be recognized in:
- README.md acknowledgments section
- CONTRIBUTORS.md file (automatically generated)
- Release notes for their contributions

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age
- Body size
- Disability
- Ethnicity
- Gender identity and expression
- Level of experience
- Nationality
- Personal appearance
- Race
- Religion
- Sexual identity and orientation

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior:**
- Trolling, insulting/derogatory comments, personal or political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## 📞 Questions?

- **General questions**: [GitHub Discussions](https://github.com/yourusername/pingmem/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/yourusername/pingmem/issues)
- **Feature requests**: [GitHub Issues](https://github.com/yourusername/pingmem/issues)

## 📚 Resources

- [Main README](README.md)
- [Quick Start Guide](QUICK-START.md)
- [Core Documentation](core/README.md)
- [Template Guide](templates/README.md)
- [Hook Reference](HOOK-QUICK-REFERENCE.md)

---

Thank you for contributing to Claude Memory Intelligence! 🙏
