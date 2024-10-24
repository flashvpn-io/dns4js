import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

export default [
  {
    input: 'src/index.js',
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      babel({ babelHelpers: 'bundled' }),
      resolve(),
      commonjs()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'dns4js'
    },
    plugins: [
      babel({ babelHelpers: 'bundled' }),
      resolve(),
      commonjs()
    ]
  }
];
