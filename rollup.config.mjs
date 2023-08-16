import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import svelte from 'rollup-plugin-svelte';
import del from 'rollup-plugin-delete';
import postcss from 'rollup-plugin-postcss';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve';
import { babel } from '@rollup/plugin-babel';
import { hoistImportDeps } from './plugins/hoist-import-deps.js';

//
//

const __DEV__ = !!process.env.ROLLUP_WATCH;

//
//

const addons = [];

//
//

if (!__DEV__) {
  //
  //  Add the typescript definition file build
  addons.push({
    input: './dist-test/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  });
} else {
  //
  //  Add the build for the fixture
  addons.push({
    input: './tests/fixture/main.ts',
    output: { dir: 'dist-test/fixture', format: 'es' },
    plugins: [
      del({ targets: 'dist-test/fixture/*' }),
      esbuild({
        sourceMap: false,
        minify: false,
      }),

      // Imports the svelte
      commonjs(),
      nodeResolve({ preferBuiltins: true,jsnext: true, exportConditions: ["solid", "node"] }),
      hoistImportDeps(),

      // Svelte and styles
      svelte(),
      // For solid
      babel({
        extensions: ['.tsx'],
        babelHelpers: 'bundled',
        presets: ['solid'],
      }),
      postcss(),

      // Serve and livereload
      serve({
        port: 3039,
        historyApiFallback: true,
      }),
    ],
  });
}

//
//

export default [
  {
    input: [
      './src/index.ts',
      './src/svelte/svelte.ts',
      './src/solid/solid.tsx',
    ],
    output: {
      dir: './dist',
      format: 'es',
      sourcemap: false,
      manualChunks(id) {
        if (id.includes('minor-projects')) {
          if (id.includes('svelte')) {
            return 'svelte';
          }

          if (id.includes('solid')) {
            return 'solid';
          }

          return 'index';
        }
      },
      entryFileNames: `[name].js`,
      chunkFileNames: `[name].js`,
      assetFileNames: `[name].[ext]`,
    },
    external: [
      'fast-deep-equal',
      'svelte',
      'svelte/internal',
      'svelte/internal/disclose-version',
      'solid-js',
      'solid-js/web',
    ],
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
    plugins: [
      esbuild({
        sourceMap: false,
        minify: false,
      }),
      babel({
        extensions: ['.tsx'],
        babelHelpers: 'bundled',
        presets: [['solid', { generate: 'ssr', hydratable: true }]],
      }),
      svelte(),
    ],
  },
  ...addons,
];
