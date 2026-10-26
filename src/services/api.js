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
};
