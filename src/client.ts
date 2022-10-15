function strcpy(memory: WebAssembly.Memory, offset: number, data: string) {
  const databuf = new Uint8Array(new TextEncoder().encode(data));
  const mem = new Uint8Array(memory.buffer, offset, databuf.length);
  mem.set(databuf);
}

function memset(memory: WebAssembly.Memory, offset: number, val: number) {
  new Uint8Array(memory.buffer)[offset] = val;
}

async function init(memory: WebAssembly.Memory) {
  const x = await (WebAssembly.instantiateStreaming(fetch("./a.wasm", { cache: "no-store" }), {
    env: {
      __linear_memory: memory,
      log: (a: number, b: number) => { console.log('success', a, b); return 42; }
    }
  }));
  const e = x.instance.exports;
  for (const k of Object.keys(e)) {
    (window as any)[k] = e[k];
  }
}

declare function foo(x: number, y: number): void;
declare function blarg(x: number): number;
declare function call_logger(x: number, y: number): number;

async function go() {
  const memory = new WebAssembly.Memory({ initial: 65536 });

  await init(memory);
  const results: string[] = [];
  const show = (x: any) => results.push(JSON.stringify(x));
  show(foo(100, 23)); // 123
  show([99, 100, 101, 299, 300, 301, 399, 400, 401].map(blarg)); // [257,2,257,257,4,257,257,5,257]
  const str = "Hello, World!\n";
  memset(memory, 0, str.length);
  strcpy(memory, 1, str);

  const _unused = 33;
  show(call_logger(1, _unused)); // 42, console.log('success 1 14');

  document.write(results.join('<br/>'));
}
go();
