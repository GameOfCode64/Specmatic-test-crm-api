# Tele CRM Auth API + Specmatic Contract Testing

A Node.js/Express authentication API backed by PostgreSQL/Prisma, with an OpenAPI contract in `openapi.yaml` wired up to [Specmatic](https://specmatic.io) for contract testing and service virtualization (mocking).

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

Specmatic will run one test per named example — `Success`, `LoginUsingUsername`, `MissingFields`, `WrongPassword`, `Disabled`, `Locked` (inline in the spec) plus the two external examples below — and fail loudly if the live API's status codes or response shapes don't match the contract.

### Schema resiliency (negative) tests

`specmatic.yaml` has `schemaResiliencyTests: all` enabled, so the same `test` command above _also_ auto-generates and runs boundary/negative-case requests beyond the hand-written examples — e.g. sending a number where a string is expected, `null` for a non-nullable field, wrong enum values for `role`, missing required fields in different combinations, etc. This is what actually stress-tests input validation rather than just the happy paths.

If you want to see only the example-driven positive tests without this extra layer, set `schemaResiliencyTests: false` in `specmatic.yaml` and re-run.

---

## 6. Run the Specmatic mock server (service virtualization)

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

## 7. Examples: inline vs. external

- **Inline examples** live directly inside `openapi.yaml`, under each `requestBody`/`response` block (`Success`, `LoginUsingUsername`, `MissingFields`, `WrongPassword`, `Disabled`, `Locked`). Specmatic pairs a request example to a response example of the same name to build a test/mock case.
- **External examples** live as standalone JSON files in `openapi_examples/` (the directory name follows Specmatic's `{spec-file-name}_examples` convention). This repo includes two:
  - `login_username_wrong_password_401.json` — username-based login with an incorrect password
  - `login_empty_body_400.json` — request missing the `email`/`username` field entirely

  Use external examples when a case doesn't belong in the spec file itself, or when you'd rather manage test data outside of the OpenAPI document.

You can validate that all examples (inline and external) are schema-correct without needing a running server or database at all:

```bash
npx specmatic examples validate --spec-file openapi.yaml
```

---

## 8. Project structure

```
.
├── openapi.yaml                # the executable contract
├── openapi_examples/            # external (out-of-spec) examples
├── specmatic.yaml               # Specmatic config (spec location + resiliency settings)
├── prisma/schema.prisma         # DB schema
├── src/                         # Express app
└── .env                         # DATABASE_URL, PORT, JWT_SECRET (create this yourself)
```
