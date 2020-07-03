const { sync } = require('fast-glob');
const { basename } = require('path');
const { writeFileSync } = require('jsonfile');

let components = sync('src/lib/*.svelte').map(file => {
  file = basename(file,'.svelte');
  return { name:file, tag:`${file.toLowerCase()}--` };
});

writeFileSync('library.json', {components:components});

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import svelteSVG from 'rollup-plugin-svelte-svg';

const production = !process.env.ROLLUP_WATCH;

const customElements = components.map(component => {
  return {
    input: `src/lib/${component.name}.svelte`,
    output: {
      dir: 'public/lib',
      format: 'esm',
    },
    plugins: [
      svelte({
        customElement: true,
        tag: component.tag,
      }),
      resolve(),
    ]
  }
});

export default [{
  input: 'src/app.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    svelte({
      dev: true,
      css: css => { css.write('public/build/bundle.css') }
    }),
    json(),
    svelteSVG(),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs(),
    !production && serve(),
    !production && livereload('public'),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
}, ...customElements];

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true
				});
			}
		}
	};
}
