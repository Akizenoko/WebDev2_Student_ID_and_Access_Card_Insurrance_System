
const API_BASE = '/api';


const getToken = () => {
  try { return JSON.parse(localStorage.getItem('wmsu_auth_user'))?.token; }
  catch { return null; }
};

const authHeaders = (extra = {}) => {
  const token = getToken();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
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
  return data;   // includes token
},

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(err.message || 'Registration failed');
    }
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`);
    return res.json();
  },

  async getUser(id) {
    const res = await fetch(`${API_BASE}/auth/me/${id}`);
    return res.json();
  },


  async getApplications(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/applications${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  return res.json();
},

  async getApplication(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`);
    if (!res.ok) throw new Error('Application not found');
    return res.json();
  },

  async createApplication(data) {
  const res = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create application' }));
      throw new Error(err.message || 'Failed to submit application');
    }
    return res.json();
  },

  async updateApplicationStatus(id, status, changed_by) {
    const res = await fetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changed_by }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async assignApplication(id, assigned_to) {
    const res = await fetch(`${API_BASE}/applications/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to }),
    });
    if (!res.ok) throw new Error('Failed to assign application');
    return res.json();
  },

  async getReissuanceRequests() {
    const res = await fetch(`${API_BASE}/reissuance`);
    return res.json();
  },

  async createReissuance(data) {
    const res = await fetch(`${API_BASE}/reissuance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to submit reissuance' }));
      throw new Error(err.message || 'Failed to submit reissuance');
    }
    return res.json();
  },

  async getCards(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/cards${query ? `?${query}` : ''}`);
    return res.json();
  },

  async getCard(id) {
    const res = await fetch(`${API_BASE}/cards/${id}`);
    if (!res.ok) throw new Error('Card not found');
    return res.json();
  },

  async uploadFile(data) {
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('File upload failed');
    return res.json();
  },
};
