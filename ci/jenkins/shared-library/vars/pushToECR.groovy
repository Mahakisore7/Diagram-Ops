def call(Map config) {
    sh """
        aws ecr get-login-password --region ${config.region} | \
          docker login --username AWS --password-stdin ${config.registry}
        docker tag ${config.localImage} ${config.registry}/${config.repoName}:sha-${env.GIT_SHA_SHORT}
        docker push ${config.registry}/${config.repoName}:sha-${env.GIT_SHA_SHORT}
    """
}
