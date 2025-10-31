import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['../mcps/satbase/dist/index-stdio.js']
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('First tool schema:');
  console.log(JSON.stringify(tools.tools[0], null, 2));
  console.log('\n---\nInputSchema of first tool:');
  console.log(JSON.stringify(tools.tools[0].inputSchema, null, 2));
  await client.close();
}
test().catch(console.error);
