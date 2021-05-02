const fs = require('fs');

const compiled = new WebAssembly.Module(fs.readFileSync('vm.wasm'));
const ins = new WebAssembly.Instance(compiled, {});
const vm = ins.exports;

const mem = vm.memory;
const mbuf = Buffer.from(mem.buffer);

const HEAP_START = vm.heap_start();

function pc() {
  return vm.pc();
}

function poke(addr, val) {
  mbuf[HEAP_START + addr] = val;
}

function dump(start) {
  if (start == undefined)
	 start = 0;
  const slice = [];
  for (let i = 0; i < 16; i++) {
	 slice.push(mbuf[1024 + start + i]);
  }
  return {pc: pc(), slice};
}

function hexify(n) {
  return '0x' + ("00" + n.toString(16)).substr(-2);
}

vm.init();

console.log(dump());

const NOP     = 0x00;

const LDA_Z   = 0x10;
const LDA_I   = 0x11;
const LDA     = 0x12;

const STA_Z   = 0x20;
const STA     = 0x22;

const ADD     = 0x30;
const SUB     = 0x31;
const ADD_I   = 0x32

const JMZ     = 0x40;
const JMP     = 0x41;
const JSR     = 0x42;
const RET     = 0x43;
const JMN     = 0x44;

const asm = [
  LDA_I, 0x91,
  STA, 0x20, 0x00,
  ADD, 0x20, 0x00,
  STA, 0x20, 0x00,
  LDA_I, 0x00,
  ADD_I, 0x00,
  STA, 0x21, 0x00,
  JMP, 0x00, 0x00
]

asm.forEach((a, i) => {
  poke(i, a);
});

for (let i = 0; i < 20; i++) {
  const d = dump(0x20);
  console.log(`PC: ${d.pc} ZP: ${d.slice.map(hexify).join(" ")}`);
  vm.steps(1);

}
