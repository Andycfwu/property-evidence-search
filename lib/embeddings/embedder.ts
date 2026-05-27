type FeatureExtractor = (
  input: string | string[],
  options: { pooling: "mean"; normalize: true },
) => Promise<{ tolist(): number[][] }>;

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

let extractorPromise: Promise<FeatureExtractor> | null = null;

export class LocalHuggingFaceEmbedder implements Embedder {
  async embed(texts: string[]) {
    if (!texts.length) return [];
    const extractor = await getExtractor();
    const tensor = await extractor(texts, { pooling: "mean", normalize: true });
    return tensor.tolist();
  }

  async embedQuery(text: string) {
    const vectors = await this.embed([text]);
    if (!vectors[0]) throw new Error("Embedding model returned no query vector.");
    return vectors[0];
  }
}

export function getEmbedder(): Embedder {
  const provider = process.env.EMBEDDING_PROVIDER ?? "local";
  if (provider !== "local") {
    throw new Error(`Unsupported embedding provider: ${provider}. Use EMBEDDING_PROVIDER=local.`);
  }
  return new LocalHuggingFaceEmbedder();
}

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const configuredModel = process.env.EMBEDDING_MODEL ?? "sentence-transformers/all-MiniLM-L6-v2";
      const model = configuredModel === "sentence-transformers/all-MiniLM-L6-v2"
        ? "onnx-community/all-MiniLM-L6-v2-ONNX"
        : configuredModel;
      return await pipeline("feature-extraction", model) as unknown as FeatureExtractor;
    })();
  }
  return extractorPromise;
}
