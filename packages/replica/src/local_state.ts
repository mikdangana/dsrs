import { Event, Offset, State } from "@dsrs/common";
import { Response } from "express";

export class ReplicaState {
  private state: State = {};
  private lastOffset: Offset = -1;

  // 🔹 minimal event buffer for delegation
  private eventLog: Event[] = [];
  private subscribers = new Set<Response>();

  public getAll(): State {
    return { ...this.state };
  }

  public get(key: string): number | undefined {
    return this.state[key];
  }

  public offset(): Offset {
    return this.lastOffset;
  }

  public apply(e: Event): void {
    // strict monotonic apply: ignore duplicates / out-of-order
    if (e.offset <= this.lastOffset) return;

    if (e.type === "PUT") {
      this.state[e.key] = e.value;
    } else {
      delete this.state[e.key];
    }

    this.lastOffset = e.offset;

    // record + fan-out for delegation
    this.eventLog.push(e);
    this.publish(e);
  }

  /**
   * Serve an SSE stream starting AFTER `since`
   * Used for delegated replication.
   */
  public streamFrom(since: Offset, res: Response): void {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // replay buffered events
    for (const e of this.eventLog) {
      if (e.offset > since) {
        res.write(`data: ${JSON.stringify(e)}\n\n`);
      }
    }

    // tail future events
    this.subscribers.add(res);

    res.on("close", () => {
      this.subscribers.delete(res);
    });
  }

  private publish(e: Event): void {
    for (const res of this.subscribers) {
      res.write(`data: ${JSON.stringify(e)}\n\n`);
    }
  }
}

