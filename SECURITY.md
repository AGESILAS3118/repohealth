# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| v1.0.x | Yes |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through a [GitHub Security Advisory](https://github.com/AGESILAS3118/repohealth/security/advisories/new). Do not report security issues in public issues.

We will acknowledge your report and aim to provide an initial response within 72 hours. Please allow us time to investigate and prepare a fix, and do not publicly disclose the vulnerability before a correction is available.

## Scope

RepoHealth analyzes public repository metadata and files in read-only fashion through the GitHub public API. It has no backend, does not modify analyzed repositories, and does not collect or transmit personal analytics data.

## Out of Scope

- False positives or disagreements with the scoring engine's assessments.
- Limitations caused by data unavailable through GitHub's public API, API rate limits, or public repository visibility.
