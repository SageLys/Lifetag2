// ============================================================
//  RunSystem —— 开局 / 重开（§5.1）
//  迁移自 game.html startRun / restartRun。创建全新 PlayerState 并进入首班。
// ============================================================
import type { GameEngine } from '../GameEngine';
import { createPlayerState } from '../model/PlayerState';

export class RunSystem {
  constructor(private e: GameEngine) {}

  startRun(): void {
    this.e.state = createPlayerState(this.e.context.config);
    this.e.logEvent('run_started', '新局开始');
    this.e.emit({ type: 'runStarted', runId: this.e.state.runId });
    this.e.shift.enterShift(this.e.context.config.firstShiftId);
  }

  restartRun(): void {
    this.startRun();
  }
}
