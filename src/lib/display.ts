import { GameState, GameStatus, Position } from "./types";

/**
 * ゲーム開始時のメッセージを生成
 */
export function formatGameStart(): string {
  return `
═══════════════════════════════════════════
       五目並べ vs マルチエージェントAI
═══════════════════════════════════════════

ルール:
- あなた（X）が先手、AI（O）が後手です
- 縦・横・斜めに5つ並べたら勝ちです
- 座標は「H8」のように列(A-O) + 行(1-15)で入力
- 終了するには「quit」と入力
`;
}

/**
 * 盤面を文字列にフォーマット
 * @param state - ゲーム状態
 * @param highlights - 直前の手をハイライト表示（任意）
 */
export function formatBoard(
  state: GameState,
  highlights?: { player?: Position; ai?: Position }
): string {
  const lines: string[] = [];

  // 列ラベル（A-O）
  const colLabels = "   A B C D E F G H I J K L M N O";
  lines.push(colLabels);

  // 各行を生成
  for (let row = 0; row < 15; row++) {
    // 行番号（1-15、右寄せ2桁）
    const rowNum = String(row + 1).padStart(2, " ");

    // 各セルを文字に変換
    const cells = state.board[row].map((cell, col) => {
      // 直前のプレイヤーの手をハイライト
      if (highlights?.player?.row === row && highlights?.player?.col === col) {
        return "✖︎";
      }
      // 直前のAIの手をハイライト
      if (highlights?.ai?.row === row && highlights?.ai?.col === col) {
        return "○";
      }
      return cell;
    });

    lines.push(`${rowNum} ${cells.join(" ")}`);
  }

  return lines.join("\n");
}

/**
 * エラーメッセージをフォーマット
 */
export function formatError(message: string): string {
  return `\n❌ ${message}`;
}

/**
 * ゲーム終了メッセージを生成
 */
export function formatGameEnd(result: GameStatus): string {
  switch (result) {
    case "playerWin":
      return `
            🎉 おめでとうございます！あなたの勝ちです！
            `;
    case "aiWin":
      return `
            🤖 AIの勝ちです。また挑戦してください！
            `;
    case "draw":
      return `
            🤝 引き分けです。
            `;
    default:
      return "";
  }
}