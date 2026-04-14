import { TeardownRegistry } from '../teardown-registry';

/**
 * Abstract base factory — auto-registers teardown on every created entity.
 */
export abstract class BaseFactory<T extends { id?: string | number }> {
  protected created: T[] = [];

  async create(overrides?: Partial<T>): Promise<T> {
    const entity = await this.apiCreate({ ...this.defaults(), ...overrides });
    this.created.push(entity);
    TeardownRegistry.register(() => this.apiDelete(String(entity.id)));
    return entity;
  }

  abstract defaults(): Partial<T>;
  abstract apiCreate(data: Partial<T>): Promise<T>;
  abstract apiDelete(id: string): Promise<void>;
}
