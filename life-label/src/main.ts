// 应用入口（app 层）：仅获取 Canvas、创建并启动应用、处理顶层错误。
import { GameApp } from './app/GameApp';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) {
  console.error('找不到 #game canvas 元素');
} else {
  const app = new GameApp(canvas);
  app.start().catch((err) => console.error('应用启动失败：', err));
}
