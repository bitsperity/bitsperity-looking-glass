import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const sendMessageTool = {
  name: 'send-message',
  config: {
    title: 'Send Message',
    description: 'Send a message from one agent to another (agent-to-agent communication).',
    inputSchema: z.object({
      from_agent: z.string().describe('Sender agent name'),
      to_agent: z.string().describe('Recipient agent name (or "all" for broadcast)'),
      type: z.enum(['insight', 'warning', 'question', 'data']).describe('Message type'),
      content: z.string().describe('Message content'),
      related_entities: z.array(z.string()).optional().describe('Related entity IDs')
    }).shape,
  },
  handler: async (input: {
    from_agent: string;
    to_agent: string;
    type: 'insight' | 'warning' | 'question' | 'data';
    content: string;
    related_entities?: string[];
  }) => {
    logger.info({ tool: 'coalescence_send-message', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>('/v1/messages', {
        method: 'POST',
        body: JSON.stringify(input),
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_send-message', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_send-message', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getMessagesTool = {
  name: 'get-messages',
  config: {
    title: 'Get Messages',
    description: 'Get messages for an agent.',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name'),
      unread_only: z.boolean().default(true).describe('Only return unread messages'),
      from_agent: z.string().optional().describe('Filter by sender agent')
    }).shape,
  },
  handler: async (input: {
    agent_name: string;
    unread_only?: boolean;
    from_agent?: string;
  }) => {
    logger.info({ tool: 'coalescence_get-messages', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.unread_only !== undefined) params.append('unread_only', input.unread_only.toString());
      if (input.from_agent) params.append('from_agent', input.from_agent);
      
      const queryString = params.toString();
      const url = queryString 
        ? `/v1/messages/${input.agent_name}?${queryString}`
        : `/v1/messages/${input.agent_name}`;

      const result = await callCoalesence<any>(url, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_get-messages', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_get-messages', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

