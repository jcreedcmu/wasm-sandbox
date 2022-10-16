function uint(n: number): number[] {
  return (n < 128) ? [n] : [0x80 | (n & 0x7f), ...uint(n >> 7)];
}

function sint(n: number): number[] {
  return (n < 64 && n >= -64) ? [n < 0 ? n + 128 : n] : [0x80 | (n & 0x7f), ...sint(n >> 7)];
}

export type TypeIdx = number;

// This is used for table size limits, and the fields are counted in
// number of table entries.
export type Limits = {
  min: number,
  max?: number,
};


// This is extensionally the same type as Limits, but it's used for
// memory limits, and the fields are counting in number of 65KB pages
export type MemType = {
  min: number,
  max?: number
};

type NumType = 'i32' | 'f32' | 'i64' | 'f64';
type RefType = 'funcref' | 'externref';
export type ValType = NumType | RefType;
export type FuncType = { i: ValType[], o: ValType[] };
export type Import = { mod: string, nm: string, desc: ImportDesc };
export type Export = { nm: string, desc: ExportDesc };
type ImportDesc =
  | { t: 'func', typeidx: number }
  | { t: 'table' }
  | { t: 'mem', memtype: MemType }
  | { t: 'global' };
type ExportDesc =
  | { t: 'func', idx: number }
  | { t: 'table', idx: number }
  | { t: 'mem', idx: number }
  | { t: 'global', idx: number };

export type Program = {
  types: FuncType[],
  imports: Import[],
  exports: Export[],
  functions: TypeIdx[],
  codes: FuncDefn[]
  tables: TableDefn[],
};

export type BlockType = number | ValType;

export type MemArg = {
  align: number,
  offset: number,
};

export type Instr =
  | { t: 'unreachable' }
  | { t: 'nop' }
  | { t: 'block', tp?: BlockType, body: Instr[] }
  | { t: 'loop', tp?: BlockType, body: Instr[] }
  | { t: 'i32.const', n: number }
  | { t: 'i32.ne' }
  | { t: 'i32.add' }
  | { t: 'i32.eq' }
  | { t: 'i32.gt_s' }
  | { t: 'br_if', n: number }
  | { t: 'local.get', n: number }
  | { t: 'local.set', n: number }
  | { t: 'local.tee', n: number }
  | { t: 'return' }
  | { t: 'drop' }
  | { t: 'select' }
  | { t: 'call', f: number }
  | { t: 'i32.load8_u', memarg: MemArg };


type Expr = Instr[];

type Local = { count: number, tp: ValType };
export type FuncDefn = {
  locals: Local[];
  e: Expr;
}

export type TableType = { ref: RefType, limits: Limits };
export type TableDefn = { tp: TableType };

type Section =
  | { t: 'types', types: FuncType[] }
  | { t: 'imports', imports: Import[] }
  | { t: 'exports', exports: Export[] }
  | { t: 'functions', functions: TypeIdx[] }
  | { t: 'codes', codes: FuncDefn[] }
  | { t: 'tables', tables: TableDefn[] };


function emitRefType(x: RefType): number[] {
  switch (x) {
    case 'funcref': return [0x70];
    case 'externref': return [0x6f];
  }
}

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
  return emitLimits(x);
}

function emitLimits(x: Limits): number[] {
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
    case 'func': return [0x00, ...uint(x.typeidx)];
    case 'mem': return [0x02, ...emitMemType(x.memtype)];
    default: throw new Error(`unsupported import type '${x.t}'`);
  }
}

function emitExportDesc(x: ExportDesc): number[] {
  switch (x.t) {
    case 'func': return [0x00, ...uint(x.idx)];
    case 'table': return [0x01, ...uint(x.idx)];
    case 'mem': return [0x02, ...uint(x.idx)];
    case 'global': return [0x03, ...uint(x.idx)];
  }
}

function emitString(x: string): number[] {
  const buf: number[] = [...Buffer.from(x, 'utf8')];
  return [...uint(buf.length), ...buf];
}

function emitImport(x: Import): number[] {
  return [...emitString(x.mod), ...emitString(x.nm), ...emitImportDesc(x.desc)];
}

function emitExport(x: Export): number[] {
  return [...emitString(x.nm), ...emitExportDesc(x.desc)];
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
    case 'loop': return [0x03, ...emitBlockType(x.tp), ...x.body.flatMap(emitInstr), 0x0b];
    case 'local.get': return [0x20, ...uint(x.n)];
    case 'local.set': return [0x21, ...uint(x.n)];
    case 'local.tee': return [0x22, ...uint(x.n)];
    case 'br_if': return [0x0d, ...uint(x.n)];
    case 'return': return [0x0f];
    case 'drop': return [0x1a];
    case 'select': return [0x1b];
    case 'i32.const': return [0x41, ...sint(x.n)];
    case 'i32.eq': return [0x46];
    case 'i32.ne': return [0x47];
    case 'i32.gt_s': return [0x4a];
    case 'i32.add': return [0x6a];
    case 'call': return [0x10, ...uint(x.f)];
    case 'i32.load8_u': return [0x2d, ...uint(x.memarg.align), ...uint(x.memarg.offset)];
  }
}

function emitLocal(local: Local): number[] {
  return [...uint(local.count), ...emitValType(local.tp)];
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

function emitTable(x: TableDefn): number[] {
  return [...emitRefType(x.tp.ref), ...emitLimits(x.tp.limits)];
}

function sectionBody(s: Section): number[] {
  switch (s.t) {
    case 'types': return emitVector(s.types, emitFuncType);
    case 'imports': return emitVector(s.imports, emitImport);
    case 'exports': return emitVector(s.exports, emitExport);
    case 'functions': return emitVector(s.functions, uint);
    case 'codes': return emitVector(s.codes, emitCode);
    case 'tables': return emitVector(s.tables, emitTable);
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
    case 'tables': return 4;
    case 'exports': return 7;
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

export function emit(p: Program): Uint8Array {
  const magic = [0x00, 0x61, 0x73, 0x6d]; // "\x00asm";
  const moduleVersion = [0x01, 0x00, 0x00, 0x00];
  const { types, imports, functions, codes, exports, tables } = p;
  // Note that although sections may be optionally missing, the order
  // of any sections that are present must match §5.5.2 of
  // https://webassembly.github.io/spec/core/_download/WebAssembly.pdf
  return Uint8Array.from([
    ...magic,
    ...moduleVersion,
    ...emitSection({ t: 'types', types }),
    ...emitSection({ t: 'imports', imports }),
    ...emitSection({ t: 'functions', functions }),
    ...emitSection({ t: 'tables', tables }),
    ...emitSection({ t: 'exports', exports }),
    ...emitSection({ t: 'codes', codes }),
  ]);
}
