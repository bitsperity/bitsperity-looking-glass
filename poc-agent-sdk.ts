#!/usr/bin/env npx tsx
/**
 * POC: Claude Agent SDK with Anthropic MCPs
 * Demonstrates stdio MCP integration with streaming agent execution
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, ".env") });

async function main() {
  console.log("=== Claude Agent SDK POC with stdio MCPs ===\n");

  const mcpServers = {
    satbase: {
      command: "node",
      args: [path.join(__dirname, "mcps/satbase/dist/index-stdio.js")],
      env: {
        SATBASE_API_URL: "http://localhost:8080"
      }
    },
    manifold: {
      command: "node",
      args: [path.join(__dirname, "mcps/manifold/dist/index-stdio.js")],
      env: {
        MANIFOLD_API_URL: "http://localhost:8083"
      }
    },
    ariadne: {
      command: "node",
      args: [path.join(__dirname, "mcps/ariadne/dist/index-stdio.js")],
      env: {
        ARIADNE_API_URL: "http://localhost:8082"
      }
    },
    tesseract: {
      command: "node",
      args: [path.join(__dirname, "mcps/tesseract/dist/index-stdio.js")],
      env: {
        TESSERACT_API_URL: "http://localhost:8081"
      }
    }
  };

  const prompt = `You are a financial discovery agent. Your task:
1. Load your watchlist from Satbase (use the get-watchlist tool)
2. Get the latest news for those tickers (use list-news from Satbase)
3. Search for supply chain and regulatory insights (use search from Tesseract)
4. Create a thought summarizing what you found (use create-thought from Manifold)
5. Return a structured summary

Be concise and focused. Use the tools available to gather real data.`;

  console.log("Starting agent with prompt:");
  console.log(prompt);
  console.log("\n--- Agent Output ---\n");

  let stepCount = 0;
  let toolCallCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    for await (const message of query({
      prompt,
      options: {
        mcpServers,
        allowedTools: [
          "mcp__satbase__*",
          "mcp__manifold__*",
          "mcp__ariadne__*",
          "mcp__tesseract__*"
        ],
        permissionMode: "auto-approve"
      }
    })) {
      // Log system messages
      if (message.type === "system") {
        console.log(`[SYSTEM] ${message.subtype}: ${JSON.stringify(message.data?.slice(0, 100))}`);
      }

      // Log assistant thinking/responses
      if (message.type === "assistant") {
        console.log(`[ASSISTANT] ${message.content?.slice(0, 150)}...`);
      }

      // Log tool calls
      if (message.type === "tool_call") {
        toolCallCount++;
        console.log(`\n[TOOL CALL #${toolCallCount}] ${message.tool_name}`);
        console.log(`  Input: ${JSON.stringify(message.input).slice(0, 200)}...`);
        stepCount++;
      }

      // Log tool results
      if (message.type === "tool_result") {
        const resultPreview = typeof message.result === "string" 
          ? message.result.slice(0, 200)
          : JSON.stringify(message.result).slice(0, 200);
        console.log(`[TOOL RESULT] ${message.tool_name}: ${resultPreview}...`);
      }

      // Log usage info
      if (message.type === "usage") {
        totalInputTokens += message.input_tokens;
        totalOutputTokens += message.output_tokens;
        console.log(`[USAGE] Input: ${message.input_tokens}, Output: ${message.output_tokens}`);
      }

      // Log final result
      if (message.type === "result") {
        console.log(`\n[RESULT] Success: ${message.subtype === "success"}`);
        if (message.subtype === "success") {
          const resultPreview = typeof message.result === "string"
            ? message.result.slice(0, 500)
            : JSON.stringify(message.result).slice(0, 500);
          console.log(`Final Output:\n${resultPreview}...`);
        } else {
          console.error(`Error: ${message.error}`);
        }
      }
    }

    console.log("\n--- Agent Execution Complete ---");
    console.log(`Total Steps: ${stepCount}`);
    console.log(`Tool Calls: ${toolCallCount}`);
    console.log(`Total Tokens Used: ${totalInputTokens + totalOutputTokens}`);
    console.log(`  - Input: ${totalInputTokens}`);
    console.log(`  - Output: ${totalOutputTokens}`);

  } catch (error: any) {
    console.error("\n[ERROR] Agent execution failed:");
    console.error(error.message);
    if (error.code) console.error(`Code: ${error.code}`);
    if (error.details) console.error(`Details: ${error.details}`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
