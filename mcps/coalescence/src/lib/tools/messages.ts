import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const sendMessageTool = {
  name: 'send-message',
  config: {
    title: 'Send Message',
    description: 'Send a message from one agent to another for agent-to-agent communication. Enables agents to share insights, warnings, questions, or data with each other. Recipient can be specific agent name or "all" for broadcast to all agents. Message types: insight (key finding), warning (important alert), question (asking for help/info), data (sharing data). Recipients can retrieve messages via get-messages. Useful for cross-agent coordination, sharing discoveries, or requesting assistance.',
    inputSchema: z.object({
      from_agent: z.string().describe('Sender agent name (e.g., "daily-news-analyst"). Must match agent configuration name.'),
      to_agent: z.string().describe('Recipient agent name (e.g., "manifold-knowledge-curator") or "all" for broadcast to all agents.'),
      type: z.enum(['insight', 'warning', 'question', 'data']).describe('Message type: "insight" = key finding, "warning" = important alert, "question" = asking for help, "data" = sharing data/facts.'),
      content: z.string().describe('Message content. Be clear and specific. For questions, state what information is needed.'),
      related_entities: z.array(z.string()).optional().describe('Array of Ariadne knowledge graph entity IDs related to this message (optional).')
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
    description: 'Get messages received by an agent from other agents. Returns array of messages with sender, type, content, timestamps, and read status. Use unread_only=true to get only unread messages (default) or false to get all messages. Optionally filter by sender agent. Agents should check for messages at the start of execution to receive insights, warnings, or questions from other agents. Use mark-message-read after processing to update read status.',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name to get messages for. Must match agent configuration name.'),
      unread_only: z.boolean().default(true).describe('If true (default): only return unread messages. If false: return all messages including already read ones.'),
      from_agent: z.string().optional().describe('Optional filter by sender agent name. If provided, only returns messages from this specific sender.')
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

export const markMessageReadTool = {
  name: 'mark-message-read',
  config: {
    title: 'Mark Message Read',
    description: 'Mark a message as read after processing. Updates the message read status so it no longer appears in unread-only queries. Use this after an agent has processed a message from get-messages. This maintains message state and prevents duplicate processing. Returns updated message status.',
    inputSchema: z.object({
      message_id: z.string().describe('Message ID to mark as read. Get message IDs from get-messages.')
    }).shape,
  },
  handler: async (input: { message_id: string }) => {
    logger.info({ tool: 'coalescence_mark-message-read', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>(`/v1/messages/${input.message_id}/read`, {
        method: 'PATCH',
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_mark-message-read', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_mark-message-read', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

