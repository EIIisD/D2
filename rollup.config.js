import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: [
    'src/One.svelte',
  ],
  output: {
    dir: 'dist',
    format: 'esm',
  },
	plugins: [
		svelte({ customElement: true }),
		resolve(),
	],
};
