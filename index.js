const fs = require('fs');
const _wabt = require('wabt');

async function compile(filename, env) {
  const wabt = await _wabt();
  const wasmModule = wabt.parseWat(filename, fs.readFileSync(filename, 'utf8'));
  const wasmBuffer = Buffer.from(wasmModule.toBinary({}).buffer);
  const compiled = new WebAssembly.Module(wasmBuffer);
  return new WebAssembly.Instance(compiled, env);
}

async function demo1() {
  const env = {
	 main: {
		sayHello() {
		  console.log('hi');
		}
	 }
  };
  const instance = await compile('assemblyscript.wat', env);
  console.log(instance.exports.add(100, 123));
}

async function demo2() {
  const instance = await compile('c.wat', {});
  const heap = new Uint8Array(instance.exports.memory.buffer);

  heap[2] = 1;
  console.log(String.fromCharCode(instance.exports.set(0)));
  console.log(String.fromCharCode(heap[0]));
  console.log(String.fromCharCode(heap[1]));
}

async function go() {
  await demo1();
  await demo2();
}

go().catch(console.error);
