# Tele CRM Auth API with Specmatic Contract Testing

A production-style authentication API built using Node.js, Express, Prisma and PostgreSQL.

This project demonstrates how Specmatic executable contracts improve API reliability by:

- Contract-first API development using OpenAPI
- Automatic request/response validation
- Schema Resiliency Testing
- API Coverage via the Specmatic actuator endpoint
- Service Virtualization (Mock Server)
- GitHub Actions CI Contract Testing
- Automatic deployment after successful contract verification

---

## Features

- **Contract-First API Development** — the OpenAPI spec is the source of truth, not an afterthought
- **Automatic Request/Response Validation** via Specmatic
- **Specmatic Actuator Support** — `GET /actuator/mappings` lets Specmatic discover implemented routes automatically
- **API Coverage Reports** — see exactly which endpoints are contract-covered, missing, or undocumented
- **External JSON Test Examples** — request/response pairs live outside the spec file and are auto-discovered by Specmatic
- **Schema Resiliency Testing** — boundary values, wrong types, and missing fields are tested automatically
- **Service Virtualization (Mock Server)** — build against a fake backend without the real API or DB running
- **Automated CI/CD Deployment Gate** — GitHub Actions blocks deployment if any contract test fails

---

## 1. Prerequisites

| Tool                   | Why you need it                                                    | Check version                        |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| Node.js 18+            | Runs the Express API                                               | `node -v`                            |
| npm                    | Installs dependencies (including Specmatic, via `devDependencies`) | `npm -v`                             |
| PostgreSQL 14+         | Database for the `User` table                                      | `psql --version`                     |
| Java 11+ **or** Docker | Required to actually run Specmatic itself                          | `java -version` / `docker --version` |

You do **not** need to install Specmatic separately — it's already listed in `package.json` under `devDependencies` and runs via `npx specmatic ...` once `npm install` has been run. Java is only needed because Specmatic itself is a JVM tool under the hood; if you'd rather not install Java, use the Docker commands given as an alternative throughout this README.

---

## 2. Clone and install

**All platforms (Windows PowerShell / macOS / Linux):**

```bash
git clone https://github.com/GameOfCode64/Specmatic-test-crm-api.git
cd Specmatic-test-crm-api
npm install
```

> **Note:** if `npm install` fails with a `403 Forbidden` referencing `registry.npmmirror.com`, delete the lockfile and reinstall against the official registry — this can happen if the lockfile was generated on a machine using an npm mirror:
>
> ```bash
> rm package-lock.json   # macOS/Linux
> del package-lock.json  # Windows
> npm install --registry https://registry.npmjs.org/
> ```

---

## 3. Set up the database

Create a Postgres database (name it anything, `telecrm` here):

- **macOS (with Homebrew Postgres running):**
  ```bash
  createdb telecrm
  ```
- **Linux (Postgres installed via apt):**
  ```bash
  sudo -u postgres psql -c "CREATE DATABASE telecrm;"
  ```
- **Windows (using the Postgres installer's `psql` / pgAdmin):**
  ```powershell
  psql -U postgres -c "CREATE DATABASE telecrm;"
  ```
- **Or skip local install entirely and use Docker (all platforms):**
  ```bash
  docker run --name telecrm-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=telecrm -p 5432:5432 -d postgres:16
  ```

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telecrm
PORT=3000
JWT_SECRET=some-long-random-secret-string
```

Run the Prisma migration to create the schema:

```bash
npx prisma migrate dev --name init
```

---

## 4. Run the API

```bash
npm run dev     # nodemon, auto-restarts on changes
# or
npm start        # plain node
```

The API is available at `http://localhost:3000/api/v1` (matches the `servers:` entry in `openapi.yaml`). Keep this running in its own terminal for the next step.

---

## 5. Run Specmatic contract tests against the live API

This checks that the _real_ running API actually matches every example (request/response pair) declared in `openapi.yaml` — both the ones written inline in the spec and the ones in `openapi_examples/`.

**Using npx (Java required):**

```bash
npx specmatic test --testBaseURL=http://localhost:3000/api/v1 openapi.yaml
```

**Using Docker instead (no Java needed) — macOS/Linux:**

```bash
docker run --network=host -v "$(pwd):/usr/src/app" specmatic/specmatic \
  test --testBaseURL=http://localhost:3000/api/v1 openapi.yaml
```

**Using Docker on Windows (PowerShell):**

```powershell
docker run --network=host -v "${PWD}:/usr/src/app" specmatic/specmatic `
  test --testBaseURL=http://localhost:3000/api/v1 openapi.yaml
```

> Docker Desktop on Windows/macOS doesn't support `--network=host` the same way as Linux. If the above can't reach `localhost`, replace it with `http://host.docker.internal:3000/api/v1` as the `--testBaseURL` and drop `--network=host`.

Specmatic will run one test per named example — `Success`, `LoginUsingUsername`, `MissingFields`, `WrongPassword`, `Disabled`, `Locked` (inline in the spec) plus the external examples in `openapi_examples/` — and fail loudly if the live API's status codes or response shapes don't match the contract.

**[📸 SCREENSHOT — Specmatic Contract Test Report goes here]**

### Schema resiliency (negative) tests

`specmatic.yaml` has `schemaResiliencyTests: all` enabled, so the same `test` command above _also_ auto-generates and runs boundary/negative-case requests beyond the hand-written examples — e.g. sending a number where a string is expected, `null` for a non-nullable field, wrong enum values for `role`, missing required fields in different combinations, password constraint violations, and other schema-generated edge cases. This is what actually stress-tests input validation rather than just the happy paths.

Backend validation has since been hardened to correctly handle these generated negative cases — fields are now type-checked and validated before use, so malformed input (wrong types, nulls, missing body) returns a clean `4xx` response instead of leaking an unhandled `500`. This closed the gap where schema-resiliency runs were surfacing real, previously-unhandled edge cases in the implementation.

If you want to see only the example-driven positive tests without this extra layer, set `schemaResiliencyTests: false` in `specmatic.yaml` and re-run.

---

## 6. Enabling API coverage via the actuator endpoint

Contract tests on their own only confirm that the endpoints you've written examples for behave correctly — they don't tell you whether your app has endpoints that are missing from the spec, or spec entries that were never actually implemented. To close that gap, this project exposes an actuator-style endpoint:

```
GET /actuator/mappings
```

This endpoint is implemented following Specmatic's actuator mapping format (the same shape Spring Boot Actuator uses), returning every route registered in the Express app under `requestMappingConditions.methods` / `.patterns`. Specmatic reads this automatically to discover implemented routes — no manual endpoint list to maintain — and cross-checks them against `openapi.yaml` to generate an **API coverage report**, which highlights:

- Contract-covered APIs — implemented and matching the spec
- Missing implementations — declared in the spec but not built yet
- Endpoints without contract definitions — built but not documented in the spec

Run the same test command as before, with the app up and the actuator endpoint reachable:

```bash
npx specmatic test --testBaseURL=http://localhost:3000/api/v1 openapi.yaml
```

The coverage report is generated alongside the test results at `build/reports/specmatic/` — open `index.html` in a browser to see the breakdown.

**[📸 SCREENSHOT — API coverage report goes here]**

---

## 7. Run the Specmatic mock server (service virtualization)

This spins up a fake version of `/auth/login` straight from `openapi.yaml` — useful for frontend/AI-agent development without the real backend or database running at all.

**Using npx:**

```bash
npx specmatic mock
```

**Using Docker — macOS/Linux:**

```bash
docker run --network=host -p 9000:9000 -v "$(pwd):/usr/src/app" specmatic/specmatic mock
```

**Using Docker — Windows (PowerShell):**

```powershell
docker run -p 9000:9000 -v "${PWD}:/usr/src/app" specmatic/specmatic mock
```

The mock listens on `http://localhost:9000` by default. Try it:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"Test@1234"}' \
  http://localhost:9000/auth/login
```

---

## 8. Examples: inline vs. external

- **Inline examples** live directly inside `openapi.yaml`, under each `requestBody`/`response` block (`Success`, `LoginUsingUsername`, `MissingFields`, `WrongPassword`, `Disabled`, `Locked`). Specmatic pairs a request example to a response example of the same name to build a test/mock case.
- **External examples** live as standalone JSON files in `openapi_examples/` (the directory name follows Specmatic's `{spec-file-name}_examples` convention). This repo includes two:
  - `login_username_wrong_password_401.json` — username-based login with an incorrect password
  - `login_empty_body_400.json` — request missing the `email`/`username` field entirely

  Use external examples when a case doesn't belong in the spec file itself, or when you'd rather manage test data outside of the OpenAPI document.

Each external example is structured as a matched request/response pair, following Specmatic's naming convention, so Specmatic can automatically discover and pair them with the correct operation and status code — no manual wiring required. This means they run exactly like inline examples both locally and in CI, with zero extra configuration.

You can validate that all examples (inline and external) are schema-correct without needing a running server or database at all:

```bash
npx specmatic examples validate --spec-file openapi.yaml
```

---

## 9. Project structure

```
.
├── openapi.yaml                # the executable contract
├── openapi_examples/            # external (out-of-spec) request/response example pairs, auto-discovered by Specmatic
├── specmatic.yaml               # Specmatic config (spec location + resiliency settings)
├── build/reports/specmatic/     # generated test results + API coverage report (gitignored)
├── .github/workflows/           # CI pipeline: contract tests, resiliency tests + conditional deploy
├── prisma/schema.prisma         # DB schema
├── src/                         # Express app (includes GET /actuator/mappings, the Specmatic actuator mapping endpoint)
└── .env                         # DATABASE_URL, PORT, JWT_SECRET (create this yourself)
```

## 10. Architecture

                Client
                   │
                   ▼
              Express API ── GET /actuator/mappings
                   │
               Prisma ORM
                   │
             PostgreSQL (Neon)

                   ▲
                   │
        Specmatic Contract Tests
             + API Coverage
                   │
            openapi.yaml

                   │
           GitHub Actions CI
                   │
        Deploy to Render (if tests pass)

## 11. CI/CD Workflow

Every push to `main` triggers a GitHub Actions run that does the following, in order:

```
Developer Push
      │
      ▼
GitHub Actions
      │
Start API
      │
Actuator Discovery
      │
Contract Tests
      │
Schema Resiliency Tests
      │
API Coverage Report
      │
Upload JUnit Artifact
      │
All Tests Pass?
   ┌──┴──┐
  Yes     No
   │       │
   ▼       ▼
 Deploy   Stop
 to Render
```

Contract tests run automatically on every push to `main`, and schema resiliency tests run as part of that same step (`schemaResiliencyTests: all` in `specmatic.yaml`, so no separate command is needed). Specmatic JUnit reports are generated on every run and uploaded as a GitHub Actions artifact, alongside the API coverage report — so you can inspect exactly what failed (or confirm what passed) without re-running anything locally. Deployment to Render only happens if every contract test — including the resiliency-generated ones — passes successfully; a contract-breaking change never reaches production, even one that "looks fine" in a manual test.

## <img width="700" height="212" alt="Screenshot 2026-07-14 212302" src="https://github.com/user-attachments/assets/b619664a-dfc5-4fb8-894c-45b4fe262683" />

## Recent Improvements

- Added the Specmatic actuator endpoint (`GET /actuator/mappings`)
- Added API Coverage report support
- Added two new API endpoints
- Improved backend validation so schema resiliency tests are handled correctly (no more unhandled `500`s on malformed input)
- Migrated test examples from inline-only to external JSON files under `openapi_examples/`
- CI now uploads Specmatic JUnit and coverage reports as GitHub Actions artifacts
- Deployment to Render is now blocked whenever any contract test fails
