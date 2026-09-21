def call(Map config) {
    withSonarQubeEnv('sonarqube-server') {
        sh """
            sonar-scanner \
              -Dsonar.projectKey=${config.projectKey} \
              -Dsonar.sources=${config.sourcePath} \
              -Dsonar.host.url=\$SONAR_HOST_URL \
              -Dsonar.login=\$SONAR_AUTH_TOKEN
        """
    }
    timeout(time: 5, unit: 'MINUTES') {
        def qg = waitForQualityGate()
        if (qg.status != 'OK') {
            error "SonarQube Quality Gate failed: ${qg.status}"
        }
    }
}
