import { openAi, summarizeText } from "../helpers/analyzeEmail";
import { turndown } from "../helpers/turndown";
import { search } from "@orama/orama";
import { Message } from "../validation/ai";
import { OramaClient } from "../lib/orama";
import { prisma } from "../lib/prismaClient";
export async function generateEmail(context: string, prompt: string) {
  try {
    const stream = await openAi.chat.completions.create(
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
             You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by providing suggestions and relevant information based on the context of their previous emails.
             
             THE TIME NOW IS ${new Date().toLocaleString()}
            
             
             START CONTEXT BLOCK
             ${context}
             END OF CONTEXT BLOCK
             based on this context, compose an email
             USER PROMPT:
             ${prompt}
             
             When responding, please keep in mind:
             - Be helpful, clever, and articulate. 
             - Rely on the provided email context to inform your response.
             - If the context does not contain enough information to fully address the prompt, politely give a draft response.
             - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
             - Do not invent or speculate about anything that is not directly supported by the email context.
             - Keep your response focused and relevant to the user's prompt.
             - Don't add fluff like 'Heres your email' or 'Here's your email' or anything like that.
             - Directly output the email, no need to say 'Here is your email' or anything like that.
             - No need to output subject
             - no need to output to: email, from: email or subject
             - if user prompt isn't a direct statement, consider that the user want you to autocomplete the text, also autocomplete with either relative information
             or a draft response
             - just output the response
             - the user will provide his/her name, compose the email that this person is sending it
             - return  '\n' between texts so that text displays nicely
             `,
          },
        ],
        stream: true,
      },
      {}
    );

    return stream;
  } catch (e) {
    throw e;
  }
}

export async function askQuestion(
  context: string,

  messages: Message[]
) {
  try {
    const prompt = {
      role: "system" as const,
      content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
      THE TIME NOW IS ${new Date().toLocaleString()}

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

When responding, please keep in mind:
- Be helpful, clever, and articulate.
- Rely on the provided email context to inform your responses.
- If the context does not contain enough information to answer a question, politely say you don't have enough information.
- Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
- Do not invent or speculate about anything that is not directly supported by the email context.
- Keep your responses concise and relevant to the user's questions or the email being composed.`,
    };
    const stream = await openAi.chat.completions.create(
      {
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages.filter((message) => message.role === "user"),
        ],
        stream: true,
      },
      {}
    );

    return stream;
  } catch (e) {
    throw e;
  }
}

export async function generateContext(
  searchResults: Awaited<ReturnType<typeof search<any, any>>>
) {
  try {
    return await Promise.all(
      searchResults.hits.map(async (result) => {
        const body = turndown.turndown(result.document.body);
        return summarizeText(body);
      })
    );
  } catch (e) {
    throw e;
  }
}

export async function performVectorSearch(content: string, accountId: string) {
  try {
    const orama = new OramaClient(accountId);
    await orama.init();

    const searchResults = await orama.vectorSearch({
      term: content,
    });
    return searchResults;
  } catch (e) {
    throw e;
  }
}

export async function getChatbotInteractionsService(userId: string) {
  try {
    const interaction = await prisma.chatbotInteraction.findUnique({
      where: {
        userId,
      },
    });
    return interaction;
  } catch (e) {
    throw e;
  }
}

export async function updateInteraction(userId: string) {
  try {
    const chatBotInteraction = await prisma.chatbotInteraction.findUnique({
      where: {
        userId,
      },
    });
    if (!chatBotInteraction) {
      await prisma.chatbotInteraction.create({
        data: {
          userId,
        },
      });
      return;
    }
    await prisma.chatbotInteraction.update({
      where: {
        userId,
      },
      data: {
        count: chatBotInteraction.count + 1,
      },
    });
  } catch (e) {
    throw e;
  }
}
