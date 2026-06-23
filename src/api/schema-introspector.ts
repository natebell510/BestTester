import { GraphQLClient } from './graphql-client';

export interface GraphQLSchema {
  __schema: {
    types: Array<{
      name: string;
      kind: string;
      fields?: Array<{ name: string; type: { name: string; kind: string } }>;
      inputFields?: Array<{ name: string; type: { name: string; kind: string } }>;
    }>;
    queryType: { name: string };
    mutationType?: { name: string };
  };
}

export class SchemaIntrospector {
  private schema: GraphQLSchema | null = null;

  private introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          fields {
            name
            type {
              name
              kind
            }
          }
          inputFields {
            name
            type {
              name
              kind
            }
          }
        }
        queryType { name }
        mutationType { name }
      }
    }
  `;

  async introspect(client: GraphQLClient): Promise<GraphQLSchema> {
    const response = await client.query<GraphQLSchema>(this.introspectionQuery);

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Introspection failed: ${response.errors[0].message}`);
    }

    if (!response.data) {
      throw new Error('No schema data returned from introspection');
    }

    this.schema = response.data;
    return response.data;
  }

  getTypes(): string[] {
    if (!this.schema) return [];
    return this.schema.__schema.types.map((t) => t.name);
  }

  getQueries(): string[] {
    if (!this.schema) return [];
    const queryType = this.schema.__schema.types.find(
      (t) => t.name === this.schema!.__schema.queryType.name,
    );
    return queryType?.fields?.map((f) => f.name) || [];
  }

  getMutations(): string[] {
    if (!this.schema || !this.schema.__schema.mutationType) return [];
    const mutationType = this.schema.__schema.types.find(
      (t) => t.name === this.schema!.__schema.mutationType?.name,
    );
    return mutationType?.fields?.map((f) => f.name) || [];
  }

  getType(name: string): typeof this.schema | undefined {
    if (!this.schema) return undefined;
    return this.schema.__schema.types.find((t) => t.name === name);
  }

  generateTestCases(): Array<{ name: string; type: string }> {
    const testCases: Array<{ name: string; type: string }> = [];

    if (!this.schema) return testCases;

    const queries = this.getQueries();
    queries.forEach((q) => {
      testCases.push({ name: q, type: 'query' });
    });

    const mutations = this.getMutations();
    mutations.forEach((m) => {
      testCases.push({ name: m, type: 'mutation' });
    });

    return testCases;
  }

  validateQuery(query: string): boolean {
    if (!query || typeof query !== 'string') return false;
    return query.trim().startsWith('query') || query.trim().startsWith('{');
  }

  validateMutation(mutation: string): boolean {
    if (!mutation || typeof mutation !== 'string') return false;
    return mutation.trim().startsWith('mutation');
  }
}
