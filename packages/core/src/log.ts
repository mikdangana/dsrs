import { Event, Offset, PutEvent, DelEvent } from "@dsrs/common";

export class EventLog {
  private events: Event[] = [];
  private nextOffset: Offset = 0;

  constructor(private maxEvents: number) {}

  public append(
    e: Omit<PutEvent, "offset"> | Omit<DelEvent, "offset">
  ): Event {
    const ev: Event = { ...e, offset: this.nextOffset++ };
    this.events.push(ev);

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
    return ev;
  }

  public coreOffset(): Offset {
    return this.nextOffset - 1;
  }

  public since(sinceExclusive: Offset): Event[] {
    return this.events.filter(e => e.offset > sinceExclusive);
  }
}

