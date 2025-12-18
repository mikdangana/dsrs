import { CoreState } from "./state";
import { EventLog } from "./log";

function randKey(): string {
  const n = Math.floor(Math.random() * 20);
  return `k${n}`;
}

export function startMutator(state: CoreState, log: EventLog, mutateMs: number): void {
  setInterval(() => {
    const key = randKey();
    const coin = Math.random();

    if (coin < 0.15) {
      state.del(key);
      log.append({ ts: Date.now(), type: "DEL", key });
      return;
    }

    // random walk value
    const value = Math.floor(Math.random() * 1000);
    state.put(key, value);
    log.append({ ts: Date.now(), type: "PUT", key, value });
  }, mutateMs);
}

