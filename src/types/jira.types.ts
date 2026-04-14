export interface JiraConfig {
  baseUrl:   string;
  email:     string;
  apiToken:  string;
  projectKey: string;
  bugIssueType: string;
}

export interface JiraIssue {
  id:     string;
  key:    string;
  self:   string;
  fields: {
    summary:     string;
    status:      { name: string };
    priority:    { name: string };
    assignee?:   { displayName: string } | null;
    labels:      string[];
    description?: JiraAdfDoc | string;
    comment?:    { comments: JiraComment[] };
  };
}

export interface JiraAdfDoc {
  type:    'doc';
  version: 1;
  content: JiraAdfNode[];
}

export interface JiraAdfNode {
  type:     string;
  content?: JiraAdfNode[];
  text?:    string;
  attrs?:   Record<string, unknown>;
  marks?:   Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface JiraComment {
  id:      string;
  author:  { displayName: string };
  body:    JiraAdfDoc | string;
  created: string;
}

export interface JiraCreatePayload {
  fields: {
    project:     { key: string };
    summary:     string;
    description: JiraAdfDoc;
    issuetype:   { name: string };
    priority:    { name: string };
    labels:      string[];
  };
}

export interface TestFailure {
  testName:    string;
  suiteName:   string;
  errorMessage: string;
  duration:    number;
  file?:       string;
  buildUrl?:   string;
  buildNumber?: string | number;
}

export interface JiraSyncResult {
  created:  string[];   // issue keys created
  updated:  string[];   // issue keys updated
  closed:   string[];   // issue keys transitioned to Done
  skipped:  string[];   // already open, no change needed
}

export interface TestExecutionRecord {
  testId:   string;   // derived from test name (slugified)
  testName: string;
  status:   'PASS' | 'FAIL' | 'SKIP';
  duration: number;   // ms
  error?:   string;
}

export interface TestExecutionPayload {
  summary:    string;
  junitPath:  string;
  tests:      TestExecutionRecord[];
  buildUrl?:  string;
  buildNumber?: string | number;
}
