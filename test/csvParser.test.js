import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVFromBuffer, getEventSummary, calculateComplianceDate } from '../src/csvParser.js';

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

  assert.equal(events.length, 15);
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

test('parseCSVFromBuffer skips participants with all empty date fields', () => {
  const rows = [
    '701,Active,01/01/2026,01/10/2026,01/11/2026,02/01/2026,02/10/2026,02/11/2026,03/01/2026,03/10/2026,03/11/2026,04/01/2026,04/10/2026,04/11/2026',
    '717,Active,,,,,,,,,,,,',  // All empty dates - should be skipped
    '718,Active,,,,,,,,,,,,',  // All empty dates - should be skipped
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));

  assert.equal(events.every((event) => event.participantId === '701'), true);
  assert.equal(events.some((event) => event.participantId === '717'), false);
  assert.equal(events.some((event) => event.participantId === '718'), false);
});

test('calculateComplianceDate adds exactly 14 days to base date', () => {
  assert.equal(calculateComplianceDate('10/01/2025'), '10/15/2025');
  assert.equal(calculateComplianceDate('12/15/2025'), '12/29/2025');
  assert.equal(calculateComplianceDate('01/20/2026'), '02/03/2026');
});

test('calculateComplianceDate returns null for invalid dates', () => {
  assert.equal(calculateComplianceDate(''), null);
  assert.equal(calculateComplianceDate('invalid'), null);
});

test('parseCSVFromBuffer creates compliance events for all 4 bursts with date+14', () => {
  const rows = [
    '701,Active,01/01/2026,01/10/2026,10/01/2025,02/01/2026,02/10/2026,10/10/2025,03/01/2026,03/10/2026,10/20/2025,04/01/2026,04/10/2026,10/30/2025',
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));
  const complianceEvents = events.filter((event) => event.eventType === 'compliance');

  assert.equal(complianceEvents.length, 4);
  assert.equal(complianceEvents[0].title, 'BURST 1 Week 2 Compliance Tracking');
  assert.equal(complianceEvents[0].date, '10/15/2025');
  assert.equal(complianceEvents[1].title, 'BURST 2 Week 2 Compliance Tracking');
  assert.equal(complianceEvents[1].date, '10/24/2025');
  assert.equal(complianceEvents[2].title, 'BURST 3 Week 2 Compliance Tracking');
  assert.equal(complianceEvents[2].date, '11/03/2025');
  assert.equal(complianceEvents[3].title, 'BURST 4 Week 2 Compliance Tracking');
  assert.equal(complianceEvents[3].date, '11/13/2025');
});

test('parseCSVFromBuffer compliance events have retention calendarType', () => {
  const rows = [
    '701,Active,,,10/01/2025,,,10/10/2025,,,10/20/2025,,,10/30/2025',
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));
  const complianceEvents = events.filter((event) => event.eventType === 'compliance');

  assert.equal(complianceEvents.length, 4);
  assert.ok(complianceEvents.every((e) => e.calendarType === 'retention'));
  assert.ok(complianceEvents.every((e) => e.baseDate !== undefined));
});

test('parseCSVFromBuffer skips empty date rows mixed with valid participants', () => {
  const rows = [
    '701,Active,01/01/2026,01/10/2026,01/11/2026,02/01/2026,02/10/2026,02/11/2026,03/01/2026,03/10/2026,03/11/2026,04/01/2026,04/10/2026,04/11/2026',
    '702,Active,,,,,,,,,,,,',  // All empty - skip
    '703,Active,01/05/2026,,01/15/2026,,,,,,,,,',  // Partial data - should create events for non-empty dates
  ];

  const csv = [header, ...rows].join('\n');
  const events = parseCSVFromBuffer(Buffer.from(csv, 'utf-8'));
  const summary = getEventSummary(events);

  // Should have 701 (11 events: 8 reminders + 3 retentions) + 703 (events from partial dates)
  assert.equal(summary.totalParticipants, 2);
  assert.equal(events.some((event) => event.participantId === '702'), false);
  assert.equal(events.some((event) => event.participantId === '703'), true);
});
