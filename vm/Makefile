run: vm.wasm vm.js
	node vm.js

CLANG ?= clang

# in my case I had to set
# CLANG=~/build/emsdk/upstream/bin/clang
# to get a new enough version of clang/llvm tooling

vm.wasm: vm.c
	${CLANG} -c -O3 --target=wasm32 -nostdlib -o vm.wasm vm.c
