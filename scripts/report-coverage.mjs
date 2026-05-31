import { readFileSync } from 'node:fs';

const summaryPath = new URL(
  '../coverage/coverage-summary.json',
  import.meta.url,
);
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const total = summary.total;

const rows = [
  ['Statements', total.statements],
  ['Branches', total.branches],
  ['Functions', total.functions],
  ['Lines', total.lines],
];

console.log('## Test Coverage');
console.log('');
console.log('| Metric | Covered | Total | Coverage |');
console.log('| --- | ---: | ---: | ---: |');

for (const [label, metric] of rows) {
  console.log(
    `| ${label} | ${metric.covered} | ${metric.total} | ${metric.pct.toFixed(2)}% |`,
  );
}
