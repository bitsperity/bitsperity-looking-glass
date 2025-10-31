import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

async function test() {
  const models = [
    "claude-3-5-haiku",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022"
  ];

  for (const model of models) {
    try {
      console.log(`\nTesting ${model}...`);
      const result = await generateText({
        model: anthropic(model),
        prompt: "Say 'OK'",
        maxTokens: 10
      });
      console.log(`✅ ${model} WORKS: ${result.text}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${model} FAILED: ${msg.substring(0, 80)}`);
    }
  }
}

test();
