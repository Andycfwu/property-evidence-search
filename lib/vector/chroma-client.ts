import { ChromaClient, type Collection, type Metadata, type Where } from "chromadb";
import type { RetrievalFilters } from "@/lib/retrieval/retrieval-types";
import type { VectorMatch, VectorMetadata, VectorRecord, VectorStore } from "./vector-store";

const COLLECTION_NAME = "atlas_evidence_chunks";

export class ChromaVectorStore implements VectorStore {
  private client: ChromaClient | null = null;
  private collectionPromise: Promise<Collection> | null = null;

  async isAvailable() {
    try {
      await this.getClient().heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  async upsertVectors(records: VectorRecord[]) {
    if (!records.length) return;
    const collection = await this.getCollection();
    await collection.upsert({
      ids: records.map((record) => record.id),
      embeddings: records.map((record) => record.embedding),
      documents: records.map((record) => record.text),
      metadatas: records.map((record) => record.metadata),
    });
  }

  async queryVectors(vector: number[], limit: number, filters: RetrievalFilters = {}) {
    const collection = await this.getCollection();
    const query = await collection.query<VectorMetadata & Metadata>({
      queryEmbeddings: [vector],
      nResults: limit,
      where: toWhere(filters),
      include: ["documents", "metadatas", "distances"],
    });
    return (query.ids[0] ?? []).flatMap((id, index) => {
      const metadata = query.metadatas[0]?.[index] as VectorMetadata | null;
      const text = query.documents[0]?.[index];
      const distance = query.distances[0]?.[index];
      return metadata && text && typeof distance === "number"
        ? [{ id, metadata, text, distance } satisfies VectorMatch]
        : [];
    });
  }

  async deleteDocumentVectors(documentId: string) {
    const collection = await this.getCollection();
    await collection.delete({ where: { documentId } });
  }

  private getClient() {
    if (!this.client) {
      const endpoint = new URL(process.env.CHROMA_URL ?? "http://localhost:8000");
      this.client = new ChromaClient({
        host: endpoint.hostname,
        port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
        ssl: endpoint.protocol === "https:",
      });
    }
    return this.client;
  }

  private getCollection() {
    if (!this.collectionPromise) {
      this.collectionPromise = this.getClient().getOrCreateCollection({
        name: COLLECTION_NAME,
        embeddingFunction: null,
      });
    }
    return this.collectionPromise;
  }
}

let vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    const provider = process.env.VECTOR_STORE_PROVIDER ?? "chroma";
    if (provider !== "chroma") {
      throw new Error(`Unsupported vector store provider: ${provider}. Use VECTOR_STORE_PROVIDER=chroma.`);
    }
    vectorStore = new ChromaVectorStore();
  }
  return vectorStore;
}

function toWhere(filters: RetrievalFilters): Where | undefined {
  const terms: Where[] = [];
  if (filters.sourceLayer) terms.push({ sourceLayer: filters.sourceLayer });
  if (filters.sourceTrust) terms.push({ sourceTrust: filters.sourceTrust });
  if (filters.sourceType) terms.push({ sourceType: filters.sourceType });
  if (!terms.length) return undefined;
  return terms.length === 1 ? terms[0] : { $and: terms };
}
