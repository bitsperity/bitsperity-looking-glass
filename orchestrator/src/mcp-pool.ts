import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { logger } from './logger.js';
import { jsonSchema } from 'ai';

interface MCPConfig {
  [mcpName: string]: {
    command: string;
    args: string[];
  };
}

export class MCPPool {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private toolCache: Map<string, any> = new Map();
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing MCP Pool...');

    for (const [mcpName, mcpConfig] of Object.entries(this.config)) {
      try {
        logger.info({ mcp: mcpName, command: mcpConfig.command }, 'Connecting to MCP');

        const transport = new StdioClientTransport({
          command: mcpConfig.command,
          args: mcpConfig.args
        });

        const client = new Client({
          name: `orchestrator-client-${mcpName}`,
          version: '1.0.0'
        });

        await client.connect(transport);
        this.clients.set(mcpName, client);
        this.transports.set(mcpName, transport);

        // Cache tools for this MCP
        const toolList = await client.listTools();
        for (const tool of toolList.tools) {
          const fullToolName = `${mcpName}.${tool.name}`;
          this.toolCache.set(fullToolName, tool);
        }

        logger.info({ mcp: mcpName, toolCount: toolList.tools.length }, 'MCP connected');
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Failed to connect to MCP');
        throw error;
      }
    }

    logger.info({ totalTools: this.toolCache.size }, 'MCP Pool initialized');
  }

  async getTools(mcpNames: string[]): Promise<Record<string, any>> {
    const tools: Record<string, any> = {};
    
    logger.info({ mcpNames, count: mcpNames.length }, 'GET_TOOLS_CALLED');
    console.log(`[DIRECT] getTools called with MCPs:`, mcpNames);

    for (const mcpName of mcpNames) {
      const client = this.clients.get(mcpName);
      if (!client) {
        logger.warn({ mcp: mcpName }, 'MCP not found in pool');
        continue;
      }

      const toolList = await client.listTools();
      console.log(`[DIRECT] Got ${toolList.tools.length} tools from ${mcpName}`);
      
      for (const tool of toolList.tools) {
        // Sanitize tool name: Anthropic only allows [a-zA-Z0-9_-]
        // Replace dots with underscores: satbase.list-news -> satbase_list_news
        const sanitizedToolName = `${mcpName}_${tool.name}`.replace(/\./g, '_').replace(/-/g, '_');
        const originalToolName = tool.name;
        
        // Ensure inputSchema is properly formatted for Vercel AI SDK
        // MUST have type field, properties, and required fields
        const baseSchema = tool.inputSchema || {};
        
        // WORKAROUND: Satbase tools have empty properties in JSON schema conversion
        // Populate known tool properties manually for testing
        let properties = baseSchema.properties || {};
        let required = baseSchema.required || [];
        
        if (mcpName === 'satbase' && Object.keys(properties).length === 0) {
          // Map known satbase tool schemas
          const toolSchemas: Record<string, any> = {
            'fred-search': {
              properties: { q: { type: 'string' }, limit: { type: 'number' } },
              required: ['q', 'limit']
            },
            'list-news': {
              properties: { symbols: { type: 'array' }, limit: { type: 'number' } },
              required: ['symbols']
            },
            'get-watchlist': {
              properties: {},
              required: []
            },
            'list-prices': {
              properties: { symbols: { type: 'array' } },
              required: ['symbols']
            }
          };
          const mapped = toolSchemas[originalToolName];
          if (mapped) {
            properties = mapped.properties;
            required = mapped.required;
            logger.info({ mcp: mcpName, tool: originalToolName }, 'Using fallback schema');
          }
        }
        
        const schema = {
          type: baseSchema.type || 'object',
          properties,
          required
        };
        
        // DEBUG: Log schema details for first satbase tool
        if (mcpName === 'satbase' && tool.name === 'get_watchlist') {
          logger.debug(
            { 
              tool: tool.name,
              baseSchemaKeys: Object.keys(baseSchema).slice(0, 10),
              baseSchemaType: typeof baseSchema,
              hasType: 'type' in baseSchema,
              typeValue: baseSchema.type,
              finalType: schema.type
            },
            'SCHEMA_ANALYSIS'
          );
        }
        
        // Enhance description with required params info
        let enhancedDescription = tool.description || `${mcpName}: ${tool.name}`;
        if (schema.required && schema.required.length > 0) {
          enhancedDescription += ` [Required: ${schema.required.join(', ')}]`;
        }
        
        tools[sanitizedToolName] = {
          description: enhancedDescription.substring(0, 512),
          inputSchema: jsonSchema(schema),
          execute: async (args: any) => {
            // Ensure required args for specific tools
            let safeArgs: any = args || {};
            if (typeof safeArgs === 'string') {
              try { safeArgs = JSON.parse(safeArgs); } catch { safeArgs = {}; }
            }
            if (mcpName === 'manifold' && originalToolName === 'mf-create-thought') {
              if (!safeArgs || typeof safeArgs !== 'object') safeArgs = {};
              if (!safeArgs.type) safeArgs.type = 'signal';
              if (!safeArgs.title) safeArgs.title = 'Auto-generated signal';
              if (!safeArgs.content) safeArgs.content = 'Auto-repaired tool call.';
            }
            logger.debug({ mcp: mcpName, tool: originalToolName, args: safeArgs }, 'Executing MCP tool');
            
            const result = await client.callTool({
              name: originalToolName,
              arguments: safeArgs
            });
            
            logger.debug({ mcp: mcpName, tool: originalToolName, result: typeof result }, 'Tool execution completed');
            
            // Return content from MCP result
            if (result.content && Array.isArray(result.content)) {
              // Extract text from content array
              return result.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
            }
            
            return result;
          }
        };
        
        // Debug: log first tool schema
        if (sanitizedToolName.includes('satbase_get_watchlist')) {
          logger.debug({ toolName: sanitizedToolName, schemaKeys: Object.keys(schema), schema: JSON.stringify(schema).substring(0, 200) }, 'SCHEMA DEBUG');
        }
      }
    }

    return tools;
  }

  async callTool(toolName: string, args: any): Promise<any> {
    // Convert tool names from LLM format (satbase_get_watchlist or manifold_mf_create_thought)
    // to MCP format (satbase.get-watchlist or manifold.mf-create-thought)
    
    // Find first underscore to split MCP name from tool method
    const firstUnderscoreIdx = toolName.indexOf('_');
    if (firstUnderscoreIdx === -1) {
      throw new Error(`Invalid tool name format: ${toolName} (expected format: mcp_tool_name)`);
    }

    const mcpName = toolName.substring(0, firstUnderscoreIdx);
    const toolMethodWithUnderscores = toolName.substring(firstUnderscoreIdx + 1);
    
    // Convert underscores to dashes in tool method name
    // (e.g., 'get_watchlist' -> 'get-watchlist', 'mf_create_thought' -> 'mf-create-thought')
    const toolMethod = toolMethodWithUnderscores.replace(/_/g, '-');

    const client = this.clients.get(mcpName);
    if (!client) {
      throw new Error(`MCP not found: ${mcpName}`);
    }

    logger.debug({ 
      originalName: toolName, 
      mcpName, 
      toolMethod,
      argsType: typeof args,
      argsValue: args ? JSON.stringify(args).substring(0, 200) : 'undefined',
      args 
    }, 'Calling tool');

    try {
      const result = await client.callTool({
        name: toolMethod,
        arguments: (() => {
          // Apply same safe defaults here in case this path is used
          let safe = args || {};
          if (typeof safe === 'string') {
            try { safe = JSON.parse(safe); } catch { safe = {}; }
          }
          if (mcpName === 'manifold' && toolMethod === 'mf-create-thought') {
            if (!safe || typeof safe !== 'object') safe = {};
            if (!safe.type) safe.type = 'signal';
            if (!safe.title) safe.title = 'Auto-generated signal';
            if (!safe.content) safe.content = 'Auto-repaired tool call.';
          }
          return safe;
        })()
      });

      logger.debug({ tool: toolName, resultType: typeof result, hasContent: !!result }, 'Tool call completed');

      // Log full result for thought-creating tools
      if (toolName.includes('create_thought') && result) {
        logger.info({ tool: toolName, resultId: result.id, result }, 'Thought created successfully');
      }

      return result;
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
      logger.error({
        tool: toolName,
        mcpName,
        toolMethod,
        argsType: typeof args,
        argsValue: args ? JSON.stringify(args).substring(0, 100) : 'undefined',
        errorMessage: errorStr,
        errorCode: (error as any)?.code
      }, 'Tool call error');
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP Pool');

    for (const [mcpName, client] of this.clients.entries()) {
      try {
        await client.close();
        const transport = this.transports.get(mcpName);
        if (transport) {
          transport.close?.();
        }
        logger.info({ mcp: mcpName }, 'MCP disconnected');
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Error closing MCP connection');
      }
    }
  }

  public getConfig(): MCPConfig {
    return this.config;
  }
}
