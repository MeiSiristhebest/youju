# Contributing to YouJu

We love your input! We want to make contributing to YouJu as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Setting Up the Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/youju.git`
3. Install workspace dependencies: `pnpm install`
4. Set up environment variables (Gemini API key, etc.)

### Branch Naming Convention

- `feature/feature-name`: For new features
- `fix/issue-description`: For bug fixes
- `docs/documentation-update`: For documentation updates
- `refactor/component-name`: For code refactoring

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools and libraries

### Pull Request Process

1. Create a new branch from `master` following the branch naming convention
2. Make your changes
3. Run tests and ensure they pass: `pnpm test`
4. Run linting and ensure it passes: `pnpm lint`
5. Build the project: `pnpm build`
6. Update documentation if necessary
7. Create a pull request to the `master` branch
8. Wait for review and address any feedback

### Monorepo Guidelines

- Add workspace-level dependencies via root package.json only if they are used across multiple packages
- Add package-specific dependencies to the respective package.json
- When adding a new workspace, update pnpm-workspace.yaml accordingly
- Reuse shared packages rather than duplicating logic across apps

## Any contributions you make will be under the MIT Software License

In short, when you submit github contributions, you're agreeing to license them under the same terms as the project's license.

## Report bugs using GitHub's issue tracker

We use GitHub issues to track public bugs. Report a bug by opening a new issue; it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Documentation

- Update README.md with any new features or changes
- Document new components and their props
- Keep API documentation up to date

## Questions?

If you have any questions or need help, please open an issue or reach out to the maintainers.

Thank you for contributing!
