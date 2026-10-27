# Alchemy Sandbox

[![ci](https://github.com/PKusch/alchemy/actions/workflows/ci.yml/badge.svg)](https://github.com/PKusch/alchemy/actions/workflows/ci.yml)

A tiny world where everything reacts to everything else. Pour, burn, boil and grow. It is one web page: no install, no build, works offline.

**Play it: https://pkusch.github.io/alchemy/**

## Things to try

- Drop **seeds** into **water** and watch a garden grow.
- Pour **oil** over the water, then drop a spark. The whole surface goes up.
- Let **lava** meet water: it boils into steam, the steam drifts up and rains back down, and the lava cools into stone.
- Burn a garden and it leaves **ash** that floats on the water.
- Drop **ice** into a pond and it slowly freezes the water around it. Put fire or lava next to it and it melts. Steam that touches it cools back into water.

Pick materials with the buttons or keys 1 to 9 and 0 (ice). **Space** pauses and plays, and **C** clears the world. "Surprise me" resets to a ready-made scene.

## How it works

Every pixel is one material. Each step, every pixel looks at its neighbours and follows a few simple rules: heavier things sink through lighter ones, fire spreads to anything that burns, and water next to a plant feeds it. The physics lives in `engine.js` with no browser code, so the rules are tested directly in Node.

## Run it yourself

```bash
git clone https://github.com/PKusch/alchemy
cd alchemy
python3 -m http.server   # then open http://localhost:8000
```

## Tests

```bash
node --test tests/engine.test.js
```
