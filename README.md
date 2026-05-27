# Property Evidence Search

A standalone MVP for real estate and homebuilding research teams to identify likely subdivision/community and builder candidates for property addresses using indexed source evidence.

The app ingests pasted document text or readable public web pages, builds a PostgreSQL-backed inverted index, ranks supporting chunks for each address, extracts candidate names through transparent heuristics, and displays evidence snippets with confidence levels.

## Project Purpose

**What it does.** Property Evidence Search turns source documents and public
page text into searchable evidence, then produces address-level community and
builder candidates with citation-backed confidence scoring and human review.

**Why it helps RealTorch/QC workflows.** A QC operator can inspect why a
community or builder is suggested, disposition ambiguous matches, record
corrections without overwriting the generated result, and export a compact
review package for downstream reconciliation.

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
   ```

   Password characters such as `@`, `:` or `/` must be URL encoded in connection
   strings.

3. Create the database tables and Prisma client:

   ```bash
   npx prisma migrate dev --name init
   ```

   For an existing prototype database created before the human-review
   workflow was added, sync the additive `ReviewDecision` table and
   `ReviewStatus` enum before seeding:

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
- Document ingestion at `/documents/new`, using pasted text or a public HTML URL.
- Indexed document library at `/documents`, with chunk-level document inspection.
- Document search at `/search`, returning ranked and highlighted snippets.

The single seeded completed run, **Atlas Triangle Review Sprint - Guided Demo
(Mock)**, is explicitly mock material and demonstrates:

- High confidence: `1847 Juniper Hollow Drive, Raleigh, NC 27603`, supported by multiple Willow Creek Estates and Northline Homes references.
- Medium confidence and corrected override: `62 Lantern Way, Durham, NC 27703`, where the reviewer normalizes the builder to `Aster Residential Homes`.
- Low confidence needing more evidence: `901 River Birch Court, Cary, NC 27519`, with one weak Cedar Crossing contextual reference and no identified builder.
- Human review decisions: one approved finding, one manually corrected finding, and one finding flagged for more evidence.

Completed evidence runs include a lightweight human-review workflow. Each
address begins as **Pending Review** and can be approved, rejected, flagged as
needing more evidence, or manually corrected with community/builder overrides
and reviewer notes. Review decisions are stored separately from extracted
candidates and evidence citations, preserving the original model output for
audit and export context.

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

Large consumer listing sites including Zillow, Redfin, Realtor.com, and
Homes.com may block automated requests or serve content only after browser-side
checks. Reliable testing sources are public builder/community pages, municipal
or public listing exports, HOA/public-record pages, or pasted listing text from
an authorized source.

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
| `GET` | `/api/documents` | List indexed documents |
| `GET` | `/api/documents/[id]` | Retrieve a document and chunks |
| `POST` | `/api/search` | Search ranked indexed chunks |
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

The response includes the internal evidence job ID, each address status, community/builder candidates, confidence scores, explanations, and supporting citation snippets. This endpoint deliberately wraps the same enrichment service used by the prototype UI, allowing a future RealTorch QC integration without duplicating evidence logic.
