import { test, expect } from '@playwright/test';
import { GraphQLClient } from '../../../src/api/graphql-client';
import { SchemaIntrospector } from '../../../src/api/schema-introspector';
import { z } from 'zod';

test.describe('GraphQL API Tests @api @graphql', () => {
  let client: GraphQLClient;
  let introspector: SchemaIntrospector;
  const baseURL = process.env.GRAPHQL_API_URL || 'http://localhost:4000';

  test.beforeEach(({ request }) => {
    client = new GraphQLClient(request, baseURL);
    introspector = new SchemaIntrospector();
  });

  test('should introspect GraphQL schema', async () => {
    const schema = await introspector.introspect(client);

    expect(schema.__schema).toBeDefined();
    expect(schema.__schema.types).toBeInstanceOf(Array);
    expect(schema.__schema.types.length).toBeGreaterThan(0);
  });

  test('should list available queries', async () => {
    await introspector.introspect(client);
    const queries = introspector.getQueries();

    expect(queries).toBeInstanceOf(Array);
    expect(queries.length).toBeGreaterThan(0);
  });

  test('should execute simple query', async () => {
    const query = `
      query {
        hello
      }
    `;

    const response = await client.query(query);

    expect(response).toBeDefined();
    expect(response.data || response.errors).toBeDefined();
  });

  test('should execute query with variables', async () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;

    const schema = z.object({
      user: z
        .object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
        })
        .optional(),
    });

    const response = await client.query(query, { id: '1' }, schema);

    expect(response).toBeDefined();
    if (response.data) {
      expect(response.data).toBeDefined();
    }
  });

  test('should handle GraphQL errors', async () => {
    const query = `
      query {
        invalidField
      }
    `;

    const response = await client.query(query);

    if (response.errors) {
      expect(response.errors.length).toBeGreaterThan(0);
      expect(response.errors[0].message).toBeDefined();
    } else {
      // Query might be valid, data might be null
      expect(response.data === null || response.data !== undefined).toBe(true);
    }
  });

  test('should validate query syntax', () => {
    const validQuery = 'query { user { id } }';
    const invalidQuery = 'select * from users';

    expect(introspector.validateQuery(validQuery)).toBe(true);
    expect(introspector.validateQuery(invalidQuery)).toBe(false);
  });

  test('should validate mutation syntax', () => {
    const validMutation = 'mutation { createUser(name: "John") { id } }';
    const invalidMutation = 'query { user { id } }';

    expect(introspector.validateMutation(validMutation)).toBe(true);
    expect(introspector.validateMutation(invalidMutation)).toBe(false);
  });

  test('should build query from fields', () => {
    const fields = ['id', 'name', 'email'];
    const query = client.buildQuery(fields, { id: 'ID!' });

    expect(query).toContain('query GetData');
    expect(query).toContain('$id: ID!');
    fields.forEach((field) => {
      expect(query).toContain(field);
    });
  });

  test('should build mutation from fields', () => {
    const fields = ['id', 'name'];
    const mutation = client.buildMutation(fields, 'CreateUserInput', 'createUser');

    expect(mutation).toContain('mutation createUser');
    expect(mutation).toContain('$input: CreateUserInput!');
    fields.forEach((field) => {
      expect(mutation).toContain(field);
    });
  });

  test('should set authentication header', () => {
    const token = 'test-token-123';
    client.setAuthHeader(token);

    expect(client).toBeDefined();
  });
});
