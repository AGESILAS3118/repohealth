# Contributing to RepoHealth

Thank you for considering a contribution.

## Bugs and Feature Requests

- Report bugs using the [Bug Report issue template](https://github.com/AGESILAS3118/repohealth/issues/new?template=bug_report.md).
- Propose features using the [Feature Request issue template](https://github.com/AGESILAS3118/repohealth/issues/new?template=feature_request.md). Describe the problem and the expected benefit before implementation.

## Pull Requests

1. Fork the repository and create a focused branch from `main`.
2. Make the change and add or update tests when relevant.
3. Run `npm test` and ensure it passes.
4. Open a pull request against `main`, describing the change and linking any related issue.
5. Address review feedback. At least one maintainer approval is expected where repository settings require approval before merging.

## Code Standards

- Use native JavaScript and ES modules; do not introduce a build step.
- Use two spaces for indentation and follow the surrounding code style.
- Add JSDoc for exported functions and non-obvious public interfaces.
- Keep changes focused and avoid adding dependencies without a clear need.

## Running the Project

Run the automated test suite with:

```bash
npm test
```

Serve the project locally over HTTP (ES modules and service workers do not work from `file://`):

```bash
python3 -m http.server 8000
```

Alternatively, if `serve` is already available:

```bash
npx serve
```

## Commit Messages

Use Conventional Commit prefixes, for example `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.
