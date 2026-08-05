// ============================================================
//  命令结果（CommandResult）—— 平台无关
//  引擎处理一条命令后的返回：更新后的状态 + 事件列表 + 成功/失败。
// ============================================================
import type { PlayerState } from '../model/PlayerState';
import type { GameEvent } from './GameEvent';

export interface CommandResult {
  /** 命令是否被接受（false 表示非法操作被拒绝） */
  ok: boolean;
  /** 处理后的玩家状态（与传入状态可能为同一引用，startRun/restartRun 为新对象） */
  state: PlayerState;
  /** 本次命令产生的领域事件，按发生顺序排列 */
  events: GameEvent[];
  /** 被拒绝时的原因（ok=false 时存在） */
  rejection?: { reason: string };
}
