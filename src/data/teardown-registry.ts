type TeardownFn = () => Promise<void>;

/**
 * Centralized registry that collects teardown callbacks and runs them all after tests.
 */
export class TeardownRegistry {
  private static fns: TeardownFn[] = [];

  static register(fn: TeardownFn): void {
    this.fns.push(fn);
  }

  static async runAll(): Promise<void> {
    const errors: unknown[] = [];
    for (const fn of this.fns.reverse()) {
      try { await fn(); } catch (e) { errors.push(e); }
    }
    this.fns = [];
    if (errors.length) throw new AggregateError(errors, 'Teardown errors');
  }
}
