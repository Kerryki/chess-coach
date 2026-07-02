/**
 * Copies stockfish.js's prebuilt engine scripts into public/ so they're
 * reachable by absolute URL at runtime. stockfish.js ships as a standalone
 * worker script (not an importable module), so it must be spawned as its
 * own Worker from a static URL rather than bundled - see
 * lib/chess/engine/stockfish.worker.ts for how it's used.
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'node_modules', 'stockfish.js');
const DEST_DIR = path.join(__dirname, '..', 'public');
const FILES = ['stockfish.js', 'stockfish.wasm', 'stockfish.wasm.js'];

fs.mkdirSync(DEST_DIR, { recursive: true });

for (const file of FILES) {
  const source = path.join(SOURCE_DIR, file);
  const dest = path.join(DEST_DIR, file);

  if (!fs.existsSync(source)) {
    console.warn(`[copy-stockfish-assets] Missing ${source}, skipping`);
    continue;
  }

  fs.copyFileSync(source, dest);
}

console.log('[copy-stockfish-assets] Copied stockfish.js engine files to public/');
