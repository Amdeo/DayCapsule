<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MemoryCapsule** is a powerful React Native life-logging application with multi-modal recording (photo, voice, text), timeline review, intelligent search, and AI-powered features.

### Quick Info
- **Framework**: React Native 0.74 + TypeScript 5.x
- **State**: Redux Toolkit
- **Database**: SQLite + FTS5
- **All commands run in `app/` directory**

## MCP Tools

The project includes Model Context Protocol (MCP) tools for enhanced development capabilities.

### When to Use

| Task | Tool | Example |
|------|------|---------|
| **Understand code** | `serena` | Find components, search patterns |
| **Get docs** | `context7` | React hooks, library APIs |
| **Mobile testing** | `mobile-mcp` | Screenshot, tap, swipe |
| **Research** | `MiniMax` | Web search, latest practices |
| **Analyze image** | `MiniMax` | UI issues, error screenshots |
| **Complex problem** | `sequential-thinking` | Architecture decisions |

**Quick reference**: [MCP Tools Guide](agent_docs/00-mcp-tools.md)

## Documentation Modules

For detailed information, refer to the modular documentation in the `agent_docs/` directory:

| Document | Description |
|----------|-------------|
| [00-mcp-tools.md](agent_docs/00-mcp-tools.md) | MCP tools usage guide and best practices |
| [01-architecture.md](agent_docs/01-architecture.md) | Architecture overview, tech stack, patterns |
| [02-module-index.md](agent_docs/02-module-index.md) | Module structure and visual diagrams |
| [03-setup-build.md](agent_docs/03-setup-build.md) | Environment setup and build commands |
| [04-coding-standards.md](agent_docs/04-coding-standards.md) | Coding conventions, TypeScript, path aliases |
| [05-testing-strategy.md](agent_docs/05-testing-strategy.md) | Testing approach and guidelines |
| [06-ai-services.md](agent_docs/06-ai-services.md) | AI service configuration and usage |
| [07-security-privacy.md](agent_docs/07-security-privacy.md) | Security policies and permissions |
| [08-directory-structure.md](agent_docs/08-directory-structure.md) | File structure and key locations |
| [09-spec-workflow.md](agent_docs/09-spec-workflow.md) | Specification-driven development process |
| [10-faq.md](agent_docs/10-faq.md) | Troubleshooting and common issues |
| [11-changelog.md](agent_docs/11-changelog.md) | Version history and updates |

## Quick Start

```bash
cd app
npm install
npm start
npm run ios  # or android
```

## Key Points

- **All commands in `app/` directory**
- **Use path aliases** (`@store/hooks`, `@ui/components`)
- **Performance**: All core operations < 2s, memory < 150MB
- **Testing**: 70% coverage minimum, run `npm test`
- **Security**: AES-256-GCM encryption, offline-first
