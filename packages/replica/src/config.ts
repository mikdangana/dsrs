export const REPLICA_ID =
  process.env.REPLICA_ID ?? "replica-unknown";

export const PORT =
  Number(process.env.PORT ?? 8090);

export const CORE_URL =
  process.env.CORE_URL ?? "http://localhost:8080";

export const SELF_URL =
  process.env.SELF_URL ??
  `http://localhost:${PORT}`;

export const DELEGATION_ENABLED =
  process.env.DELEGATION_ENABLED === "true";

