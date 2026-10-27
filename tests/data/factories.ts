import { randomUUID } from 'node:crypto';

export interface Credentials {
  email: string;
  password: string;
}

/** Short random suffix so every test creates data nobody else touches (safe in parallel runs). */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

/** A unique, readable title such as "Write smoke test [3fa9c1d2]". */
export function uniqueTitle(prefix = 'Todo'): string {
  return `${prefix} [${uniqueSuffix()}]`;
}

export const users = {
  qa: { email: 'qa@demo.dev', password: 'Passw0rd!' } satisfies Credentials,
  dev: { email: 'dev@demo.dev', password: 'Passw0rd!' } satisfies Credentials,
};

export function wrongPasswordUser(): Credentials {
  return { email: users.qa.email, password: `wrong-${uniqueSuffix()}` };
}

export function unknownUser(): Credentials {
  return { email: `nobody-${uniqueSuffix()}@demo.dev`, password: 'Passw0rd!' };
}
