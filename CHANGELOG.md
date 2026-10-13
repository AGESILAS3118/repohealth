# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-13

### Added
- Seven-pillar scoring engine (Documentation, CI/CD, Security, Activity, Community, Code Quality, Hygiene)
- GitHub REST API client with rate limit handling
- Bilingual interface (FR/EN) with browser detection
- SVG badge generation with Markdown snippets
- JSON report export
- Light/dark theme with system preference detection
- PWA support with offline caching
- Legal disclaimer and scoring methodology documentation
- 130 automated tests

### Security
- Strict Content Security Policy allowing only api.github.com
- No analytics, no tracking, no third-party requests
- All analysis runs 100% client-side
