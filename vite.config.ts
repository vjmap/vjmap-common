import { defineConfig } from 'vite';

import pkg from './package.json';

const deps = Object.keys(pkg.dependencies);

export default defineConfig({
  build: {
    cssCodeSplit: false,
    sourcemap: true,
    minify: true,
    
    lib: {
      entry: 'src/index.ts',
      name: 'vjcommon',
      fileName: () => `vjcommon.min.js`,
      formats: ['umd'],
    },

    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external(id: string) {
        return deps.some((k) => new RegExp(`^${k}`).test(id));
      },
      output: {
        exports: "named",
        globals: {
          'vjmap': 'vjmap'
        }
      }
    },
  },
});
