import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { config } from "dotenv";

config({ path: "../../.env" });

async function test() {
  const models = [
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku",
    "claude-3-5-sonnet",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5-20250929"
  ];

  for (const model of models) {
    try {
      const result = await generateText({
        model: anthropic(model),
        prompt: "Say OK",
        maxTokens: 5
      });
      console.log(`✅ ${model}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("model:")) {
        console.log(`❌ ${model} - MODEL NOT FOUND`);
      } else if (msg.includes("rate")) {
        console.log(`⚠️  ${model} - RATE LIMIT`);
      } else {
        console.log(`❌ ${model} - ${msg.substring(0, 50)}`);
      }
    }
  }
}

test().catch(console.error);
