import type { BoardInfo, Cell, GameState, Player, Position, WinCheckResult } from "./types";

export function initGameState(): GameState {
  const board: Cell[][] = Array(15)
    .fill(null)
    .map(() => Array(15).fill("."));
  
  return {
    board,
    currentTurn: "player",
    status: "playing",
    moveHistory: [],
    moveCount: 0,
  };
}

/**
 * 手を盤面に反映する
 * @param state - 現在のゲーム状態
 * @param position - 置く位置
 * @param player - プレイヤー種別
 */
export function applyMove(
  state: GameState,
  position: Position,
  player: Player
): GameState {
  // 盤面をコピー（元の状態を変更しない）
  const newBoard = state.board.map((row) => [...row]);

  // 石を置く
  const cell: Cell = player === "player" ? "X" : "O";
  newBoard[position.row][position.col] = cell;

  // 座標文字列を生成（履歴用）
  const move = `${String.fromCharCode(65 + position.col)}${position.row + 1}`;

  return {
    ...state,
    board: newBoard,
    currentTurn: player === "player" ? "ai" : "player",
    moveHistory: [...state.moveHistory, move],
    moveCount: state.moveCount + 1,
  };
}

/**
 * 勝者がいるかチェック
 * @param state - ゲーム状態
 */
export function checkWinner(state: GameState): WinCheckResult {
  const board = state.board;

  // 4方向: 横、縦、右下斜め、左下斜め
  const directions = [
    { dr: 0, dc: 1 },  // 横 →
    { dr: 1, dc: 0 },  // 縦 ↓
    { dr: 1, dc: 1 },  // 斜め ↘
    { dr: 1, dc: -1 }, // 斜め ↙
  ];

  // 全マスをチェック
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cell = board[row][col];

      // 空マスはスキップ
      if (cell === ".") continue;

      // 各方向をチェック
      for (const { dr, dc } of directions) {
        const line = getLine(board, row, col, dr, dc);

        if (line.length === 5) {
          // 5つ揃った
          const winner: Player = cell === "X" ? "player" : "ai";
          return {
            hasWinner: true,
            winner,
            winningLine: line,
          };
        }
      }
    }
  }

  // 勝者なし
  return { hasWinner: false };
}

/**
 * 指定位置から指定方向に同じ石が続く座標を取得
 * @param board - 盤面
 * @param startRow - 開始行
 * @param startCol - 開始列
 * @param dr - 行の増分
 * @param dc - 列の増分
 */
function getLine(
  board: Cell[][],
  startRow: number,
  startCol: number,
  dr: number,
  dc: number
): Position[] {
  const cell = board[startRow][startCol];
  const line: Position[] = [];

  for (let i = 0; i < 5; i++) {
    const row = startRow + dr * i;
    const col = startCol + dc * i;

    // 盤面外チェック
    if (row < 0 || row > 14 || col < 0 || col > 14) {
      break;
    }

    // 同じ石かチェック
    if (board[row][col] !== cell) {
      break;
    }

    line.push({ row, col });
  }

  return line;
}

/**
 * 盤面情報をLLM用に整形
 * @param state - 現在のゲーム状態
 */
export function createBoardInfo(state: GameState): BoardInfo {
  const analysisText = generateAnalysisText(state);
  
  return {
    boardText: formatBoardForLLM(state),
    lastMove: state.moveHistory.at(-1) ?? "",
    moveCount: state.moveCount,
    aiStones: getStonePositions(state, "O"),
    playerStones: getStonePositions(state, "X"),
    candidateMoves: getCandidateMoves(state),
    analysisText,
  };
}

/**
 * 指定した石の座標リストを取得
 * @param state - ゲーム状態
 * @param cell - 対象の石（"X" or "O"）
 */
export function getStonePositions(state: GameState, cell: Cell): string[] {
  const positions: string[] = [];

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (state.board[row][col] === cell) {
        const move = `${String.fromCharCode(65 + col)}${row + 1}`;
        positions.push(move);
      }
    }
  }

  return positions;
}

/**
 * LLM用の盤面文字列を生成
 * display.ts の formatBoard と似ているが、LLM向けにシンプルにする
 */
function formatBoardForLLM(state: GameState): string {
  const lines: string[] = [];

  // 列ラベル
  lines.push("   A B C D E F G H I J K L M N O");

  // 各行
  for (let row = 0; row < 15; row++) {
    const rowNum = String(row + 1).padStart(2, " ");
    const cells = state.board[row].join(" ");
    lines.push(`${rowNum} ${cells}`);
  }

  return lines.join("\n");
}

/**
 * 勝利確定の手、または敗北回避の手を探す（ルールベース）
 * @param state - ゲーム状態
 * @param selfPlayer - 自分のプレイヤー種別 ("ai" or "player")
 */
export function findCriticalMove(state: GameState, selfPlayer: Player): Position | null {
  const opponent: Player = selfPlayer === "ai" ? "player" : "ai";
  const emptyCells: Position[] = [];

  // 空きマスを収集
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (state.board[row][col] === ".") {
        emptyCells.push({ row, col });
      }
    }
  }

  // 1. 自分の勝ちを探す (Checkmate)
  for (const pos of emptyCells) {
    // 仮に置いてみる
    const nextState = applyMove(state, pos, selfPlayer);
    if (checkWinner(nextState).hasWinner) {
      return pos;
    }
  }

  // 2. 相手の勝ちを防ぐ (Block Checkmate)
  for (const pos of emptyCells) {
    // 相手が置いたと仮定
    const nextState = applyMove(state, pos, opponent);
    if (checkWinner(nextState).hasWinner) {
      return pos;
    }
  }

  // 延長：三連を四連にされるのを防ぐなどはLLMまたは別の重要手検索に任せる
  return null;
}

/**
 * 有力な候補手（既存の石の近傍）を取得する
 * @param state - ゲーム状態
 * @param range - 探索範囲（デフォルト2マス）
 */
export function getCandidateMoves(state: GameState, range: number = 2): string[] {
  const candidates = new Set<string>();

  let hasStones = false;

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (state.board[row][col] !== ".") {
        hasStones = true;
        // 石がある場所から周囲 range マスを探索
        for (let dr = -range; dr <= range; dr++) {
          for (let dc = -range; dc <= range; dc++) {
            const r = row + dr;
            const c = col + dc;

            // 盤面外
            if (r < 0 || r > 14 || c < 0 || c > 14) continue;

            // 空きマスなら候補に追加
            if (state.board[r][c] === ".") {
              const move = `${String.fromCharCode(65 + c)}${r + 1}`;
              candidates.add(move);
            }
          }
        }
      }
    }
  }

  // 盤面が空なら天元(H8)
  if (!hasStones) {
    return ["H8"];
  }

  return Array.from(candidates).sort();
}

/**
 * 相手（またはAI）の脅威（3連以上）を検出
 * 連続した石だけでなく、1マスの隙間がある石も検出（例: X X . X X）
 * @param state - ゲーム状態
 * @param player - チェック対象のプレイヤー
 */
export function detectThreats(state: GameState, player: Player): string[] {
  const board = state.board;
  const cell = player === "player" ? "X" : "O";
  const threats: Map<string, { length: number; positions: string[] }> = new Map();

  const directions = [
    { dr: 0, dc: 1, name: "横" },
    { dr: 1, dc: 0, name: "縦" },
    { dr: 1, dc: 1, name: "斜め↘" },
    { dr: 1, dc: -1, name: "斜め↙" },
  ];

  // 各空きマスについて、その位置を埋めることで形成される脅威をチェック
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] === ".") {
        // 各方向で相手の石の数をカウント
        for (const { dr, dc, name } of directions) {
          let countBefore = 0;  // この位置の手前方向の相手の石数
          let countAfter = 0;   // この位置の奥方向の相手の石数

          // 手前方向にカウント（最大4つまで）
          for (let i = 1; i <= 4; i++) {
            const r = row - dr * i;
            const c = col - dc * i;
            if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === cell) {
              countBefore++;
            } else {
              break;
            }
          }

          // 奥方向にカウント（最大4つまで）
          for (let i = 1; i <= 4; i++) {
            const r = row + dr * i;
            const c = col + dc * i;
            if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === cell) {
              countAfter++;
            } else {
              break;
            }
          }

          // 合計が3以上なら脅威
          const totalLength = countBefore + countAfter;
          if (totalLength >= 3) {
            const move = `${String.fromCharCode(65 + col)}${row + 1}`;
            // 同じ位置で複数方向の脅威がある場合は最長を保持
            if (!threats.has(move) || threats.get(move)!.length < totalLength) {
              threats.set(move, {
                length: totalLength,
                positions: [move],
              });
            }
          }
        }
      }
    }
  }

  // 長さでソート（長い順）、同じ長さなら位置順
  return Array.from(threats.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([move, data]) => `${move}(${data.length}連)`);
}

/**
 * 高度な盤面解析（ヒューリスティック）
 */
interface GamePattern {
  type: "Five" | "OpenFour" | "BlockedFour" | "OpenThree" | "BlockedThree";
  player: Player;
  positions: Position[];
  recommendedMoves: Position[]; // 阻止、または完了のために打つべき場所
  description: string;
}

export function analyzePatterns(state: GameState): GamePattern[] {
  const patterns: GamePattern[] = [];
  const board = state.board;

  const directions = [
    { dr: 0, dc: 1, name: "横" },
    { dr: 1, dc: 0, name: "縦" },
    { dr: 1, dc: 1, name: "斜め↘" },
    { dr: 1, dc: -1, name: "斜め↙" },
  ];

  const players: Player[] = ["player", "ai"];

  for (const player of players) {
    const char = player === "player" ? "X" : "O";
    const opponentChar = player === "player" ? "O" : "X";

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        for (const { dr, dc, name } of directions) {
          const winSize = 5;
          const segment: string[] = [];
          const positions: Position[] = [];
          
          let outOfBounds = false;
          for (let i = 0; i < winSize; i++) {
            const r = row + dr * i;
            const c = col + dc * i;
            if (r >= 0 && r < 15 && c >= 0 && c < 15) {
              segment.push(board[r][c]);
              positions.push({ row: r, col: c });
            } else {
              outOfBounds = true;
              break;
            }
          }

          if (outOfBounds) continue;

          const stoneCount = segment.filter(s => s === char).length;
          const emptyCount = segment.filter(s => s === ".").length;
          const opponentCount = segment.filter(s => s === opponentChar).length;

          if (opponentCount > 0) continue;

          // 推奨される手（この5マス内の空きマス）
          const sementMoves = positions.filter((_, i) => segment[i] === ".");

          // 1. 五連
          if (stoneCount === 5) {
            patterns.push({
              type: "Five",
              player,
              positions: [...positions],
              recommendedMoves: [],
              description: `${name}に五連があります！勝利確定です。`,
            });
          }

          // 2. 四連 (石4つ、空き1つ)
          if (stoneCount === 4 && emptyCount === 1) {
            const beforeR = row - dr;
            const beforeC = col - dc;
            const afterR = row + dr * 5;
            const afterC = col + dc * 5;

            const isBeforeOpen = beforeR >= 0 && beforeR < 15 && beforeC >= 0 && beforeC < 15 && board[beforeR][beforeC] === ".";
            const isAfterOpen = afterR >= 0 && afterR < 15 && afterC >= 0 && afterC < 15 && board[afterR][afterC] === ".";

            const isContinuous = !segment.includes(".");
            if (isContinuous && isBeforeOpen && isAfterOpen) {
              patterns.push({
                type: "OpenFour",
                player,
                positions: [...positions],
                recommendedMoves: [...sementMoves],
                description: `${name}に活四（両端空きの4連）があります。王手です。`,
              });
            } else {
              patterns.push({
                type: "BlockedFour",
                player,
                positions: [...positions],
                recommendedMoves: [...sementMoves],
                description: `${name}に四連（${isContinuous ? "片端ブロック" : "隙間あり"}）があります。`,
              });
            }
          }

          // 3. 三連 (石3つ、空き2つ)
          if (stoneCount === 3 && emptyCount === 2) {
            const beforeR = row - dr;
            const beforeC = col - dc;
            const afterR = row + dr * 5;
            const afterC = col + dc * 5;

            const isBeforeOpen = beforeR >= 0 && beforeR < 15 && beforeC >= 0 && beforeC < 15 && board[beforeR][beforeC] === ".";
            const isAfterOpen = afterR >= 0 && afterR < 15 && afterC >= 0 && afterC < 15 && board[afterR][afterC] === ".";

            if (isBeforeOpen && isAfterOpen) {
              // 活三は、内白（segment内の空き）だけでなく、両端（before, after）も重要
              const totalRecommended = [...sementMoves];
              if (isBeforeOpen) totalRecommended.push({ row: beforeR, col: beforeC });
              if (isAfterOpen) totalRecommended.push({ row: afterR, col: afterC });

              patterns.push({
                type: "OpenThree",
                player,
                positions: positions.filter((_, i) => segment[i] === char),
                recommendedMoves: totalRecommended,
                description: `${name}に活三（次に活四を作れる手）があります。`,
              });
            } else if (isBeforeOpen || isAfterOpen) {
              const totalRecommended = [...sementMoves];
              if (isBeforeOpen) totalRecommended.push({ row: beforeR, col: beforeC });
              if (isAfterOpen) totalRecommended.push({ row: afterR, col: afterC });

              patterns.push({
                type: "BlockedThree",
                player,
                positions: positions.filter((_, i) => segment[i] === char),
                recommendedMoves: totalRecommended,
                description: `${name}に三連（片端ブロック）があります。`,
              });
            }
          }
        }
      }
    }
  }

  // 重複を削除
  const uniquePatterns: GamePattern[] = [];
  const seen = new Set<string>();

  for (const p of patterns) {
    const posKey = p.positions.map(pos => `${pos.row},${pos.col}`).sort().join("|");
    const key = `${p.type}-${p.player}-${posKey}`;
    if (!seen.has(key)) {
      uniquePatterns.push(p);
      seen.add(key);
    }
  }

  return uniquePatterns;
}

export function generateAnalysisText(state: GameState): string {
  const patterns = analyzePatterns(state);
  
  if (patterns.length === 0) return "特筆すべきパターンは見つかりませんでした。";

  const aiPatterns = patterns.filter(p => p.player === "ai");
  const playerPatterns = patterns.filter(p => p.player === "player");

  let text = "【盤面高度解析結果 (V4)】\n";

  const typePriority = {
    "Five": 0,
    "OpenFour": 1,
    "BlockedFour": 2,
    "OpenThree": 3,
    "BlockedThree": 4
  };

  const sortPattern = (a: GamePattern, b: GamePattern) => typePriority[a.type] - typePriority[b.type];

  const posToCoord = (p: Position) => `${String.fromCharCode(65 + p.col)}${p.row + 1}`;

  if (playerPatterns.length > 0) {
    text += "▼ 相手（X）の状況・阻止すべき場所:\n";
    playerPatterns.sort(sortPattern).forEach(p => {
      const recStr = p.recommendedMoves.length > 0 ? p.recommendedMoves.map(posToCoord).join(", ") : "勝利確定";
      text += `- [${p.type}] ${p.description}\n  👉 阻止推奨座標: ${recStr}\n`;
    });
  } else {
    text += "▼ 相手（X）の阻止が必要な急所はありません。\n";
  }

  text += "\n";

  if (aiPatterns.length > 0) {
    text += "▼ AI（O）の状況・狙い目:\n";
    aiPatterns.sort(sortPattern).forEach(p => {
      const recStr = p.recommendedMoves.length > 0 ? p.recommendedMoves.map(posToCoord).join(", ") : "勝利確定";
      text += `- [${p.type}] ${p.description}\n  👉 攻撃推奨座標: ${recStr}\n`;
    });
  } else {
    text += "▼ AI（O）の目立ったチャンスはありません。\n";
  }

  return text;
}