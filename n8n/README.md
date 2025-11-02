# Cyber SA RAG Workflows (Arabic Excel ? Qdrant ? Chatbot)

This folder contains two ready-to-import n8n workflows to power an Arabic chatbot that answers strictly from your Saudi National Cybersecurity Assessment Excel file.

- `ingest-cyber-sa.json`: Ingests the Arabic Excel, normalizes and chunks text, generates embeddings, and upserts to Qdrant.
- `chat-cyber-sa.json`: Webhook that receives a question, retrieves relevant chunks from Qdrant, and answers in Arabic using RAG.

---

## Prerequisites
- n8n (latest recommended)
- OpenAI (or compatible) API key for embeddings and chat
- Vector database:
  - Qdrant reachable at `http://qdrant:6333` (default in workflows) or change to your endpoint
- Your Arabic Excel file (e.g., `/data/cyber-sa.xlsx` on the n8n host)

Optional: You can swap Qdrant for Pinecone/Weaviate/pgvector with minimal changes to the HTTP Request node(s).

---

## Files in this folder
- `ingest-cyber-sa.json`
- `chat-cyber-sa.json`
- `README.md` (this document)

---

## Quick start
1) Place the Excel file on the n8n host
   - Default path in the ingestion workflow: `/data/cyber-sa.xlsx`
   - Adjust the path in node `Read Binary File` if needed

2) Import the workflows
   - In n8n UI ? Workflows ? Import from File ? select `ingest-cyber-sa.json` and `chat-cyber-sa.json`

3) Configure OpenAI credentials in n8n
   - Credentials ? OpenAI API ? add your API key
   - The workflows reference credentials named `OpenAI API`

4) Ensure Qdrant is reachable
   - Default base URL in HTTP Request nodes: `http://qdrant:6333`
   - If external, change to your URL (e.g., `https://<your-qdrant>:6333`)

5) Run the ingestion workflow
   - Workflow: `Cyber SA Ingestion (Arabic Excel ? Qdrant)`
   - Click ?Execute Workflow?
   - It will create (or reuse) Qdrant collection `cyber-sa` and upsert points

6) Test the chat workflow
   - Workflow: `Cyber SA Chat (Arabic RAG via Qdrant)`
   - Send a POST request to the webhook:

```bash
curl -X POST https://<your-n8n>/webhook/cyber-sa/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"?? ?? ?????? ???????? ?????? ???????? ???????????"}'
```

---

## What the ingestion workflow does (step-by-step)
Workflow: `Cyber SA Ingestion (Arabic Excel ? Qdrant)`

1) Manual Trigger
- Start the flow manually or via Cron (optional)

2) Read Binary File
- Reads the Excel file from `/data/cyber-sa.xlsx` into a binary property

3) Spreadsheet File
- Converts the Excel data to JSON rows (header row enabled)

4) Normalize + Chunk (AR) [Code node]
- Arabic-aware normalization:
  - Removes diacritics (harakat) and tatweel
  - Normalizes Alef variants (????? ? ?) and Yaa/Alif Maqsura (? ? ?)
  - Trims excessive whitespace
- Column selection:
  - Uses a list of Arabic headers to build a combined text per row
  - Adds metadata fields such as `eccSubdomain` and `controlCode` if present
- Chunking:
  - Splits long text into overlapping character-based chunks (size ~1200, overlap ~150)

5) OpenAI Embeddings
- Generates embeddings for each chunk (default model: `text-embedding-3-small`)

6) Extract Embedding [Code node]
- Maps provider response into `json.embedding`

7) Ensure Collection (Qdrant)
- Creates the collection `cyber-sa` if it does not exist
- Uses `Cosine` distance and the embedding size from the first item

8) Upsert to Qdrant
- Upserts each chunk with deterministic point IDs, embedding vector, and payload:
  - `text` (normalized chunk)
  - `type` (e.g., `evidence`, `mechanism`, `prerequisite`)
  - `rowIndex`, `chunkIndex`, `eccSubdomain`, `controlCode`

Result: Your Excel content is indexed in `cyber-sa` collection ready for retrieval.

---

## What the chat workflow does (step-by-step)
Workflow: `Cyber SA Chat (Arabic RAG via Qdrant)`

1) Webhook
- Receives POST requests at `/webhook/cyber-sa/chat`
- Expected body: `{ "question": "..." }`

2) Normalize Question (AR) [Code node]
- Applies the same Arabic normalization to the user question

3) OpenAI Embeddings
- Embeds the normalized question

4) Qdrant Search
- Searches `cyber-sa` with the question embedding, retrieves top-k chunks (default 6)

5) Build Context [Code node]
- Concatenates the top chunks into a single context string (bulleted)

6) OpenAI Chat (AR)
- System prompt in Arabic instructs the assistant to answer strictly from the provided context
- Temperature low (0.2) for concise, grounded answers

7) Respond to Webhook
- Returns the Arabic answer as the HTTP response

---

## Arabic Excel headers and mapping
- The ingestion Code node includes `TEXT_COLUMNS` with Arabic headers based on your sheet.
- If your column names differ, edit that list to match your Excel headers precisely.
- The logic auto-detects row type (`evidence`, `mechanism`, `prerequisite`) by checking which columns are present.

---

## Re-indexing and updates
- Re-run the ingestion workflow when the Excel changes.
- Deterministic IDs (`type-rowIndex-chunkIndex`) make upserts idempotent.
- For large sheets, consider adding a row-level hash to skip unchanged content.

---

## Security and quality notes
- Keep the model grounded: the system prompt refuses to answer beyond the provided context.
- Optionally filter by a minimum similarity score in Qdrant results.
- Review payload fields (e.g., names, contacts) to avoid exposing sensitive data to the model output.

---

## Troubleshooting
- No results or irrelevant answers:
  - Verify Excel path and column headers
  - Confirm embeddings were created and Qdrant collection has points
- Qdrant connection issues:
  - Update HTTP Request node URLs to match your deployment
- Encoding issues:
  - Ensure Spreadsheet File node outputs UTF-8 JSON (header row enabled)

---

## Future improvements (optional)
- Add score thresholding and citations in the final answer
- Add pagination for large Excel files
- Swap Qdrant with Pinecone/Weaviate/pgvector if preferred
- Add Cron to re-index periodically
