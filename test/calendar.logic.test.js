import test from 'node:test';
import assert from 'node:assert/strict';
import { google } from 'googleapis';
import { createEvents, createEventsFromCSV, deleteRecentEvents, partitionCSVEventsByIdempotency } from '../src/calendar.js';

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

test('createEventsFromCSV fails fast when calendar IDs are missing', async () => {
  const originalCalendarFactory = google.calendar;
  const { calendar } = createMockCalendar();
  google.calendar = () => calendar;

  await assert.rejects(
    () =>
      createEventsFromCSV({}, [
        {
          participantId: '701',
          title: 'BURST 1 Pre-BURST Checklist',
          date: '11/02/2026',
          column: 'B1STARTMIN10',
          eventType: 'reminder',
          calendarType: 'reminder',
        },
      ], {
        reminderCalendarId: '',
        retentionCalendarId: '',
      }),
    /REMINDER_CALENDAR_ID and RETENTION_CALENDAR_ID must both be configured/
  );

  google.calendar = originalCalendarFactory;
});

test('createEventsFromCSV surfaces calendar access errors before row processing', async () => {
  const originalCalendarFactory = google.calendar;
  const calendar = {
    calendars: {
      get: async ({ calendarId }) => {
        if (calendarId === 'bad-retention') {
          const err = new Error('Not Found');
          err.code = 404;
          throw err;
        }
        return { data: { id: calendarId } };
      },
    },
    events: {
      list: async () => ({ data: { items: [] } }),
      insert: async () => ({ data: { id: 'event-1', htmlLink: 'https://example.com/e/1' } }),
    },
  };

  google.calendar = () => calendar;

  await assert.rejects(
    () =>
      createEventsFromCSV({}, [
        {
          participantId: '701',
          title: 'BURST 1 Pre-BURST Checklist',
          date: '11/02/2026',
          column: 'B1STARTMIN10',
          eventType: 'reminder',
          calendarType: 'reminder',
        },
      ], {
        reminderCalendarId: 'good-reminder',
        retentionCalendarId: 'bad-retention',
      }),
    /Unable to access retention calendar \(bad-retention\): Not Found/
  );

  google.calendar = originalCalendarFactory;
});

test('createEventsFromCSV checks idempotency with idempotencyKey property', async () => {
  const originalCalendarFactory = google.calendar;
  const listCalls = [];

  const calendar = {
    calendars: {
      get: async ({ calendarId }) => ({ data: { id: calendarId } }),
    },
    events: {
      list: async (params) => {
        listCalls.push(params);
        return { data: { items: [] } };
      },
      insert: async () => ({ data: { id: 'event-1', htmlLink: 'https://example.com/e/1' } }),
    },
  };

  google.calendar = () => calendar;

  await createEventsFromCSV({}, [
    {
      participantId: '701',
      title: 'BURST 1 Pre-BURST Checklist',
      date: '11/02/2026',
      column: 'B1STARTMIN10',
      eventType: 'reminder',
      calendarType: 'reminder',
    },
  ], {
    reminderCalendarId: 'calendar-reminder',
    retentionCalendarId: 'calendar-retention',
  });

  assert.equal(listCalls.length > 0, true);
  assert.equal(
    listCalls.some((call) => String(call.privateExtendedProperty || '').startsWith('idempotencyKey=')),
    true
  );

  google.calendar = originalCalendarFactory;
});

test('deleteRecentEvents scans all configured calendars and deletes from matching source calendars', async () => {
  const originalCalendarFactory = google.calendar;
  const listCalls = [];
  const deleteCalls = [];
  const recentCreated = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const staleCreated = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const calendar = {
    events: {
      list: async (params) => {
        listCalls.push(params);

        if (params.calendarId === 'calendar-reminder' && params.privateExtendedProperty === 'source=csv-import') {
          return {
            data: {
              items: [
                {
                  id: 'event-reminder-1',
                  summary: 'Reminder event',
                  created: recentCreated,
                  start: { dateTime: '2026-04-17T09:00:00Z' },
                  extendedProperties: { private: { source: 'csv-import' } },
                },
                {
                  id: 'event-reminder-old',
                  summary: 'Old reminder event',
                  created: staleCreated,
                  start: { dateTime: '2026-04-10T09:00:00Z' },
                  extendedProperties: { private: { source: 'csv-import' } },
                },
              ],
            },
          };
        }

        if (params.calendarId === 'calendar-retention' && params.privateExtendedProperty === 'source=gcal-automation-demo') {
          return {
            data: {
              items: [
                {
                  id: 'event-retention-1',
                  summary: 'Retention event',
                  created: recentCreated,
                  start: { date: '2026-04-17' },
                  extendedProperties: { private: { source: 'gcal-automation-demo' } },
                },
              ],
            },
          };
        }

        return { data: { items: [] } };
      },
      delete: async (params) => {
        deleteCalls.push(params);
        return {};
      },
    },
  };

  google.calendar = () => calendar;

  const results = await deleteRecentEvents({}, {
    hours: 24,
    calendarId: ['calendar-reminder', 'calendar-retention'],
  });

  assert.equal(listCalls.length, 4);
  assert.equal(
    listCalls.every((call) => String(call.privateExtendedProperty || '').startsWith('source=')),
    true
  );
  assert.equal(results.deleted, 2);
  assert.deepEqual(
    deleteCalls.map((call) => `${call.calendarId}:${call.eventId}`).sort(),
    ['calendar-reminder:event-reminder-1', 'calendar-retention:event-retention-1']
  );

  google.calendar = originalCalendarFactory;
});

test('partitionCSVEventsByIdempotency returns only new events for preview', async () => {
  const originalCalendarFactory = google.calendar;
  const listCalls = [];

  const calendar = {
    calendars: {
      get: async ({ calendarId }) => ({ data: { id: calendarId } }),
    },
    events: {
      list: async (params) => {
        listCalls.push(params);

        if (params.privateExtendedProperty?.includes('idempotencyKey=701_11-02-2026_B1STARTMIN10')) {
          return { data: { items: [{ id: 'existing-701' }] } };
        }

        return { data: { items: [] } };
      },
    },
  };

  google.calendar = () => calendar;

  const events = [
    {
      participantId: '701',
      title: 'BURST 1 Pre-BURST Checklist',
      date: '11/02/2026',
      column: 'B1STARTMIN10',
      eventType: 'reminder',
      calendarType: 'reminder',
    },
    {
      participantId: '702',
      title: 'BURST 2 Retention Text',
      date: '11/03/2026',
      column: 'B2STARTDATE',
      eventType: 'retention',
      calendarType: 'retention',
    },
  ];

  const { newEvents, duplicateEvents } = await partitionCSVEventsByIdempotency({}, events, {
    reminderCalendarId: 'calendar-reminder',
    retentionCalendarId: 'calendar-retention',
  });

  assert.equal(duplicateEvents.length, 1);
  assert.equal(duplicateEvents[0].participantId, '701');
  assert.equal(newEvents.length, 1);
  assert.equal(newEvents[0].participantId, '702');
  assert.equal(
    listCalls.some((call) => String(call.privateExtendedProperty || '').startsWith('idempotencyKey=')),
    true
  );

  google.calendar = originalCalendarFactory;
});
