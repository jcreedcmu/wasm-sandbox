run: vm.wasm vm.js
	node vm.js

CLANG ?= clang
WASMLD ?= wasm-ld

# in my case I had to set
# CLANG=~/build/emsdk/upstream/bin/clang
# WASMLD=~/build/emsdk/upstream/bin/wasm-ld
# to get a new enough version of clang/llvm tooling

# This choice of flags came from
# https://medium.com/@dougschaefer/going-straight-to-clang-for-webassembly-928df1484430

vm.o: vm.c
	${CLANG} -Wall --target=wasm32 -Os -nostdlib \
	-fvisibility=hidden -o vm.o -c vm.c

vm.wasm: vm.o
	${WASMLD} --no-entry --export-dynamic \
	--strip-all -error-limit=0 --lto-O3 -O3  vm.o -o vm.wasm

clean:
	rm -f vm.o vm.wasm
