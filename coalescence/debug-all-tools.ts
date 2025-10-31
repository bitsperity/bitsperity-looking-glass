import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const mcps = ['satbase', 'tesseract', 'manifold', 'ariadne'];
  
  for (const mcpName of mcps) {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [`../mcps/${mcpName}/dist/index-stdio.js`]
    });
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(transport);
    const tools = await client.listTools();
    
    const toolsWithoutType = tools.tools.filter(t => !t.inputSchema?.type);
    if (toolsWithoutType.length > 0) {
      console.log(`${mcpName}: ${toolsWithoutType.length} tools without type:`);
      toolsWithoutType.forEach(t => {
        console.log(`  - ${t.name}: ${JSON.stringify(t.inputSchema).substring(0, 80)}`);
      });
    }
    
    await client.close();
  }
}
test();
