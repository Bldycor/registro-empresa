import { google } from "googleapis";
import crypto from "crypto";

const TIME_ZONE = "America/Bogota";

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getCalendarClient() {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth: client });
}

type EventInput = {
  summary: string;
  description: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  attendees: string[];
};

export async function createCalendarMeetEvent({
  summary,
  description,
  fecha,
  horaInicio,
  horaFin,
  attendees,
}: EventInput) {
  const calendar = getCalendarClient();

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary,
      description,
      start: { dateTime: `${fecha}T${horaInicio}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${fecha}T${horaFin}:00`, timeZone: TIME_ZONE },
      attendees: attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    meetLink: data.hangoutLink ?? null,
    eventLink: data.htmlLink ?? null,
    eventId: data.id ?? null,
  };
}

export async function updateCalendarMeetEvent({
  eventId,
  summary,
  description,
  fecha,
  horaInicio,
  horaFin,
  attendees,
}: EventInput & { eventId: string }) {
  const calendar = getCalendarClient();

  const { data } = await calendar.events.update({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: {
      summary,
      description,
      start: { dateTime: `${fecha}T${horaInicio}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${fecha}T${horaFin}:00`, timeZone: TIME_ZONE },
      attendees: attendees.map((email) => ({ email })),
    },
  });

  return {
    meetLink: data.hangoutLink ?? null,
    eventLink: data.htmlLink ?? null,
    eventId: data.id ?? null,
  };
}
