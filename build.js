const { build } = require('esbuild')

const args = process.argv.slice(2);

const entryPoints =['./src/gen.ts', './src/surface.ts', './src/wasm-lib.ts'];

async function go() {

  if (args[0] == 'all') {
    await Promise.all([
      build({
	     entryPoints: entryPoints,
	     minify: false,
	     sourcemap: true,
	     bundle: false,
	     outdir: './out',
	     format: 'cjs',
	     logLevel: 'info',
	     watch: true,
      }),
      build({
	     entryPoints: ['./src/client.ts'],
	     minify: false,
	     sourcemap: true,
	     bundle: false,
	     outdir: './public',
	     format: 'cjs',
	     logLevel: 'info',
	     watch: true,
      })]);
  }
  else {
    await build({
	   entryPoints: entryPoints,
	   minify: false,
	   sourcemap: true,
	   bundle: false,
	   outdir: './out',
	   format: 'cjs',
	   logLevel: 'info',
	   watch: args[0] == 'watch',
    });
  }
}

go();
