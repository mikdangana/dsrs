import express from "express";
import { Request, Response } from "express";
import { CoreState } from "./state";
import { EventLog } from "./log";
import { startMutator } from "./mutator";
import { encodeEvent } from "@dsrs/common";
import { EventsResponse, Offset } from "@dsrs/common";
import { ReplicaRegistry } from "./registry";

import cors from "cors";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const MUTATE_MS = parseInt(process.env.MUTATE_MS ?? "500", 10);
const LOG_MAX = parseInt(process.env.LOG_MAX ?? "50000", 10);
const DELEGATION_ENABLED =
  process.env.DELEGATION_ENABLED === "true";

const DELEGATION_MIN_LAG =
  parseInt(process.env.DELEGATION_MIN_LAG ?? "5", 10);


const app = express();

app.use(cors({
  origin: "*",        // OK for local demo
  methods: ["GET"],
}));
app.use(express.json());

const state = new CoreState();
const log = new EventLog(LOG_MAX);
const registry = new ReplicaRegistry();


// start periodic mutations
startMutator(state, log, MUTATE_MS);

app.get("/health", (_req, res) => {
  res.json({ ok: true, port: PORT, coreOffset: log.coreOffset() });
});

app.get("/state", (_req, res) => {
  res.json({ coreOffset: log.coreOffset(), state: state.getAll() });
});

app.get("/events", (req, res) => {
  const since = parseInt((req.query.since as string) ?? "-1", 10);
  const events = log.since(since);
  const coreOffset = log.coreOffset();
  const toInclusive = events.length ? events[events.length - 1].offset : since;

  const body: EventsResponse = {
    fromExclusive: since,
    toInclusive,
    events,
    coreOffset
  };
  res.json(body);
});

// SSE stream endpoint
function serveCoreStream(req: Request, res: Response): void {
  const since = parseInt((req.query.since as string) ?? "-1", 10);
  let lastSent: Offset = since;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // initial catch-up burst over SSE (optional)
  const initial = log.since(lastSent);
  for (const e of initial) {
    res.write(`id: ${e.offset}\n`);
    res.write(`data: ${encodeEvent(e)}\n\n`);
    lastSent = e.offset;
  }

  // poll the log periodically and push new events
  const tick = setInterval(() => {
    const evs = log.since(lastSent);
    for (const e of evs) {
      res.write(`id: ${e.offset}\n`);
      res.write(`data: ${encodeEvent(e)}\n\n`);
      lastSent = e.offset;
    }
  }, 200);

  req.on("close", () => {
    clearInterval(tick);
    res.end();
  });
};

app.get("/stream", (req, res) => {
  if (DELEGATION_ENABLED) {
    const since = Number(req.query.since ?? -1);
    const delegate = registry.getDelegate(since + DELEGATION_MIN_LAG);

    if (delegate) {
      res.status(302)
         .setHeader("Location",
           `${delegate.url}/stream?since=${since}`)
         .end();
      return;
    }
  }

  // fallback: core serves stream
  serveCoreStream(req, res);
});

// core/src/server.ts
app.get("/replicas", (_req, res) => {
  res.json(
    registry.list().map(r => ({
      id: r.id,
      url: r.url
    }))
  );
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[core] listening on :${PORT} (mutate every ${MUTATE_MS}ms)`);
});

