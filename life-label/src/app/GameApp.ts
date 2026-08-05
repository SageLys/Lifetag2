// ============================================================
//  GameApp —— 装配各层并启动：
//   data 加载/校验 → core 引擎 → presentation（视图/控制器）→ input → loop
// ============================================================
import { loadGameData } from '../data/GameDataLoader';
import { indexGameData } from '../data/GameDataIndex';
import { validateGameData } from '../data/GameDataValidator';
import { GameEngine } from '../core/GameEngine';
import { createGameContext } from '../core/GameContext';
import { CanvasContext } from '../presentation/canvas/CanvasContext';
import { createViewState } from '../presentation/ViewState';
import { createRenderData } from '../presentation/canvas/RenderContext';
import { PresentationController } from '../presentation/PresentationController';
import { drawLoading } from '../presentation/canvas/CanvasRenderer';
import { GameController } from './GameController';
import { GameLoop } from './GameLoop';
import { PointerInput } from '../input/PointerInput';
import { KeyboardInput } from '../input/KeyboardInput';

export class GameApp {
  private cc: CanvasContext;
  loop?: GameLoop;

  constructor(canvas: HTMLCanvasElement) {
    this.cc = new CanvasContext(canvas);
    window.addEventListener('resize', this.cc.resize);
  }

  async start(): Promise<void> {
    this.showLoading('人生标签交易所');
    await (document as any).fonts.ready;
    try {
      const data = await loadGameData();
      const errs = validateGameData(data);
      if (errs.length) {
        console.error('配置校验失败:\n' + errs.join('\n'));
        this.showLoading('配置错误，详见控制台');
        return;
      }
      const index = indexGameData(data);
      const engine = new GameEngine(createGameContext(data, index));
      const view = createViewState();
      const renderData = createRenderData(data, index);
      const presentation = new PresentationController(view, renderData);
      const controller = new GameController(engine, view, presentation, renderData);

      new PointerInput(this.cc, controller, view, renderData).attach();
      new KeyboardInput(controller).attach();

      this.loop = new GameLoop(this.cc, controller, view, renderData);
      this.loop.start();
    } catch (err: any) {
      console.error(err);
      this.showLoading('数据加载失败：' + (err && err.message ? err.message : err));
    }
  }

  private showLoading(msg: string): void {
    this.cc.applyTransform();
    drawLoading(this.cc.ctx, msg);
  }
}
