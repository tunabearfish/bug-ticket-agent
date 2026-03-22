import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export interface MCPToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export class NotionMCPClient {
  private client: Client;
  private connected = false;

  constructor() {
    this.client = new Client(
      { name: 'bug-ticket-agent', version: '1.0.0' },
      { capabilities: {} },
    );
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        ...process.env,
        OPENAPI_MCP_HEADERS: JSON.stringify({
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
        }),
      },
    });

    await this.client.connect(transport);
    this.connected = true;
    console.log('[MCP] Connected to Notion MCP server');
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.client.close();
    this.connected = false;
  }

  /** Returns tools in Anthropic's tool format for claude.messages.create */
  async getAnthropicTools(): Promise<Tool[]> {
    const { tools } = await this.client.listTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? '',
      input_schema: (tool.inputSchema as Tool['input_schema']) ?? {
        type: 'object' as const,
        properties: {},
      },
    }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return result as MCPToolResult;
  }
}

// Singleton — one MCP connection per process
let instance: NotionMCPClient | null = null;

export async function getNotionClient(): Promise<NotionMCPClient> {
  if (!instance) {
    instance = new NotionMCPClient();
    await instance.connect();
  }
  return instance;
}
