const fs = require('fs');

const compiled = new WebAssembly.Module(fs.readFileSync('vm.wasm'));
const ins = new WebAssembly.Instance(compiled, {});

const mem = ins.exports.memory;
const mbuf = Buffer.from(mem.buffer);

const HEAP_START = ins.exports.heap_start();
const STACK_START = ins.exports.stack_start();

function pc() {
  return mbuf[1] + (mbuf[2] << 8) + (mbuf[3] << 16) + (mbuf[4] << 24) - HEAP_START;
}

function poke(addr, val) {
  mbuf[HEAP_START + addr] = val;
}

function dump() {
  const slice = [];
  for (let i = 0; i < 32; i++) {
	 slice.push(mbuf[1024 + i]);
  }
  return {pc: pc(), slice};
}


console.log('HEAP_START', HEAP_START);
console.log('STACK_START', STACK_START);
ins.exports.init();

console.log(dump());

poke(2, 0x41); // JMP
poke(3, 0x01); // DST_L
poke(4, 0x00); // DST_H

console.time();
ins.exports.steps(4);
console.timeEnd();
console.log(dump());
