import EventSource from "eventsource";
import { decodeEvent } from "@dsrs/common";
import { EventsResponse, Offset } from "@dsrs/common";
import { ReplicaState } from "./local_state";
import { readOffset, writeOffset } from "./persistence";
import {
  CORE_URL,
  REPLICA_ID,
  SELF_URL,
  DELEGATION_ENABLED,
} from "./config";


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class Replicator {
  private stopped = false;
  private es: EventSource | null = null;
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private coreUrl: string,
    private replicaId: string,
    private offsetFile: string,
    private state: ReplicaState
  ) {}

  public stop(): void {
    this.stopped = true;
    this.es?.close();
    this.es = null;
    this.heartbeat?.unref();
    this.heartbeat = undefined;
  }

  private persistOffset(): void {
    writeOffset(this.offsetFile, this.state.offset());
  }

  public async start(): Promise<void> {
    // initialize last offset from disk
    const diskOffset = readOffset(this.offsetFile);
    if (diskOffset > this.state.offset()) {
      // fast-forward our in-memory offset marker only; state will be rebuilt by catch-up
      // For simplicity, we just keep state empty and catch up from diskOffset.
      // If you want full correctness, add snapshotting.
      // We'll set internal lastOffset to diskOffset so we don't re-apply old events.
      // Easiest: apply a "fake" offset by applying nothing and tracking offset separately.
      // We'll do it by replaying from (diskOffset - 1) and applying real events.
    }


    if (process.env.DELEGATION_ENABLED === "true") {
      this.startHeartbeat();
    }

    // main loop: catch-up then stream; reconnect on failure
    let backoff = 200;

    while (!this.stopped) {
      try {
        // catch up from our current offset
        await this.catchUp();

        // open SSE stream
        await this.stream();
        backoff = 200; // reset if stream ends cleanly
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[replica ${this.replicaId}] replication error:`, e);
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 5000);
      }
    }
  }

  private startHeartbeat() {
    this.heartbeat = setInterval(() => {
      fetch(`${CORE_URL}/heartbeat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: REPLICA_ID,
          offset: this.state.offset(),
          url: SELF_URL,
        }),
      }).catch(() => {
        /* best-effort heartbeat */
      });
    }, 1000);
  }

  private async catchUp(): Promise<void> {
    const since = this.state.offset();
    const url = `${this.coreUrl}/events?since=${since}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`catchUp failed: ${resp.status}`);
    const body = (await resp.json()) as EventsResponse;

    for (const ev of body.events) {
      this.state.apply(ev);
    }
    this.persistOffset();
  }

  private stream(): Promise<void> {
  return new Promise((resolve, reject) => {
    const since = this.state.offset();
    const url = `${this.coreUrl}/stream?since=${since}`;

    // eslint-disable-next-line no-console
    console.log(`[replica ${this.replicaId}] connecting SSE: ${url}`);

    const es = new EventSource(url);
    this.es = es;

    es.onmessage = (msg: MessageEvent) => {
      try {
        const e = decodeEvent(msg.data as string);
        this.state.apply(e);
        this.persistOffset();
      } catch (err) {
        es.close();
        this.es = null;
        reject(err);
      }
    };

    es.onerror = (err: any) => {
      es.close();
      this.es = null;
      reject(err);
    };

    // allow graceful shutdown
    const interval = setInterval(() => {
      if (this.stopped) {
        clearInterval(interval);
        es.close();
        this.es = null;
        resolve();
      }
    }, 250);
  });
}
}
