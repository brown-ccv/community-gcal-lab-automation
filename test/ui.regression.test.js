import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '..', 'public', 'script.js');

function getScriptSource() {
  return readFileSync(scriptPath, 'utf8');
}

test('live mode banner stays hidden for production users', () => {
  const source = getScriptSource();

  assert.match(source, /Production UI: no live banner copy needed\./);
  assert.match(source, /banner\.style\.display\s*=\s*'none';/);
  assert.equal(source.includes('Connected to Google Calendar API'), false);
});

test('live mode removes clear demo card and renumbers delete recent section', () => {
  const source = getScriptSource();

  assert.match(source, /clearDemoCard\.remove\(\);/);
  assert.match(source, /'Step 3: Delete Recent Events'/);
});

test('csv import flow keeps post-import report visible in live mode', () => {
  const source = getScriptSource();

  assert.match(source, /displayCsvImportReport\(payload\.results \|\| \{\}\);/);
  assert.match(source, /displayCsvImportReport\(demoResults\);/);

  // Preview reset should not happen in import success paths so the report stays visible.
  assert.equal(source.includes('resetCsvPreview();'), false);
});
