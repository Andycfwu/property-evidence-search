import type { RetrievalFilters } from "@/lib/retrieval/retrieval-types";

export type VectorMetadata = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceUrl: string;
  sourceType: string;
  sourceLayer: string;
  sourceTrust: string;
  sourceName: string;
  city: string;
  state: string;
  zip: string;
  importedAt: string;
};

export type VectorRecord = {
  id: string;
  embedding: number[];
  text: string;
  metadata: VectorMetadata;
};

export type VectorMatch = {
  id: string;
  text: string;
  metadata: VectorMetadata;
  distance: number;
};

export interface VectorStore {
  isAvailable(): Promise<boolean>;
  upsertVectors(records: VectorRecord[]): Promise<void>;
  queryVectors(vector: number[], limit: number, filters?: RetrievalFilters): Promise<VectorMatch[]>;
  deleteDocumentVectors(documentId: string): Promise<void>;
}
