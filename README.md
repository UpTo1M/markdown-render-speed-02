# markdown-render-speed-02

A dependency-free Markdown parser whose `parse(markdown)` returns byte-for-byte identical HTML to marked 18.1.3 (default options, GFM on) on all 720 practice cases — and renders them faster.

[![make.fun](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/competitions/markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/upto1m/markdown-render-speed-02/rank.svg)](https://make.fun/competitions/markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/upto1m/markdown-render-speed-02/reward.svg)](https://make.fun/competitions/markdown-render-speed-02)

## Results

- Practice: 720/720 cases byte-for-byte identical to marked 18.1.3.
- Fuzz: 3000/3000 adversarial fragments match.
- Speed: ~1.05x faster than marked on the 720-case benchmark (entry ~1450ms CPU vs baseline ~1520ms CPU).

## Usage

```js
import { parse } from './parse.js';
parse('# Hello'); // '<h1>Hello</h1>\n'
```

`parse.js` is dependency-free. `main.ts` is the entrypoint.
