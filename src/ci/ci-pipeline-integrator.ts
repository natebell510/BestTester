import axios, { AxiosInstance } from 'axios';

export interface CIPipelineConfig {
  provider: 'github' | 'gitlab' | 'jenkins' | 'circleci';
  token: string;
  baseUrl: string;
  repoOwner?: string;
  repoName?: string;
  jobName?: string;
}

export interface BuildResult {
  buildId: string;
  status: 'success' | 'failure' | 'pending';
  url: string;
  timestamp: string;
  testsPassed: number;
  testsFailed: number;
  duration: number;
}

export interface DeploymentConfig {
  environment: string;
  triggerCondition: 'always' | 'on-success' | 'on-failure';
  maxRetries: number;
  timeout: number;
}

export class CIPipelineIntegrator {
  private client: AxiosInstance;
  private config: CIPipelineConfig;

  constructor(config: CIPipelineConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async triggerBuild(branch?: string): Promise<BuildResult> {
    try {
      let response;

      switch (this.config.provider) {
        case 'github':
          response = await this.triggerGitHubBuild(branch);
          break;
        case 'gitlab':
          response = await this.triggerGitLabBuild(branch);
          break;
        case 'jenkins':
          response = await this.triggerJenkinsBuild();
          break;
        case 'circleci':
          response = await this.triggerCircleCIBuild(branch);
          break;
        default:
          throw new Error(`Unsupported CI provider: ${this.config.provider}`);
      }

      return response;
    } catch (error) {
      throw new Error(`Failed to trigger build: ${error}`);
    }
  }

  async getBuildStatus(buildId: string): Promise<BuildResult> {
    try {
      let response;

      switch (this.config.provider) {
        case 'github':
          response = await this.getGitHubBuildStatus(buildId);
          break;
        case 'gitlab':
          response = await this.getGitLabBuildStatus(buildId);
          break;
        case 'jenkins':
          response = await this.getJenkinsBuildStatus(buildId);
          break;
        case 'circleci':
          response = await this.getCircleCIBuildStatus(buildId);
          break;
        default:
          throw new Error(`Unsupported CI provider: ${this.config.provider}`);
      }

      return response;
    } catch (error) {
      throw new Error(`Failed to get build status: ${error}`);
    }
  }

  async pollBuildCompletion(buildId: string, maxWaitTime: number = 3600000): Promise<BuildResult> {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getBuildStatus(buildId);

      if (status.status !== 'pending') {
        return status;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(`Build ${buildId} did not complete within ${maxWaitTime}ms`);
  }

  async reportTestResults(
    buildId: string,
    testResults: { passed: number; failed: number },
  ): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'github':
          await this.reportGitHubResults(buildId, testResults);
          break;
        case 'gitlab':
          await this.reportGitLabResults(buildId, testResults);
          break;
        case 'jenkins':
          await this.reportJenkinsResults(buildId, testResults);
          break;
        case 'circleci':
          await this.reportCircleCIResults(buildId, testResults);
          break;
      }
    } catch (error) {
      throw new Error(`Failed to report test results: ${error}`);
    }
  }

  async updateBuildStatus(buildId: string, status: 'success' | 'failure'): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'github':
          await this.updateGitHubStatus(buildId, status);
          break;
        case 'gitlab':
          await this.updateGitLabStatus(buildId, status);
          break;
        case 'circleci':
          await this.updateCircleCIStatus(buildId, status);
          break;
      }
    } catch (error) {
      throw new Error(`Failed to update build status: ${error}`);
    }
  }

  async cancelBuild(buildId: string): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'github':
          await this.cancelGitHubBuild(buildId);
          break;
        case 'gitlab':
          await this.cancelGitLabBuild(buildId);
          break;
        case 'jenkins':
          await this.cancelJenkinsBuild(buildId);
          break;
        case 'circleci':
          await this.cancelCircleCIBuild(buildId);
          break;
      }
    } catch (error) {
      throw new Error(`Failed to cancel build: ${error}`);
    }
  }

  async createArtifact(buildId: string, name: string, content: string): Promise<string> {
    try {
      switch (this.config.provider) {
        case 'github':
          return await this.createGitHubArtifact(buildId, name, content);
        case 'gitlab':
          return await this.createGitLabArtifact(buildId, name, content);
        case 'jenkins':
          return await this.createJenkinsArtifact(buildId, name, content);
        default:
          throw new Error(`Artifacts not supported for ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to create artifact: ${error}`);
    }
  }

  private async triggerGitHubBuild(branch?: string): Promise<BuildResult> {
    await this.client.post(`/repos/${this.config.repoOwner}/${this.config.repoName}/dispatches`, {
      event_type: 'test',
      ref: branch || 'main',
    });

    return {
      buildId: `github-${Date.now()}`,
      status: 'pending',
      url: `https://github.com/${this.config.repoOwner}/${this.config.repoName}/actions`,
      timestamp: new Date().toISOString(),
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
    };
  }

  private async getGitHubBuildStatus(): Promise<BuildResult> {
    const response = await this.client.get(
      `/repos/${this.config.repoOwner}/${this.config.repoName}/actions/runs`,
    );

    const run = response.data.workflow_runs[0];

    return {
      buildId: run.id.toString(),
      status:
        run.status === 'completed'
          ? run.conclusion === 'success'
            ? 'success'
            : 'failure'
          : 'pending',
      url: run.html_url,
      timestamp: run.created_at,
      testsPassed: 0,
      testsFailed: 0,
      duration: run.run_number || 0,
    };
  }

  private async triggerGitLabBuild(branch?: string): Promise<BuildResult> {
    const response = await this.client.post(
      `/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipeline`,
      { ref: branch || 'main' },
    );

    return {
      buildId: response.data.id.toString(),
      status: 'pending',
      url: response.data.web_url,
      timestamp: new Date().toISOString(),
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
    };
  }

  private async getGitLabBuildStatus(buildId: string): Promise<BuildResult> {
    const response = await this.client.get(
      `/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipelines/${buildId}`,
    );

    const pipeline = response.data;

    return {
      buildId: pipeline.id.toString(),
      status:
        pipeline.status === 'success'
          ? 'success'
          : pipeline.status === 'failed'
            ? 'failure'
            : 'pending',
      url: pipeline.web_url,
      timestamp: pipeline.created_at,
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
    };
  }

  private async triggerJenkinsBuild(): Promise<BuildResult> {
    const resp = await this.client.post(`/job/${this.config.jobName}/buildWithParameters`, {});

    return {
      buildId: resp.headers.location.split('/').pop() || 'unknown',
      status: 'pending',
      url: `${this.config.baseUrl}/job/${this.config.jobName}`,
      timestamp: new Date().toISOString(),
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
    };
  }

  private async getJenkinsBuildStatus(buildId: string): Promise<BuildResult> {
    const response = await this.client.get(`/job/${this.config.jobName}/${buildId}/api/json`);

    return {
      buildId: response.data.number.toString(),
      status: response.data.building
        ? 'pending'
        : response.data.result === 'SUCCESS'
          ? 'success'
          : 'failure',
      url: response.data.url,
      timestamp: new Date(response.data.timestamp).toISOString(),
      testsPassed: 0,
      testsFailed: 0,
      duration: response.data.duration,
    };
  }

  private async triggerCircleCIBuild(branch?: string): Promise<BuildResult> {
    const response = await this.client.post(
      `/project/github/${this.config.repoOwner}/${this.config.repoName}/latest/artifacts?branch=${branch || 'main'}`,
      {},
    );

    return {
      buildId: response.data.build_num.toString(),
      status: 'pending',
      url: response.data.build_url,
      timestamp: new Date().toISOString(),
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
    };
  }

  private async getCircleCIBuildStatus(buildId: string): Promise<BuildResult> {
    const response = await this.client.get(
      `/project/github/${this.config.repoOwner}/${this.config.repoName}/${buildId}`,
    );

    return {
      buildId: response.data.build_num.toString(),
      status:
        response.data.status === 'success'
          ? 'success'
          : response.data.status === 'fixed'
            ? 'success'
            : 'failure',
      url: response.data.build_url,
      timestamp: response.data.start_time,
      testsPassed: 0,
      testsFailed: 0,
      duration: response.data.build_time_millis,
    };
  }

  private async reportGitHubResults(
    buildId: string,
    results: { passed: number; failed: number },
  ): Promise<void> {
    await this.client.post(`/repos/${this.config.repoOwner}/${this.config.repoName}/check-runs`, {
      name: 'Test Results',
      head_sha: buildId,
      status: 'completed',
      conclusion: results.failed === 0 ? 'success' : 'failure',
      summary: `Passed: ${results.passed}, Failed: ${results.failed}`,
    });
  }

  private async reportGitLabResults(
    buildId: string,
    results: { passed: number; failed: number },
  ): Promise<void> {
    await this.client.put(
      `/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipelines/${buildId}`,
      { description: `Passed: ${results.passed}, Failed: ${results.failed}` },
    );
  }

  private async reportJenkinsResults(
    buildId: string,
    results: { passed: number; failed: number },
  ): Promise<void> {
    await this.client.post(`/job/${this.config.jobName}/${buildId}/submitDescription`, {
      description: `Passed: ${results.passed}, Failed: ${results.failed}`,
    });
  }

  private async reportCircleCIResults(): Promise<void> {
    // CircleCI doesn't have a direct API for updating test results
    // Results are typically pushed via artifacts
  }

  private async updateGitHubStatus(buildId: string, status: 'success' | 'failure'): Promise<void> {
    await this.client.post(`/repos/${this.config.repoOwner}/${this.config.repoName}/check-runs`, {
      name: 'BestTester',
      head_sha: buildId,
      status: 'completed',
      conclusion: status === 'success' ? 'success' : 'failure',
    });
  }

  private async updateGitLabStatus(buildId: string, status: 'success' | 'failure'): Promise<void> {
    await this.client.put(
      `/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipelines/${buildId}`,
      { status },
    );
  }

  private async updateCircleCIStatus(): Promise<void> {
    // Status updates handled through artifact push
  }

  private async cancelGitHubBuild(buildId: string): Promise<void> {
    await this.client.post(
      `/repos/${this.config.repoOwner}/${this.config.repoName}/actions/runs/${buildId}/cancel`,
      {},
    );
  }

  private async cancelGitLabBuild(buildId: string): Promise<void> {
    await this.client.post(
      `/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipelines/${buildId}/cancel`,
      {},
    );
  }

  private async cancelJenkinsBuild(buildId: string): Promise<void> {
    await this.client.post(`/job/${this.config.jobName}/${buildId}/stop`, {});
  }

  private async cancelCircleCIBuild(buildId: string): Promise<void> {
    await this.client.post(
      `/project/github/${this.config.repoOwner}/${this.config.repoName}/${buildId}/cancel`,
      {},
    );
  }

  private async createGitHubArtifact(buildId: string): Promise<string> {
    // GitHub stores artifacts through workflow artifacts
    return `https://github.com/${this.config.repoOwner}/${this.config.repoName}/actions/runs/${buildId}/artifacts`;
  }

  private async createGitLabArtifact(buildId: string): Promise<string> {
    return `${this.config.baseUrl}/projects/${this.config.repoOwner}%2F${this.config.repoName}/pipelines/${buildId}/artifacts`;
  }

  private async createJenkinsArtifact(buildId: string): Promise<string> {
    return `${this.config.baseUrl}/job/${this.config.jobName}/${buildId}/artifact/`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
