const API_BASE = '/api';

const getToken = () => {
  try {
    return JSON.parse(localStorage.getItem('wmsu_auth_user'))?.token;
  } catch {
    return null;
  }
};

const authHeaders = (extra = {}) => {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};




export const api = {
  async verifyOtp(challenge, code) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Verification failed');
    err.status = res.status;
    throw err;
  }
  return data;   // user object with role, profile and token
},

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Registration failed');
    return result;
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  async setUserActive(id, active, reason) {
    const res = await fetch(`${API_BASE}/auth/users/${id}/active`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ active, reason }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to update account');
    return data;
  },

  async deleteUser(id, password) {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to delete account');
    return data;
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/auth/audit-logs`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || 'Unable to load audit log');
    return data;
  },

  async getUser(id) {
    const res = await fetch(`${API_BASE}/auth/me/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('User not found');
    return res.json();
  },

  async getApplications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/applications${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  async getApplication(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Application not found');
    return res.json();
  },

  async createApplication(data) {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to submit application');
    return result;
  },

  updateApplicationStatus: async (id, status, remarks) => {
    const res = await fetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({ notifications: [], unread: 0 }));
    if (!res.ok) throw new Error(data.message || 'Unable to load notifications');
    return data;
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to update notification');
    return data;
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, { method: 'PATCH', headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to update notifications');
    return data;
  },

  async setApplicationPhoto(id, photo_file_id) {
    const res = await fetch(`${API_BASE}/applications/${id}/photo`, {
      method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ photo_file_id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to save photo');
    return data;
  },

  async requestAccessActivation(id) {
    const res = await fetch(`${API_BASE}/cards/${id}/access-request`, { method: 'POST', headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to request access activation');
    return data;
  },

  async setAccessStatus(id, access_status, reason) {
    const res = await fetch(`${API_BASE}/cards/${id}/access-status`, {
      method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ access_status, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to update access status');
    return data;
  },

  async validateCardSemester(id, semester) {
    const res = await fetch(`${API_BASE}/cards/${id}/validate-semester`, {
      method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ semester }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to validate ID');
    return data;
  },

  async revokeCardValidation(id) {
    const res = await fetch(`${API_BASE}/cards/${id}/validate-semester`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Unable to revoke ID validation');
    return data;
  },

  async assignApplication(id, assigned_to) {
    const res = await fetch(`${API_BASE}/applications/${id}/assign`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ assigned_to }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to assign application');
    return result;
  },

  async deleteApplication(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to delete application');
    return result;
  },

  async getReissuanceRequests() {
    const res = await fetch(`${API_BASE}/reissuance`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || 'Unable to load loss reports');
    return Array.isArray(data) ? data : [];
  },

  async createReissuance(data) {
    const res = await fetch(`${API_BASE}/reissuance`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to submit reissuance');
    return result;
  },

  async getCards(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/cards${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  async getCard(id) {
    const res = await fetch(`${API_BASE}/cards/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Card not found');
    return res.json();
  },

  async uploadFile(data) {
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'File upload failed');
    return result;
  },

  // Assurance, reassurance and access-control module
  async getFacilities() {
    const res = await fetch(`${API_BASE}/facilities`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async createFacility(payload) { return apiJson('/facilities', 'POST', payload); },
  async updateFacility(id, payload) { return apiJson(`/facilities/${id}`, 'PATCH', payload); },
  async deactivateFacility(id) { return apiJson(`/facilities/${id}`, 'DELETE'); },

  async getPermissions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/facilities/permissions${query ? `?${query}` : ''}`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async grantPermission(facilityId, payload) { return apiJson(`/facilities/${facilityId}/permissions`, 'POST', payload); },
  async updatePermission(id, payload) { return apiJson(`/facilities/permissions/${id}`, 'PATCH', payload); },
  async revokePermission(id) { return apiJson(`/facilities/permissions/${id}`, 'DELETE'); },

  async checkAccess(payload) { return apiJson('/access/check', 'POST', payload); },
  async getAccessAttempts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/access/attempts${query ? `?${query}` : ''}`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async getMyAccessAttempts() {
    const res = await fetch(`${API_BASE}/access/attempts/mine`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  async getRevalidations(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/revalidation${query ? `?${query}` : ''}`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async submitRevalidation(payload) { return apiJson('/revalidation', 'POST', payload); },
  async reviewRevalidation(id, payload) { return apiJson(`/revalidation/${id}/review`, 'PATCH', payload); },
  async verifyLossReport(id, payload) { return apiJson(`/reissuance/${id}/verify`, 'PATCH', payload); },
  async getReportSummary() {
    const res = await fetch(`${API_BASE}/reports/summary`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Unable to load report summary');
    return res.json();
  },

  async setCardStatus(id, status, reason) {
    return apiJson(`/cards/${id}/status`, 'PATCH', { status, reason });
  },
  async getCardHistory(id) {
    const res = await fetch(`${API_BASE}/cards/${id}/history`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },
  async checkCredential(reference) {
    const res = await fetch(`${API_BASE}/cards/credential/${encodeURIComponent(reference)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Unable to check credential reference');
    return res.json();
  },
};

async function apiJson(path, method, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
