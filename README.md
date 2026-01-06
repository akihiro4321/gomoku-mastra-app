# Gomoku Mastra App

A Gomoku (Five in a Row) game powered by Mastra with multi-agent AI system. The AI uses three specialized agents (Attacker, Defender, Commander) working together to make strategic game decisions.

## Features

- **15x15 Gomoku Board**: Classic five-in-a-row game
- **Multi-Agent AI System**:
  - Attacker Agent: Proposes aggressive moves to build winning patterns
  - Defender Agent: Proposes defensive moves to block opponent threats
  - Commander Agent: Makes final decision by synthesizing both perspectives
- **Intelligent Threat Detection**: Detects opponent threats including patterns with gaps
- **Rule-Based Fallback**: Critical moves (winning/blocking) are handled by rule-based logic before LLM consultation
- **CLI Interface**: Play the game directly from the terminal
- **Mastra Studio Integration**: Visual workflow debugging and monitoring

## Quick Start

### Prerequisites

- Node.js >= 22.13.0
- pnpm (recommended) or npm
- OpenAI API Key (for GPT-4o-mini)

### Installation

```bash
pnpm install
```

### Setup Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
# Edit .env and add OPENAI_API_KEY
```

### Run the Game

Play via CLI:
```bash
pnpm run "start cli"
```

Development mode (Mastra Studio):
```bash
pnpm run dev
```

## Project Structure

```
src/
├── cli.ts                 # Main CLI interface for playing the game
├── mastra/
│   ├── agents/           # AI agents (Attacker, Defender, Commander)
│   └── workflows/        # Game decision workflow
└── lib/
    ├── board.ts          # Game logic (board state, threat detection)
    ├── display.ts        # Terminal display formatting
    ├── validation.ts     # Input validation and parsing
    ├── types.ts          # TypeScript type definitions
    └── schemas.ts        # Zod schemas for type safety
```

## Game Rules

- 15x15 board
- Players alternate turns (human plays X, AI plays O)
- First to make 5 consecutive stones in any direction wins
- Draw after 225 moves with no winner

## Architecture

The AI decision-making follows this flow:

1. **Board Info Creation**: Prepare current board state for agents
2. **Parallel Analysis**:
   - Attacker Agent analyzes offensive opportunities
   - Defender Agent analyzes threats and defensive positions
3. **Threat Detection**: Find all opponent patterns (3+ consecutive stones)
4. **Merge Proposals**: Combine agent proposals, apply rule-based critical moves
5. **Commander Decision**: Final decision considering both proposals and threats

See `CLAUDE.md` for detailed workflow documentation.

## Development

Run TypeScript compiler:
```bash
npx tsc --noEmit
```

Check for style issues:
```bash
pnpm run lint  # if configured
```

## License

MIT

## Notes

- The app uses dotenv for environment variable management
- Structured output from LLMs is enforced via Zod schemas
- All game logic is purely rule-based (no ML), only decision-making uses LLMs
