import * as wasm from './wasm-lib';

export type ValType = wasm.ValType;

export type Arg = { name: string, tp: ValType };

type BlockType = FuncType | ValType;

export type Instr =
  | { t: 'unreachable' }
  | { t: 'nop' }
  | { t: 'block', label: string, tp?: BlockType, body: Instr[] }
  | { t: 'loop', label: string, tp?: BlockType, body: Instr[] }
  | { t: 'i32.const', n: number }
  | { t: 'i32.ne' }
  | { t: 'i32.add' }
  | { t: 'i32.eq' }
  | { t: 'i32.gt_s' }
  | { t: 'br_if', n: string }
  | { t: 'local.get', n: string }
  | { t: 'local.set', n: string }
  | { t: 'local.tee', n: string }
  | { t: 'return' }
  | { t: 'drop' }
  | { t: 'select' }
  | { t: 'call', fidx: string }
  | { t: 'i32.load8_u', memarg: wasm.MemArg };

export type FuncDecl = { args: Arg[], ret: ValType[] };
export type FuncType = { args: ValType[], ret: ValType[] };

export type Decl =
  | { t: 'importFunc', name: string, tp: FuncType }
  | { t: 'importMem', name: string, mt: wasm.MemType }
  | { t: 'func', name: string, decl: FuncDecl, doExport?: boolean, body: Instr[] }

export type Program = Decl[];

function stringOfFunctionType(tp: FuncType): string {
  return tp.args.join(',') + '->' + tp.ret.join(',');
}

function numberFuncs(p: Program): Record<string, number> {
  const rv: Record<string, number> = {};
  const imports = p.flatMap(d => d.t == 'importFunc' ? [d.name] : []);
  const definedFuncs = p.flatMap(d => d.t == 'func' ? [d.name] : []);
  [...imports, ...definedFuncs].map((name, ix) => {
    rv[name] = ix;
  });
  return rv;
}

function tpOfDecl(decl: FuncDecl): FuncType {
  return { args: decl.args.map(x => x.tp), ret: decl.ret };
}

function typesOfProgram(p: Program): { numberOfType: Record<string, number>, types: FuncType[] } {
  const numberOfType: Record<string, number> = {}
  const types: FuncType[] = [];
  function collectTp(t: FuncType) {
    const s = stringOfFunctionType(t);
    if (numberOfType[s] == undefined) {
      numberOfType[s] = types.length;
      types.push(t);
    }
  }
  function collectInstruction(ins: Instr) {
    switch (ins.t) {
      case 'block': // intentional fallthrough here
      case 'loop':
        if (typeof ins.tp == 'object')
          collectTp(ins.tp);
        ins.body.forEach(ins => collectInstruction(ins));
      default:
    }
  }
  function collectDecl(d: Decl) {
    switch (d.t) {
      case 'importFunc': collectTp(d.tp); return;
      case 'importMem': return;
      case 'func': collectTp(tpOfDecl(d.decl)); d.body.forEach(ins => collectInstruction(ins)); return;
    }
  }
  function collectProgram(p: Program) {
    p.forEach(d => collectDecl(d));
  }
  collectProgram(p);
  return { numberOfType, types };
}

function assemble(p: Program): wasm.Program {
  const { numberOfType, types: ptypes } = typesOfProgram(p);
  const numberOfFunc = numberFuncs(p);

  function getExports(d: Decl): wasm.Export[] {
    switch (d.t) {
      case 'func': return (d.doExport ?? true) ? [{ nm: d.name, desc: { t: 'func', idx: numberOfFunc[d.name] } }] : [];
      default: return [];
    }
  }

  function getFunctions(d: Decl): wasm.TypeIdx[] {
    switch (d.t) {
      case 'func': return [numberOfType[stringOfFunctionType(tpOfDecl(d.decl))]];
      default: return [];
    }
  }

  function getImports(d: Decl): wasm.Import[] {
    switch (d.t) {
      case 'func': return [];
      case 'importFunc': return [{ mod: 'env', nm: d.name, desc: { t: 'func', typeidx: numberOfType[stringOfFunctionType(d.tp)] } }];
      case 'importMem': return [{ mod: 'env', nm: d.name, desc: { t: 'mem', memtype: d.mt } }];
    }
  }
  const codes = (() => { throw 'nope' })();
  const functions = p.flatMap(d => getFunctions(d));
  const imports = p.flatMap(d => getImports(d));
  const types: wasm.FuncType[] = ptypes.map(t => ({ i: t.args, o: t.ret }));
  const exports = p.flatMap(d => getExports(d));
  return { codes, exports, functions, imports, types };
}
