import { openAi } from "../lib/analyzeEmail";

export async function generateEmail(context: string, prompt: string) {
  try {
    const stream = await openAi.chat.completions.create(
      {
        model: "gpt-4",
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
