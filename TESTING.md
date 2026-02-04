# Integration Testing Setup

## Overview
Two-tier testing strategy:
1. **Unit tests** (mocked) - Fast, run on every commit
2. **Integration tests** (wrangler dev) - Full stack, run on releases

## Running Tests

### Unit Tests (Mocked)
```bash
npm test
```
- Uses mocked D1/R2
- Fast feedback
- 37 tests covering all modules

### Integration Tests (Local Wrangler)
```bash
# Terminal 1: Start wrangler
npx wrangler dev --local --port 8787

# Terminal 2: Run integration tests
npm run test:integration
```

## GitHub Actions
Integration tests run automatically on releases via `.github/workflows/integration-test.yml`

If integration tests fail → blame Cloudflare 😄
