import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import driver from "@/lib/neo4j";
import { z } from "zod";
import { embedDocuments } from "@/lib/embeddings";

const isError = (e: unknown): e is Error =>
  typeof e === "object" && e !== null && "message" in e;

const neo4jPayloadSchema = z.object({
  userId: z.string(),
  problem: z.object({
    url: z.string().url(),
    name: z.string(),
    domain: z.string(),         
    approachName: z.string(), 
  }),
});

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  // --- Verification & Validation ---
  const body = await req.clone().text();
  try {
    const isValid = await receiver.verify({
      signature: req.headers.get("upstash-signature")!,
      body,
    });
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (error) {
     return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const validation = neo4jPayloadSchema.safeParse(JSON.parse(body));
  if (!validation.success) {
    console.error("Invalid payload for Neo4j worker:", validation.error.flatten());
    return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
  }

  const { userId, problem } = validation.data;

  const sanitizedPayload = {
    userId,
    problem: {
      url: problem.url,
      name: problem.name.trim(),
      domain: problem.domain.trim(),
      approachName: problem.approachName.trim(),
    },
  };

  const session = driver.session();
  try {
    const textsToEmbed = [
      sanitizedPayload.problem.name,
      sanitizedPayload.problem.approachName,
      sanitizedPayload.problem.domain,
    ];

    // Embeddings only power chat search. If the embedding provider fails (quota,
    // outage, bad key), still write the graph so the KG page works; the embedding
    // properties are left untouched and can be filled in by a later submission.
    let problemEmbedding: number[] | null = null;
    let approachEmbedding: number[] | null = null;
    let conceptEmbedding: number[] | null = null;
    try {
      [problemEmbedding, approachEmbedding, conceptEmbedding] = await embedDocuments(textsToEmbed);
    } catch (embeddingError) {
      console.error("Embedding failed; writing graph without embeddings:", embeddingError);
    }

    const finalPayload = {
        userId: sanitizedPayload.userId,
        problem: {
            ...sanitizedPayload.problem,
            embedding: problemEmbedding,
        },
        approachEmbedding,
        conceptEmbedding,
    }

    await session.run(
      `
      // 1. Find or create the core entities and set their embeddings.
      MERGE (u:User {userId: $userId})

      MERGE (p:Problem {url: $problem.url})
        ON CREATE SET p.name = $problem.name
      SET p.embedding = coalesce($problem.embedding, p.embedding)

      MERGE (a:Approach {name: $problem.approachName})
      SET a.embedding = coalesce($approachEmbedding, a.embedding)

      MERGE (c:Concept {name: $problem.domain})
      SET c.embedding = coalesce($conceptEmbedding, c.embedding)

      // 2. Create the relationships that connect them for this specific submission.
      MERGE (u)-[:SUBMITTED]->(p)
      MERGE (p)-[:SOLVED_WITH]->(a)
      MERGE (a)-[:BELONGS_TO]->(c)
      `,
      finalPayload
    );

    console.log(`Successfully updated knowledge graph for problem: ${problem.name}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Neo4j write operation failed:", error);
    return NextResponse.json(
        { error: `Failed to update graph: ${isError(error) ? error.message : 'Unknown error'}` }, 
        { status: 500 }
    );
  } finally {
    await session.close();
  }
}
