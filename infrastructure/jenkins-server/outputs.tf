output "jenkins_public_ip" { value = aws_eip.jenkins.public_ip }
output "jenkins_instance_id" { value = aws_instance.jenkins.id }
