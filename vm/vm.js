const fs = require('fs');

const compiled = new WebAssembly.Module(fs.readFileSync('vm.wasm'));
const ins = new WebAssembly.Instance(compiled, {});

const mem = ins.exports.memory;
const mbuf = Buffer.from(mem.buffer);

function pc() { return mbuf[1] }


ins.exports.init();
console.log(pc());
ins.exports.steps(10);
console.log(pc());
