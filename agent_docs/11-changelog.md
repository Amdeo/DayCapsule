# Changelog

### 2025-12-12 18:05
- **Added MCP Tools Guide**: Created comprehensive documentation for Model Context Protocol tools
- New document: `agent_docs/00-mcp-tools.md`
- Covers 6 MCP tool categories:
  - Sequential-thinking: Deep thinking and analysis
  - zai-mcp-server: Image/error analysis
  - Context7: Library documentation and code examples
  - Serena: Semantic coding agent for code analysis
  - open-websearch: Internet research capabilities
  - mobile-mcp: iOS/Android device automation
- Updated CLAUDE.md to include MCP tools section
- Added quick reference and common scenarios

### 2025-12-12 18:20
- **Refined MCP Tools Guide**: Simplified documentation for better readability
- Reduced from 164 lines to 101 lines
- Added sequential-thinking tool
- Streamlined format with tables and concise examples
- Enhanced quick reference section

### 2025-12-12 18:35
- **Added MiniMax MCP Support**: Integrated MiniMax MCP tools for enhanced capabilities
- Added to Core Tools table in agent_docs/00-mcp-tools.md
- MiniMax features:
  - web_search: Web search with current date context
  - understand_image: Image analysis and understanding
- Updated Usage Principles to prioritize MiniMax for web search and image analysis
- Added comprehensive examples for both MiniMax functions
- Updated Quick Reference with MiniMax shortcuts
- Updated CLAUDE.md MCP tools table to reflect MiniMax capabilities
- Provides alternative to open-websearch and zai-mcp-server for common tasks

### 2025-12-12 16:45
- **Major refactor**: Split CLAUDE.md into modular documentation in `agent_docs/`
- Created 11 specialized documentation modules:
  - Architecture overview
  - Module index with visual diagrams
  - Setup and build guide
  - Coding standards and best practices
  - Testing strategy and guidelines
  - AI services configuration
  - Security and privacy policies
  - Directory structure reference
  - Spec workflow development process
  - FAQ with troubleshooting guides
  - Complete changelog

### 2025-12-11 00:36
- Added standard CLAUDE.md prefix, conforming to claude.ai/code specifications
- Clarified working directory requirement: all commands must be executed in `app/` directory
- Extended common commands list, adding cleanup, cache reset, single test execution and other practical commands
- Added "Spec Workflow Development Process" chapter, detailing specification-driven development workflow
- Improved "Key Development Notes", emphasizing TypeScript configuration, path aliases, architecture patterns and performance optimization
- Enhanced "AI Usage Guide", clarifying service configuration, file paths and offline-first principles
- Significantly expanded "FAQ" section, adding 6 practical Q&As covering startup, configuration, performance, testing, and iOS build issues

### 2025-11-03 05:40:04
- Completed project AI context initialization
- Generated root-level CLAUDE.md documentation
- Created module-level documentation structure
- Established Mermaid architecture diagrams
- Updated project index and coverage statistics
