const fs = require('fs');

const compiled = new WebAssembly.Module(fs.readFileSync('vm.wasm'));
const ins = new WebAssembly.Instance(compiled, {});
const vm = ins.exports;

const mem = vm.memory;
const mbuf = Buffer.from(mem.buffer);

const HEAP_START = vm.heap_start();
const STACK_START = vm.stack_start();

function pc() {
  return mbuf[1] + (mbuf[2] << 8) + (mbuf[3] << 16) + (mbuf[4] << 24);
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

vm.init();

console.log(dump());

poke(5, 0x41); // JMP
poke(6, 0x01); // DST_L
poke(7, 0x00); // DST_H

for (let i = 0; i < 10; i++) {
  console.log(pc());
  vm.steps(1);

}
