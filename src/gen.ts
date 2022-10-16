import * as fs from 'fs';
import * as path from 'path';
import * as surface from './surface';
import { Program, emit } from './wasm-lib';

const sprog: surface.Program = [
  {
    t: 'func',
    name: 'call_logger',
    decl: { args: [{ name: 'baz', tp: 'i32' }, { name: 'mumble', tp: 'i32' }], ret: ['i32'] },
    locals: [{ name: 'length', tp: 'i32' }, { name: 'p', tp: 'i32' }],
    body: [
      // local 2 holds the length of the string
      // local 3 holds a 0-indexed pointer into the string

      /* read zeroth byte from memory */
      { t: 'i32.const', n: 0 },
      { t: 'i32.load8_u', memarg: { align: 0, offset: 0 } },
      { t: 'local.tee', n: 'length' },
      { t: 'i32.const', n: 0 },
      { t: 'local.set', n: 'p' },
      { t: 'call', f: 'log' /* log */ },
      {
        t: 'loop', label: 'loop', body: [

          // load
          { t: 'local.get', n: 'p' },
          { t: 'i32.load8_u', memarg: { align: 0, offset: 1 } },
          // print
          { t: 'call', f: 'log' },
          // increment
          { t: 'local.get', n: 'p' },
          { t: 'i32.const', n: 1 },
          { t: 'i32.add' },
          { t: 'local.tee', n: 'p' },
          // compare to length
          { t: 'local.get', n: 'length' },
          { t: 'i32.ne' },
          // if ne, loop
          { t: 'br_if', n: 'loop' }
        ]
      },
      { t: 'i32.const', n: 0 },
      { t: 'return' }
    ],
  },
  {
    t: 'func', name: 'foo', decl: { args: [{ name: 'x', tp: 'i32' }, { name: 'y', tp: 'i32' }], ret: ['i32'] }, locals: [], body: [
      { t: 'local.get', n: 'x' },
      { t: 'local.get', n: 'y' },
      { t: 'i32.add' },
      { t: 'return' }
    ]
  },
  {
    t: 'func', name: 'blarg', decl: { args: [{ name: 'x', tp: 'i32' }], ret: ['i32'] }, locals: [], body: [
      {
        t: 'block', label: 'b1', body: [
          { t: 'local.get', n: 'x' },
          { t: 'i32.const', n: 100 },
          { t: 'i32.ne' },
          { t: 'br_if', n: 'b1' },
          { t: 'i32.const', n: 2 },
          { t: 'return' },
        ]
      },
      {
        t: 'block', label: 'b2', body: [
          {
            t: 'block', label: 'b3', body: [
              { t: 'local.get', n: 'x' },
              { t: 'i32.const', n: 400 },
              { t: 'i32.eq' },
              { t: 'br_if', n: 'b3' },
              { t: 'local.get', n: 'x' },
              { t: 'i32.const', n: 300 },
              { t: 'i32.ne' },
              { t: 'br_if', n: 'b2' },
              { t: 'i32.const', n: 4 },
              { t: 'return' },
            ]
          },
          { t: 'i32.const', n: 5 },
          { t: 'return' },
        ]
      },
      { t: 'i32.const', n: 257 },
    ]
  },
  {
    t: 'func', name: 'table_entry_1', doExport: false, decl: { args: [{ name: 'x', tp: 'i32' }], ret: ['i32'] }, locals: [], body: [
      { t: 'local.get', n: 'x' },
      { t: 'i32.const', n: 100 },
      { t: 'i32.add' },
    ]
  },
  {
    t: 'func', name: 'table_entry_2', doExport: false, decl: { args: [{ name: 'x', tp: 'i32' }], ret: ['i32'] }, locals: [], body: [
      { t: 'local.get', n: 'x' },
      { t: 'i32.const', n: 200 },
      { t: 'i32.add' },
    ]
  },
  {
    t: 'func', name: 'table_call', decl: { args: [{ name: 'f', tp: 'i32' }, { name: 'x', tp: 'i32' }], ret: ['i32'] }, locals: [], body: [
      { t: 'local.get', n: 'x' },
      { t: 'local.get', n: 'f' },
      { t: 'call_indirect', tp: { args: ['i32'], ret: ['i32'] } },
    ]
  },
  { t: 'importFunc', name: 'log', tp: { args: ['i32'], ret: [] } },
  { t: 'importMem', name: '__linear_memory', mt: { min: 1 } },
  { t: 'table', funcs: ['table_entry_1', 'table_entry_2'] },
];

async function go() {
  try {
    const prog = surface.assemble(sprog);
    const bytes = emit(prog);
    console.log(bytes);
    fs.writeFileSync(path.join(__dirname, "../public/a.wasm"), bytes);
    if (1) {
      const instance = await WebAssembly.instantiate(bytes, {
        env: {
          __linear_memory: new WebAssembly.Memory({ initial: 1 }),
          log: (a: number, b: number) => { console.log('success', a, b); }
        }
      });
    }
    console.log('ok');
  }
  catch (e) {
    console.log('error', e);
  }
}

go();
