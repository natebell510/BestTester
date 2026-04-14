# Changelog

All notable changes to BestTester are documented here.
This file is auto-generated via [standard-version](https://github.com/conventional-changelog/standard-version).

## [Unreleased]

### Added
- **3.5** Test Data Factory + Teardown Registry (`src/data/`)
- **3.6** Multi-role auth matrix with `RoleManager` + `AuthStateCache` (`src/auth/`)
- **3.7** Mutation testing via Stryker (`mutation/stryker.config.ts`, `mutation.yml`)
- **3.8** Security testing hooks — header validator, SQLi/XSS fuzzer, ZAP client (`src/security/`)
- **3.9** i18n testing — locale switcher, string validator, locale JSON files (`src/i18n/`)
- **3.10** DX tooling — VS Code configs, scaffolders, Husky hooks, lint-staged

---

To generate a new release entry run:
```bash
npx standard-version
```
