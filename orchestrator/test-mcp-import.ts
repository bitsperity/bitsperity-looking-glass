import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('createMCPClient type:', typeof createMCPClient);
console.log('StdioClientTransport type:', typeof StdioClientTransport);

const transport = new StdioClientTransport({
  command: 'node',
  args: ['../mcps/satbase/dist/index-stdio.js']
});

console.log('Transport created:', !!transport);

const client = await createMCPClient({ transport });
console.log('Client created:', !!client);
console.log('Client type:', typeof client);

const tools = await client.tools();
console.log('Tools loaded:', Object.keys(tools).length);

process.exit(0);
