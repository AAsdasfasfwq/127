#!/usr/bin/env node
// Print word-level narration timings for a time range:  node tools/words.js 138.2 180
'use strict';
const path = require('path');
const d = require(path.join(__dirname, '..', 'assets', 'script.json'));
const a = parseFloat(process.argv[2] || 0), b = parseFloat(process.argv[3] || 1e9);
const words = d.segments.flatMap((s) => s.words || []).filter((w) => w.start >= a - 0.01 && w.start < b && w.start < 1027.6);
let line = '', t0 = null;
for (const w of words) {
  if (t0 === null) t0 = w.start;
  line += `${w.word.trim()}[${w.start.toFixed(2)}] `;
  if (/[.!?]$/.test(w.word.trim()) || line.length > 150) { console.log(line.trim()); line = ''; t0 = null; }
}
if (line) console.log(line.trim());
