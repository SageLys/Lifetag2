import { defineConfig } from 'vitest/config';

// 数据文件位于项目根的 data/ 目录，运行时通过 fetch('data/*.json') 加载。
// dev：Vite 直接从项目根静态服务 /data/*.json。
// build：通过 publicDir 将 data/ 复制进产物，保持 /data/*.json 路径不变。
export default defineConfig({
  publicDir: false, // 不使用默认 public/，数据复制由下方插件处理
  plugins: [
    {
      name: 'copy-data-dir',
      apply: 'build',
      async generateBundle() {
        const { readdir, readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const dataDir = join(import.meta.dirname, 'data');
        const files = await readdir(dataDir);
        for (const f of files) {
          if (!f.endsWith('.json')) continue;
          const source = await readFile(join(dataDir, f));
          this.emitFile({ type: 'asset', fileName: `data/${f}`, source });
        }
      }
    }
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
