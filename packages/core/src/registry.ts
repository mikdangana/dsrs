export interface ReplicaInfo {
  id: string;
  lastOffset: number;
  url: string;
}

export class ReplicaRegistry {
  private replicas: ReplicaInfo[] = [];
  private rr = 0;

  update(info: ReplicaInfo) {
    const i = this.replicas.findIndex(r => r.id === info.id);
    if (i >= 0) this.replicas[i] = info;
    else this.replicas.push(info);
  }

  getDelegate(minOffset: number): ReplicaInfo | null {
    const eligible = this.replicas.filter(
      r => r.lastOffset >= minOffset
    );
    if (!eligible.length) return null;

    const r = eligible[this.rr % eligible.length];
    this.rr++;
    return r;
  }

  list(): ReplicaInfo[] | [] {
    return this.replicas;
  }
}

