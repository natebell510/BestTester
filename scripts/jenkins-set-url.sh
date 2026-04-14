#!/bin/bash
JENKINS_PW="REPLACE_WITH_JENKINS_TOKEN"

# Write Jenkins location config with localhost URL
cat > /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml << 'XMLEOF'
<?xml version='1.1' encoding='UTF-8'?>
<jenkins.model.JenkinsLocationConfiguration>
  <adminAddress>nobody@nowhere</adminAddress>
  <jenkinsUrl>http://localhost:8080/</jenkinsUrl>
</jenkins.model.JenkinsLocationConfiguration>
XMLEOF

chown jenkins:jenkins /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml
systemctl restart jenkins
echo "Waiting for Jenkins..."
sleep 30

# Test CLI
java -jar /home/ec2-user/jenkins-cli.jar \
  -s http://localhost:8080 \
  -auth admin:${JENKINS_PW} \
  version && echo "CLI_OK"
