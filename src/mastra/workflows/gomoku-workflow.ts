import { createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";
import { createBoardInfo, findCriticalMove, detectThreats } from "../../lib/board";
import { AiDecisionSchema, AttackerProposalSchema, BoardInfoSchema, DefenderProposalSchema, GameStateSchema, MergeProposalsOutputSchema } from "../../lib/schemas";
import { BoardInfo, GameState } from "../../lib/types";
import { getEmptyPositions, isValidMove } from "../../lib/validation";

const createBoardInfoStep = createStep({
  id: 'create-board-info',
  inputSchema: z.object({
    gameState: GameStateSchema,
  }),
  outputSchema: z.object({
    gameState: GameStateSchema,
    boardInfo: BoardInfoSchema,
  }),
  execute: async ({ inputData }) => {
    const { gameState } = inputData;
    const boardInfo = createBoardInfo(gameState);
    return {
      gameState,
      boardInfo,
    };
  }
});


const attackerAnalysisStep = createStep({
  id: 'attacker-analysis',
  inputSchema: z.object({
    gameState: GameStateSchema,
    boardInfo: BoardInfoSchema,
  }),
  outputSchema: z.object({
    proposal: AttackerProposalSchema,
    isValid: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { gameState, boardInfo } = inputData;
    const agent = mastra?.getAgent("attackerAgent");
    if (!agent) throw new Error("Attacker agent not found");

    const prompt = `
## 五目並べ（15x15盤面）
あなたはAI（O）の攻撃担当です。

## 現在の盤面

\`\`\`
${boardInfo.boardText}
\`\`\`

## AI（O）の全石の位置
${boardInfo.aiStones.join(", ") || "なし"}

## 相手（X）の全石の位置
${boardInfo.playerStones.join(", ") || "なし"}

## 直前の相手の手
${boardInfo.lastMove || "なし"}

## 候補手（重要）
以下のリストの中から、最も攻撃的に優れた手を選んでください。
候補手: ${boardInfo.candidateMoves.join(", ")}

## 指示
攻撃的な視点で次の一手を提案してください。
    `;
    const response = await agent.generate(prompt, {
      structuredOutput: {
        schema: AttackerProposalSchema
      },
    });
    const proposal = response.object;
    const isValid = isValidMove(proposal.move, gameState);

    return {
      proposal,
      isValid
    };
  }
});

const defenderAnalysisStep = createStep({
  id: 'defender-analysis',
  inputSchema: z.object({
    gameState: GameStateSchema,
    boardInfo: BoardInfoSchema,
  }),
  outputSchema: z.object({
    proposal: DefenderProposalSchema,
    isValid: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { gameState, boardInfo } = inputData;
    const agent = mastra?.getAgent("defenderAgent");
    if (!agent) throw new Error("Defender agent not found");

    // 相手の脅威（3連以上）を検出
    const threats = detectThreats(gameState, "player");
    const threatsText = threats.length > 0
      ? `相手の脅威: ${threats.join(", ")}（いずれかをブロックする必要があります）`
      : "相手の3連以上の脅威は現在ありません";

    const prompt = `
## 五目並べ（15x15盤面）
あなたはAI（O）の守備担当です。

## 現在の盤面

\`\`\`
${boardInfo.boardText}
\`\`\`

## 相手（X）の全石の位置
${boardInfo.playerStones.join(", ") || "なし"}

## 直前の相手の手
${boardInfo.lastMove || "なし"}

## 【重要】相手の脅威分析
${threatsText}

## 候補手（重要）
以下のリストの中から、最も守備的に優れた手を選んでください。
候補手: ${boardInfo.candidateMoves.join(", ")}

## 重要な分析ポイント
- 相手の脅威（上記）をすべてブロックすることが最優先
- 複数の脅威がある場合、最も危険な脅威（4連に最も近い脅威）を優先

## 指示
守備的な視点で次の一手を提案してください。相手の脅威をブロックすることを絶対に優先してください。
    `;

    const response = await agent.generate(prompt, {
      structuredOutput: {
        schema: DefenderProposalSchema,
      },
    });

    const proposal = response.object;
    const isValid = isValidMove(proposal.move, gameState);

    return {
      proposal,
      isValid
    };
  }
});

const mergeProposalsStep = createStep({
  id: 'merge-proposals',
  inputSchema: z.object({
    "attacker-analysis": z.object({
      proposal: AttackerProposalSchema,
      isValid: z.boolean(),
    }),
    "defender-analysis": z.object({
      proposal: DefenderProposalSchema,
      isValid: z.boolean(),
    }),
  }),
  outputSchema: MergeProposalsOutputSchema,
  execute: async ({ inputData, getInitData, getStepResult }) => {
    // 最初の入力から gameState を取得
    const initialPayload = getInitData() as { gameState: GameState };

    // createBoardInfoStep の出力から boardInfo を取得
    const boardInfoResult = getStepResult(createBoardInfoStep) as { gameState: GameState; boardInfo: BoardInfo };

    const gameState = initialPayload.gameState;
    const boardInfo = boardInfoResult.boardInfo;

    // ルールベースで決定的な手をチェック（LLM呼び出し前の最後のチャンス）
    const criticalMove = findCriticalMove(gameState, 'ai');
    if (criticalMove) {
      const move = `${String.fromCharCode(65 + criticalMove.col)}${criticalMove.row + 1}`;
      return {
        gameState,
        boardInfo,
        attackerProposal: null,
        defenderProposal: null,
        validProposalCount: 0,
        // フラグを追加：これは critical move であることを示す
        criticalMove: move,
      };
    }

    const attackerData = inputData["attacker-analysis"];
    const defenderData = inputData["defender-analysis"];

    // 有効な提案のみを渡す
    const attackerProposal = attackerData.isValid ? attackerData.proposal : null;
    const defenderProposal = defenderData.isValid ? defenderData.proposal : null;

    const validProposalCount = (attackerProposal ? 1 : 0) + (defenderProposal ? 1 : 0);

    return {
      gameState,
      boardInfo,
      attackerProposal,
      defenderProposal,
      validProposalCount,
      criticalMove: null,
    };
  },
});

const commanderDecisionStep = createStep({
  id: 'commander-decision',
  // @ts-expect-error - Mastra の型推論の制限
  inputSchema: MergeProposalsOutputSchema,
  outputSchema: z.object({
    decision: AiDecisionSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      gameState,
      boardInfo,
      attackerProposal,
      defenderProposal,
      validProposalCount,
      criticalMove,
    } = inputData as any;

    // 相手の脅威を検出
    const threats = detectThreats(gameState, "player");

    // ルールベースで見つかった決定的な手がある場合
    if (criticalMove) {
      return {
        decision: {
          move: criticalMove,
          reason: "勝利確定、または敗北回避のための即時実行（ルールベース）",
          comment: "五連が作れる、あるいは相手の五連を阻止する必要がある重要局面と判断しました。",
          adoptedFrom: "own",
        },
      };
    }

    // 両方無効 → ランダムに空きマスを選ぶ（フォールバック）
    if (validProposalCount === 0) {
      const emptyPositions = getEmptyPositions(gameState);
      const randomMove = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
      return {
        decision: {
          move: randomMove,
          reason: "有効な提案がなかったためランダム選択",
          comment: "攻撃派・守備派の提案が両方不正だったため、空きマスからランダムに選びました。",
          adoptedFrom: "own",
        },
      };
    }

    // 1つだけ有効 → そのまま採用
    if (validProposalCount === 1) {
      if (attackerProposal) {
        return {
          decision: {
            move: attackerProposal.move,
            reason: attackerProposal.reason,
            comment: "守備派の提案が不正だったため攻撃派を採用",
            adoptedFrom: "attacker",
          },
        };
      } else {
        return {
          decision: {
            move: defenderProposal!.move,
            reason: defenderProposal!.reason,
            comment: "攻撃派の提案が不正だったため守備派を採用",
            adoptedFrom: "defender",
          },
        };
      }
    }

    const agent = mastra?.getAgent("commanderAgent");
    if (!agent) throw new Error("Commander agent not found");

    const threatsText = threats.length > 0
      ? `相手の脅威（ブロック必須）: ${threats.join(", ")}`
      : "相手の3連以上の脅威は現在ありません";

    const prompt = `
## 五目並べ 司令塔
2つの提案から最終手を決定してください。

## 現在の盤面

\`\`\`
${boardInfo.boardText}
\`\`\`

## 【重要】相手の脅威分析
${threatsText}

## 候補手（重要）
以下のいずれかの提案から選ぶか、あるいはより良い手があれば ${boardInfo.candidateMoves.join(", ")} から選んでください。

## 攻撃派の提案
手: ${attackerProposal!.move}
理由: ${attackerProposal!.reason}

## 守備派の提案
手: ${defenderProposal!.move}
理由: ${defenderProposal!.reason}
脅威: ${defenderProposal!.threat ?? "なし"}

## 相手（X）の全石の位置
${boardInfo.playerStones.join(", ") || "なし"}

## 相手の最新の手
${boardInfo.lastMove || "なし"}

## 指示
以下の優先順位で最終的な手を決定してください：
1. 相手の脅威（上記）が存在する場合、これをブロック（必須）
2. 相手が四を作った場合、それを止める
3. 自分の四を作る
4. その他の戦略的な手

盤面全体を考慮して、最終的な手を決定してください。
    `;

    const response = await agent.generate(prompt, {
      structuredOutput: {
        schema: AiDecisionSchema,
      },
    });
    const decision = response.object;
    return {
      decision,
    };
  }
});

export const gomokuWorkflow = createWorkflow({
  id: 'gomoku-workflow',
  inputSchema: z.object({
    gameState: GameStateSchema,
  }),
  outputSchema: z.object({
    decision: AiDecisionSchema,
  })
})
  .then(createBoardInfoStep)
  .parallel([attackerAnalysisStep, defenderAnalysisStep])
  .then(mergeProposalsStep)
  .then(commanderDecisionStep);

gomokuWorkflow.commit();