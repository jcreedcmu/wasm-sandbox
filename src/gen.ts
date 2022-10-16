import * as fs from 'fs';
import * as path from 'path';

import { Program, emit } from './wasm-lib';

const prog: Program = {
  types: [
    { i: ['i32', 'i32'], o: ['i32'] },
    { i: ['i32'], o: ['i32'] },
    { i: ['i32'], o: [] }
  ],
  functions: [0, 0, 1],
  codes: [
    // 1: call_logger
    {
      locals: [{ count: 2, tp: 'i32' }],
      e: [
        // local 2 holds the length of the string
        // local 3 holds a 0-indexed pointer into the string

        /* read zeroth byte from memory */
        { t: 'i32.const', n: 0 },
        { t: 'i32.load8_u', memarg: { align: 0, offset: 0 } },
        { t: 'local.tee', n: 2 },
        { t: 'i32.const', n: 0 },
        { t: 'local.set', n: 3 },
        { t: 'call', fidx: 0 /* log */ },
        {
          t: 'loop', body: [

            // load
            { t: 'local.get', n: 3 },
            { t: 'i32.load8_u', memarg: { align: 0, offset: 1 } },
            // print
            { t: 'call', fidx: 0 },
            // increment
            { t: 'local.get', n: 3 },
            { t: 'i32.const', n: 1 },
            { t: 'i32.add' },
            { t: 'local.tee', n: 3 },
            // compare to length
            { t: 'local.get', n: 2 },
            { t: 'i32.ne' },
            // if ne, loop
            { t: 'br_if', n: 0 }
          ]
        },
        { t: 'i32.const', n: 0 },
        { t: 'return' }
      ]
    },
    // 2: foo
    {
      locals: [], e: [
        { t: 'local.get', n: 0 },
        { t: 'local.get', n: 1 },
        { t: 'i32.add' },
        { t: 'return' }
      ]
    },
    // 3: blarg
    {
      locals: [], e: [
        {
          t: 'block', body: [
            { t: 'local.get', n: 0 },
            { t: 'i32.const', n: 100 },
            { t: 'i32.ne' },
            { t: 'br_if', n: 0 },
            { t: 'i32.const', n: 2 },
            { t: 'return' },
          ]
        },
        {
          t: 'block', body: [
            {
              t: 'block', body: [
                { t: 'local.get', n: 0 },
                { t: 'i32.const', n: 400 },
                { t: 'i32.eq' },
                { t: 'br_if', n: 0 },
                { t: 'local.get', n: 0 },
                { t: 'i32.const', n: 300 },
                { t: 'i32.ne' },
                { t: 'br_if', n: 1 },
                { t: 'i32.const', n: 4 },
                { t: 'return' },
              ]
            },
            { t: 'i32.const', n: 5 },
            { t: 'return' },
          ]
        },
        { t: 'i32.const', n: 256 },
      ]
    },
  ],
  exports: [
    { nm: 'call_logger', desc: { t: 'func', idx: 1 } },
    { nm: 'foo', desc: { t: 'func', idx: 2 } },
    { nm: 'blarg', desc: { t: 'func', idx: 3 } }
  ],
  imports: [{
    mod: 'env',
    nm: '__linear_memory',
    desc: { t: 'mem', memtype: { min: 0 } }
  },
  {
    mod: 'env',
    nm: 'log',
    desc: { t: 'func', typeidx: 2 },
  }],
};

async function go() {
  try {
    const bytes = emit(prog);
    console.log(bytes);
    fs.writeFileSync(path.join(__dirname, "../public/a.wasm"), bytes);
    const instance = await WebAssembly.instantiate(bytes, {
      env: {
        __linear_memory: new WebAssembly.Memory({ initial: 0 }),
        log: (a: number, b: number) => { console.log('success', a, b); }
      }
    });
    console.log('ok');
  }
  catch (e) {
    console.log('error', e);
  }
}

go();
