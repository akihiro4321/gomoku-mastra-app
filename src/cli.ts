import 'dotenv/config';
import * as readline from "readline/promises";
import { applyMove, checkWinner, initGameState } from "./lib/board";
import {
    formatBoard,
    formatError,
    formatGameEnd,
    formatGameStart
} from "./lib/display";
import type { GameState } from "./lib/types";
import { parseMove, validateInput } from "./lib/validation";
import { mastra } from "./mastra";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main(): Promise<void> {
  // ゲーム状態の初期化
  let gameState: GameState = initGameState();
  
  // 開始メッセージと初期盤面を表示
  console.log(formatGameStart());
  console.log(formatBoard(gameState));

  // メインループ
  while (gameState.status === "playing") {
    // 1. プレイヤー入力を受付
    const rawInput = await rl.question("\nあなたの番です > ");

    // 2. バリデーション
    const validation = validateInput(rawInput, gameState);

    // quit の場合は終了
    if (validation.isQuit) {
      console.log("\nゲームを終了します");
      break;
    }

    // バリデーションエラーの場合は再入力
    if (!validation.isValid) {
      console.log(formatError(validation.errorMessage!));
      continue;
    }

    // 3. プレイヤーの手を反映
    gameState = applyMove(gameState, validation.position!, "player");

    // 4. 勝敗判定（プレイヤー）
    const playerWinCheck = checkWinner(gameState);
    if (playerWinCheck.hasWinner) {
      gameState = { ...gameState, status: "playerWin" };
      console.log(formatBoard(gameState, { player: validation.position }));
      console.log(formatGameEnd("playerWin"));
      break;
    }

    // 引き分けチェック
    if (gameState.moveCount >= 225) {
      gameState = { ...gameState, status: "draw" };
      console.log(formatBoard(gameState));
      console.log(formatGameEnd("draw"));
      break;
    }

    // 5-8. AI思考 & 手の反映
    console.log("\n💭 AI思考中...\n");

    const workflow = mastra.getWorkflow("gomokuWorkflowV2");
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { gameState }
    });

    // @ts-expect-error - Mastra の型推論の制限
    const aiDecision = result.result.decision;
    const aiPos = parseMove(aiDecision.move)!;

    console.log(`AIの選択: ${aiDecision.move}`);
    console.log(`理由: ${aiDecision.reason}`);
    if (aiDecision.comment) console.log(`コメント: ${aiDecision.comment}`);

    gameState = applyMove(gameState, aiPos, "ai");

    // 9. 勝敗判定（AI）
    const aiWinCheck = checkWinner(gameState);
    if (aiWinCheck.hasWinner) {
      gameState = { ...gameState, status: "aiWin" };
      console.log(formatBoard(gameState, { ai: aiPos }));
      console.log(formatGameEnd("aiWin"));
      break;
    }

    // 10. 盤面表示
    console.log(formatBoard(gameState, {
      player: validation.position,
      ai: aiPos
    }));
  }
}

main();
