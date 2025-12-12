# Spec Workflow Development Process

The project adopts a specification-driven development process (Spec-driven Development). All new features require creating specification documents first:

## Specification Directory Structure

- `specs/`: Feature requirement specifications and task documents
- `.spec-workflow/`: Specification workflow tools and scripts

## Development Workflow

1. **Create Specification**: Create new feature specification documents in the `specs/` directory
2. **Task Breakdown**: Decompose specifications into specific development tasks
3. **Implementation**: Implement features step by step according to the task list
4. **Review**: Code submission requires passing specification checks

## Current Active Specifications

- `specs/001-lifelog-capture/`: Life-logging feature specification

## Specification Workflow Tools

The project includes OpenSpec workflow tools:
- `/openspec/proposal` - Create change proposals
- `/openspec/apply` - Apply approved changes
- `/openspec/archive` - Archive deployed changes

## When to Use Specification Workflow

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding
