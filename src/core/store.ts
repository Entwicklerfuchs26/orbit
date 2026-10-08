type Subscriber<T> = (value: T) => void;
type Unsubscribe = () => void;
type Updater<T> = (value: T) => T;

export class Store<T> {
  private value: T;
  private subscribers: Set<Subscriber<T>> = new Set();

  constructor(initial: T) {
    this.value = initial;
  }

  subscribe(fn: Subscriber<T>): Unsubscribe {
    fn(this.value);
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  set(value: T): void {
    if (this.value === value) return;
    this.value = value;
    this.notify();
  }

  update(fn: Updater<T>): void {
    this.set(fn(this.value));
  }

  get(): T {
    return this.value;
  }

  private notify(): void {
    for (const fn of this.subscribers) {
      fn(this.value);
    }
  }
}

export class MapStore<K, V> {
  private map: Map<K, V> = new Map();
  private subscribers: Set<Subscriber<Map<K, V>>> = new Set();

  subscribe(fn: Subscriber<Map<K, V>>): Unsubscribe {
    fn(this.map);
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  set(key: K, value: V): void {
    this.map.set(key, value);
    this.notify();
  }

  delete(key: K): boolean {
    const result = this.map.delete(key);
    if (result) this.notify();
    return result;
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  values(): V[] {
    return [...this.map.values()];
  }

  entries(): [K, V][] {
    return [...this.map.entries()];
  }

  get size(): number {
    return this.map.size;
  }

  private notify(): void {
    for (const fn of this.subscribers) {
      fn(this.map);
    }
  }
}
