import * as wasm from './wasm-lib';

export type ValType = wasm.ValType;

export type Arg = { name: string, tp: ValType };

type BlockType = FuncType | ValType;

export type Instr =
  | { t: 'unreachable' }
  | { t: 'nop' }
  | { t: 'block', label?: string, tp?: BlockType, body: Instr[] }
  | { t: 'loop', label?: string, tp?: BlockType, body: Instr[] }
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
  | { t: 'call', f: string }
  | { t: 'call_indirect', tp: FuncType }
  | { t: 'i32.load8_u', memarg: wasm.MemArg };

export type FuncDecl = { args: Arg[], ret: ValType[] };
export type FuncType = { args: ValType[], ret: ValType[] };

export type Decl =
  | { t: 'importFunc', name: string, tp: FuncType }
  | { t: 'importMem', name: string, mt: wasm.MemType }
  | { t: 'func', name: string, locals: Arg[], decl: FuncDecl, doExport?: boolean, body: Instr[] }
  | { t: 'table', funcs: string[] }

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
        break;
      case 'call_indirect': collectTp(ins.tp); break;
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

export function assemble(p: Program): wasm.Program {
  const { numberOfType, types: ptypes } = typesOfProgram(p);
  const numberOfFunc = numberFuncs(p);
  function lookupFunc(label: string): number {
    const ix = numberOfFunc[label];
    if (ix == undefined) {
      throw new Error(`Can't find local '${label}'`);
    }
    return ix;
  }

  function getExports(d: Decl): wasm.Export[] {
    switch (d.t) {
      case 'func': return (d.doExport ?? true) ? [{ nm: d.name, desc: { t: 'func', idx: lookupFunc(d.name) } }] : [];
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
      case 'importFunc': return [{ mod: 'env', nm: d.name, desc: { t: 'func', typeidx: numberOfType[stringOfFunctionType(d.tp)] } }];
      case 'importMem': return [{ mod: 'env', nm: d.name, desc: { t: 'mem', memtype: d.mt } }];
      default: return [];
    }
  }

  function cvtBlockType(tp: BlockType | undefined): wasm.BlockType | undefined {
    if (tp === undefined) {
      return undefined;
    }
    if (typeof tp == 'object') {
      return numberOfType[stringOfFunctionType(tp)];
    }
    else {
      return tp;
    }
  }

  function assembleInstr(blockLabels: (string | undefined)[], locals: Arg[], ins: Instr): wasm.Instr {
    function lookupBlock(label: string): number {
      const ix = blockLabels.findIndex(x => x !== undefined && x == label);
      if (ix == -1) {
        throw new Error(`Can't find block '${label}'`);
      }
      return ix;
    }
    function lookupLocal(label: string): number {
      const ix = locals.findIndex(x => x.name == label);
      if (ix == -1) {
        throw new Error(`Can't find local '${label}'`);
      }
      return ix;
    }

    switch (ins.t) {
      case 'block': return { t: 'block', tp: cvtBlockType(ins.tp), body: assembleFunc([ins.label, ...blockLabels], locals, ins.body) };
      case 'loop': return { t: 'loop', tp: cvtBlockType(ins.tp), body: assembleFunc([ins.label, ...blockLabels], locals, ins.body) };
      case 'br_if': return { t: 'br_if', n: lookupBlock(ins.n) };
      case 'local.get': return { t: 'local.get', n: lookupLocal(ins.n) };
      case 'local.set': return { t: 'local.set', n: lookupLocal(ins.n) };
      case 'local.tee': return { t: 'local.tee', n: lookupLocal(ins.n) };
      case 'call': return { t: 'call', f: lookupFunc(ins.f) };
      case 'call_indirect': return { t: 'call_indirect', tpidx: numberOfType[stringOfFunctionType(ins.tp)] };
      default: return ins;
    }
  }

  function assembleFunc(blockLabels: (string | undefined)[], locals: Arg[], body: Instr[]): wasm.Instr[] {
    return body.map(ins => assembleInstr(blockLabels, locals, ins));
  }

  function getCodes(d: Decl): wasm.FuncDefn[] {
    switch (d.t) {
      case 'func': return [{ e: assembleFunc([], [...d.decl.args, ...d.locals], d.body), locals: d.locals.map(l => ({ count: 1, tp: l.tp })) }];
      default: return [];
    }
  }

  function getTables(d: Decl): wasm.TableDefn[] {
    switch (d.t) {
      // I think non-imported tables must be funcref
      case 'table': return [{ tp: { ref: 'funcref', limits: { min: d.funcs.length, max: d.funcs.length } } }];
      default: return [];
    }
  }

  function getElems(d: Decl): wasm.ElemDefn[] {
    switch (d.t) {
      case 'table': return [{ t: 'functable', fidxs: d.funcs.map(lookupFunc) }];
      default: return [];
    }
  }

  const codes = p.flatMap(d => getCodes(d));
  const functions = p.flatMap(d => getFunctions(d));
  const imports = p.flatMap(d => getImports(d));
  const types: wasm.FuncType[] = ptypes.map(t => ({ i: t.args, o: t.ret }));
  const exports = p.flatMap(d => getExports(d));
  const tables = p.flatMap(d => getTables(d));
  const elems = p.flatMap(d => getElems(d));
  return { codes, exports, functions, imports, types, tables, elems };
}
