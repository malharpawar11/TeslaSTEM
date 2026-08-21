import { Platform, Linking, Share } from 'react-native';
import type { ClubEvent } from '@/types/domain';

/**
 * "Add to calendar" without asking for calendar permissions.
 *
 * Google Calendar takes a plain template URL, and every other calendar app
 * (Apple Calendar, Outlook, the device calendar) understands a `.ics` file.
 * Neither path needs the OS calendar permission, so the app never requests it
 * just to add one event.
 */

/** 20260814T173000Z: the format both Google and iCalendar expect. */
function toCalendarStamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Events without an end time get a one-hour block. */
function endOf(event: ClubEvent): string {
  if (event.endsAt) return event.endsAt;
  return new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString();
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function eventDescription(event: ClubEvent): string {
  const parts = [event.description?.trim(), event.organizer ? `Organizer: ${event.organizer}` : null]
    .filter(Boolean);
  return parts.join('\n\n');
}

export function googleCalendarUrl(event: ClubEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.clubName ? `${event.title}: ${event.clubName}` : event.title,
    dates: `${toCalendarStamp(event.startsAt)}/${toCalendarStamp(endOf(event))}`,
    details: eventDescription(event),
    location: event.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A single VEVENT, or a whole club feed when several events are passed. */
export function buildIcs(events: ClubEvent[], calendarName = 'Tesla STEM Clubs'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tesla STEM Clubs//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@teslastemclubs`,
      `DTSTAMP:${toCalendarStamp(new Date().toISOString())}`,
      `DTSTART:${toCalendarStamp(event.startsAt)}`,
      `DTEND:${toCalendarStamp(endOf(event))}`,
      `SUMMARY:${escapeIcs(event.clubName ? `${event.title}: ${event.clubName}` : event.title)}`,
      `DESCRIPTION:${escapeIcs(eventDescription(event))}`,
      `LOCATION:${escapeIcs(event.location ?? '')}`,
      `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function filenameFor(name: string): string {
  return `${name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().slice(0, 40) || 'event'}.ics`;
}

/**
 * Downloads (web) or shares (native) an .ics file. On web this creates a Blob
 * URL so the browser hands the file to whatever calendar app is registered;
 * on native the share sheet lets the user open it in Apple Calendar.
 */
export async function downloadIcs(events: ClubEvent[], name: string): Promise<void> {
  const ics = buildIcs(events, name);
  if (Platform.OS === 'web') {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFor(name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Give the browser a tick to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ message: ics, title: filenameFor(name) });
}

export async function openGoogleCalendar(event: ClubEvent): Promise<void> {
  const url = googleCalendarUrl(event);
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await Linking.openURL(url);
}

// ---------------------------------------------------------------------------
// Display helpers shared by the event cards and the calendar screen.
// ---------------------------------------------------------------------------

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Date TBD';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatEventTime(event: { startsAt: string; endsAt: string | null }): string {
  const start = new Date(event.startsAt);
  if (isNaN(start.getTime())) return '';
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!event.endsAt) return fmt(start);
  const end = new Date(event.endsAt);
  if (isNaN(end.getTime())) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "Today", "Tomorrow", or the weekday+date; used as calendar group headers. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Scheduled';
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(today)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
