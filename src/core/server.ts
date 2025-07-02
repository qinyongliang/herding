import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toolsDefinitions } from "../tools/definitions.js";
import { toolsHandler } from "../tools/handler.js";

/**
 * 创建并配置Herding MCP服务器
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: "herding-mcp-server",
      version: "1.0.9",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolsDefinitions,
    };
  });

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await toolsHandler(name, args || {});
  });

  return server;
}

/**
 * 启动MCP服务器
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Herding MCP Server running on stdio");
} 