/* Render blog and diagram mathematics with the locally bundled KaTeX release. */
const fs = require('node:fs');
const katex = require('../assets/vendor/katex/katex.min.js');

const equations = JSON.parse(fs.readFileSync(0, 'utf8'));
const rendered = equations.map(({ latex, display }) => katex.renderToString(latex, {
    displayMode: display,
    output: 'htmlAndMathml',
    throwOnError: true,
    strict: 'error',
    trust: false,
    fleqn: false
}));
process.stdout.write(JSON.stringify(rendered));
