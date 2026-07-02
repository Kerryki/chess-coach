# Contributing to Chess Coach

First off, thank you for considering contributing to Chess Coach! It's people like you that make Chess Coach such a great tool.

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### For First-Time Contributors

1. **Fork the repository** - Click the "Fork" button on GitHub
2. **Clone your fork** - `git clone https://github.com/YOUR_USERNAME/chess-coach.git`
3. **Create a branch** - `git checkout -b feature/my-feature` (from `main`)
4. **Make changes** - See [Development Guide](../DEVELOPMENT.md)
5. **Commit** - Use [conventional commits](https://www.conventionalcommits.org/)
6. **Push** - `git push origin feature/my-feature`
7. **Open PR** - Create pull request on GitHub

### Development Setup

See [DEVELOPMENT.md](../DEVELOPMENT.md) for complete setup instructions.

Quick start:
```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

## How to Contribute

### Types of Contributions

We accept contributions for:

- **Bug Fixes** - Fix identified issues
- **Features** - New functionality
- **Documentation** - Improve guides and API docs
- **Tests** - Improve test coverage
- **Performance** - Optimize existing code
- **Security** - Report and fix security issues
- **Accessibility** - Improve a11y

### Reporting Bugs

**Before submitting a bug report:**
- Check existing issues (may already be reported)
- Check README and DEVELOPMENT guide (may be documented)
- Collect information about the bug:
  - Operating system and version
  - Browser and version
  - Node.js version
  - Steps to reproduce
  - Expected vs actual behavior
  - Error messages and stack traces

**When submitting:**
1. Create a new GitHub issue
2. Use bug report template
3. Include all collected information
4. Example code demonstrating the issue helps

### Suggesting Enhancements

**Before suggesting:**
- Check existing issues and discussions
- Consider if feature fits Chess Coach's scope

**When suggesting:**
1. Create a new GitHub issue
2. Use feature request template
3. Describe the problem you're solving
4. Describe expected solution
5. Include examples if applicable

### Pull Requests

**Before submitting:**
- Follow the coding standards
- Write/update tests (80% coverage required)
- Update relevant documentation
- Run `npm run ci` locally and confirm all checks pass
- Sign commits (optional but appreciated)

**PR checklist:**
- [ ] Branch is based on `main`
- [ ] Commits follow [conventional commits](https://www.conventionalcommits.org/)
- [ ] Tests added/updated for changes
- [ ] Coverage >= 80%
- [ ] All tests pass: `npm run ci`
- [ ] Documentation updated
- [ ] No hardcoded secrets or API keys
- [ ] No console.log statements (use logger instead)
- [ ] PR description explains changes

**PR description format:**
```markdown
## Description
Brief explanation of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Motivation and Context
Why is this change needed?

## Testing
How was this tested?

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Tests pass
- [ ] Coverage >= 80%
- [ ] No breaking changes
- [ ] Documentation updated
- [ ] Commits are meaningful
```

## Coding Standards

### TypeScript/React

See [DEVELOPMENT.md - Coding Standards](../DEVELOPMENT.md#coding-standards)

Key points:
- **Immutability** - Use spread/destructuring, no mutations
- **Small Functions** - Maximum 50 lines
- **Small Files** - Maximum 400 lines, 800 absolute limit
- **Error Handling** - Always explicit, no silent failures
- **Types** - Use TypeScript strictly (strict mode enabled)
- **Testing** - 80%+ coverage required

### Git Commits

Use [conventional commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

<optional detailed body>

<optional footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code cleanup (no behavior change)
- `test:` - Test additions/changes
- `docs:` - Documentation only
- `chore:` - Build/dependency updates
- `perf:` - Performance improvements
- `ci:` - CI/CD changes
- `security:` - Security fixes

**Examples:**
```
feat: add deep dive streaming explanations

Implement real-time streaming of Claude explanations:
- Stream coaching responses as they're generated
- Show live text updates in DeepDiveModal
- Handle streaming errors gracefully
- Add tests for streaming scenarios

Closes #42

test: increase coaching analyzer test coverage

Add tests for edge cases:
- Positions with multiple tactics
- Endgame blunders
- Null move scenarios

docs: update API documentation

Clarify types and add examples for:
- CoachingMoment interface
- detectCoachingMoments function
- buildCoachingPrompt function
```

## Testing Requirements

### Coverage Target: 80%+

**Test Types Required:**
1. **Unit Tests** - Individual functions
2. **Integration Tests** - Component/hook combinations
3. **E2E Tests** - Critical user flows

**Test Organization:**
```
__tests__/
├── unit/
│   ├── chess/
│   ├── coaching/
│   ├── utils/
│   └── storage/
├── integration/
└── e2e/
```

**Writing Tests:**

```typescript
// Pattern: Arrange → Act → Assert
describe('parsePgn', () => {
  it('should parse valid PGN notation', () => {
    // Arrange
    const pgn = '1. e4 c5 2. Nf3 d6'
    
    // Act
    const game = parsePgn(pgn)
    
    // Assert
    expect(game.moves.length).toBe(4)
    expect(game.moves[0].san).toBe('e4')
  })

  it('should throw on invalid notation', () => {
    // Arrange
    const invalidPgn = 'invalid move notation'
    
    // Act & Assert
    expect(() => parsePgn(invalidPgn)).toThrow()
  })
})
```

**Run tests:**
```bash
npm test                    # Run once
npm test -- --watch        # Watch mode
npm run coverage            # Coverage report
npm run test:e2e            # E2E tests
```

## Review Process

### What Happens After You Submit

1. **Automated Checks** - GitHub Actions runs CI pipeline
   - Linting
   - Type checking
   - Tests
   - Build verification
   - Coverage check

2. **Code Review** - Maintainer reviews PR
   - Code quality
   - Style adherence
   - Test coverage
   - Security review
   - Documentation check

3. **Feedback** - Maintainer may request changes
   - Reply to comments
   - Make requested changes
   - Push additional commits

4. **Approval** - PR approved by maintainer
   - Squash merge to main
   - Automatic deployment to Vercel
   - Closes associated issues

### Review Standards

PRs will be reviewed for:
- ✅ Code quality and correctness
- ✅ Test coverage (80%+)
- ✅ Documentation accuracy
- ✅ Security (no hardcoded secrets)
- ✅ Performance impact
- ✅ Accessibility
- ✅ Breaking changes

## Recognition

### How We Recognize Contributions

- **Commits** - Your commits are visible in git history
- **CHANGELOG** - Major features listed in release notes
- **Contributors** - Listed in GitHub contributors page
- **Documentation** - Major contributors listed in docs

## Questions?

- **Setup questions** - See [DEVELOPMENT.md](../DEVELOPMENT.md)
- **API questions** - See [API.md](../API.md)
- **Architecture questions** - See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Feature requests** - Create GitHub discussion

## Additional Notes

### Performance Considerations

When contributing features:
- **Analysis Speed** - Keep Stockfish analysis <2s
- **Rendering** - Optimize React components with memo/useMemo
- **Memory** - Watch for memory leaks in long sessions
- **Bundle Size** - Avoid large dependencies

### Security

Before committing:
- [ ] No hardcoded API keys
- [ ] No passwords or secrets
- [ ] Validate user input
- [ ] Sanitize external data
- [ ] Check for security issues: `npm audit`

### Documentation

Update docs when:
- **APIs change** - Update API.md
- **Architecture changes** - Update ARCHITECTURE.md
- **Setup changes** - Update DEVELOPMENT.md
- **Features change** - Update README.md

## Attribution

We appreciate all contributions! Contributors will be:
- Recognized in git history
- Listed on GitHub contributors page
- Mentioned in release notes for major contributions

## License

By contributing, you agree that your contributions will be licensed under the project's license (MIT).

## Thank You!

Your interest in improving Chess Coach is much appreciated. Together we're building a better chess learning tool!

Happy coding! 🎉
