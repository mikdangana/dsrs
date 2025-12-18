import express from "express";
import { ReplicaState } from "./local_state";
import { Replicator } from "./replicator";
import cors from "cors";

const PORT = parseInt(process.env.PORT ?? "8090", 10);
const CORE_URL = process.env.CORE_URL ?? "http://localhost:8080";
const REPLICA_ID = process.env.REPLICA_ID ?? "replica";
const OFFSET_FILE = process.env.OFFSET_FILE ?? `./offset-${REPLICA_ID}.txt`;

const app = express();

app.use(cors({
  origin: "*",        // OK for local demo
  methods: ["GET"],
}));
app.use(express.json());

const state = new ReplicaState();
const repl = new Replicator(CORE_URL, REPLICA_ID, OFFSET_FILE, state);

app.get("/health", (_req, res) => {
  res.json({ ok: true, replicaId: REPLICA_ID, port: PORT, coreUrl: CORE_URL });
});

app.get("/offset", (_req, res) => {
  res.json({ replicaId: REPLICA_ID, offset: state.offset() });
});

app.get("/data", (_req, res) => {
  res.json({ replicaId: REPLICA_ID, offset: state.offset(), state: state.getAll() });
});

app.get("/data/:key", (req, res) => {
  const key = req.params.key;
  const value = state.get(key);
  if (value === undefined) return res.status(404).json({ error: "not found", key });
  res.json({ key, value, offset: state.offset() });
});

app.get("/stream", (req, res) => {
  const since = Number(req.query.since ?? -1);
  state.streamFrom(since, res);
});

app.get("/state", (_req, res) => {
  res.json({
    replicaOffset: state.offset(),
    state: state.getAll()
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[replica ${REPLICA_ID}] listening on :${PORT} (core=${CORE_URL})`);
  repl.start().catch(err => {
    // eslint-disable-next-line no-console
    console.error(`[replica ${REPLICA_ID}] replicator failed:`, err);
  });
});

process.on("SIGINT", () => {
  repl.stop();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  repl.stop();
  server.close(() => process.exit(0));
});

