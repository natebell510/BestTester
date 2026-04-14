#!/bin/bash
# push-single-test-job.sh
# Copies jenkins-create-jobs.sh to EC2 and runs it to create/update BestTester-SingleTest.
set -e

KEY="$(dirname "$0")/../besttester-jenkins-key.pem"
EC2="98.81.219.145"
SSH="ssh -i \"$KEY\" -o StrictHostKeyChecking=no ec2-user@${EC2}"
SCRIPT="$(dirname "$0")/jenkins-create-jobs.sh"

echo "=== Pushing jenkins-create-jobs.sh to EC2 ==="
scp -i "$KEY" -o StrictHostKeyChecking=no "$SCRIPT" "ec2-user@${EC2}:/tmp/jenkins-create-jobs.sh"

echo "=== Running on EC2 ==="
eval "$SSH" "bash /tmp/jenkins-create-jobs.sh"

echo ""
echo "✅ Done. Open: http://${EC2}:8080/job/BestTester-SingleTest"
