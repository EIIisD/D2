import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: [
    'src/One/One.svelte',
    'src/Two/Two.svelte',
  ],
  output: {
    dir: 'dist',
    format: 'esm',
    // sourcemap: true,
  },
	plugins: [
		svelte({ customElement: true }),
		resolve(),
	],
  // experimentalCodeSplitting: true,
  // experimentalDynamicImport: true,
};
