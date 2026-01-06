// src/lib/validation.ts
import type { GameState, Position, ValidationResult } from "./types";

/**
 * プレイヤー入力をバリデーション
 * @param rawInput - 生の入力文字列
 * @param gameState - 現在のゲーム状態
 */
export function validateInput(
  rawInput: string,
  gameState: GameState
): ValidationResult {
  const trimmed = rawInput.trim().toLowerCase();

  // quit チェック
  if (trimmed === "quit") {
    return {
      isValid: false,
      isQuit: true,
    };
  }

  // 形式チェック: a-o + 1-15
  // 例: h8, A1, o15
  const match = trimmed.match(/^([a-o])(\d{1,2})$/);

  if (!match) {
    return {
      isValid: false,
      isQuit: false,
      errorType: "format",
      errorMessage: "入力形式が正しくありません（例: H8）",
    };
  }

  // 座標をパース
  const colChar = match[1];
  const rowStr = match[2];

  const col = colChar.charCodeAt(0) - "a".charCodeAt(0); // 0-14
  const row = parseInt(rowStr, 10) - 1; // 0-14

  // 行の範囲チェック（1-15 → 0-14）
  if (row < 0 || row > 14) {
    return {
      isValid: false,
      isQuit: false,
      errorType: "outOfBounds",
      errorMessage: "行は1〜15の範囲で指定してください",
    };
  }

  // 空きマスチェック
  if (gameState.board[row][col] !== ".") {
    return {
      isValid: false,
      isQuit: false,
      errorType: "occupied",
      errorMessage: "そのマスには既に石があります",
    };
  }

  // 正規化された座標文字列を生成（大文字）
  const normalizedMove = `${colChar.toUpperCase()}${row + 1}`;
  const position: Position = { col, row };

  return {
    isValid: true,
    isQuit: false,
    normalizedMove,
    position,
  };
}

/**
 * 座標文字列をパースする
 * @param move - "H8" のような座標文字列
 * @returns Position または null
 */
export function parseMove(move: string): Position | null {
  const match = move.trim().toUpperCase().match(/^([A-O])(\d{1,2})$/);
  if (!match) return null;

  const col = match[1].charCodeAt(0) - "A".charCodeAt(0);
  const row = parseInt(match[2], 10) - 1;

  if (row < 0 || row > 14 || col < 0 || col > 14) return null;

  return { col, row };
}

/**
 * AIの提案が合法手かチェックする
 * @param move - 提案された手（"H8" など）
 * @param gameState - 現在のゲーム状態
 */
export function isValidMove(move: string, gameState: GameState): boolean {
  const position = parseMove(move);
  if (!position) return false;
  return gameState.board[position.row][position.col] === ".";
}

/**
 * 空きマスのリストを取得
 */
export function getEmptyPositions(gameState: GameState): string[] {
  const positions: string[] = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (gameState.board[row][col] === ".") {
        const move = `${String.fromCharCode(65 + col)}${row + 1}`;
        positions.push(move);
      }
    }
  }
  return positions;
}