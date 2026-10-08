import type { Command, CommandManager } from './types';
import { Store } from './store';

export class Commands implements CommandManager {
  private commands: Map<string, Command> = new Map();
  readonly store: Store<Command[]>;

  constructor() {
    this.store = new Store<Command[]>([]);
  }

  register(command: Command): void {
    this.commands.set(command.id, command);
    this.sync();
  }

  unregister(id: string): void {
    this.commands.delete(id);
    this.sync();
  }

  execute(id: string): void {
    const cmd = this.commands.get(id);
    if (cmd) cmd.callback();
  }

  getAll(): Command[] {
    return [...this.commands.values()];
  }

  search(query: string): Command[] {
    if (!query) return this.getAll();
    const lower = query.toLowerCase();
    return this.getAll().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lower) ||
        cmd.id.toLowerCase().includes(lower),
    );
  }

  private sync(): void {
    this.store.set([...this.commands.values()]);
  }
}
