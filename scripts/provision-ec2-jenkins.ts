/**
 * provision-ec2-jenkins.ts
 * Provisions an EC2 instance with Jenkins + Node + Playwright pre-installed.
 * Run: npx ts-node scripts/provision-ec2-jenkins.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  EC2Client,
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  RunInstancesCommand,
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
} from '@aws-sdk/client-ec2';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const REGION       = process.env.AWS_BEDROCK_REGION ?? 'us-east-1';
const KEY_NAME     = 'besttester-jenkins-key';
const SG_NAME      = 'besttester-jenkins-sg';
const INSTANCE_TYPE = 't3.medium';
// Amazon Linux 2023 AMI (us-east-1) — update if using a different region
const AMI_ID       = 'ami-0c02fb55956c7d316';

const ec2 = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const USER_DATA = `#!/bin/bash
set -e
yum update -y

# Java (Jenkins dependency)
yum install -y java-17-amazon-corretto

# Jenkins
wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
yum install -y jenkins
systemctl enable jenkins
systemctl start jenkins

# Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Git
yum install -y git

# Playwright system deps
npx playwright install-deps chromium 2>/dev/null || true

# Allow Jenkins to run npm
echo 'jenkins ALL=(ALL) NOPASSWD: /usr/bin/npm, /usr/bin/npx, /usr/bin/node' >> /etc/sudoers

# Write Jenkins URL to a file for retrieval
echo "Jenkins will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080" > /home/ec2-user/jenkins-url.txt
`;

async function createKeyPair(): Promise<string> {
  console.log('🔑 Creating key pair...');
  const keyPath = path.resolve(__dirname, `../${KEY_NAME}.pem`);
  if (fs.existsSync(keyPath)) {
    console.log('   Key pair file already exists, skipping creation.');
    return KEY_NAME;
  }
  const res = await ec2.send(new CreateKeyPairCommand({ KeyName: KEY_NAME }));
  fs.writeFileSync(keyPath, res.KeyMaterial ?? '', { mode: 0o400 });
  console.log(`   Saved to ${keyPath}`);
  return KEY_NAME;
}

async function createSecurityGroup(): Promise<string> {
  console.log('🔒 Creating security group...');
  try {
    const res = await ec2.send(new CreateSecurityGroupCommand({
      GroupName:   SG_NAME,
      Description: 'BestTester Jenkins security group',
    }));
    const sgId = res.GroupId!;
    // Allow SSH (22) and Jenkins (8080) from anywhere
    await ec2.send(new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [
        { IpProtocol: 'tcp', FromPort: 22,   ToPort: 22,   IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
        { IpProtocol: 'tcp', FromPort: 8080, ToPort: 8080, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
      ],
    }));
    console.log(`   Security group created: ${sgId}`);
    return sgId;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('already exists')) {
      console.log('   Security group already exists, reusing.');
      return SG_NAME;
    }
    throw e;
  }
}

async function launchInstance(sgId: string): Promise<string> {
  console.log('🚀 Launching EC2 instance...');
  const res = await ec2.send(new RunInstancesCommand({
    ImageId:          AMI_ID,
    InstanceType:     INSTANCE_TYPE,
    MinCount:         1,
    MaxCount:         1,
    KeyName:          KEY_NAME,
    SecurityGroupIds: [sgId],
    UserData:         Buffer.from(USER_DATA).toString('base64'),
    TagSpecifications: [{
      ResourceType: 'instance',
      Tags: [
        { Key: 'Name',    Value: 'BestTester-Jenkins' },
        { Key: 'Project', Value: 'BestTester' },
      ],
    }],
    BlockDeviceMappings: [{
      DeviceName: '/dev/xvda',
      Ebs: { VolumeSize: 30, VolumeType: 'gp3' },
    }],
  }));
  const instanceId = res.Instances?.[0]?.InstanceId!;
  console.log(`   Instance launched: ${instanceId}`);
  return instanceId;
}

async function waitForInstance(instanceId: string): Promise<string> {
  console.log('⏳ Waiting for instance to be running...');
  let publicIp = '';
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 15_000));
    const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    const inst = res.Reservations?.[0]?.Instances?.[0];
    if (inst?.State?.Name === 'running' && inst.PublicIpAddress) {
      publicIp = inst.PublicIpAddress;
      console.log(`   Instance running. Public IP: ${publicIp}`);
      break;
    }
    process.stdout.write('.');
  }
  return publicIp;
}

async function main() {
  console.log('\n=== BestTester EC2 Jenkins Provisioner ===\n');
  await createKeyPair();
  const sgId      = await createSecurityGroup();
  const instanceId = await launchInstance(sgId);
  const publicIp   = await waitForInstance(instanceId);

  // Save instance info
  const info = { instanceId, publicIp, region: REGION, keyFile: `${KEY_NAME}.pem` };
  fs.writeFileSync(
    path.resolve(__dirname, '../ec2-instance.json'),
    JSON.stringify(info, null, 2),
  );

  // Update .env with Jenkins URL
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  const jenkinsUrl = `http://${publicIp}:8080`;
  envContent = envContent.replace(/JENKINS_URL=.*/, `JENKINS_URL=${jenkinsUrl}`);
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Provisioning complete!');
  console.log(`   Instance ID : ${instanceId}`);
  console.log(`   Public IP   : ${publicIp}`);
  console.log(`   Jenkins URL : ${jenkinsUrl}  (available in ~3 min after boot)`);
  console.log(`   SSH         : ssh -i ${KEY_NAME}.pem ec2-user@${publicIp}`);
  console.log(`   Initial PW  : ssh in and run: sudo cat /var/lib/jenkins/secrets/initialAdminPassword`);
  console.log('\n   Info saved to ec2-instance.json and JENKINS_URL updated in .env\n');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
