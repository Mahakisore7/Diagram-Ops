#!/bin/bash
set -euo pipefail

apt-get update -y
apt-get upgrade -y

# Java — required by Jenkins
apt-get install -y fontconfig openjdk-17-jre

# Jenkins repo + install
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | \
  tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | \
  tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt-get update -y
apt-get install -y jenkins

# Docker — Jenkins will need this to build images
apt-get install -y docker.io
usermod -aG docker jenkins

systemctl enable docker && systemctl start docker
systemctl enable jenkins && systemctl start jenkins
