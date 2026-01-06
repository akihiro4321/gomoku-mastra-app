import { z } from 'zod';
import { CellSchema, GameStatusSchema, PlayerSchema, GameStateSchema, BoardInfoSchema } from './schemas';

export type Cell = z.infer<typeof CellSchema>;

export type GameStatus = z.infer<typeof GameStatusSchema>;

// 座標
export interface Position {
  col: number;  // 0-14 (A-O)
  row: number;  // 0-14 (1-15)
}

// プレイヤー種別
export type Player = z.infer<typeof PlayerSchema>;

// 盤面の状態
// interfaceを維持したい場合は extends を使用します
export interface GameState extends z.infer<typeof GameStateSchema> {}

export interface ValidationResult {
  isValid: boolean;
  
  // バリデーション成功時
  normalizedMove?: string;  // 正規化された座標 (例: "H8")
  position?: Position;      // パース済み座標
  
  // バリデーション失敗時
  errorType?: "format" | "occupied" | "outOfBounds" | "quit";
  errorMessage?: string;
  
  // quit入力の場合
  isQuit: boolean;
}

// 勝敗チェック結果
export interface WinCheckResult {
  // 勝者がいるか
  hasWinner: boolean;
  
  // 勝者（hasWinner が true の場合のみ）
  winner?: Player;
  
  // 勝利ライン（5つの座標）
  winningLine?: Position[];
}

export interface BoardInfo extends z.infer<typeof BoardInfoSchema> {}