import { Event } from "./types";

export function encodeEvent(e: Event): string {
  return JSON.stringify(e);
}

export function decodeEvent(s: string): Event {
  const o = JSON.parse(s);
  if (!o || typeof o !== "object") throw new Error("bad event json");
  if (typeof o.offset !== "number" || typeof o.ts !== "number" || typeof o.type !== "string") {
    throw new Error("missing required event fields");
  }
  if (o.type === "PUT") {
    if (typeof o.key !== "string" || typeof o.value !== "number") throw new Error("bad PUT event");
    return o as Event;
  }
  if (o.type === "DEL") {
    if (typeof o.key !== "string") throw new Error("bad DEL event");
    return o as Event;
  }
  throw new Error(`unknown event type: ${o.type}`);
}

