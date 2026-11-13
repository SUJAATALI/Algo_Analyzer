import { GoogleGenAI } from "@google/genai";

/**
 * Text embeddings via the Gemini API (replaces the Hugging Face MiniLM embeddings).
 *
 * IMPORTANT: the Neo4j vector indexes (problemEmbeddings, approachEmbeddings,
 * conceptEmbeddings) must be created with EMBEDDING_DIMENSIONS dimensions.
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

let client: GoogleGenAI | null = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY env variable is missing");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
};

// gemini-embedding-001 only returns unit-length vectors at its default size,
// so normalize the truncated vectors ourselves.
const normalize = (v: number[]): number[] => {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
  return v.map((x) => x / norm);
};

const embed = async (texts: string[], taskType: string): Promise<number[][]> => {
  const res = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
  if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error(`Unexpected embedding response (${vectors.length} vectors for ${texts.length} inputs)`);
  }
  return vectors.map(normalize);
};

/** Embed stored items (problems, approaches, concepts). */
export const embedDocuments = (texts: string[]) => embed(texts, "RETRIEVAL_DOCUMENT");

/** Embed a user's chat question for similarity search. */
export const embedQuery = async (text: string) => (await embed([text], "RETRIEVAL_QUERY"))[0];
