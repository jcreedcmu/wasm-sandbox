# wasm-sandbox

Just some little webassembly experiments

## How To

The way to run the current thing is:

    node ./build.js # generates out/gen.js
    node out/gen.js # generates public/a.wasm
    cd public && python3 -m http.server

and browse to [localhost:8000](http://localhost:8000).
