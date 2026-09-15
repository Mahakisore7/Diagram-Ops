#!/bin/bash
set -euo pipefail

apt-get update -y
apt-get upgrade -y

# Java - required by Jenkins. Jenkins raises its minimum supported Java
# version periodically as older JDKs go EOL; openjdk-17-jre was enough
# when this script was first written, but the current Jenkins release
# refuses to start under anything older than Java 21 (confirmed via
# `/usr/bin/jenkins` printing "Supported Java versions are: [21, 25]"
# when run manually) - check https://jenkins.io/redirect/java-support/
# if this ever breaks again.
apt-get install -y fontconfig openjdk-21-jre

# Jenkins repo + install. The signing key filename is fetched dynamically,
# not hardcoded (e.g. "jenkins.io-2023.key") - Jenkins rotates this key
# periodically, and a hardcoded name silently goes stale (NO_PUBKEY /
# "repository is not signed" at apt-get update time, with no warning at
# `terraform plan` time - this only surfaces on a real boot).
JENKINS_KEY_FILE=$(curl -fsSL https://pkg.jenkins.io/debian-stable/ | \
  grep -oE '[a-zA-Z0-9._-]+\.key' | sort -u | tail -1)
curl -fsSL "https://pkg.jenkins.io/debian-stable/${JENKINS_KEY_FILE}" | \
  tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | \
  tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt-get update -y
apt-get install -y jenkins

# Docker - Jenkins will need this to build images
apt-get install -y docker.io
usermod -aG docker jenkins

systemctl enable docker && systemctl start docker
systemctl enable jenkins && systemctl start jenkins
