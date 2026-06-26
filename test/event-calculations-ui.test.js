import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');

function getHtmlSource() {
  return readFileSync(htmlPath, 'utf8');
}

test('index.html contains collapsible date calculations panel with correct title', () => {
  const html = getHtmlSource();

  assert.match(html, /<details/i);
  assert.match(html, /<summary/i);
  assert.match(html, /View Active Date Calculation Rules & Formulas/);
});
