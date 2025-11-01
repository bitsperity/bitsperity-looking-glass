import { spawn } from 'child_process';
import { logger } from './logger.js';
import Anthropic from '@anthropic-ai/sdk';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPToolCall {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

export interface MCPConfig {
  [key: string]: {
    command: string;
    args: string[];
    env: Record<string, string>;
  };
}

/**
 * ToolExecutor: Loads tools from MCPs via stdio and executes them
 */
export class ToolExecutor {
  private mcpConfigs: MCPConfig;
  private tools: Map<string, ToolDefinition & { mcpName: string }> = new Map();

  constructor(mcpConfigs: MCPConfig) {
    this.mcpConfigs = mcpConfigs;
  }

  /**
   * Load all tool definitions from configured MCPs
   */
  async loadTools(): Promise<void> {
    logger.info('Loading tools from MCPs...');

    for (const [mcpName, config] of Object.entries(this.mcpConfigs)) {
      try {
        logger.info({ mcp: mcpName }, 'Loading tools');
        const tools = await this.loadMCPTools(mcpName, config.command, config.args, config.env);
        logger.info({ mcp: mcpName, count: tools.length }, 'Tools loaded');

        // Prefix tool names with MCP name and store
        for (const tool of tools) {
          const prefixedName = `${mcpName}_${tool.name}`;
          this.tools.set(prefixedName, {
            ...tool,
            mcpName,
            name: prefixedName
          });
        }
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Failed to load tools from MCP');
      }
    }

    logger.info({ totalTools: this.tools.size }, 'All tools loaded');
  }

  /**
   * Get all tools as Claude tool definitions
   */
  getClaudeTools(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as any
    }));
  }

  /**
   * Get tools filtered by MCP names
   */
  getClaudeToolsForMcps(mcpNames: string[]): Anthropic.Tool[] {
    if (!mcpNames || mcpNames.length === 0) {
      return this.getClaudeTools(); // Fallback: alle Tools
    }
    
    return Array.from(this.tools.values())
      .filter(tool => mcpNames.includes(tool.mcpName))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as any
      }));
  }

  /**
   * Get tools filtered by specific tool names (prefixed names like "satbase_list-news")
   */
  getClaudeToolsForTools(toolNames: string[]): Anthropic.Tool[] {
    if (!toolNames || toolNames.length === 0) {
      return this.getClaudeTools(); // Fallback: alle Tools
    }
    
    return Array.from(this.tools.values())
      .filter(tool => toolNames.includes(tool.name))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as any
      }));
  }

  /**
   * Load tool definitions from an MCP server via stdio
   */
  private async loadMCPTools(
    mcpName: string,
    command: string,
    args: string[],
    env: Record<string, string>
  ): Promise<ToolDefinition[]> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { env: { ...process.env, ...env } });
      let buffer = '';

      const timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`MCP ${mcpName} timeout loading tools`));
      }, 5000);

      proc.stdout?.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const msg = JSON.parse(line);

            // Check if this is the tools/list response
            if (msg.result?.tools && Array.isArray(msg.result.tools)) {
              clearTimeout(timeoutId);
              const tools: ToolDefinition[] = msg.result.tools.map((tool: any) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema || {
                  type: 'object',
                  properties: {}
                }
              }));
              proc.kill();
              resolve(tools);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      proc.on('error', reject);

      // Request tool list
      setTimeout(() => {
        if (proc.stdin) {
          proc.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'orchestrator', version: '1.0' }
              }
            }) + '\n'
          );

          proc.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list',
              params: {}
            }) + '\n'
          );
        }
      }, 100);
    });
  }

  /**
   * Execute a tool by calling the MCP server
   */
  async executeTool(toolName: string, toolInput: Record<string, any>): Promise<any> {
    const toolDef = this.tools.get(toolName);
    if (!toolDef) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const mcpName = toolDef.mcpName;
    const originalToolName = toolDef.originalName || toolName.split('_').slice(1).join('_');
    const config = this.mcpConfigs[mcpName];

    if (!config) {
      throw new Error(`MCP config not found: ${mcpName}`);
    }

    return this.callMCPTool(
      originalToolName,
      toolInput,
      config.command,
      config.args,
      config.env
    );
  }

  /**
   * Call a tool on an MCP server via stdio
   */
  private async callMCPTool(
    toolName: string,
    toolInput: Record<string, any>,
    command: string,
    args: string[],
    env: Record<string, string>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { env: { ...process.env, ...env } });
      let buffer = '';
      let stderrOutput = '';

      // Longer timeout for Manifold/Tesseract tools that need to initialize vector stores
      // Check if tool name contains 'manifold' or 'tesseract' (case-insensitive)
      const isVectorTool = toolName.toLowerCase().includes('manifold') || 
                          toolName.toLowerCase().includes('tesseract') ||
                          toolName.toLowerCase().includes('mf-') ||
                          toolName.toLowerCase().includes('semantic');
      const timeoutMs = isVectorTool ? 60000 : 30000; // 60s for vector tools, 30s for others

      const timeoutId = setTimeout(() => {
        proc.kill();
        const errorDetail = stderrOutput ? `\nMCP stderr: ${stderrOutput}` : '';
        reject(new Error(`Tool ${toolName} execution timeout (${timeoutMs/1000}s)${errorDetail}`));
      }, timeoutMs);

      proc.stdout?.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Skip MCP log lines (contain ANSI codes or timestamps)
          if (line.includes('[3') || line.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)) {
            logger.debug({ toolName }, `MCP log: ${line}`);
            continue;
          }

          try {
            const msg = JSON.parse(line);

            // Listen for tool result (id 2 is the tool call)
            if (msg.result && msg.id === 2) {
              clearTimeout(timeoutId);
              proc.kill();
              resolve(msg.result);
              return;
            }

            if (msg.error && msg.id === 2) {
              clearTimeout(timeoutId);
              proc.kill();
              const errorMsg = msg.error.message || `Tool error: ${toolName}`;
              reject(new Error(`${errorMsg}${stderrOutput ? `\nMCP stderr: ${stderrOutput}` : ''}`));
              return;
            }
          } catch (e) {
            // Ignore parse errors but log for debugging
            logger.debug({ toolName, line }, 'Failed to parse MCP response line');
          }
        }
      });

      proc.stderr?.on('data', (data) => {
        const stderrMsg = data.toString();
        stderrOutput += stderrMsg;
        logger.debug({ toolName }, `MCP stderr: ${stderrMsg}`);
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn MCP process for ${toolName}: ${error.message}${stderrOutput ? `\nMCP stderr: ${stderrOutput}` : ''}`));
      });

      // Send requests
      setTimeout(() => {
        if (proc.stdin) {
          // Initialize
          proc.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'orchestrator', version: '1.0' }
              }
            }) + '\n'
          );

          // Call tool
          proc.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: toolInput
              }
            }) + '\n'
          );
        }
      }, 100);
    });
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get tools by MCP
   */
  getToolsByMCP(mcpName: string): Map<string, ToolDefinition & { mcpName: string }> {
    const result = new Map();
    for (const [name, tool] of this.tools.entries()) {
      if (tool.mcpName === mcpName) {
        result.set(name, tool);
      }
    }
    return result;
  }
}
