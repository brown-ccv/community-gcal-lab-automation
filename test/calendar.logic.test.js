import test from 'node:test';
import assert from 'node:assert/strict';
import { google } from 'googleapis';
import { createEvents } from '../src/calendar.js';

function createMockCalendar(overrides = {}) {
  const listCalls = [];
  const insertCalls = [];

  const calendar = {
    events: {
      list: async (params) => {
        listCalls.push(params);
        if (overrides.list) {
          return overrides.list(params);
        }
        return { data: { items: [] } };
      },
      insert: async (params) => {
        insertCalls.push(params);
        if (overrides.insert) {
          return overrides.insert(params);
        }
        return { data: { id: `event-${insertCalls.length}`, htmlLink: 'https://example.com/event' } };
      },
    },
  };

  return { calendar, listCalls, insertCalls };
}

test('createEvents dry-run returns 3 events and shifts weekend date to Friday', async () => {
  const originalCalendarFactory = google.calendar;
  const { calendar, listCalls, insertCalls } = createMockCalendar();

  google.calendar = () => calendar;

  const results = await createEvents({}, {
    baseDate: '11/07/2025',
    title: 'BURST Follow-up',
    time: '09:00',
    attendeeEmail: '701@example.com',
    dryRun: true,
    demoMode: false,
  });

  google.calendar = originalCalendarFactory;

  assert.equal(results.length, 3);
  assert.equal(results.every((result) => result.type === 'dry-run'), true);
  assert.equal(results[0].wasShifted, true);
  assert.equal(results[0].date, '11/07/2025');
  assert.equal(results[0].originalDate, '11/08/2025');
  assert.equal(insertCalls.length, 0);
  assert.equal(listCalls.length, 3);
});

test('createEvents skips existing events via idempotency checks', async () => {
  const originalCalendarFactory = google.calendar;
  const { calendar, insertCalls } = createMockCalendar({
    list: async () => ({ data: { items: [{ id: 'existing-event-id' }] } }),
  });

  google.calendar = () => calendar;

  const results = await createEvents({}, {
    baseDate: '11/10/2025',
    title: 'Retention',
    time: '09:00',
    attendeeEmail: 'participant@brown.edu',
    dryRun: false,
    demoMode: false,
  });

  google.calendar = originalCalendarFactory;

  assert.equal(results.length, 3);
  assert.equal(results.every((result) => result.type === 'skipped'), true);
  assert.equal(results.every((result) => result.reason.includes('idempotent')), true);
  assert.equal(insertCalls.length, 0);
});
