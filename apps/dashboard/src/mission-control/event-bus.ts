import type { BotEvent } from "@tourab/shared";

export type EventHandler = (event: BotEvent) => void;

export class EventBus {
  private handlers = new Set<EventHandler>();

  publish(event: BotEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
