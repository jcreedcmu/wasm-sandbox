const fs = require('fs');

const mem = new WebAssembly.Memory({initial: 1 /* 64k page */ });
const mbuf = Buffer.from(mem.buffer);

const ift = new WebAssembly.Table({initial: 0, element: 'anyfunc'});
const compiled = new WebAssembly.Module(fs.readFileSync('vm.wasm'));
const ins = new WebAssembly.Instance(compiled, {env: {
  __linear_memory: mem,
  __indirect_function_table: ift
}});

function pc() { return mbuf[1] }

ins.exports.init();
console.log(pc());
ins.exports.steps(10);
console.log(pc());
