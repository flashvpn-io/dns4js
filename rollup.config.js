import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      typescript(),
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
      resolve(),
      commonjs()
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'dns4js'
    },
    plugins: [
      typescript(),
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
      resolve(),
      commonjs()
    ]
  }
];
