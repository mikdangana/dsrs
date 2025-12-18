import { State } from "@dsrs/common";

export class CoreState {
  private state: State = {};

  public getAll(): State {
    // shallow copy for safety
    return { ...this.state };
  }

  public put(key: string, value: number): void {
    this.state[key] = value;
  }

  public del(key: string): void {
    delete this.state[key];
  }
}

