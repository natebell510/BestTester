export interface JiraConfig {
  baseUrl:      string;
  email:        string;
  apiToken:     string;
  projectKey:   string;
  bugIssueType: string;
}

export interface EnvironmentConfig {
  baseURL: string;
  adminUsername: string;
  adminPassword: string;
}

export interface JenkinsConfig {
  url: string;
  username: string;
  token: string;
}

export interface SlackConfig {
  webhookUrl: string;
}
