/**
 * Kinetic Bay Enterprise CMS API Client
 * Enforces server-side authentication, CSRF tokens, and credentials inclusion
 */

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Sends HttpOnly session cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = data?.error || `Request failed with status ${response.status}`;
    const retryHeader = response.headers.get('Retry-After');
    const retryAfter = retryHeader ? parseInt(retryHeader, 10) : (data?.retryAfter ? Number(data.retryAfter) : undefined);

    if (response.status === 429) {
      if (retryAfter && retryAfter > 0) {
        errorMsg = `${data?.error || 'Rate limit reached.'} Please wait ${retryAfter}s before retrying.`;
      } else {
        errorMsg = data?.error || 'Too many requests. Please slow down and try again shortly.';
      }
    }

    const err = new Error(errorMsg) as Error & {
      status: number;
      reference?: string;
      retryAfter?: number;
      limitType?: string;
    };
    err.status = response.status;
    err.reference = data?.reference;
    err.retryAfter = retryAfter;
    err.limitType = data?.limitType;
    throw err;
  }

  return data;
}

export const api = {
  // ── Route Obfuscation Resolution ──
  async resolveRoute(pathSegment: string) {
    return request('/api/security/resolve-route', {
      method: 'POST',
      body: JSON.stringify({ pathSegment }),
    });
  },

  // ── Authentication & MFA ──
  async login(username: string, password: string) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, email: username, password }),
    });
  },

  async verifyMfa(mfaToken: string, code: string) {
    const res = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code }),
    });
    if (res.csrfToken) {
      setCsrfToken(res.csrfToken);
    }
    return res;
  },

  async getMe() {
    const res = await request('/api/auth/me');
    if (res.csrfToken) {
      setCsrfToken(res.csrfToken);
    }
    return res;
  },

  async logout() {
    const res = await request('/api/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ── Content Management & Approval Workflow ──
  async getContent(includeDeleted = false) {
    return request(`/api/content?includeDeleted=${includeDeleted}`);
  },

  async createContent(data: { title: string; slug: string; content: string; category?: string }) {
    return request('/api/content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateContent(id: string, data: { title?: string; content?: string; category?: string }) {
    return request(`/api/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async transitionContent(id: string, targetStatus: string) {
    return request(`/api/content/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus }),
    });
  },

  async softDeleteContent(id: string, reason?: string) {
    return request(`/api/content/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async restoreContent(id: string) {
    return request(`/api/content/${id}/restore`, {
      method: 'POST',
    });
  },

  // ── User Management & RBAC ──
  async getUsers() {
    return request('/api/users');
  },

  async createUser(data: { username?: string; email?: string; name: string; role: string; initialPassword: string }) {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUserRole(id: string, newRole: string) {
    return request(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ newRole }),
    });
  },

  async updateUserStatus(id: string, status: 'active' | 'disabled') {
    return request(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ── Security & Audit Logs ──
  async rotateCmsRoute(confirmationPassword: string, reason?: string) {
    return request('/api/security/rotate-cms-route', {
      method: 'POST',
      body: JSON.stringify({ confirmationPassword, reason }),
    });
  },

  async getAuditLogs() {
    return request('/api/security/audit-logs');
  },

  // ── Public Ticketing & Enquiries (No CMS exposure) ──
  async submitPublicEnquiry(data: {
    name: string;
    email: string;
    company?: string;
    service_slug?: string;
    budget_range?: string;
    timeline?: string;
    message: string;
  }) {
    return request('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitPublicTicket(data: {
    name: string;
    email: string;
    category?: string;
    priority?: string;
    subject: string;
    description: string;
  }) {
    return request('/api/public/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPublicTicketStatus(ticketId: string, email: string) {
    return request('/api/public/ticket-status', {
      method: 'POST',
      body: JSON.stringify({ ticketId, email }),
    });
  },

  // ── CMS Ticket & Service Desk Management ──
  async getCmsTickets(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    includeDeleted?: boolean;
  }) {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.priority && params.priority !== 'all') q.set('priority', params.priority);
    if (params?.category && params.category !== 'all') q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.includeDeleted) q.set('includeDeleted', 'true');
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request(`/api/tickets${queryStr}`);
  },

  async getCmsTicketById(id: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}`);
  },

  async createCmsTicket(data: {
    name?: string;
    email?: string;
    category?: string;
    priority?: string;
    subject: string;
    description: string;
    status?: string;
    assignedTo?: string | null;
    initialNote?: string;
  }) {
    return request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCmsTicket(id: string, data: {
    subject?: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    assignedTo?: string | null;
    requester_name?: string;
    requester_email?: string;
  }) {
    return request(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateTicketStatus(id: string, status: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async assignTicket(id: string, assignedTo: string | null) {
    return request(`/api/tickets/${encodeURIComponent(id)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTo }),
    });
  },

  async addTicketInternalNote(id: string, note: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async addTicketCustomerUpdate(id: string, message: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}/customer-update`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async softDeleteTicket(id: string, reason?: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async restoreTicket(id: string) {
    return request(`/api/tickets/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    });
  },

  // ── CMS Enquiries & CRM Pipeline ──
  async getCmsEnquiries(params?: { status?: string; search?: string; includeDeleted?: boolean }) {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.includeDeleted) q.set('includeDeleted', 'true');
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request(`/api/enquiries${queryStr}`);
  },

  async updateEnquiryStatus(id: string, status: string, notes?: string) {
    return request(`/api/enquiries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  async softDeleteEnquiry(id: string) {
    return request(`/api/enquiries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ── Real Visitor Analytics & Telemetry ──
  async recordPublicVisit(payload: { path: string; visitorId?: string; referrer?: string; device?: string; isNew?: boolean }) {
    return request('/api/public/analytics/visit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAnalytics() {
    return request('/api/analytics');
  },

  async resetAnalytics() {
    return request('/api/analytics/reset', {
      method: 'POST',
    });
  },

  // ── Storage diagnostics & email ──
  async getDatabaseStats() {
    return request('/api/security/database');
  },

  async sendTestEmail(to?: string) {
    return request('/api/security/test-email', {
      method: 'POST',
      body: JSON.stringify({ to }),
    });
  },

  // ── Staff directory (for ticket assignment) ──
  async getStaff() {
    return request('/api/staff');
  },

  // ── Team members (shared across all CMS users) ──
  async getTeam() {
    return request('/api/team');
  },

  async createTeamMember(data: { name: string; role: string; bio?: string; image?: string; linkedin?: string }) {
    return request('/api/team', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateTeamMember(id: string, data: { name?: string; role?: string; bio?: string; image?: string; linkedin?: string }) {
    return request(`/api/team/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteTeamMember(id: string) {
    return request(`/api/team/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── Dashboard, pipeline, customers, notifications ──
  async getDashboard() {
    return request('/api/dashboard');
  },

  async updateLead(id: string, data: { status?: string; owner_id?: string | null; follow_up_at?: string | null; notes?: string; estimated_value?: number | null }) {
    return request(`/api/enquiries/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async logLeadActivity(id: string, type: 'note' | 'call' | 'meeting' | 'whatsapp', text: string) {
    return request(`/api/enquiries/${encodeURIComponent(id)}/activities`, { method: 'POST', body: JSON.stringify({ type, text }) });
  },

  async replyToLead(id: string, subject: string, message: string) {
    return request(`/api/enquiries/${encodeURIComponent(id)}/reply`, { method: 'POST', body: JSON.stringify({ subject, message }) });
  },

  async getCustomers(search?: string) {
    return request(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  },

  async getCustomer(email: string) {
    return request(`/api/customers/${encodeURIComponent(email)}`);
  },

  async getNotifications() {
    return request('/api/notifications');
  },

  async markNotificationsSeen() {
    return request('/api/notifications/seen', { method: 'POST' });
  },

  // ── Projects, plans & payments ──
  async getProjects(params?: { customer?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.customer) q.set('customer', params.customer);
    if (params?.status) q.set('status', params.status);
    return request(`/api/projects${q.toString() ? `?${q}` : ''}`);
  },

  async createProject(data: Record<string, unknown>) {
    return request('/api/projects', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateProject(id: string, data: Record<string, unknown>) {
    return request(`/api/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async submitProject(id: string) {
    return request(`/api/projects/${encodeURIComponent(id)}/submit`, { method: 'POST' });
  },

  async decideProject(id: string, decision: 'approve' | 'reject', note?: string) {
    return request(`/api/projects/${encodeURIComponent(id)}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) });
  },

  async setProjectStatus(id: string, status: string) {
    return request(`/api/projects/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  },

  async recordPayment(id: string, data: { amount: number; date: string; method: string; reference?: string; note?: string }) {
    return request(`/api/projects/${encodeURIComponent(id)}/payments`, { method: 'POST', body: JSON.stringify(data) });
  },

  async deletePayment(id: string, paymentId: string) {
    return request(`/api/projects/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
  },

  async archiveProject(id: string) {
    return request(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── Client logos ──
  async getPublicClients() {
    return request('/api/public/clients');
  },

  async getClients() {
    return request('/api/clients');
  },

  async createClient(data: { name: string; logo: string; website?: string; visible?: boolean }) {
    return request('/api/clients', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateClient(id: string, data: { name?: string; logo?: string; website?: string; visible?: boolean; move?: 'up' | 'down' }) {
    return request(`/api/clients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteClient(id: string) {
    return request(`/api/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getAssignmentRules() {
    return request('/api/assignment-rules');
  },

  async getRoles() {
    return request('/api/roles');
  },

  async runDigest() {
    return request('/api/security/run-digest', { method: 'POST' });
  },
};
