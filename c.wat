(module
  (type $t0 (func))
  (type $t1 (func (param i32) (result i32)))
  (func $__wasm_call_ctors (type $t0))
  (func $set (export "set") (type $t1) (param $p0 i32) (result i32)
    get_local $p0
    i32.const 23105
    i32.store16 align=1
    get_local $p0
    i32.load8_u offset=2
    i32.const 24
    i32.shl
    i32.const 1090519040
    i32.add
    i32.const 24
    i32.shr_s)
  (table $T0 1 1 anyfunc)
  (memory $memory (export "memory") 2)
  (global $g0 (mut i32) (i32.const 66560))
  (global $__heap_base (export "__heap_base") i32 (i32.const 66560))
  (global $__data_end (export "__data_end") i32 (i32.const 1024)))

(;

// obtained this by compiling the following at
// https://webassembly.studio/

#define WASM_EXPORT __attribute__((visibility("default")))

WASM_EXPORT
char set(unsigned char* p) {
    p[0] = 'A';
    p[1] = 'Z';
    return p[0] + p[2];
}

;)