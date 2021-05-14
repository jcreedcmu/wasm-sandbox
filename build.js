const { build } = require('esbuild')

const args = process.argv.slice(2);

async function go() {

  await build({
	 entryPoints: ['./src/gen.ts'],
	 minify: false,
	 sourcemap: true,
	 bundle: false,
	 outdir: './out',
	 format: 'cjs',
	 logLevel: 'info',
	 watch: args[0] == 'watch',
  });

}

go();
