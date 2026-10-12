# Contributing

The most useful thing you can send is a combination that behaves wrongly: two things that should react and do not, or react in a way that feels off. Open a "wrong reaction" issue and say what you poured and what happened.

## Where things live

- `engine.js` holds the rules for every material and how they react.
- `index.html` is the page, the brush and the buttons.
- `tests/engine.test.js` covers the rules.

## Running it

```bash
node --test tests/engine.test.js
```

For a look at the page, open `index.html` in a browser. There is no build and no install.
