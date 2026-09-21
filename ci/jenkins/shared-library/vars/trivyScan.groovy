def call(Map config) {
    sh "trivy image --exit-code 1 --severity HIGH,CRITICAL --no-progress ${config.image}"
}
