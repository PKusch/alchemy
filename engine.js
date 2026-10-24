// The physics of the sandbox. No browser code in here, so it can be tested in Node.
(function (root) {
  const EMPTY = 0, WALL = 1, SAND = 2, WATER = 3, FIRE = 4, SEED = 5,
        PLANT = 6, ASH = 7, OIL = 8, STEAM = 9, LAVA = 10, STONE = 11, ICE = 12;
  const NAMES = ['erase', 'wall', 'sand', 'water', 'fire', 'seed', 'plant', 'ash', 'oil', 'steam', 'lava', 'stone', 'ice'];
  // How heavy each thing is. A falling thing sinks through anything lighter.
  const DENSITY = [];
  DENSITY[EMPTY] = 0; DENSITY[STEAM] = -1; DENSITY[OIL] = 1; DENSITY[ASH] = 1.5;
  DENSITY[SEED] = 1.8; DENSITY[WATER] = 2; DENSITY[SAND] = 3; DENSITY[LAVA] = 4;
  const FALLS = new Set([SAND, ASH, SEED, WATER, OIL, LAVA]);
  const FLOWS = new Set([WATER, OIL, LAVA]);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function World(w, h, seed) {
    this.w = w; this.h = h;
    this.cells = new Uint8Array(w * h);
    this.life = new Uint8Array(w * h);
    this.moved = new Uint32Array(w * h);
    this.tick = 0;
    this.rand = mulberry32(seed === undefined ? 1 : seed);
  }

  World.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return WALL;
    return this.cells[y * this.w + x];
  };

  World.prototype.set = function (x, y, t) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.cells[i] = t;
    this.life[i] = t === FIRE ? 20 + ((this.rand() * 20) | 0) : t === STEAM ? 120 + ((this.rand() * 120) | 0) : 0;
    this.moved[i] = this.tick;
  };

  // Put a cell of `t` here, but only where it would not overwrite something.
  World.prototype.paint = function (x, y, t) {
    if (t === EMPTY || this.get(x, y) === EMPTY) this.set(x, y, t);
  };

  World.prototype.swap = function (a, b) {
    const c = this.cells, l = this.life;
    let v = c[a]; c[a] = c[b]; c[b] = v;
    v = l[a]; l[a] = l[b]; l[b] = v;
    this.moved[a] = this.moved[b] = this.tick;
  };

  World.prototype.canSink = function (t, x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const o = this.cells[y * this.w + x];
    if (o === EMPTY) return true;
    return FALLS.has(o) || o === STEAM ? DENSITY[o] < DENSITY[t] : false;
  };

  World.prototype.step = function () {
    this.tick++;
    const w = this.w, h = this.h, dirFirst = this.tick & 1;
    for (let y = h - 1; y >= 0; y--) {
      for (let k = 0; k < w; k++) {
        const x = dirFirst ? k : w - 1 - k;
        const i = y * w + x;
        if (this.moved[i] === this.tick) continue;
        const t = this.cells[i];
        if (t === EMPTY || t === WALL || t === STONE) continue;
        if (t === ICE) { this.frost(x, y); continue; }
        if (t === LAVA) this.heat(x, y, i);
        if (this.cells[i] !== t) continue;
        if (FALLS.has(t)) this.fall(t, x, y, i);
        else if (t === FIRE) this.burn(x, y, i);
        else if (t === STEAM) this.rise(x, y, i);
        else if (t === PLANT) this.grow(x, y, i);
        if (t === SEED) this.sprout(x, y, i);
      }
    }
  };

  World.prototype.fall = function (t, x, y, i) {
    const w = this.w, r = this.rand;
    if (this.canSink(t, x, y + 1)) return this.swap(i, i + w);
    const d = r() < 0.5 ? -1 : 1;
    if (this.canSink(t, x + d, y + 1) && this.canSink(t, x + d, y)) return this.swap(i, i + w + d);
    if (this.canSink(t, x - d, y + 1) && this.canSink(t, x - d, y)) return this.swap(i, i + w - d);
    if (FLOWS.has(t) && (t !== LAVA || r() < 0.3)) {
      for (let s = 1; s <= 3; s++) {
        if (this.get(x + d * s, y) !== EMPTY) break;
        if (s === 3 || this.get(x + d * (s + 1), y) !== EMPTY) return this.swap(i, i + d * s);
      }
    }
  };

  World.prototype.rise = function (x, y, i) {
    const w = this.w, r = this.rand;
    if (--this.life[i] === 0) return this.set(x, y, WATER);
    const d = r() < 0.5 ? -1 : 1;
    if (this.get(x, y - 1) === EMPTY && r() < 0.8) return this.swap(i, i - w);
    if (this.get(x + d, y - 1) === EMPTY) return this.swap(i, i - w + d);
    if (this.get(x + d, y) === EMPTY) return this.swap(i, i + d);
  };

  World.prototype.burn = function (x, y, i) {
    const r = this.rand;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const n = this.get(x + dx, y + dy);
        if (n === WATER) {
          this.set(x + dx, y + dy, STEAM);
          return this.set(x, y, STEAM);
        }
        if (n === ICE) { this.set(x + dx, y + dy, WATER); continue; }
        if ((n === PLANT || n === SEED) && r() < 0.15) this.set(x + dx, y + dy, FIRE);
        else if (n === OIL && r() < 0.5) this.set(x + dx, y + dy, FIRE);
      }
    }
    if (--this.life[i] === 0) return this.set(x, y, r() < 0.4 ? ASH : EMPTY);
    const d = r() < 0.5 ? -1 : 1;
    if (r() < 0.4) {
      if (this.get(x, y - 1) === EMPTY) return this.swap(i, i - this.w);
      if (this.get(x + d, y - 1) === EMPTY) return this.swap(i, i - this.w + d);
    }
  };

  World.prototype.grow = function (x, y, i) {
    const r = this.rand;
    if (r() > 0.05) return;
    // a plant drinks the water beside or above it and turns it into more plant
    const spots = [[0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]];
    const s = spots[(r() * spots.length) | 0];
    if (this.get(x + s[0], y + s[1]) === WATER) this.set(x + s[0], y + s[1], PLANT);
  };

  World.prototype.sprout = function (x, y, i) {
    if (this.cells[i] !== SEED) return;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.get(x + dx, y + dy) === WATER && this.rand() < 0.1) {
          this.set(x + dx, y + dy, PLANT);
          return this.set(x, y, PLANT);
        }
  };

  World.prototype.heat = function (x, y, i) {
    const r = this.rand;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const n = this.get(x + dx, y + dy);
        if (n === ICE) {
          this.set(x + dx, y + dy, WATER);
        } else if (n === WATER) {
          this.set(x + dx, y + dy, STEAM);
          if (r() < 0.3) return this.set(x, y, STONE);
        } else if ((n === PLANT || n === SEED || n === OIL) && r() < 0.4) this.set(x + dx, y + dy, FIRE);
        else if (n === SAND && r() < 0.01) this.set(x + dx, y + dy, WALL);
      }
    }
  };

  // Ice slowly freezes water beside it, so a cold block spreads over a pond.
  World.prototype.frost = function (x, y) {
    if (this.rand() > 0.02) return;
    const spots = [[0, -1], [-1, 0], [1, 0], [0, 1]];
    const s = spots[(this.rand() * spots.length) | 0];
    if (this.get(x + s[0], y + s[1]) === WATER) this.set(x + s[0], y + s[1], ICE);
  };

  World.prototype.count = function (t) {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === t) n++;
    return n;
  };

  const api = { World, NAMES, EMPTY, WALL, SAND, WATER, FIRE, SEED, PLANT, ASH, OIL, STEAM, LAVA, STONE, ICE, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Alchemy = api;
})(this);
