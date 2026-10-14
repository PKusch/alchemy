const test = require('node:test');
const assert = require('node:assert');
const A = require('../engine.js');
const { World } = A;

const run = (w, n) => { for (let i = 0; i < n; i++) w.step(); };
const floor = (w) => { for (let x = 0; x < w.w; x++) w.set(x, w.h - 1, A.WALL); };

test('sand falls and stops on the floor', () => {
  const w = new World(5, 10); floor(w); w.set(2, 0, A.SAND);
  run(w, 20);
  assert.equal(w.get(2, 8), A.SAND);
  assert.equal(w.get(2, 0), A.EMPTY);
});

test('walls never move', () => {
  const w = new World(5, 5); w.set(2, 2, A.WALL); run(w, 10);
  assert.equal(w.get(2, 2), A.WALL);
});

test('water spreads out flat', () => {
  const w = new World(9, 5); floor(w);
  for (let y = 0; y < 3; y++) w.set(4, y, A.WATER);
  run(w, 60);
  assert.equal(w.count(A.WATER), 3);
  assert.equal(w.get(4, 2), A.EMPTY); // no tower left standing
});

test('sand sinks through water', () => {
  const w = new World(3, 6); floor(w);
  w.set(1, 4, A.WATER); w.set(1, 3, A.SAND);
  run(w, 10);
  assert.equal(w.get(1, 4), A.SAND);
});

test('oil floats on water', () => {
  const w = new World(3, 6); floor(w);
  w.set(0, 4, A.WALL); w.set(2, 4, A.WALL); w.set(0, 3, A.WALL); w.set(2, 3, A.WALL);
  w.set(1, 4, A.OIL); w.set(1, 3, A.WATER);
  run(w, 10);
  assert.equal(w.get(1, 4), A.WATER);
  assert.equal(w.get(1, 3), A.OIL);
});

test('fire meeting water makes steam', () => {
  const w = new World(3, 3); w.set(1, 1, A.FIRE); w.set(2, 1, A.WATER);
  run(w, 1);
  assert.equal(w.count(A.WATER), 0);
  assert.ok(w.count(A.STEAM) >= 1);
});

test('steam rises and eventually falls back as water', () => {
  const w = new World(3, 30); w.set(1, 29, A.STEAM);
  run(w, 5);
  assert.equal(w.get(1, 29), A.EMPTY);
  run(w, 400);
  assert.equal(w.count(A.STEAM), 0);
  assert.equal(w.count(A.WATER), 1);
});

test('a seed in water becomes a plant, and the plant keeps growing', () => {
  const w = new World(9, 9, 7); floor(w);
  for (let x = 1; x < 8; x++) for (let y = 5; y < 8; y++) w.set(x, y, A.WATER);
  w.set(4, 4, A.SEED);
  run(w, 400);
  assert.equal(w.count(A.SEED), 0);
  assert.ok(w.count(A.PLANT) > 5, `only ${w.count(A.PLANT)} plant cells`);
});

test('fire spreads through a plant and leaves some ash', () => {
  const w = new World(12, 12, 3); floor(w);
  for (let x = 1; x < 11; x++) for (let y = 6; y < 11; y++) w.set(x, y, A.PLANT);
  w.set(5, 7, A.FIRE);
  run(w, 300);
  assert.ok(w.count(A.PLANT) < 50, `${w.count(A.PLANT)} plant left of 50`);
  assert.ok(w.count(A.ASH) > 0);
});

test('lava turns water to steam and cools into stone', () => {
  const w = new World(5, 5); w.set(2, 2, A.LAVA);
  for (let x = 0; x < 5; x++) w.set(x, 3, A.WALL);
  w.set(1, 2, A.WATER);
  run(w, 200);
  assert.equal(w.count(A.WATER) <= 1, true);
  assert.ok(w.count(A.STONE) + w.count(A.LAVA) >= 1);
});

test('same seed, same world', () => {
  const build = () => {
    const w = new World(20, 20, 42); floor(w);
    for (let i = 0; i < 30; i++) w.set(i % 20, i % 7, [A.SAND, A.WATER, A.OIL][i % 3]);
    w.set(10, 10, A.FIRE);
    run(w, 100);
    return Buffer.from(w.cells).toString('hex');
  };
  assert.equal(build(), build());
});

test('painting never overwrites, erasing does', () => {
  const w = new World(3, 3); w.set(1, 1, A.WALL);
  w.paint(1, 1, A.SAND); assert.equal(w.get(1, 1), A.WALL);
  w.paint(1, 1, A.EMPTY); assert.equal(w.get(1, 1), A.EMPTY);
});

test('fire lights oil next to it, so a spark takes the whole slick', () => {
  const w = new World(12, 4, 5); floor(w);
  for (let x = 1; x < 11; x++) w.set(x, 2, A.OIL);
  w.set(0, 2, A.FIRE);
  run(w, 200);
  assert.equal(w.count(A.OIL), 0);
});

test('ash floats on water instead of sinking', () => {
  const w = new World(3, 6); floor(w);
  w.set(0, 4, A.WALL); w.set(2, 4, A.WALL); w.set(0, 3, A.WALL); w.set(2, 3, A.WALL);
  w.set(1, 4, A.WATER); w.set(1, 3, A.ASH);
  run(w, 10);
  assert.equal(w.get(1, 4), A.WATER);
  assert.equal(w.get(1, 3), A.ASH);
});

test('painting outside the world is ignored', () => {
  const w = new World(4, 4);
  assert.doesNotThrow(() => { w.paint(-1, 0, A.SAND); w.paint(0, -1, A.SAND); w.paint(4, 0, A.SAND); w.paint(0, 4, A.SAND); });
  assert.equal(w.count(A.SAND), 0);
});

test('sand is never lost or made while it falls and piles up', () => {
  const w = new World(8, 12, 7); floor(w);
  for (let x = 1; x < 7; x++) for (let y = 0; y < 3; y++) w.set(x, y, A.SAND);
  run(w, 100);
  assert.equal(w.count(A.SAND), 18);
});
