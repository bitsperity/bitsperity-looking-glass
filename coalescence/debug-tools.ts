import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const mcps = ['satbase', 'tesseract', 'manifold', 'ariadne'];
  
  for (const mcpName of mcps) {
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [`../mcps/${mcpName}/dist/index-stdio.js`]
      });
      const client = new Client({ name: 'test', version: '1.0.0' });
      await client.connect(transport);
      const tools = await client.listTools();
      
      console.log(`\n${mcpName}: ${tools.tools.length} tools`);
      
      // Check first few tools
      for (let i = 0; i < Math.min(3, tools.tools.length); i++) {
        const tool = tools.tools[i];
        const hasType = tool.inputSchema?.type;
        const hasProps = !!tool.inputSchema?.properties;
        console.log(`  [${i}] ${tool.name}: type=${hasType || 'MISSING'}, properties=${hasProps ? 'yes' : 'no'}`);
        if (!hasType) {
          console.log(`       Full schema: ${JSON.stringify(tool.inputSchema).substring(0, 100)}`);
        }
      }
      
      await client.close();
    } catch (error) {
      console.error(`${mcpName}: ${error}`);
    }
  }
}
test();
