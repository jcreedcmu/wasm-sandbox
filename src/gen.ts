import * as fs from 'fs';

function uint(n: number): number[] {
  return (n < 128) ? [n] : [0x80 | (n & 0x7f), ...uint(n >> 7)];
}

function sint(n: number): number[] {
  return (n < 64 && n >= -64) ? [n < 0 ? n + 128 : n] : [0x80 | (n & 0x7f), ...sint(n >> 7)];
}

type TypeIdx = number;
type MemType = { min: number, max?: number };
type NumType = 'i32' | 'f32' | 'i64' | 'f64';
type RefType = 'funcref' | 'externref';
type ValType = NumType | RefType;
type FuncType = { i: ValType[], o: ValType[] };
type Import = { mod: string, nm: string, desc: ImportDesc };
type ImportDesc =
  | { t: 'func', tidx: number }
  | { t: 'table' }
  | { t: 'mem', memtype: MemType }
  | { t: 'global' };
type Program = {
  types: FuncType[],
  imports: Import[],
  functions: TypeIdx[],
  codes: FuncDefn[]
};

type BlockType = number | ValType;

type Instr =
  | { t: 'unreachable' }
  | { t: 'nop' }
  | { t: 'block', tp?: BlockType, body: Instr[] }
  | { t: 'i32.const', n: number }
  | { t: 'i32.ne' }
  | { t: 'i32.eq' }
  | { t: 'i32.gt_s' }
  | { t: 'br_if', n: number }
  | { t: 'local.get', n: number }
  | { t: 'return' }
  | { t: 'drop' }
  | { t: 'select' };


type Expr = Instr[];

type Local = { n: number, t: ValType };
type FuncDefn = {
  locals: Local[];
  e: Expr;
}

type Section =
  | { t: 'types', types: FuncType[] }
  | { t: 'imports', imports: Import[] }
  | { t: 'functions', functions: TypeIdx[] }
  | { t: 'codes', codes: FuncDefn[] };

function emitValType(x: ValType): number[] {
  switch (x) {
    case 'i32': return [0x7f];
    case 'i64': return [0x7e];
    case 'f32': return [0x7d];
    case 'f64': return [0x7c];
    case 'funcref': return [0x70];
    case 'externref': return [0x6f];
  }
}

function emitMemType(x: MemType): number[] {
  return x.max === undefined ?
    [0x00, ...uint(x.min)] :
    [0x01, ...uint(x.min), ...uint(x.max)];
}

function emitFuncType(x: FuncType): number[] {
  return [0x60,
    ...emitVector(x.i, emitValType),
    ...emitVector(x.o, emitValType)];
}

function emitImportDesc(x: ImportDesc): number[] {
  switch (x.t) {
    case 'mem': return [0x02, ...emitMemType(x.memtype)];
    default: throw `unsupported ${x}`;
  }
}

function emitString(x: string): number[] {
  const buf: number[] = [...Buffer.from(x, 'utf8')];
  return [...uint(buf.length), ...buf];
}

function emitImport(x: Import): number[] {
  return [...emitString(x.mod), ...emitString(x.nm), ...emitImportDesc(x.desc)];
}

function emitBlockType(x?: BlockType): number[] {
  if (x === undefined)
    return [0x40];
  else if (typeof x === 'number')
    return sint(x);
  else
    return emitValType(x);
}

function emitInstr(x: Instr): number[] {
  switch (x.t) {
    case 'unreachable': return [0x00];
    case 'nop': return [0x01];
    case 'block': return [0x02, ...emitBlockType(x.tp), ...x.body.flatMap(emitInstr), 0x0b];
    case 'local.get': return [0x20, ...uint(x.n)];
    case 'br_if': return [0x0d, ...uint(x.n)];
    case 'return': return [0x0f];
    case 'drop': return [0x1a];
    case 'select': return [0x1b];
    case 'i32.const': return [0x41, ...sint(x.n)];
    case 'i32.eq': return [0x46];
    case 'i32.ne': return [0x47];
    case 'i32.gt_s': return [0x4a];
  }
}

function emitLocal(x: Local): number[] {
  return [...uint(x.n), ...emitValType(x.t)];
}

function _emitCode(x: FuncDefn): number[] {
  return [
    ...emitVector(x.locals, emitLocal),
    ...x.e.flatMap(emitInstr),
    0x0b
  ];
}

function emitCode(x: FuncDefn): number[] {
  const funcDefnEncoded = _emitCode(x);
  return [...uint(funcDefnEncoded.length), ...funcDefnEncoded];
}

function sectionBody(s: Section): number[] {
  switch (s.t) {
    case 'types': return emitVector(s.types, emitFuncType);
    case 'imports': return emitVector(s.imports, emitImport);
    case 'functions': return emitVector(s.functions, uint);
    case 'codes': return emitVector(s.codes, emitCode);
  }
}

function emitVector<T>(vec: T[], emit: (x: T) => number[]): number[] {
  return [...uint(vec.length), ...vec.flatMap(emit)];
}

function sectionId(s: Section): number {
  switch (s.t) {
    case 'types': return 1;
    case 'imports': return 2;
    case 'functions': return 3;
    case 'codes': return 10;
  }
}

function emitSection(s: Section): number[] {
  const body = sectionBody(s);
  return [
    ...uint(sectionId(s)),
    ...uint(body.length),
    ...body,
  ];
}

function emit(p: Program): Uint8Array {
  const magic = [0x00, 0x61, 0x73, 0x6d]; // "\x00asm";
  const moduleVersion = [0x01, 0x00, 0x00, 0x00];
  const { types, imports, functions, codes } = p;
  return Uint8Array.from([
    ...magic,
    ...moduleVersion,
    ...emitSection({ t: 'types', types }),
    ...emitSection({ t: 'imports', imports }),
    ...emitSection({ t: 'functions', functions }),
    ...emitSection({ t: 'codes', codes }),
  ]);
}

async function go() {
  const p: Program = {
    types: [
      { i: ['i32'], o: ['i32'] }
    ],
    codes: [
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
          { t: 'i32.const', n: 257 },
        ]
      },
    ],
    functions: [0],
    imports: [{
      mod: 'env', nm: '__linear_memory',
      desc: { t: 'mem', memtype: { min: 0 } }
    }],
  }
  const bytes = emit(p);
  console.log(bytes);
  fs.writeFileSync('/tmp/a.wasm', bytes);
  const instance = await WebAssembly.instantiate(bytes, {
    env: {
      __linear_memory: new WebAssembly.Memory({ initial: 0 })
    }
  });
  console.log('ok');
}

go();
