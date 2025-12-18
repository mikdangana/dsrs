export type Offset = number;

export type PutEvent = {
  offset: Offset;
  ts: number;
  type: "PUT";
  key: string;
  value: number;
};

export type DelEvent = {
  offset: Offset;
  ts: number;
  type: "DEL";
  key: string;
};

export type Event = PutEvent | DelEvent;

export type State = Record<string, number>;

export type EventsResponse = {
  fromExclusive: Offset;
  toInclusive: Offset;
  events: Event[];
  coreOffset: Offset;
};

