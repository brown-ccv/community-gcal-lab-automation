import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVFromBuffer, getEventSummary } from '../src/csvParser.js';

const header = [
  'ID',
  'IDSTATUS',
  'B1STARTMIN10',
  'B1STARTMIN1',
  'B1STARTDATE',
  'B2STARTMIN10',
  'B2STARTMIN1',
  'B2STARTDATE',
  'B3STARTMIN10',
  'B3STARTMIN1',
  'B3STARTDATE',
  'B4STARTMIN10',
  'B4STARTMIN1',
  'B4STARTDATE',
].join(',');

test('parseCSVFromBuffer creates reminder and retention events for active participants', () => {
  const rows = [
    '701,Active,01/01/2026,01/10/2026,01/11/2026,02/01/2026,02/10/2026,02/11/2026,03/01/2026,03/10/2026,03/11/2026,04/01/2026,04/10/2026,04/11/2026',
    '702,Inactive,01/01/2026,01/10/2026,01/11/2026,02/01/2026,02/10/2026,02/11/2026,03/01/2026,03/10/2026,03/11/2026,04/01/2026,04/10/2026,04/11/2026',
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));

  const reminders = events.filter((event) => event.eventType === 'reminder');
  const retentions = events.filter((event) => event.eventType === 'retention');

  assert.equal(events.length, 11);
  assert.equal(reminders.length, 8);
  assert.equal(retentions.length, 3);
  assert.equal(events.every((event) => event.participantId === '701'), true);
  assert.equal(retentions.some((event) => event.title === 'BURST 2 Retention Text'), true);
  assert.equal(retentions.some((event) => event.date === '12/28/2025'), true);
});

test('parseCSVFromBuffer skips blank reminder dates and ignores invalid retention base dates', () => {
  const rows = [
    '900,Active,,,,,,invalid-date,,,,,,',
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));

  assert.equal(events.length, 0);
});

test('getEventSummary returns participant and per-title counts', () => {
  const events = [
    { participantId: '701', title: 'BURST 1 Pre-BURST Checklist' },
    { participantId: '701', title: 'BURST 1 Pre-BURST Checklist' },
    { participantId: '702', title: 'BURST 2 Retention Text' },
  ];

  const summary = getEventSummary(events);

  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.totalParticipants, 2);
  assert.equal(summary.eventsByType['BURST 1 Pre-BURST Checklist'], 2);
  assert.equal(summary.eventsByType['BURST 2 Retention Text'], 1);
});
