# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Gomoku (Five-in-a-Row) CLI game powered by **Mastra**, an AI agent framework. The AI uses a multi-agent system with specialized agents (Attacker, Defender, Commander) to decide moves.

## Commands

### Core Commands
- `npm run "start cli"` - Start the interactive Gomoku game in the terminal
- `npm run dev` - Start Mastra development server (useful for inspecting agents/workflows)
- `npm run build` - Build the Mastra project
- `npm run start` - Start the Mastra server in production mode
- `npx tsx src/cli.ts` - Direct way to run the CLI game

### Development
- `npx tsc --noEmit` - Check TypeScript compilation without emitting files
- `npx tsc -w` - Watch mode for TypeScript compilation

## High-Level Architecture

### Three-Layer System

#### 1. **Game Logic Layer** (`src/lib/`)
- `board.ts`: Core game mechanics (15x15 board, win detection, move validation, candidate move generation)
- `types.ts`: TypeScript interfaces (GameState, Position, BoardInfo, etc.)
- `validation.ts`: Input parsing and move validation
- `display.ts`: CLI formatting and board visualization
- `schemas.ts`: Zod schemas for AI input/output validation

#### 2. **AI/Mastra Layer** (`src/mastra/`)
- `index.ts`: Mastra instance configuration with agents, workflows, storage, and Langfuse observability integration
- `agents/`: Defines three specialized agents:
  - **Attacker Agent**: Analyzes winning opportunities and offensive strategies
  - **Defender Agent**: Identifies threats and defensive moves
  - **Commander Agent**: Evaluates proposals from both agents and makes final decision
- `workflows/gomoku-workflow.ts`: Multi-step workflow orchestrating the AI decision process
- `tools/`: Helper functions for agents (e.g., game logic tool, weather tool examples)

#### 3. **CLI Entry Point** (`src/cli.ts`)
The main game loop that:
1. Initializes the game state
2. Repeatedly prompts for player moves
3. Validates input and applies moves to the board
4. Executes the `gomokuWorkflow` to get AI decisions
5. Checks for winners or draws
6. Displays the updated board

### AI Workflow: Multi-Agent Decision Flow

The workflow (`src/mastra/workflows/gomoku-workflow.ts`) follows this execution pattern:

```
createBoardInfoStep (prepares board state for agents)
    ↓
checkCriticalStep (checks for immediate win/block scenarios)
    ├─ [IF critical move found]
    │  └─ finalDecisionStep → return critical move
    │
    └─ [ELSE]
       ├─ PARALLEL:
       │  ├─ attackerAnalysisStep (AI attacking proposal)
       │  └─ defenderAnalysisStep (AI defensive proposal)
       │
       ├─ mergeProposalsStep (validate and combine proposals)
       │
       ├─ commanderDecisionStep (LLM chooses final move)
       │
       └─ finalDecisionStep (return decision)
```

**Decision Priority** (implemented in Commander Agent):
1. **Win**: Make 5-in-a-row if possible
2. **Block Win**: Prevent opponent from making 5-in-a-row (critical)
3. **Make Four**: Create a position where next move guarantees win
4. **Block Three**: Stop opponent from building opportunities
5. **Make Three**: Build attacking positions
6. **Default**: Center-biased or multi-line threatening positions

### Key Design Patterns

#### Candidate Move Filtering
All agents only consider candidate moves from `getCandidateMoves()` which:
- Returns moves within 2-cell radius of existing stones
- Reduces search space while maintaining strategic relevance
- Falls back to center (H8) on empty board

#### Critical Move Detection
`findCriticalMove()` uses rule-based checks:
- First checks if AI can win immediately
- Then checks if opponent can win next turn (requires blocking)
- Bypasses LLM for these high-stakes decisions

#### Board Information for LLM
`createBoardInfo()` packages:
- Formatted board text
- Player stone positions (coordinates)
- AI stone positions (coordinates)
- Last move
- Candidate moves (restricted list)

## Important Notes on Agent System

- **Language**: All agent instructions and prompts are in **Japanese**
- **Model**: Uses OpenAI `gpt-4o-mini` for all agents
- **Structured Output**: Agents use Zod schemas for JSON validation
- **Invalid Move Handling**: If an agent proposes a move outside candidate list or an already-occupied cell, it's rejected and fallback logic is used

## Environment Setup

Requires:
- Node.js >= 22.13.0
- `OPENAI_API_KEY` (required for agent operations)
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASEURL` (optional, for observability)

See `.env` file for configuration.

## Storage & Observability

- **Storage**: LibSQL in-memory (`:memory:`) for Mastra state
  - To persist to file, change URL in `src/mastra/index.ts` to `file:../mastra.db`
- **Observability**: Integrated with Langfuse for agent trace recording (optional)
- **Logging**: Pino logger configured at `info` level

## Code Patterns to Follow

1. **Game State Immutability**: Always create new state objects rather than mutating
2. **Type Safety**: Leverage GameState, BoardInfo, Position interfaces
3. **Validation**: Use Zod schemas for all AI I/O
4. **Separation of Concerns**:
   - Game rules stay in `board.ts`
   - Display logic stays in `display.ts`
   - Validation stays in `validation.ts`
   - Agent orchestration stays in workflows
