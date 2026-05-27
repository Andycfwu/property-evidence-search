# Property Evidence Search

A standalone MVP for real estate and homebuilding research teams to identify likely subdivision/community and builder candidates for property addresses using indexed source evidence.

The app ingests pasted document text, permitted CSV/source exports, or readable public web pages, builds a PostgreSQL-backed inverted index, ranks supporting chunks for each address, extracts candidate names through transparent heuristics, and displays evidence snippets with confidence levels. Broad evidence can establish a baseline while reviewed internal sources or a human decision control the final answer.

## Project Purpose

**What it does.** Property Evidence Search turns source documents and public
page text into searchable evidence, then produces address-level community and
builder candidates with citation-backed confidence scoring and human review.

**Why it helps RealTorch/QC workflows.** A QC operator can inspect why a
community or builder is suggested, disposition ambiguous matches, record
corrections without overwriting the generated result, and export a compact
review package for downstream reconciliation.

**Baseline and internal override evidence.** Baseline evidence is broad
coverage loaded from permitted listing exports, licensed/vendor feeds, public
records, builder/community web pages, human-provided listing snippets, or an
internal dim listing export. Internal and reviewed evidence represents
governed RealTorch normalization or operator-reviewed research. Atlas displays
both, and a verified internal/reviewed value can supersede a baseline label
without deleting the source that originally suggested it.

**What is demo data.** All seeded documents, URLs, addresses, builders,
communities, citations, and review decisions are realistic-looking mock
examples marked `(Mock)` or `MOCK`. They are not customer records or verified
real-property assertions.

**What production integration needs.** A production rollout would require
authenticated users and authorization, governed document/source ingestion,
auditable reviewer identity and decision history, migrations and deployment
controls, monitoring, security review, and an agreed QC integration contract
using the existing integration API as a starting point.

## Stack

- Next.js App Router with TypeScript and Tailwind CSS
- Prisma and Supabase Postgres through `DATABASE_URL`
- Custom document chunking, inverted term index, search ranking, and candidate extraction
- Optional local Hugging Face MiniLM embeddings and ChromaDB vector retrieval
- No authentication, Supabase client SDK, or paid external APIs for the MVP

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

   The app uses Supabase only as hosted Postgres through Prisma. It requires one
   environment variable. For local Prisma development on an IPv4 network, open
   **Connect > Session Pooler** in the Supabase dashboard and place that URI in
   `DATABASE_URL`:

   ```dotenv
   DATABASE_URL="postgresql://postgres.xwhssnrvigfaycqwiste:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
   VECTOR_STORE_PROVIDER=chroma
   CHROMA_URL=http://localhost:8000
   EMBEDDING_PROVIDER=local
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   ```

   Password characters such as `@`, `:` or `/` must be URL encoded in connection
   strings.

3. Create the database tables and Prisma client:

   ```bash
   npx prisma migrate dev --name init
   ```

   For an existing prototype database created before the human-review,
   source-layering, or vector-retrieval workflows were added, sync the
   additive `ReviewDecision` table, enums, document provenance columns, and
   vector-index status columns before seeding:

   ```bash
   npx prisma db push
   ```

   Review Prisma's output first; if it warns about data loss, stop instead of
   accepting the change.

4. Add realistic mock demonstration data:

   ```bash
   npx prisma db seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Included Workflow

- Dashboard at `/` for indexed-document and job visibility.
- New evidence job at `/jobs/new` for newline-separated property addresses.
- Job detail at `/jobs/[id]` to run enrichment and review candidate evidence.
- Document ingestion at `/documents/new`, using CSV batch import, pasted text, or a public HTML URL.
- Indexed document library at `/documents`, with chunk-level document inspection.
- Document search at `/search`, returning ranked and highlighted snippets.
- Retrieval comparison lab at `/retrieval-lab`, comparing lexical, vector, and hybrid ranking.

The single seeded completed run, **Atlas Triangle Review Sprint - Guided Demo
(Mock)**, is explicitly mock material and demonstrates:

- High confidence with layered override: `1847 Juniper Hollow Drive, Raleigh, NC 27603`, where baseline `Willow Creek` is normalized to reviewed/verified `Willow Creek Estates`, with Northline Homes support.
- Medium confidence and corrected override: `62 Lantern Way, Durham, NC 27703`, where the reviewer normalizes the builder to `Aster Residential Homes`.
- Low confidence needing more evidence: `901 River Birch Court, Cary, NC 27519`, with one weak Cedar Crossing contextual reference and no identified builder.
- Human review decisions: one approved finding, one manually corrected finding, and one finding flagged for more evidence.

Completed evidence runs include a lightweight human-review workflow. Each
address begins as **Pending Review** and can be approved, rejected, flagged as
needing more evidence, or manually corrected with community/builder overrides
and reviewer notes. Review decisions are stored separately from extracted
candidates and evidence citations, preserving the original model output for
audit and export context.

Recommendation precedence is explicit:

1. Human reviewer community or builder correction.
2. `REVIEWED` evidence with `VERIFIED` trust.
3. `INTERNAL` evidence with `VERIFIED`, then `HIGH`, trust.
4. Official builder/community evidence.
5. Multiple matching `BASELINE` sources.
6. A single baseline source, then weak inferred matches.

Baseline support can improve confidence, but it cannot displace a verified
internal or reviewed result. Completed runs and exported review packages show
baseline values, final values, controlling layer/trust, and the override
reason.

## Demo Script

After running `npx prisma db seed` and `npm run dev`, follow this exact click
path:

1. Open `/` and read the **Demo Mode** card on the Evidence Command Center.
2. Click **Try Demo Flow** to preview the four product steps, then close the dialog.
3. Click **Open Seeded Demo Run** in the Demo Mode card.
4. In the completed run, review the three rows: High/Approved, Medium/Manually Corrected, and Low/Needs More Evidence.
5. In the medium-confidence row, confirm the visible `Aster Residential Homes` reviewer override and the preserved original model value beneath it.
6. Click **Low**, then **Needs Review**, in the evidence-table filters to demonstrate triage.
7. Click **Export Review Package** and choose **Export CSV table**.
8. Click **Export Review Package** again and choose **Export review brief** to download the citation-ready Markdown package.
9. For the full ingestion path, return to `/`, click **Try Demo Flow**, and use **Stage sources**, **Search snippets**, and **Start run** with the provided copy-demo buttons.

## Search And Enrichment Design

`lib/search/tokenizer.ts` normalizes text, removes common stopwords, splits documents into chunks, and creates safe highlighted snippets. `lib/search/indexer.ts` writes per-chunk term frequencies to `SearchIndexTerm`, providing a simple inverted index without a hosted search dependency.

`lib/search/ranker.ts` retrieves term matches and ranks chunks using term matches, frequency, query coverage, exact normalized phrases, and title relevance. `lib/enrichment/*` parses addresses, searches indexed chunks, detects community and builder phrases, compares a configurable known-builder list, scores candidates, and records citation rows in `EvidenceSource`.

## Custom IR vs Vector Retrieval vs Hybrid Retrieval

The original retrieval path remains intact. Atlas tokenizes cleaned evidence
chunks, stores per-chunk term frequencies in `SearchIndexTerm`, and ranks
matches with coverage, phrase, title, and frequency boosts. This custom
inverted index is fast and inspectable, especially for exact identifiers such
as addresses, ZIP codes, parcel language, and builder names.

Vector retrieval is an optional parallel path. The local embedding adapter
uses Hugging Face Transformers.js with the ONNX-compatible MiniLM package for
`sentence-transformers/all-MiniLM-L6-v2`. Embeddings are stored in ChromaDB
with source-provenance metadata. Semantic retrieval improves recall when a
query describes a concept while source text uses different wording.

Hybrid retrieval runs both paths, normalizes scores, merges chunks, and boosts
evidence found by both. It is a practical production pattern: lexical
retrieval protects exact property identifiers while semantic retrieval helps
with natural-language research. Neither retrieval mode proves a community or
builder; citations, provenance priority, and human review still determine the
final recommendation.

Limitations:

- Lexical search can miss synonyms and paraphrases.
- Vector search can return conceptually similar text without an exact property match.
- Hybrid search requires a maintained embedding index and a running vector store.
- Verified internal/reviewed evidence and human corrections outrank baseline evidence regardless of retrieval mode.

### Local ChromaDB Setup

Vector search is optional. If ChromaDB is unavailable, ingestion still
completes lexical indexing, records a vector-indexing failure state, and
semantic search reports **Vector search unavailable**. Evidence jobs and
lexical search continue to work.

Start ChromaDB locally with Docker:

```bash
docker run -p 8000:8000 chromadb/chroma
```

The first vector operation downloads the lightweight embedding model from
Hugging Face; subsequent indexing uses the local model cache. After enabling
Chroma for existing indexed evidence, create vectors with:

```bash
npm run vector:backfill
```

Pasted text, URL evidence, and CSV evidence are lexically indexed first and
then best-effort vector indexed. Source Library status badges display each
state independently.

## URL Ingestion

At `/documents/new`, choose **Fetch from URL** to ingest a publicly accessible
HTML page. The server fetches the URL, extracts the page title and readable
`main` or `article` text, removes navigation/scripts/forms and other non-content
markup, and runs the extracted text through the same chunking and indexing
pipeline as pasted evidence. The source URL is retained on the document and on
enrichment citations.

For safety and predictable evidence quality:

- Only public `http` and `https` HTML pages are accepted.
- Fetching times out after 10 seconds and rejects responses above 2 MB.
- Redirect destinations are checked, and private/local network destinations are rejected.
- The app does not bypass authentication, paywalls, captchas, rate limits, or anti-bot controls.
- Non-HTML files such as PDFs are not yet supported; paste extracted text when needed.

The app intentionally does not scrape Zillow or Redfin and does not attempt to
bypass anti-bot protections, captchas, authentication, paywalls, robots.txt
restrictions, or website terms. Large consumer listing sites including
Realtor.com and Homes.com may also block automated requests or serve content
only after browser-side checks. Reliable testing sources are permitted public
builder/community pages, licensed or public listing exports, HOA/public-record
pages, internal dim listing extracts, or pasted listing text from an authorized
source.

## Batch Evidence Import

At `/documents/new`, use **Import source records from CSV** to stage many
evidence rows at once. Upload a `.csv` file, review the suggested column
mapping, adjust mappings as needed, and import. A downloadable sample template
is available from the same panel at
`/templates/evidence-import-template.csv`.

Supported mapped fields include:

- `address`, `street`, `city`, `state`, and `zip`
- `community`, `subdivision`, and `builder`
- `baseline_community`, `baseline_builder`, `verified_community`, and `verified_builder`
- `source_url` and `source_type`
- `source_layer`, `source_trust`, `source_name`, `effective_date`, and `external_id`
- `description`, `notes`, and `listing_text`

Each accepted row becomes its own `Document`. Atlas composes readable evidence
text from the mapped fields, preserves a valid `source_url`, and sends the
record through the existing chunking and inverted-index pipeline. Choose
default layer, trust, and source name before importing. A row with mapped
`verified_community` or `verified_builder` is treated as reviewed/verified
override evidence unless the row supplies explicit layer or trust metadata.
The import summary identifies imported rows, created documents, skipped rows,
and row errors.

This flow gives RealTorch a lightweight path for importing:

- Listing exports with address, marketing text, builder, and listing-source URLs.
- Known community/subdivision reference datasets used to corroborate QC results.
- Analyst or QC research exports containing notes and public evidence citations.
- Governed internal dim listing exports with verified community or builder normalizations.

For production integration, batch ingestion would additionally need controlled
file retention, source lineage and import-job audit history, identity and
permission enforcement, deduplication rules, validation against governed
community/builder vocabularies, and operational monitoring.

## Supabase Database Connections

This app does not use Supabase Auth, the Data API, or `@supabase/supabase-js`.
All reads and writes go through Prisma using the server-only `DATABASE_URL`.
No `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is
required.

Choose the connection URI in **Supabase Dashboard > Connect**:

| Option | Use when | Example format |
| --- | --- | --- |
| Session Pooler | Local development or long-running app traffic from an IPv4 network | `postgresql://postgres.xwhssnrvigfaycqwiste:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require` |
| Direct connection | Migrations or persistent servers with IPv6 support, or with the IPv4 add-on | `postgresql://postgres:[PASSWORD]@db.xwhssnrvigfaycqwiste.supabase.co:5432/postgres?sslmode=require` |
| Transaction Pooler | A future serverless or autoscaling production deployment | Copy the transaction-mode URI on port `6543`; Prisma pooled-runtime settings must also disable prepared statements as specified by Supabase. |

For the current local MVP, Session Pooler is the practical default because it
supports both IPv4 and IPv6 and works with Prisma migration and seed commands.
The application runtime limits its Prisma pool to three connections unless a
`connection_limit` is already present in `DATABASE_URL`, preventing a local
operator console from consuming the hosted Session Pooler's client allowance.

## Connection Troubleshooting

### Prisma `P1001`: cannot reach database server

- Confirm `DATABASE_URL` exists in `.env.local` or `.env` and contains the
  exact URI copied from **Supabase Dashboard > Connect**.
- Check that the Supabase project is running and that the password is correct
  and URL encoded.
- If the URI uses `db.xwhssnrvigfaycqwiste.supabase.co`, switch to the Session
  Pooler URI when working from an IPv4-only network.
- Recheck connectivity with `npx prisma migrate status`, then retry the
  migration or seed command that failed.

### Direct host DNS failure

The direct `db.xwhssnrvigfaycqwiste.supabase.co` host resolves to an IPv6
database endpoint by default. A DNS or connectivity failure from a local
IPv4-only network is expected; it does not indicate a Prisma schema problem.
Use the Session Pooler URI on port `5432`, or enable Supabase's IPv4 add-on.

### Pooler versus direct connection

- Use **Session Pooler** for this local app when IPv4 compatibility is needed.
- Use **Direct** for an IPv6-capable persistent environment and database
  administration or migrations where a direct route is available.
- Use **Transaction Pooler** for future serverless application runtime traffic;
  it is not a drop-in choice for every Prisma command because it does not
  support prepared statements.

### Missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

This app intentionally removed Supabase client and Auth middleware code.
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is therefore not required. If browser
or authentication features are added later using `@supabase/supabase-js`, add
the publishable key at that time and do not expose service-role or secret keys
to the browser.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/documents` | Ingest pasted text or fetch/index a public HTML page |
| `POST` | `/api/documents/batch` | Import mapped CSV evidence rows and index each document |
| `GET` | `/api/documents` | List indexed documents |
| `GET` | `/api/documents/[id]` | Retrieve a document and chunks |
| `POST` | `/api/search` | Search ranked indexed chunks |
| `POST` | `/api/search/vector` | Search indexed chunks through local embeddings and ChromaDB |
| `POST` | `/api/search/hybrid` | Merge lexical and semantic retrieval rankings |
| `POST` | `/api/search/compare` | Compare retrieval modes in Retrieval Lab |
| `POST` | `/api/jobs` | Create an evidence job and parsed addresses |
| `GET` | `/api/jobs` | List evidence jobs |
| `GET` | `/api/jobs/[id]` | Retrieve candidates and citations |
| `POST` | `/api/jobs/[id]/run` | Run or rerun enrichment |
| `PATCH` | `/api/jobs/[id]/addresses/[addressId]/review` | Save a human review decision and optional overrides |
| `GET` | `/api/jobs/[id]/export?format=csv\|md` | Export a completed review package |
| `POST` | `/api/integrations/qc/enrich-cluster` | External QC integration contract |

Example search payload:

```json
{
  "query": "1847 Juniper Hollow Drive Raleigh community builder",
  "limit": 10
}
```

Example URL ingestion payload:

```json
{
  "ingestionMode": "URL",
  "sourceUrl": "https://builder.example/community/willow-creek",
  "sourceType": "BUILDER_BROCHURE",
  "sourceLayer": "BASELINE",
  "sourceTrust": "MEDIUM",
  "sourceName": "Public Builder Page",
  "title": ""
}
```

## Future QC Integration

An external QC tool can submit a cluster without depending on the user interface:

```http
POST /api/integrations/qc/enrich-cluster
Content-Type: application/json
```

```json
{
  "clusterId": "qc-cluster-1042",
  "name": "Raleigh QC review",
  "addresses": [
    "1847 Juniper Hollow Drive, Raleigh, NC 27603"
  ]
}
```

The response includes the internal evidence job ID, each address status, a
layer-resolved baseline/final recommendation with override metadata, and the
underlying community/builder candidates, confidence scores, explanations, and
supporting citation snippets. This endpoint deliberately wraps the same
enrichment service used by the prototype UI, allowing a future RealTorch QC
integration without duplicating evidence logic.

The vector path is isolated behind `lib/vector/vector-store.ts`, whose
`upsertVectors`, `queryVectors`, and `deleteDocumentVectors` operations allow
a future Pinecone adapter without changing recommendation logic or the search
user interface.
