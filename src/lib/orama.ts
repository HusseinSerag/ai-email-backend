import { create, insert, search, type AnyOrama } from "@orama/orama";
import { prisma } from "./prismaClient";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { persist, restore } from "@orama/plugin-data-persistence";
import { generateEmbeddings } from "../helpers/analyzeEmail";

export class OramaClient {
  //@ts-ignore
  private orama: AnyOrama;

  constructor(private accountId: string) {}
  async saveIndex() {
    const index = await persist(this.orama, "json");
    await prisma.account.update({
      where: {
        id: this.accountId,
      },
      data: {
        oramaIndex: index as any,
      },
    });

    return this;
  }
  async init() {
    const account = await prisma.account.findUnique({
      where: {
        id: this.accountId,
      },
    });
    if (!account) {
      throw new CustomError("Account not found!", HttpStatusCode.NOT_FOUND);
    }
    if (account.oramaIndex) {
      this.orama = await restore("json", account.oramaIndex as any);
    } else {
      this.orama = create({
        schema: {
          subject: "string",
          body: "string",
          rawBody: "string",
          from: "string",
          to: "string[]",
          sentAt: "string",
          embeddings: "vector[1536]",
          threadId: "string",
        },
      });

      await this.saveIndex();
      return this;
    }
  }
  async search({ term }: { term: string }) {
    return await search(this.orama, {
      term,
    });
  }
  async insert(doc: any) {
    await insert(this.orama, doc);

    return this;
  }

  async vectorSearch({ term }: { term: string }) {
    const embeddings = await generateEmbeddings(term);
    const result = await search(this.orama, {
      mode: "hybrid",
      term: term,
      vector: {
        value: embeddings,
        property: "embeddings",
      },
      similarity: 0.8,
      limit: 10,
    });
    return result;
  }
}
