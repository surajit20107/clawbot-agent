import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages, useMemory, userId } = await request.json();

  const tools =
    useMemory && process.env.SUPERMEMORY_API_KEY
      ? supermemoryTools(process.env.SUPERMEMORY_API_KEY, {
          containerTags: [userId ?? "demo-user"],
        })
      : {};

  const result = streamText({
    model: getLanguageModel(DEFAULT_CHAT_MODEL),
    system: useMemory
      ? "You are a helpful assistant with long-term memory. Use your memory tools to remember and recall information about the user across conversations."
      : "You are a helpful assistant. You have no memory of previous conversations.",
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
