# Kubernetes Deployment Guide

## Overview

BestTester supports distributed test execution on Kubernetes using Helm charts. Tests are executed as parallel pods within a Kubernetes Job, with results aggregated from a shared PersistentVolume.

## Prerequisites

- Kubernetes cluster (v1.24+)
- Helm 3.x installed
- kubectl configured to access your cluster
- Docker image pushed to a registry accessible from the cluster
- PersistentVolume provisioner available (or pre-provisioned PV)

## Quick Start

### 1. Prepare Your Environment

```bash
# Export cluster configuration
export KUBE_CONTEXT=your-cluster-context
export NAMESPACE=besttester

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE

# Create a PersistentVolume (or ensure a provisioner is available)
kubectl apply -f k8s/pv.yaml
```

### 2. Deploy Tests Using npm Script

```bash
# Run smoke tests with 4 workers
npm run k8s:run -- smoke 4 besttester

# Run API tests with 8 workers
npm run k8s:run -- api 8 besttester

# Run security tests with 2 workers
npm run k8s:run -- security 2 besttester
```

### 3. Deploy Using Helm Directly

```bash
# Install with default values
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  --set testSuite=smoke \
  --set workers=4

# Install with custom values file
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  -f custom-values.yaml

# Install with overrides
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  --set testSuite=api \
  --set workers=8 \
  --set image.tag=v1.0.1 \
  --set baseUrl=https://staging.example.com
```

## Configuration

### Required Values

| Key | Default | Description |
|-----|---------|-------------|
| `testSuite` | `smoke` | Test suite to run (@ui, @api, @security, @smoke, etc.) |
| `workers` | `4` | Number of parallel pods |
| `image.repository` | `docker.io/yourusername/besttester` | Docker image repository |
| `image.tag` | `latest` | Docker image tag |

### Optional Values

| Key | Default | Description |
|-----|---------|-------------|
| `namespace` | `besttester` | Kubernetes namespace |
| `baseUrl` | `http://localhost:3000` | Application base URL |
| `apiBaseUrl` | `http://localhost:3001` | API base URL |
| `adminUsername` | `admin` | Admin username for tests |
| `testTimeout` | `30000` | Test timeout in milliseconds |
| `retryAttempts` | `3` | Number of retry attempts |
| `logLevel` | `info` | Logging level (debug, info, warn, error) |
| `resources.requests.memory` | `512Mi` | Memory request per pod |
| `resources.requests.cpu` | `250m` | CPU request per pod |
| `resources.limits.memory` | `1Gi` | Memory limit per pod |
| `resources.limits.cpu` | `500m` | CPU limit per pod |

### Secrets

Create a custom values file with sensitive data:

```yaml
adminPassword: "your-admin-password"
databaseUrl: "postgresql://host:5432/db"
databasePassword: "db-password"
anthropicApiKey: "sk-ant-..."
slackWebhookUrl: "https://hooks.slack.com/..."
authToken: "your-auth-token"
```

Then deploy with:

```bash
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  -f values.yaml \
  -f secrets-values.yaml
```

## Monitoring and Debugging

### View Job Status

```bash
# Check job status
kubectl get jobs -n $NAMESPACE
kubectl describe job besttester-smoke -n $NAMESPACE

# View pod status
kubectl get pods -n $NAMESPACE -l app=besttester
kubectl describe pod besttester-smoke-xxxxx -n $NAMESPACE
```

### Stream Logs

```bash
# Stream logs from all pods
kubectl logs -n $NAMESPACE -l app=besttester --all-containers=true --timestamps=true

# Stream logs from specific pod
kubectl logs -n $NAMESPACE besttester-smoke-xxxxx -c tester

# Follow logs in real-time
kubectl logs -n $NAMESPACE -l app=besttester -f
```

### Access Test Results

```bash
# Copy results from pod
kubectl cp $NAMESPACE/besttester-smoke-xxxxx:/app/reports ./local-reports -c tester

# View reports volume
kubectl run -it --rm debug --image=busybox:latest --restart=Never -- \
  sh -c 'mount | grep reports && ls -la /data'
```

## Pod Distribution

By default, pods are spread across cluster nodes using anti-affinity:

```yaml
podAntiAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:
  - weight: 100
    podAffinityTerm:
      topologyKey: kubernetes.io/hostname
```

This ensures pods are distributed across different nodes when possible, improving test parallelization and fault tolerance.

To disable:

```bash
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  --set affinity.enabled=false
```

## Cleanup

### Manual Cleanup

```bash
# Uninstall Helm release
helm uninstall besttester-run -n $NAMESPACE

# Delete all pods and jobs
kubectl delete jobs -n $NAMESPACE -l app=besttester
kubectl delete pods -n $NAMESPACE -l app=besttester

# Clean up resources
kubectl delete pvc besttester-reports -n $NAMESPACE
kubectl delete cm besttester-config -n $NAMESPACE
kubectl delete secret besttester-secrets -n $NAMESPACE
```

### Automatic Cleanup

Jobs are automatically deleted after completion due to `ttlSecondsAfterFinished: 86400` (24 hours). Pods in failed/succeeded state are cleaned up by the TTL controller.

## Troubleshooting

### Pod Stuck in Pending

```bash
# Check resource availability
kubectl describe nodes

# Check PVC status
kubectl get pvc -n $NAMESPACE
kubectl describe pvc besttester-reports -n $NAMESPACE
```

**Solution**: Add more worker nodes or reduce resource requests.

### Pod Failing with ImagePullBackOff

**Solution**: Ensure the Docker image exists in the registry and image pull credentials are configured.

```bash
# Verify image exists
docker pull your-registry/besttester:latest

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=username \
  --docker-password=password \
  -n $NAMESPACE
```

### Tests Not Running in Pod

```bash
# Check pod logs for errors
kubectl logs besttester-smoke-xxxxx -n $NAMESPACE -c tester

# Verify environment variables
kubectl exec besttester-smoke-xxxxx -n $NAMESPACE -- env | grep TEST_SUITE

# Test manually in pod
kubectl exec -it besttester-smoke-xxxxx -n $NAMESPACE -- /bin/bash
npm run test:smoke
```

### Results Not Being Aggregated

```bash
# Verify PVC mount
kubectl exec besttester-smoke-xxxxx -n $NAMESPACE -- ls -la /app/reports

# Check PVC access
kubectl get pvc -n $NAMESPACE -o wide
kubectl get pv -o wide
```

## Performance Tuning

### Scaling Workers

```bash
# Increase parallelism
helm upgrade besttester-run k8s/helm \
  -n $NAMESPACE \
  --set workers=16
```

### Resource Optimization

```bash
# Reduce memory footprint
helm install besttester-run k8s/helm \
  -n $NAMESPACE \
  --set resources.requests.memory=256Mi \
  --set resources.limits.memory=512Mi
```

### Network Optimization

For high-concurrency scenarios, ensure your cluster has adequate network bandwidth and adjust the OTEL collector endpoint if needed.

## Advanced: Custom Helm Values

Create `values-prod.yaml`:

```yaml
namespace: production
workers: 32
image:
  repository: registry.company.com/besttester
  tag: v1.0.1
  pullPolicy: IfNotPresent
resources:
  requests:
    memory: 1Gi
    cpu: 1000m
  limits:
    memory: 2Gi
    cpu: 2000m
baseUrl: https://api.production.com
logLevel: warn
reports:
  pvc:
    size: 100Gi
    storageClass: fast-ssd
affinity:
  enabled: true
  spreadAcrossNodes: true
```

Deploy with:

```bash
helm install besttester-prod k8s/helm -n production -f values-prod.yaml
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run K8s Tests
  run: npm run k8s:run -- ${{ matrix.test-suite }} 8 production
  env:
    KUBECONFIG: ${{ secrets.KUBECONFIG }}
```

### GitLab CI

```yaml
k8s_tests:
  script:
    - npm run k8s:run -- smoke 4 besttester
  only:
    - main
```

## References

- [Kubernetes Job Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Helm Documentation](https://helm.sh/docs/)
- [Playwright Documentation](https://playwright.dev/)
