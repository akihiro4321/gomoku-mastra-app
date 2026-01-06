
import { Mastra } from '@mastra/core/mastra';
import { LangfuseExporter } from '@mastra/langfuse';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { attackerAgent, commanderAgent, defenderAgent } from './agents/gomoku-agent';
import { weatherAgent } from './agents/weather-agent';
import { completenessScorer, toolCallAppropriatenessScorer, translationScorer } from './scorers/weather-scorer';
import { gomokuWorkflow } from './workflows/gomoku-workflow';
import { weatherWorkflow } from './workflows/weather-workflow';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, gomokuWorkflow },
  agents: { weatherAgent, commanderAgent, attackerAgent, defenderAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    // Enables DefaultExporter and CloudExporter for tracing
    configs: {
      langfuse: {
        serviceName: 'gomoku-mastra-app',
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASEURL,
          }),
        ],
      },
    },
  }),
});
