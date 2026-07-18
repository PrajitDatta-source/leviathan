import { Command } from "./types";

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command) {
    if (this.commands.has(command.id)) {
      throw new Error(`Command "${command.id}" is already registered.`);
    }

    this.commands.set(command.id, command);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  search(query: string): Command[] {
    const value = query.trim().toLowerCase();

    if (!value) {
      return this.getAll();
    }

    return this.getAll().filter((command) => {
      const searchable = [
        command.title,
        command.description ?? "",
        command.category ?? "",
        ...(command.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }

  get(id: string) {
    return this.commands.get(id);
  }

  clear() {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistry();