#!/usr/bin/env node
// Live preview: serves the project and prints the URL (open it in Chrome).
'use strict';
const path = require('path');
const http = require('http');
const { startServer } = require('./lib');
(async () => {
  const { url } = await startServer(path.resolve(__dirname, '..'));
  console.log(`\n  127 preview → ${url}/index.html\n  (space = play, arrows = scrub, ?t=SECONDS to jump)\n`);
})();
