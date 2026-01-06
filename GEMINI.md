# Gomoku Mastra App

## Project Overview

This project is a CLI-based Gomoku (Five in a Row) game application powered by **Mastra**, an AI agent framework. It features a multi-agent AI system that plays against a human user.

**Key Features:**
-   **Multi-Agent Architecture:** Uses specialized agents ("Attacker", "Defender", "Commander") to decide the best move.
-   **Mastra Framework:** Orchestrates the agents and workflows.
-   **CLI Interface:** Interactive command-line interface for playing the game.
-   **Observability:** Integrated with Langfuse (via Mastra) for tracing agent interactions.

## Key Technologies

-   **Runtime:** Node.js (>=22.13.0)
-   **Language:** TypeScript (ES2022)
-   **Framework:** [Mastra](https://mastra.ai) (v1.0.0-beta.12)
-   **AI Models:** OpenAI GPT-4o-mini
-   **Validation:** Zod
-   **Storage:** LibSQL (In-memory configuration)

## Project Structure

```
/Users/okuya/develop/application/gomoku-mastra-app/
├── src/
│   ├── cli.ts                  # CLI Entry point & Game Loop
│   ├── lib/                    # Domain Logic
│   │   ├── board.ts            # Board state & Game rules
│   │   ├── validation.ts       # Input validation
│   │   ├── schemas.ts          # Zod schemas for AI I/O
│   │   └── types.ts            # TypeScript interfaces
│   └── mastra/                 # Mastra Configuration
│       ├── index.ts            # Mastra instance setup
│       ├── agents/             # Agent definitions
│       │   └── gomoku-agent.ts # Attacker, Defender, Commander agents
│       └── workflows/          # Workflow definitions
│           └── gomoku-workflow.ts # AI decision workflow
├── .mastra/                    # Mastra internal build artifacts
├── package.json                # Project dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

## AI Architecture

The AI's decision-making process is defined in `src/mastra/workflows/gomoku-workflow.ts`:

1.  **Analysis Phase (Parallel):**
    -   **Attacker Agent:** Analyzes the board to find winning moves (making "fours" or "threes").
    -   **Defender Agent:** Analyzes the board to block the opponent's winning lines.
2.  **Decision Phase:**
    -   **Commander Agent:** Evaluates proposals from both agents and decides the final move based on priority (Win > Block Win > Create Opportunity).

## Setup & Usage

### Prerequisites
-   Node.js v22.13.0 or higher
-   OpenAI API Key (configured in environment)
-   Langfuse Keys (optional, for tracing)

### Commands

*   **Start the Game (CLI):**
    ```bash
    npm run "start cli"
    # or
    npx tsx src/cli.ts
    ```
    *Note: Currently, the CLI is using a placeholder random move logic. Connection to the Mastra workflow is the next development step.*

*   **Start Mastra Server (Dev Mode):**
    ```bash
    npm run dev
    ```
    Starts the Mastra server (useful for inspecting agents/workflows via Mastra Playground if enabled).

## Development Notes

*   **Language:** Agent system prompts and instructions are written in **Japanese**.
*   **Current Status:** The core AI logic (`gomoku-workflow.ts`) and Game Logic (`board.ts`) are implemented. The CLI (`cli.ts`) needs to be updated to invoke the `gomokuWorkflow` instead of the random move fallback.

## Important Files

*   `src/mastra/agents/gomoku-agent.ts`: Defines the specialized agents and their prompts.
*   `src/mastra/workflows/gomoku-workflow.ts`: Defines the step-by-step logic for the AI turn.
*   `src/lib/board.ts`: Contains the `checkWinner` logic and board manipulation functions.
