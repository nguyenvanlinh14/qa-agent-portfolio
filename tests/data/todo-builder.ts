import { uniqueTitle } from './factories';

export interface TodoInput {
  title: string;
  done: boolean;
}

/** Test-data builder: sensible unique defaults, override only what the test cares about. */
export class TodoBuilder {
  private title = uniqueTitle();
  private isDone = false;

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withPrefix(prefix: string): this {
    this.title = uniqueTitle(prefix);
    return this;
  }

  /** Exactly `length` characters; the API limit is 120. */
  withTitleLength(length: number): this {
    this.title = 'x'.repeat(length);
    return this;
  }

  done(): this {
    this.isDone = true;
    return this;
  }

  build(): TodoInput {
    return { title: this.title, done: this.isDone };
  }
}

export const aTodo = (): TodoBuilder => new TodoBuilder();
