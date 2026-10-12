{{/*
Service names are fixed (backend, frontend, mongodb), NOT prefixed with the
release name: frontend/nginx.conf proxies /api/ to the literal host
"backend:5000" (see docs/adr/0007-nginx-api-proxy.md), so the backend
Service must be called exactly "backend". One release per namespace.
*/}}
{{- define "three-tier-app.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "three-tier-app.image" -}}
{{- $reg := .root.Values.global.registry | required "set global.registry (e.g. <account-id>.dkr.ecr.ap-south-1.amazonaws.com)" -}}
{{ $reg }}/{{ .image.repository }}:{{ .image.tag }}
{{- end }}
