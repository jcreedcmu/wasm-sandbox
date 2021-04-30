(module
  (type $t0 (func))
  (type $t1 (func (param i32 i32) (result i32)))
  (import "main" "sayHello" (func $main.sayHello (type $t0)))
  (func $add (export "add") (type $t1) (param $p0 i32) (param $p1 i32) (result i32)
    get_local $p0
    get_local $p1
    i32.add)
  (func $f2 (type $t0)
    call $main.sayHello)
  (memory $memory (export "memory") 0)
  (start 2))

(;

// obtained this by compiling the default AssemblyScript project at
// https://webassembly.studio/

declare function sayHello(): void;

sayHello();

export function add(x: i32, y: i32): i32 {
  return x + y;
}

;)