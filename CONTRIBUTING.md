# Contributing to Langratia Pharmacy POS

Thank you for your interest in contributing to **Langratia Pharmacy POS**! We welcome bug reports, feature suggestions, documentation enhancements, and pull requests from developers and healthcare technology enthusiasts worldwide.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect, kindness, and professionalism.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the [Issues tracker](https://github.com/allaninfo-comp/langratia-pharmacy/issues) to see if the issue has already been reported.
- If not, open a new issue using our **Bug Report Template**.
- Provide a clear and descriptive title, steps to reproduce the behavior, expected outcome vs. actual outcome, and system information (OS, screen resolution, Host/Client network mode).

### 2. Suggesting Features
- Open a **Feature Request** issue to describe the pharmaceutical workflow improvement or technical enhancement.
- Explain the motivation, use case, and proposed UI or backend approach.

### 3. Submitting Pull Requests (PRs)
1. **Fork** the repository and clone your fork locally.
2. Create a dedicated branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/issue-description
   ```
3. Make your changes adhering to the coding standards below.
4. Run all backend tests and verify frontend builds cleanly:
   ```bash
   # Test Go backend
   go test -v -short ./...
   
   # Build & type-check frontend
   cd frontend
   npm run build
   ```
5. Commit your changes using **Conventional Commits**:
   ```bash
   git commit -m "feat(pos): add support for wholesale batch discounts"
   ```
6. Push to your fork and open a Pull Request against `main`.

---

## Coding Guidelines

### Go Backend Guidelines
- Follow standard Go formatting (`gofmt` / `goimports`).
- **Service Layer Isolation**: All business logic belongs inside `backend/services/`. `app.go` serves as the IPC router/bridge and should delegate to services.
- **Error Wrapping**: Wrap errors with context using `fmt.Errorf("operation failed: %w", err)`.
- **Database Operations**:
  - Always use parameterized queries (`?`) to prevent SQL injection.
  - Wrap multi-table state modifications in transactions (`tx.Begin()`, `tx.Commit()`, `defer tx.Rollback()`).
  - Use database mutex locking (`db.Lock() / db.Unlock()`) when required to maintain WAL concurrency consistency.
- **LAN RPC Compatibility**: When adding or updating bound methods in `app.go`, ensure client proxy support is handled via `api.CallRPC` when `a.apiURL != ""`.

### React 19 / TypeScript Frontend Guidelines
- **TypeScript**: Strive for strong typing. Avoid using `any` where domain models or interfaces exist in `frontend/src/types/`.
- **Styling**: Utilize the existing CSS custom properties (`var(--blue)`, `var(--bg-card)`, etc.) defined in `src/index.css` for consistent dark/light theme support.
- **Component Design**: Keep UI components modular, accessible, and responsive. Prefer custom components in `src/components/ui/` for consistency.
- **State Management**: Use React context hooks (`useAuth`, `usePharmacy`, `usePermission`) for shared state. Avoid unnecessary full-page re-renders on rapid POS keystrokes.

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new user-facing feature or enhancement.
- `fix:` A bug fix.
- `docs:` Documentation changes only.
- `style:` Formatting, missing semi-colons, no code logic changes.
- `refactor:` Code refactoring that neither fixes a bug nor adds a feature.
- `perf:` Performance improvements.
- `test:` Adding or correcting unit/integration tests.
- `ci:` Changes to CI/CD workflows or build scripts.
- `chore:` Maintenance tasks, dependency bumps, or tool configurations.

---

## Licensing

By contributing to Langratia Pharmacy POS, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
