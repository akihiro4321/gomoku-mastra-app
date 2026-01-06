import { z } from 'zod';

export const CellSchema = z.enum(['.', 'X', 'O']);

export const GameStatusSchema = z.enum(['playing', 'playerWin', 'aiWin', 'draw']);

export const PlayerSchema = z.enum(["player", "ai"]);

export const GameStateSchema = z.object({
  // 盤面（15x15）
  board: z.array(z.array(CellSchema)),
  
  // 現在の手番
  currentTurn: PlayerSchema,
  
  // ゲームステータス
  status: GameStatusSchema,
  
  // 手の履歴（座標文字列）
  moveHistory: z.array(z.string()),
  
  // 手数
  moveCount: z.number(),
});

export const BoardInfoSchema = z.object({
  // 盤面の文字列表現（LLMが読みやすい形式）
  boardText: z.string(),
  
  // 直近の手（プレイヤーが打った手）
  lastMove: z.string(),
  
  // 現在の手数
  moveCount: z.number(),
  
  // AIの石(O)の位置リスト
  aiStones: z.array(z.string()),
  
  // プレイヤーの石(X)の位置リスト
  playerStones: z.array(z.string()),

  // 有力な候補手（周囲2マス以内の空きマス）
  candidateMoves: z.array(z.string()),
});


export const AttackerProposalSchema = z.object({
  move: z.string(),
  reason: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const DefenderProposalSchema = z.object({
  move: z.string(),
  reason: z.string(),
  threat: z.string().nullable(),
  priority: z.enum(["critical", "high", "medium", "low"]),
});

export const MergeProposalsOutputSchema = z.object({
  gameState: GameStateSchema,
  boardInfo: BoardInfoSchema,
  attackerProposal: AttackerProposalSchema.nullable(),
  defenderProposal: DefenderProposalSchema.nullable(),
  validProposalCount: z.number(),
  criticalMove: z.string().nullable(),
});

export const AiDecisionSchema = z.object({
  move: z.string(),
  reason: z.string(),
  comment: z.string(),
  adoptedFrom: z.enum(["attacker", "defender", "own"]),
});