/**
 * provision-ec2-jenkins.ts
 * Terminates old instance, provisions a new AL2023 EC2 with Jenkins + Node 20 + Playwright.
 * Run: npx ts-node scripts/provision-ec2-jenkins.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  TerminateInstancesCommand,
  DescribeSecurityGroupsCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
} from '@aws-sdk/client-ec2';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const REGION = process.env.AWS_BEDROCK_REGION ?? 'us-east-1';
const KEY_NAME = 'besttester-jenkins-key';
const SG_NAME = 'besttester-jenkins-sg';
const INSTANCE_TYPE = 't3.medium';
// Amazon Linux 2023 AMI (us-east-1, x86_64) — glibc 2.34, supports Node 20
const AMI_ID = 'ami-0f88e80871fd81e91';

const ec2 = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const USER_DATA = `#!/bin/bash
set -ex

# System update
dnf update -y

# Java 17 (Jenkins dependency)
dnf install -y java-17-amazon-corretto-headless

# Jenkins
wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
dnf install -y jenkins
systemctl enable jenkins
systemctl start jenkins

# Node.js 20 via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
node --version
npm --version

# Git
dnf install -y git

# Playwright system dependencies (Chromium needs these)
dnf install -y \\
  alsa-lib atk at-spi2-atk cups-libs libdrm libXcomposite libXdamage \\
  libXrandr mesa-libgbm pango nss nspr libxkbcommon libXtst \\
  gtk3 dbus-glib libXScrnSaver

# Jenkins passwordless sudo (for Playwright browser install)
echo 'jenkins ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/jenkins
chmod 440 /etc/sudoers.d/jenkins

echo "DONE" > /home/ec2-user/provision-complete.txt
`;

async function getSecurityGroupId(): Promise<string> {
  try {
    const res = await ec2.send(new DescribeSecurityGroupsCommand({ GroupNames: [SG_NAME] }));
    const id = res.SecurityGroups?.[0]?.GroupId;
    if (id) {
      console.log(`   Reusing SG: ${id}`);
      return id;
    }
  } catch {}
  console.log('   Creating security group...');
  const res = await ec2.send(
    new CreateSecurityGroupCommand({ GroupName: SG_NAME, Description: 'BestTester Jenkins' }),
  );
  const sgId = res.GroupId!;
  await ec2.send(
    new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [
        { IpProtocol: 'tcp', FromPort: 22, ToPort: 22, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
        { IpProtocol: 'tcp', FromPort: 8080, ToPort: 8080, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
      ],
    }),
  );
  return sgId;
}

async function terminateOld(): Promise<void> {
  const infoPath = path.resolve(__dirname, '../ec2-instance.json');
  if (!fs.existsSync(infoPath)) return;
  const { instanceId } = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
  if (!instanceId) return;
  console.log(`🗑️  Terminating old instance ${instanceId}...`);
  try {
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
    console.log('   Terminated.');
  } catch (e: any) {
    console.log(`   ${e.message}`);
  }
}

async function launch(sgId: string): Promise<string> {
  console.log('🚀 Launching AL2023 instance...');
  const res = await ec2.send(
    new RunInstancesCommand({
      ImageId: AMI_ID,
      InstanceType: INSTANCE_TYPE,
      MinCount: 1,
      MaxCount: 1,
      KeyName: KEY_NAME,
      SecurityGroupIds: [sgId],
      UserData: Buffer.from(USER_DATA).toString('base64'),
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: 'BestTester-Jenkins' },
            { Key: 'Project', Value: 'BestTester' },
          ],
        },
      ],
      BlockDeviceMappings: [
        { DeviceName: '/dev/xvda', Ebs: { VolumeSize: 30, VolumeType: 'gp3' } },
      ],
    }),
  );
  const id = res.Instances?.[0]?.InstanceId ?? '';
  if (!id) throw new Error('No instance ID returned');
  console.log(`   Launched: ${id}`);
  return id;
}

async function waitForIp(instanceId: string): Promise<string> {
  console.log('⏳ Waiting for public IP...');
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    const inst = res.Reservations?.[0]?.Instances?.[0];
    if (inst?.State?.Name === 'running' && inst.PublicIpAddress) {
      console.log(`   IP: ${inst.PublicIpAddress}`);
      return inst.PublicIpAddress;
    }
    process.stdout.write('.');
  }
  throw new Error('Timeout waiting for instance');
}

async function main(): Promise<void> {
  console.log('\n=== BestTester: Provision Jenkins EC2 (AL2023) ===\n');

  await terminateOld();
  const sgId = await getSecurityGroupId();
  const instanceId = await launch(sgId);
  const publicIp = await waitForIp(instanceId);

  const jenkinsUrl = `http://${publicIp}:8080`;
  fs.writeFileSync(
    path.resolve(__dirname, '../ec2-instance.json'),
    JSON.stringify({ instanceId, publicIp, region: REGION, keyFile: `${KEY_NAME}.pem` }, null, 2),
  );

  const envPath = path.resolve(__dirname, '../.env');
  let env = fs.readFileSync(envPath, 'utf-8');
  env = env.replace(/JENKINS_URL=.*/, `JENKINS_URL=${jenkinsUrl}`);
  fs.writeFileSync(envPath, env);

  console.log(`\n✅ Done!`);
  console.log(`   Instance : ${instanceId}`);
  console.log(`   IP       : ${publicIp}`);
  console.log(`   Jenkins  : ${jenkinsUrl} (ready in ~3-5 min)`);
  console.log(`   SSH      : ssh -i ${KEY_NAME}.pem ec2-user@${publicIp}`);
  console.log(`   Init PW  : sudo cat /var/lib/jenkins/secrets/initialAdminPassword\n`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
