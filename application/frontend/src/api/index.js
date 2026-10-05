import client from './client';

// One function per backend endpoint, so pages never hand-build URLs and a
// route change in the API is a one-line change here.

export const authApi = {
  me: () => client.get('/api/auth/me').then((r) => r.data.user),
  login: (email, password) => client.post('/api/auth/login', { email, password }).then((r) => r.data),
  register: (email, password, name) =>
    client.post('/api/auth/register', { email, password, name }).then((r) => r.data.user),
  updateProfile: (fields) => client.patch('/api/auth/me', fields).then((r) => r.data.user),
  changePassword: (currentPassword, newPassword) =>
    client.post('/api/auth/change-password', { currentPassword, newPassword }),
  deleteAccount: (password) => client.delete('/api/auth/me', { data: { password } }),
  exportData: () => client.get('/api/auth/me/export').then((r) => r.data),
};

export const diagramsApi = {
  generate: (text, diagramType) =>
    client
      .post('/api/diagrams/generate', { text, ...(diagramType ? { diagramType } : {}) })
      .then((r) => r.data),
  create: (payload) => client.post('/api/diagrams', payload).then((r) => r.data),
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== false) query.set(k, String(v));
    });
    return client.get(`/api/diagrams?${query}`).then((r) => r.data);
  },
  stats: () => client.get('/api/diagrams/stats').then((r) => r.data),
  get: (id) => client.get(`/api/diagrams/${id}`).then((r) => r.data),
  update: (id, fields) => client.patch(`/api/diagrams/${id}`, fields).then((r) => r.data),
  remove: (id) => client.delete(`/api/diagrams/${id}`),
  duplicate: (id) => client.post(`/api/diagrams/${id}/duplicate`).then((r) => r.data),
  versions: (id) => client.get(`/api/diagrams/${id}/versions`).then((r) => r.data.versions),
  share: (id) => client.post(`/api/diagrams/${id}/share`).then((r) => r.data.shareToken),
  unshare: (id) => client.delete(`/api/diagrams/${id}/share`),
  publicView: (token) => client.get(`/api/public/diagrams/${token}`).then((r) => r.data),
};

export const systemApi = {
  activity: (limit = 50) => client.get(`/api/activity?limit=${limit}`).then((r) => r.data.events),
  providerStatus: () => client.get('/api/provider-status').then((r) => r.data),
};

export function shareUrl(token) {
  return `${window.location.origin}/s/${token}`;
}
