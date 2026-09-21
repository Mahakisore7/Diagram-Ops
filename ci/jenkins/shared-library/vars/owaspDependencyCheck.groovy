def call(Map config) {
    sh """
        dependency-check.sh --project "${config.projectName}" --scan ${config.scanPath} \
          --format HTML --format JSON --out dependency-check-report \
          --nvdApiKey \$NVD_API_KEY \
          --failOnCVSS 8
    """
    publishHTML(target: [
        reportDir: 'dependency-check-report',
        reportFiles: 'dependency-check-report.html',
        reportName: "OWASP Report — ${config.projectName}"
    ])
}
