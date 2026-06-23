import { PactOptions } from '@pact-foundation/pact';

export const pactConfig: PactOptions = {
  consumer: 'BestTester',
  dir: './pacts',
  logLevel: 'INFO',
  spec: 2,
};

export const pactBrokerConfig = {
  brokerUrl: process.env.PACT_BROKER_URL || 'http://localhost:8080',
  brokerUsername: process.env.PACT_BROKER_USERNAME || 'pactbroker',
  brokerPassword: process.env.PACT_BROKER_PASSWORD || 'pactbroker',
  brokerToken: process.env.PACT_BROKER_TOKEN,
  publishVerificationResult: true,
  consumerVersion: process.env.GIT_COMMIT || 'dev-build',
  consumerBranch: process.env.GIT_BRANCH || 'main',
  tags: process.env.PACT_TAGS ? process.env.PACT_TAGS.split(',') : ['latest'],
  providerVersion: process.env.PROVIDER_VERSION || '1.0.0',
  providerBranch: process.env.PROVIDER_BRANCH || 'main',
};

export const contractTestConfig = {
  providers: [
    {
      name: 'OrangeHRM-Auth',
      baseUrl: process.env.AUTH_API_URL || 'http://localhost:8080',
      port: 8081,
    },
    {
      name: 'OrangeHRM-Employee',
      baseUrl: process.env.EMPLOYEE_API_URL || 'http://localhost:8080',
      port: 8082,
    },
    {
      name: 'OrangeHRM-Leave',
      baseUrl: process.env.LEAVE_API_URL || 'http://localhost:8080',
      port: 8083,
    },
  ],
  pactDir: './pacts',
  format: 'json',
};
