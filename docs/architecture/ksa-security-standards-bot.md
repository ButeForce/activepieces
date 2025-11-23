## KSA Security Standards Knowledge Bot

### 1. Objective
- Automate ingestion of compliance spreadsheets stored in Google Drive and surface them through a retrieval-augmented chatbot.
- Keep responses aligned with the latest file revisions while preserving traceability to the original rows.

### 2. Core Requirements Recap
- Monitor a configured Drive folder via webhook (push) or polling fallbacks.
- Parse Google Sheets and Excel workbooks (CSV/text/PDF later) into normalized records.
- Maintain both structured data (PostgreSQL) and embeddings (pgvector/Qdrant/Chroma).
- Provide `/chat` API that performs semantic retrieval + LLM answer synthesis with referenced sources.

### 3. High-Level Architecture
```
┌──────────────────┐     Drive push/poll updates      ┌────────────────┐
│ Google Drive API │ ───────────────────────────────▶ │ Drive Listener │
└──────────────────┘                                   └───────┬────────┘
                                                               │
                                                      File metadata + payload
                                                               │
                                                       ┌───────▼────────┐
                                                       │ Ingestion &     │
                                                       │ Normalization   │
                                                       └───────┬────────┘
                              Structured rows + events         │
                                                               ▼
                      ┌────────────────────┐        ┌──────────────────────┐
                      │ PostgreSQL (core) │◀──────▶│ Indexer & Chunker     │
                      └──────┬────────────┘        └────────┬──────────────┘
                             │                               │
                             │                     Embeddings + metadata
                             │                               │
                      ┌──────▼───────────┐          ┌────────▼────────────┐
                      │ Vector Store     │◀────────▶│ Chatbot API (FastAPI)│
                      └──────────────────┘          └──────────────────────┘
```

### 4. Component Responsibilities
**Drive Listener & Scheduler**
- Exposes `/drive/webhook` for Google push notifications.
- Keeps change tokens (Drive Changes API) to list modified files after each callback.
- Polling mode driven by APScheduler/Celery Beat/K8s CronJob; compares `modifiedTime` and `md5Checksum`.

**Ingestion & Normalization Service**
- Downloads files through Drive API using service account credentials stored in Secret Manager or Vault.
- Formats data via pandas; rows are converted to canonical column names using a mapping JSON (per standard or sheet).
- Applies normalization rules (trim strings, uppercase statuses, parse ISO dates).
- Emits idempotent “file ingest” jobs to the indexer (e.g., via Redis queue, Postgres listen/notify, or direct async task).

**Indexer & Chunker**
- Receives parsed rows, upserts `files`, `sheets`, `controls`, and `compliance_records`.
- Builds `chunks` by concatenating salient fields in deterministic order.
- Generates embeddings using OpenAI text-embedding-3-large or local alternatives through a pluggable provider interface.
- Writes embeddings + metadata (`control_id`, `standard_name`, `department`, `row_number`) to pgvector (preferred) or external vector DBs.

**Chatbot API**
- FastAPI app exposing:
  - `POST /chat`: accepts `question`, optional `filters`, `top_k`.
  - `POST /drive/webhook`: drive notifications (shared with listener if services are collapsed).
  - `POST /reindex`: manual trigger (secured).
- Flow: compute question embedding → vector search with filters → construct prompt template → call LLM → return answer + references.
- Response includes traceable identifiers (file name, sheet, row, control ID, status).

### 5. Data Model (Conceptual)
```
files(id, drive_file_id, name, mime_type, last_modified, checksum, status)
sheets(id, file_id FK, sheet_name, last_indexed_at)
controls(id, standard_name, control_id, domain, section, title, requirement_text)
compliance_records(id, control_id FK, file_id FK, sheet_id FK, row_number,
                   status, department, owner, due_date, risk_level, evidence_link, comments)
chunks(id, control_id FK?, compliance_record_id FK?, file_id FK, sheet_id FK,
       row_number, text, created_at, metadata JSON)
embeddings(id==chunks.id, embedding VECTOR, metadata)
```
- Enforce unique `(drive_file_id, sheet_name, row_number)` to simplify re-ingest.
- Maintain `status_history` table if auditing is required later.

### 6. Indexing & Reconciliation Workflow
1. Listener captures file change → enqueue `ingest_job(file_id, change_token)`.
2. Ingestion downloads file, iterates sheets with pandas/Sheets API.
3. For each row:
   - Validate required columns (`control_id`, `standard_name`).
   - Normalize statuses to enum: `COMPLIANT`, `PARTIAL`, `NON_COMPLIANT`, `NOT_STARTED`.
   - Convert `due_date` to `date`.
   - Build `chunk_text`.
4. Indexer wraps DB operations in transaction:
   - Mark previous chunks for that file/sheet as inactive.
   - Upsert rows and create new chunk + embedding records.
5. On success mark file `status=indexed`; on failure log + retry with exponential backoff.

### 7. Retrieval-Augmented Generation
- Embedding search: `SELECT ... ORDER BY embedding <=> query LIMIT top_k` (pgvector) with optional metadata filters.
- Prompt template enforces grounded answers and “I don’t know” fallback.
- Optionally add re-ranking (e.g., Cohere Rerank) before final prompt.
- Log chat requests/responses with latency, tokens, hit controls for observability.

### 8. Configuration & Secrets
- `.env` / secrets manager entries:
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `DRIVE_FOLDER_ID`
  - `INDEXING_MODE=push|poll`
  - `POLL_INTERVAL_MINUTES`
  - `DATABASE_URL`
  - `VECTOR_DB_URL` (optional if shared with Postgres)
  - `OPENAI_API_KEY` or provider token
  - `API_AUTH_TOKEN` for `/chat` and `/drive/webhook`
- Central `config.yaml` to define column mappings per sheet/standard and normalization rules.

### 9. Security & Compliance
- Restrict Drive service account to read-only access of target folder.
- Protect APIs with JWT/api-key + optional IP allow list.
- Log metadata only (file name, row numbers); avoid storing sensitive cell contents in logs.
- Encrypt data at rest (Postgres TLS, disk encryption) and in transit (HTTPS).

### 10. Deployment Considerations
- Containerize each service (listener, ingestion/indexer, chatbot) or run as a single FastAPI app with background tasks depending on scale.
- Use Docker Compose for local dev (Postgres + pgvector, Qdrant optional, LocalStack for secrets).
- For production: deploy on Kubernetes with HPA, use Cloud SQL (Postgres) + Cloud Run or ECS.
- Schedule health checks and implement retry queues (e.g., Redis + RQ, Celery, or AWS SQS).

### 11. Observability
- Structured logging with `structlog`/`loguru`.
- Metrics: number of files indexed, rows processed, embedding latency, chat latency, 5xx counts.
- Alerts on ingestion failures > N retries or webhook delivery failures.

### 12. Incremental Delivery Plan
1. **Milestone 1:** Stand up FastAPI skeleton, Postgres schema, manual file upload ingestion, `/chat` endpoint using mock data.
2. **Milestone 2:** Integrate Google Drive push notifications + polling fallback, automate Excel/Sheets parsing and normalization.
3. **Milestone 3:** Productionize vector search, add filters, improve prompt + citation formatting, add API auth.
4. **Milestone 4:** Frontend React chat UI, dashboards, advanced analytics, optional CSV/PDF parsing.

### 13. Future Enhancements
- Automatic control deduplication and mapping across standards.
- Evidence attachment handling with secure storage references.
- Multi-tenant support (org_id scoping) and granular RBAC.
- Fine-tuned local LLM or Azure OpenAI for data residency requirements.
