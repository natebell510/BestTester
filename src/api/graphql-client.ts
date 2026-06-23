import { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

export interface GraphQLQuery {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

export class GraphQLClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(
    private request: APIRequestContext,
    baseURL: string,
    customHeaders: Record<string, string> = {},
  ) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
  }

  setAuthHeader(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    schema?: z.ZodSchema,
  ): Promise<GraphQLResponse<T>> {
    const response = await this.request.post(`${this.baseURL}/graphql`, {
      headers: this.headers,
      data: {
        query,
        variables,
      },
    });

    if (!response.ok()) {
      throw new Error(`GraphQL request failed: ${response.status()}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (schema && result.data) {
      try {
        schema.parse(result.data);
      } catch (err) {
        throw new Error(`GraphQL response validation failed: ${err}`);
      }
    }

    return result;
  }

  async mutation<T>(
    mutation: string,
    variables?: Record<string, unknown>,
    schema?: z.ZodSchema,
  ): Promise<GraphQLResponse<T>> {
    return this.query<T>(mutation, variables, schema);
  }

  async subscription<T>(
    subscription: string,
    variables?: Record<string, unknown>,
  ): Promise<AsyncGenerator<T>> {
    return this.createSubscriptionGenerator<T>(subscription, variables);
  }

  private async *createSubscriptionGenerator<T>(
    subscription: string,
    variables?: Record<string, unknown>,
  ): AsyncGenerator<T> {
    const response = await this.request.post(`${this.baseURL}/graphql`, {
      headers: { ...this.headers, Connection: 'Upgrade' },
      data: {
        query: subscription,
        variables,
      },
    });

    if (!response.ok()) {
      throw new Error(`GraphQL subscription failed: ${response.status()}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const json = JSON.parse(line);
          if (json.data) {
            yield json.data as T;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }

  buildQuery(fields: string[], variables: Record<string, string> = {}): string {
    const varString = Object.entries(variables)
      .map(([name, type]) => `$${name}: ${type}`)
      .join(', ');

    const argString = Object.keys(variables)
      .map((name) => `${name}: $${name}`)
      .join(', ');

    const query = `query GetData${varString ? `(${varString})` : ''} {
      ${argString ? `data(${argString})` : 'data'} {
        ${fields.join('\n')}
      }
    }`;

    return query;
  }

  buildMutation(fields: string[], inputType: string, operationName: string): string {
    return `mutation ${operationName}($input: ${inputType}!) {
      ${operationName}(input: $input) {
        ${fields.join('\n')}
      }
    }`;
  }
}
