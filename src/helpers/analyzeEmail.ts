import OpenAI from "openai";
import { TiktokenModel, encoding_for_model } from "tiktoken";

export const openAi = new OpenAI({
  apiKey: process.env.OPENAI_SECRET,
});

const MAX_NUM_TOKENS = 8192;

export async function generateEmbeddings(text: string) {
  let body = text;
  const tokenLength = getTokenCount(text, "text-embedding-ada-002");

  if (tokenLength > MAX_NUM_TOKENS) {
    body = await summarizeText(body);
  }
  if (body === "") {
    body = text.slice(0, 3000);
  }
  const embeddings = await getEmbeddings(body);
  return embeddings;
}

function getTokenCount(
  text: string,
  model: TiktokenModel = "gpt-3.5-turbo"
): number {
  const encoder = encoding_for_model(model);
  const tokens = encoder.encode(text);
  encoder.free();
  return tokens.length;
}

export async function summarizeText(
  text: string,
  maxAllowedTokens: number = 4096
) {
  try {
    const response = await openAi.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant summarizing content, if you see any HTML tags ignore and just focus on the text .",
        },
        {
          role: "user",
          content: `Summarize the following content:\n\n${text}`,
        },
      ],
      max_tokens: maxAllowedTokens - 1000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error summarizing email:", error);
    throw error;
  }
}
export async function getEmbeddings(text: string) {
  try {
    const res = await openAi.embeddings.create({
      input: text.replace(/\n/g, " "),

      model: "text-embedding-ada-002",
    });

    return res.data[0].embedding;
  } catch (e) {
    throw e;
  }
}
