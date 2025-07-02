# Herding

> By qinyongliang

[![CN](https://img.shields.io/badge/语言-中文版-red.svg)](./README_CN.md)

Herding is a powerful AI task supervision tool (牧羊犬MCP) that provides better task decomposition, progress tracking, and user interaction capabilities for AI agents through the Model Context Protocol (MCP). It supervises and guides AI tools like Cursor to execute tasks more effectively.

## MCP Setup

add mcp settings
```
{
  "mcpServers": {
    "herding": {
      "command": "npx",
      "args": ["herding"]
    }
  }
}

```

1. Initialize herding in Cursor/Windsurf agent mode by sending the command:
```
do init-codelf and follow the instructions
```

1. In most cases, prompts will be automatically assembled by herding

2. After the agent completes writing, you can prompt:

```
do update-project-info
```

## Cursor Setup

1. goto `Settings` -> `Rules` -> `User Rules`
2. add Content 
```
Before responding or modifying the code, one should first obtain comprehensive information via `get-project-info` before making any decisions.
Everytime you finish editing code, you must call `update-project-info` and follow the instructions from the response
```
3. if you are in windows, add 
    ```I am currently under the Windows system. Use like "C:\Users\..." to send Path```

## Windsurf Setup

1. goto `Settings` -> `cascade` -> `Memories and Rules` -> `Global rules`
2. add Content
```
Before responding or modifying the code, one should first obtain comprehensive information via `get-project-info` before making any decisions.
Everytime you finish editing code, you must call `update-project-info` and follow the instructions from the response
```
3. if you are in windows, add 
```
I am currently under the Windows system. Use like "C:\\Users\\..." to send Path
```

## Core Features

### AI Task Supervision (牧羊犬功能)
- Task decomposition and planning
- Progress tracking and task completion management
- User interaction through elegant popup dialogs
- Git integration for better context awareness

### AI IDE Friendly
- Automatically analyzes project language/structure/purpose
- Reads code blocks in Edit/Agent mode
- Records each LLM request for traceability

### MCP Support
- Comprehensive project structure
- Complete code standards

### Adaptive Changes
- File tree
- Project structure changes
- Code standard validation
