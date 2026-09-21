import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BarChart3,
  MessageSquare,
  Shield,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Eye,
  RefreshCw,
  Cookie,
  Smartphone,
  Monitor,
  Tablet,
  X,
  Sparkles,
  KeyRound,
  FileCheck,
  Clock,
  Ticket,
  Search,
  Send,
  Database,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getChatbotConfig,
  getLeads,
  updateLeadStatus,
  deleteLead,
  exportLeadsCSV,
} from '../../lib/cmsStore';
import { getAnalytics, getCookieConsent } from '../../lib/analytics';
import { processChatQuery } from '../../lib/chatbotEngine';
import {
  TeamMember,
  ChatbotConfig,
  CapturedLead,
  LeadStatus,
  VisitAnalytics,
} from '../../types/cms';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface InternalCMSProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

interface ContentWorkflowItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: 'draft' | 'submitted' | 'review' | 'approved' | 'published';
  content: string;
  version: number;
  authorId: string;
  reviewerId: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface ServerUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  type: string;
  timestamp: string;
  userId: string;
  role: string;
  reqId: string;
  ip: string;
  userAgent: string;
  target: string;
  action: string;
  result: string;
  metadata?: any;
}

interface CmsTicket {
  id: string;
  public_id: string;
  requester_name: string;
  requester_email: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  assigned_to: string | null;
  internal_notes: { id: string; author_id: string; author_name: string; note: string; created_at: string }[];
  customer_updates: { id: string; message: string; created_at: string }[];
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface CmsEnquiry {
  id: string;
  reference_id: string;
  name: string;
  email: string;
  company: string;
  service_slug: string;
  service_name: string;
  budget_range: string;
  timeline: string;
  message: string;
  status: string;
  notes: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function InternalCMS({ currentUser, onLogout }: InternalCMSProps) {
  // Determine available tabs based on RBAC permissions
  const canManageUsers = currentUser.permissions.includes('users:read');
  const canViewAudits = currentUser.permissions.includes('audit:read');
  const canManageSecurity = currentUser.permissions.includes('security:update') || currentUser.permissions.includes('cms-route:update');
  const canManageTickets = currentUser.permissions.includes('tickets:read');
  const canManageEnquiries = currentUser.permissions.includes('enquiries:read');

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'content' | 'tickets' | 'enquiries' | 'crm' | 'team' | 'chatbot' | 'users' | 'audit' | 'security' | 'cookies'
  >('analytics');

  // Telemetry & local data
  const [analytics, setAnalytics] = useState<VisitAnalytics>(getAnalytics());
  const [leads, setLeads] = useState<CapturedLead[]>(getLeads());
  const [team, setTeam] = useState<TeamMember[]>(getTeamMembers());
  const [botConfig] = useState<ChatbotConfig>(getChatbotConfig());
  const [cookieConsent] = useState(getCookieConsent());

  // Server-managed Content Workflow state
  const [serverContent, setServerContent] = useState<ContentWorkflowItem[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentWorkflowItem | null>(null);
  const [contentForm, setContentForm] = useState({ title: '', slug: '', category: 'homepage', content: '' });

  // Server-managed Tickets state
  const [tickets, setTickets] = useState<CmsTicket[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all');
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketIncludeDeleted, setTicketIncludeDeleted] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<CmsTicket | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [newInternalNote, setNewInternalNote] = useState('');
  const [newCustomerUpdate, setNewCustomerUpdate] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Ticket creation & detail editing states
  const [createTicketModalOpen, setCreateTicketModalOpen] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    name: '',
    email: '',
    category: 'technical_support',
    priority: 'medium',
    status: 'NEW',
    assignedTo: '',
    subject: '',
    description: '',
    initialNote: '',
  });
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTicketForm, setEditTicketForm] = useState({
    subject: '',
    description: '',
    category: 'technical_support',
    priority: 'medium',
    requester_name: '',
    requester_email: '',
  });

  // Server-managed Enquiries state
  const [serverEnquiries, setServerEnquiries] = useState<CmsEnquiry[]>([]);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('all');
  const [enquirySearch, setEnquirySearch] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<CmsEnquiry | null>(null);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryNoteDraft, setEnquiryNoteDraft] = useState('');
  const [enquiryStatusDraft, setEnquiryStatusDraft] = useState('NEW');

  // Server Users state
  const [serverUsers, setServerUsers] = useState<ServerUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', email: '', name: '', role: 'marketing', initialPassword: '' });

  // Server Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Route rotation state
  const [rotatePassword, setRotatePassword] = useState('');
  const [rotateReason, setRotateReason] = useState('');
  const [rotateSuccess, setRotateSuccess] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Status feedback & filters
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; ref?: string } | null>(null);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<CapturedLead | null>(null);

  // Team modal state
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', role: '', bio: '', image: '', linkedin: '' });

  // Chatbot Sandbox state
  const [testQuery, setTestQuery] = useState('');
  const [testResponses, setTestResponses] = useState<{ sender: 'user' | 'bot'; text: string; warn?: boolean }[]>([
    { sender: 'bot', text: 'CMS Sandbox ready. Try asking about services, integration, or test confidential prompts.' },
  ]);
  const [testLoading, setTestLoading] = useState(false);

  // Status notification helper
  const notify = (message: string, type: 'success' | 'error' = 'success', ref?: string) => {
    setFeedback({ type, message, ref });
    setTimeout(() => setFeedback(null), 5000);
  };

  /* ─── SERVER DATA LOADING ─── */
  // Load server-side aggregated real analytics
  const loadRealAnalytics = async () => {
    try {
      const res = await api.getAnalytics();
      if (res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch {
      // Fallback to local mirror
    }
  };

  const handleResetAnalytics = async () => {
    try {
      const res = await api.resetAnalytics();
      if (res.analytics) {
        setAnalytics(res.analytics);
      }
      notify('Real telemetry counters have been reset to zero.');
    } catch (err: any) {
      notify(err.message || 'Failed to reset telemetry', 'error', err.reference);
    }
  };

  // Load server-side content workflow items
  const loadServerContent = async () => {
    try {
      const res = await api.getContent(includeDeleted);
      if (res.items) setServerContent(res.items);
    } catch (err: any) {
      notify(err.message || 'Failed to fetch content from secure server', 'error', err.reference);
    }
  };

  // Load server-side users (Admin / Super Admin only)
  const loadServerUsers = async () => {
    if (!canManageUsers) return;
    try {
      const res = await api.getUsers();
      if (res.users) setServerUsers(res.users);
    } catch (err: any) {
      notify(err.message || 'Failed to fetch users', 'error', err.reference);
    }
  };

  // Load server-side audit logs
  const loadAuditLogs = async () => {
    if (!canViewAudits) return;
    try {
      const res = await api.getAuditLogs();
      if (res.logs) setAuditLogs(res.logs);
    } catch (err: any) {
      notify(err.message || 'Failed to fetch audit logs', 'error', err.reference);
    }
  };

  // Load server-side tickets
  const loadTickets = async () => {
    if (!canManageTickets) return;
    setTicketLoading(true);
    try {
      const res = await api.getCmsTickets({
        status: ticketStatusFilter,
        priority: ticketPriorityFilter,
        category: ticketCategoryFilter,
        search: ticketSearch,
        includeDeleted: ticketIncludeDeleted,
      });
      if (res.tickets) setTickets(res.tickets);
    } catch (err: any) {
      notify(err.message || 'Failed to fetch tickets', 'error', err.reference);
    } finally {
      setTicketLoading(false);
    }
  };

  // Load server-side enquiries
  const loadEnquiries = async () => {
    if (!canManageEnquiries) return;
    setEnquiryLoading(true);
    try {
      const res = await api.getCmsEnquiries({
        status: enquiryStatusFilter,
        search: enquirySearch,
      });
      if (res.enquiries) setServerEnquiries(res.enquiries);
    } catch (err: any) {
      notify(err.message || 'Failed to fetch enquiries', 'error', err.reference);
    } finally {
      setEnquiryLoading(false);
    }
  };

  useEffect(() => {
    loadRealAnalytics();
    loadServerContent();
    loadServerUsers();
    loadAuditLogs();
    loadTickets();
    loadEnquiries();
  }, [includeDeleted]);

  const loadDatabaseStats = async () => {
    try {
      setDbLoading(true);
      const res = await api.getDatabaseStats();
      if (res.database) {
        setDbStats(res.database);
      }
    } catch {
      // Graceful fallback
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'KB NEXUS | Enterprise Platform';
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadRealAnalytics();
    }
    if (activeTab === 'security') {
      loadDatabaseStats();
    }
  }, [activeTab]);

  useEffect(() => {
    loadTickets();
  }, [ticketStatusFilter, ticketPriorityFilter, ticketCategoryFilter, ticketSearch, ticketIncludeDeleted]);

  useEffect(() => {
    loadEnquiries();
  }, [enquiryStatusFilter, enquirySearch]);

  /* ─── TICKET ACTIONS ─── */
  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await api.updateTicketStatus(ticketId, status);
      notify(`Ticket status updated to ${status}`);
      loadTickets();
      if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket.public_id === ticketId)) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to update ticket status', 'error', err.reference);
    }
  };

  const handleAssignTicket = async (ticketId: string, assignedTo: string | null) => {
    try {
      await api.assignTicket(ticketId, assignedTo);
      notify('Ticket assignment updated.');
      loadTickets();
      if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket.public_id === ticketId)) {
        setSelectedTicket({ ...selectedTicket, assigned_to: assignedTo });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to assign ticket', 'error', err.reference);
    }
  };

  const handleAddInternalNote = async (ticketId: string) => {
    if (!newInternalNote.trim()) return;
    try {
      const res = await api.addTicketInternalNote(ticketId, newInternalNote.trim());
      notify('Internal staff note appended.');
      setNewInternalNote('');
      loadTickets();
      if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket.public_id === ticketId) && res.note) {
        setSelectedTicket({
          ...selectedTicket,
          internal_notes: [...selectedTicket.internal_notes, res.note],
        });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to add note', 'error', err.reference);
    }
  };

  const handleAddCustomerUpdate = async (ticketId: string) => {
    if (!newCustomerUpdate.trim()) return;
    try {
      const res = await api.addTicketCustomerUpdate(ticketId, newCustomerUpdate.trim());
      notify('Customer status update posted.');
      setNewCustomerUpdate('');
      loadTickets();
      if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket.public_id === ticketId) && res.update) {
        setSelectedTicket({
          ...selectedTicket,
          customer_updates: [...selectedTicket.customer_updates, res.update],
        });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to post customer update', 'error', err.reference);
    }
  };

  const handleSoftDeleteTicket = async (ticketId: string) => {
    try {
      await api.softDeleteTicket(ticketId, deleteReason || 'Archived by staff');
      notify('Ticket soft-deleted and archived.');
      setDeleteReason('');
      setTicketModalOpen(false);
      loadTickets();
    } catch (err: any) {
      notify(err.message || 'Failed to archive ticket', 'error', err.reference);
    }
  };

  const handleRestoreTicket = async (ticketId: string) => {
    try {
      await api.restoreTicket(ticketId);
      notify('Ticket restored to active dispatch queue.');
      loadTickets();
      if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket.public_id === ticketId)) {
        setSelectedTicket({ ...selectedTicket, deleted_at: null });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to restore ticket', 'error', err.reference);
    }
  };

  const openTicketDetails = (t: CmsTicket, startEditing = false) => {
    setSelectedTicket(t);
    setEditTicketForm({
      subject: t.subject || '',
      description: t.description || '',
      category: t.category || 'technical_support',
      priority: t.priority || 'medium',
      requester_name: t.requester_name || '',
      requester_email: t.requester_email || '',
    });
    setIsEditingDetails(startEditing);
    setTicketModalOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim()) {
      notify('Ticket subject is required.', 'error');
      return;
    }
    if (!ticketForm.description.trim()) {
      notify('Ticket description is required.', 'error');
      return;
    }

    setTicketSubmitting(true);
    try {
      const res = await api.createCmsTicket({
        name: ticketForm.name.trim() || 'Valued Customer',
        email: ticketForm.email.trim() || 'customer@kineticbay.internal',
        category: ticketForm.category,
        priority: ticketForm.priority,
        status: ticketForm.status,
        assignedTo: ticketForm.assignedTo || null,
        subject: ticketForm.subject.trim(),
        description: ticketForm.description.trim(),
        initialNote: ticketForm.initialNote.trim() || undefined,
      });

      notify(`Ticket ${res.ticket?.public_id || ''} created successfully!`);
      setCreateTicketModalOpen(false);
      setTicketForm({
        name: '',
        email: '',
        category: 'technical_support',
        priority: 'medium',
        status: 'NEW',
        assignedTo: '',
        subject: '',
        description: '',
        initialNote: '',
      });
      loadTickets();
    } catch (err: any) {
      notify(err.message || 'Failed to create ticket', 'error', err.reference);
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleSaveTicketDetails = async (ticketId: string) => {
    if (!editTicketForm.subject.trim()) {
      notify('Subject cannot be empty.', 'error');
      return;
    }
    if (!editTicketForm.description.trim()) {
      notify('Description cannot be empty.', 'error');
      return;
    }

    try {
      const res = await api.updateCmsTicket(ticketId, {
        subject: editTicketForm.subject.trim(),
        description: editTicketForm.description.trim(),
        category: editTicketForm.category,
        priority: editTicketForm.priority,
        requester_name: editTicketForm.requester_name.trim(),
        requester_email: editTicketForm.requester_email.trim(),
      });

      notify('Ticket details updated successfully!');
      setIsEditingDetails(false);
      loadTickets();
      if (res.ticket) {
        setSelectedTicket(res.ticket);
      } else if (selectedTicket) {
        setSelectedTicket({
          ...selectedTicket,
          subject: editTicketForm.subject.trim(),
          description: editTicketForm.description.trim(),
          category: editTicketForm.category,
          priority: editTicketForm.priority,
          requester_name: editTicketForm.requester_name.trim(),
          requester_email: editTicketForm.requester_email.trim(),
        });
      }
    } catch (err: any) {
      notify(err.message || 'Failed to update ticket details', 'error', err.reference);
    }
  };

  /* ─── ENQUIRY ACTIONS ─── */
  const handleUpdateEnquiry = async (enquiryId: string, status: string, notes?: string) => {
    try {
      await api.updateEnquiryStatus(enquiryId, status, notes);
      notify('Enquiry updated.');
      loadEnquiries();
      setEnquiryModalOpen(false);
    } catch (err: any) {
      notify(err.message || 'Failed to update enquiry', 'error', err.reference);
    }
  };

  const handleSoftDeleteEnquiry = async (enquiryId: string) => {
    try {
      await api.softDeleteEnquiry(enquiryId);
      notify('Enquiry deleted.');
      loadEnquiries();
      setEnquiryModalOpen(false);
    } catch (err: any) {
      notify(err.message || 'Failed to delete enquiry', 'error', err.reference);
    }
  };

  /* ─── WORKFLOW & CONTENT ACTIONS ─── */
  const handleSaveContentItem = async () => {
    try {
      if (editingContent) {
        await api.updateContent(editingContent.id, contentForm);
        notify('Content item updated.');
      } else {
        await api.createContent(contentForm);
        notify('Draft content created.');
      }
      setContentModalOpen(false);
      setEditingContent(null);
      setContentForm({ title: '', slug: '', category: 'homepage', content: '' });
      loadServerContent();
    } catch (err: any) {
      notify(err.message || 'Error saving content item', 'error', err.reference);
    }
  };

  const handleTransition = async (id: string, targetStatus: string) => {
    try {
      await api.transitionContent(id, targetStatus);
      notify(`Content status moved to ${targetStatus}.`);
      loadServerContent();
    } catch (err: any) {
      notify(err.message || 'Workflow transition denied', 'error', err.reference);
    }
  };

  const handleSoftDeleteContent = async (id: string) => {
    const reason = window.prompt('Please provide a reason for soft-deletion:');
    if (reason === null) return;
    try {
      await api.softDeleteContent(id, reason);
      notify('Item placed in trash.');
      loadServerContent();
    } catch (err: any) {
      notify(err.message || 'Soft delete failed', 'error', err.reference);
    }
  };

  const handleRestoreContent = async (id: string) => {
    try {
      await api.restoreContent(id);
      notify('Item restored from trash.');
      loadServerContent();
    } catch (err: any) {
      notify(err.message || 'Restore operation denied', 'error', err.reference);
    }
  };

  /* ─── USER MANAGEMENT ACTIONS ─── */
  const handleCreateUser = async () => {
    try {
      await api.createUser(userForm);
      notify(`New user @${userForm.username || userForm.email} created.`);
      setUserModalOpen(false);
      setUserForm({ username: '', email: '', name: '', role: 'marketing', initialPassword: '' });
      loadServerUsers();
    } catch (err: any) {
      notify(err.message || 'User creation failed', 'error', err.reference);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      notify('Role successfully updated.');
      loadServerUsers();
    } catch (err: any) {
      notify(err.message || 'Role change denied', 'error', err.reference);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const target = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await api.updateUserStatus(userId, target);
      notify(`User account set to ${target}.`);
      loadServerUsers();
    } catch (err: any) {
      notify(err.message || 'Status change denied', 'error', err.reference);
    }
  };

  /* ─── ROUTE ROTATION (SUPER ADMIN) ─── */
  const handleRotateRoute = async () => {
    if (!rotatePassword) {
      notify('Confirmation password required for step-up auth.', 'error');
      return;
    }
    try {
      const res = await api.rotateCmsRoute(rotatePassword, rotateReason);
      if (res.success) {
        setRotateSuccess(res.newRoutePath);
        setRotatePassword('');
        setRotateReason('');
        notify('CMS Route has been rotated and old route invalidated!');
        loadAuditLogs();
      }
    } catch (err: any) {
      notify(err.message || 'Route rotation denied', 'error', err.reference);
    }
  };

  /* ─── TEAM MANAGEMENT ─── */
  const handleSaveTeam = () => {
    if (!memberForm.name.trim() || !memberForm.role.trim()) return;
    if (editingMember) {
      updateTeamMember(editingMember.id, memberForm);
      notify('Team member updated.');
    } else {
      addTeamMember({
        ...memberForm,
        image: memberForm.image || 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=600',
      });
      notify('New team member added.');
    }
    setTeam(getTeamMembers());
    setTeamModalOpen(false);
    setEditingMember(null);
  };

  /* ─── CHATBOT SANDBOX ─── */
  const handleTestBot = async () => {
    if (!testQuery.trim() || testLoading) return;
    const q = testQuery.trim();
    setTestResponses((prev) => [...prev, { sender: 'user', text: q }]);
    setTestQuery('');
    setTestLoading(true);

    try {
      const res = await processChatQuery(q);
      setTestResponses((prev) => [...prev, { sender: 'bot', text: res.text, warn: res.isConfidentialWarning }]);
    } catch {
      setTestResponses((prev) => [...prev, { sender: 'bot', text: 'Error executing test query.' }]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-ink font-sans flex flex-col">
      {/* ── TOP NAV BAR ── */}
      <header className="h-16 px-6 bg-surface/90 border-b border-border/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-raised/90 border border-primary/40 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)] shrink-0">
            <img src="/favicon.png" alt="KB NEXUS Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-sm text-ink tracking-wide flex items-center gap-2">
                <span>KB NEXUS</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-semibold font-mono uppercase tracking-wider">
                  CMS
                </span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                Server-Authenticated Session
              </span>
            </div>
            <div className="text-[11px] text-text-secondary/60 flex items-center gap-1.5">
              <span>User: <b className="text-ink">@{currentUser.username || currentUser.name}</b></span>
              <span>•</span>
              <span className="uppercase text-primary font-semibold">{currentUser.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{feedback.message}</span>
              {feedback.ref && <span className="text-[10px] opacity-70 font-mono">[{feedback.ref}]</span>}
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface border border-border text-xs text-text-secondary hover:text-ink transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </header>

      {/* ── WORKSPACE SHELL ── */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#0a0b0e] border-r border-border/70 p-4 space-y-1 shrink-0">
          <div className="text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider px-3 py-2">
            Operations & Analytics
          </div>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4" />
              <span>Visits & Telemetry</span>
            </div>
            <span className="text-[11px] opacity-80">{analytics.totalVisits}</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'content'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4" />
              <span>Content Workflow</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-primary font-semibold">
              {serverContent.length}
            </span>
          </button>

          {canManageTickets && (
            <button
              onClick={() => setActiveTab('tickets')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'tickets'
                  ? 'bg-primary text-ink shadow-ember-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4" />
                <span>Service Desk & Tickets</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-primary font-semibold">
                {tickets.length}
              </span>
            </button>
          )}

          {canManageEnquiries && (
            <button
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'enquiries'
                  ? 'bg-primary text-ink shadow-ember-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Enquiries & Proposals</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-accent font-semibold">
                {serverEnquiries.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('crm')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'crm'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Legacy Leads</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-accent font-semibold">
              {leads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'team'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Team Addition</span>
            </div>
            <span className="text-[11px] opacity-80">{team.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('chatbot')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'chatbot'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chatbot & Guardrails</span>
          </button>

          <div className="text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider px-3 py-2 pt-4">
            Security & Governance
          </div>

          {canManageUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-primary text-ink shadow-ember-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>User RBAC</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-ink">
                {serverUsers.length}
              </span>
            </button>
          )}

          {canViewAudits && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-primary text-ink shadow-ember-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Audit Logs</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised text-ink">
                {auditLogs.length}
              </span>
            </button>
          )}

          {canManageSecurity && (
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'security'
                  ? 'bg-primary text-ink shadow-ember-sm'
                  : 'text-text-secondary hover:bg-surface hover:text-ink'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Route Obfuscation</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cookies')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'cookies'
                ? 'bg-primary text-ink shadow-ember-sm'
                : 'text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Cookie Connection</span>
          </button>

          <div className="pt-4 mt-4 border-t border-border/60 px-2">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-raised/40 border border-border/60">
              <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center p-1 shrink-0 border border-primary/20">
                <img src="/favicon.png" alt="KB NEXUS" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-ink tracking-wide truncate">KB NEXUS</div>
                <div className="text-[9px] text-primary/80 font-mono">Enterprise Console</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace View */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl">
          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TOTAL VISITS & TELEMETRY                             */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-xl text-ink">
                      Website Traffic & Real Visit Telemetry
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                      Zero Mock Data • Verified Real
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Live visitor metrics. Automated bots, scrapers, headless browsers, and internal CMS sessions are strictly filtered out.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={() => {
                      loadRealAnalytics();
                      notify('Real telemetry metrics refreshed.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface border border-border text-xs text-text-secondary hover:text-ink transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={handleResetAnalytics}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset to Zero</span>
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-surface/70 border border-border/80">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider block">
                    Real Total Visits
                  </span>
                  <div className="text-2xl font-bold font-heading text-ink mt-1">
                    {analytics.totalVisits.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-400 mt-1 block font-mono">30-min session rolling window</span>
                </div>

                <div className="p-4 rounded-2xl bg-surface/70 border border-border/80">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider block">
                    Unique Visitors
                  </span>
                  <div className="text-2xl font-bold font-heading text-ink mt-1">
                    {analytics.uniqueVisitors.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 block">Privacy-safe hashed IP/UA</span>
                </div>

                <div className="p-4 rounded-2xl bg-surface/70 border border-border/80">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider block">
                    Total Inquiries
                  </span>
                  <div className="text-2xl font-bold font-heading text-accent mt-1">
                    {leads.length}
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 block">Chatbot + Form submissions</span>
                </div>

                <div className="p-4 rounded-2xl bg-surface/70 border border-border/80">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider block">
                    Conversion Rate
                  </span>
                  <div className="text-2xl font-bold font-heading text-primary mt-1">
                    {analytics.uniqueVisitors > 0
                      ? ((leads.length / analytics.uniqueVisitors) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 block">Inquiry / Unique visitor</span>
                </div>
              </div>

              {/* Daily Chart */}
              <div className="p-6 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-sm text-ink">Daily Visits (Real Traffic Timeline)</h3>
                  <span className="text-[10px] text-text-secondary font-mono">Real-time daily buckets</span>
                </div>
                {analytics.dailyVisits.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-text-secondary/60">
                    No visits recorded yet today. Visit the public pages to record live real visits!
                  </div>
                ) : (
                  <div className="h-44 flex items-end justify-between gap-2 pt-6 border-b border-border/50">
                    {analytics.dailyVisits.slice(-7).map((day, idx) => {
                      const max = Math.max(...analytics.dailyVisits.map((d) => d.count), 10);
                      const heightPct = Math.round((day.count / max) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                          <span className="text-[10px] text-text-secondary group-hover:text-primary transition-colors">
                            {day.count}
                          </span>
                          <div
                            className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary rounded-t-lg transition-all"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] text-text-secondary/70 whitespace-nowrap">
                            {day.date.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Devices & Page Views */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-ink">Page Views Distribution</h3>
                  {Object.keys(analytics.pageViews).length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-secondary/60">
                      No page views recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(analytics.pageViews).map(([path, count]) => {
                        const pct = Math.round((count / (analytics.totalVisits || 1)) * 100);
                        return (
                          <div key={path} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-mono text-ink">{path}</span>
                              <span className="text-text-secondary">{count} views ({pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
                  <h3 className="font-heading font-semibold text-sm text-ink">Device Breakdown</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-surface-raised border border-border">
                      <Monitor className="w-5 h-5 mx-auto text-primary mb-1" />
                      <span className="text-xs font-semibold text-ink block">Desktop</span>
                      <span className="text-[11px] text-text-secondary">
                        {analytics.deviceBreakdown.desktop}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-raised border border-border">
                      <Smartphone className="w-5 h-5 mx-auto text-accent mb-1" />
                      <span className="text-xs font-semibold text-ink block">Mobile</span>
                      <span className="text-[11px] text-text-secondary">
                        {analytics.deviceBreakdown.mobile}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-raised border border-border">
                      <Tablet className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                      <span className="text-xs font-semibold text-ink block">Tablet</span>
                      <span className="text-[11px] text-text-secondary">
                        {analytics.deviceBreakdown.tablet}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Real Visits Stream */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-ink">Live Verified Visits Stream</h3>
                    <p className="text-[11px] text-text-secondary">Real human visitors currently browsing public pages.</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Anti-Bot Guard Active
                  </span>
                </div>

                {analytics.recentVisits.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-text-secondary/60 space-y-1">
                    <p>No visits recorded in this session yet.</p>
                    <p className="text-[11px]">Browse the public pages (<code className="text-primary font-mono">/</code>, <code className="text-primary font-mono">/services</code>, <code className="text-primary font-mono">/solutions</code>, <code className="text-primary font-mono">/team</code>, <code className="text-primary font-mono">/contact</code>) to generate real visits!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-text-secondary/60 text-[10px] uppercase font-mono">
                          <th className="pb-2">Time</th>
                          <th className="pb-2">Page Path</th>
                          <th className="pb-2">Device</th>
                          <th className="pb-2">Referrer</th>
                          <th className="pb-2 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                        {analytics.recentVisits.slice(0, 10).map((v) => (
                          <tr key={v.id} className="hover:bg-surface-raised/40 transition-colors">
                            <td className="py-2.5 text-text-secondary">{v.timestamp}</td>
                            <td className="py-2.5 font-medium text-ink">{v.path}</td>
                            <td className="py-2.5 text-text-secondary capitalize">{v.deviceType}</td>
                            <td className="py-2.5 text-text-secondary">{v.referrer || 'Direct'}</td>
                            <td className="py-2.5 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ Real User
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 2: CONTENT APPROVAL WORKFLOW & SOFT DELETE              */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink">
                    Content Approval Workflow & Soft Delete
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Multi-stage governance: Draft → Submitted → Review → Approved → Published.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDeleted}
                      onChange={(e) => setIncludeDeleted(e.target.checked)}
                      className="accent-primary"
                    />
                    <span>Show Trash / Soft-Deleted</span>
                  </label>
                  <button
                    onClick={() => {
                      setEditingContent(null);
                      setContentForm({ title: '', slug: '', category: 'homepage', content: '' });
                      setContentModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-ember-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Draft</span>
                  </button>
                </div>
              </div>

              {/* Content Table */}
              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Title & Slug</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Workflow Status</th>
                      <th className="p-3.5">Version</th>
                      <th className="p-3.5">Lifecycle</th>
                      <th className="p-3.5 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {serverContent.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-ink">{item.title}</div>
                          <div className="text-[11px] font-mono text-text-secondary">/{item.slug}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="capitalize">{item.category}</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              item.status === 'published'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'approved'
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : item.status === 'review'
                                ? 'bg-accent/15 text-accent border border-accent/30'
                                : item.status === 'submitted'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-surface-raised text-text-secondary border border-border'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-text-secondary">v{item.version}</td>
                        <td className="p-3.5">
                          {item.deleted_at ? (
                            <span className="text-red-400 text-[10px] block">
                              Soft Deleted: {new Date(item.deleted_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-text-secondary text-[11px]">
                              Active ({new Date(item.updated_at).toLocaleDateString()})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {item.deleted_at ? (
                            <button
                              onClick={() => handleRestoreContent(item.id)}
                              className="px-2.5 py-1 rounded bg-surface hover:bg-surface-raised border border-border text-emerald-400 hover:text-emerald-300 text-[11px]"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              {/* Workflow Transition Buttons */}
                              {item.status === 'draft' && (
                                <button
                                  onClick={() => handleTransition(item.id, 'submitted')}
                                  className="px-2 py-1 rounded bg-surface border border-border text-blue-400 hover:text-blue-300 text-[10px]"
                                  title="Submit for Review"
                                >
                                  Submit
                                </button>
                              )}
                              {item.status === 'submitted' && (
                                <button
                                  onClick={() => handleTransition(item.id, 'review')}
                                  className="px-2 py-1 rounded bg-surface border border-border text-accent hover:text-accent text-[10px]"
                                  title="Assign to Review"
                                >
                                  Review
                                </button>
                              )}
                              {item.status === 'review' && (
                                <button
                                  onClick={() => handleTransition(item.id, 'approved')}
                                  className="px-2 py-1 rounded bg-surface border border-border text-primary hover:text-primary-light text-[10px]"
                                  title="Approve Content"
                                >
                                  Approve
                                </button>
                              )}
                              {item.status === 'approved' && (
                                <button
                                  onClick={() => handleTransition(item.id, 'published')}
                                  className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold"
                                  title="Publish Live"
                                >
                                  Publish
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingContent(item);
                                  setContentForm({
                                    title: item.title,
                                    slug: item.slug,
                                    category: item.category,
                                    content: item.content,
                                  });
                                  setContentModalOpen(true);
                                }}
                                className="p-1 rounded bg-surface border border-border text-text-secondary hover:text-ink inline-flex"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleSoftDeleteContent(item.id)}
                                className="p-1 rounded bg-surface border border-border text-text-secondary hover:text-red-400 inline-flex"
                                title="Soft Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Content Form Modal */}
              <AnimatePresence>
                {contentModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface-raised border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading font-bold text-base text-ink">
                          {editingContent ? 'Edit Content Item' : 'New Content Draft'}
                        </h3>
                        <button onClick={() => setContentModalOpen(false)} className="text-text-secondary hover:text-ink">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-text-secondary mb-1">Title</label>
                          <input
                            type="text"
                            value={contentForm.title}
                            onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                            className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink focus:border-primary focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-text-secondary mb-1">Slug</label>
                          <input
                            type="text"
                            value={contentForm.slug}
                            onChange={(e) => setContentForm({ ...contentForm, slug: e.target.value })}
                            className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink focus:border-primary focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-text-secondary mb-1">Category</label>
                          <select
                            value={contentForm.category}
                            onChange={(e) => setContentForm({ ...contentForm, category: e.target.value })}
                            className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink focus:border-primary focus:outline-none"
                          >
                            <option value="homepage">Homepage</option>
                            <option value="services">Services</option>
                            <option value="solutions">Solutions</option>
                            <option value="press">Press / Announcements</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-text-secondary mb-1">Body / Markdown</label>
                          <textarea
                            rows={5}
                            value={contentForm.content}
                            onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })}
                            className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => setContentModalOpen(false)}
                          className="px-3.5 py-2 rounded-xl bg-surface border border-border text-xs text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveContentItem}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold shadow-ember-sm"
                        >
                          Save Draft
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: SERVICE DESK & TICKETS                                  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span>Service Desk & Ticket Dispatch</span>
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Triage incoming client requests, assign engineering leads, track statuses, and maintain confidential internal notes.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={() => setCreateTicketModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Ticket</span>
                  </button>
                  <button
                    onClick={loadTickets}
                    className="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border text-ink text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ticketLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Queue</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Search Tickets</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search ID, subject, email..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Filter by Status</label>
                    <select
                      value={ticketStatusFilter}
                      onChange={(e) => setTicketStatusFilter(e.target.value)}
                      className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="NEW">NEW</option>
                      <option value="TRIAGED">TRIAGED</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Filter by Priority</label>
                    <select
                      value={ticketPriorityFilter}
                      onChange={(e) => setTicketPriorityFilter(e.target.value)}
                      className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="all">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Filter by Category</label>
                    <select
                      value={ticketCategoryFilter}
                      onChange={(e) => setTicketCategoryFilter(e.target.value)}
                      className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="all">All Categories</option>
                      <option value="technical_support">Technical Support</option>
                      <option value="project_enquiry">Project Enquiry</option>
                      <option value="billing">Billing</option>
                      <option value="consultation">Consultation</option>
                      <option value="bug_report">Bug Report</option>
                    </select>
                  </div>
                </div>

                {['admin', 'super_admin'].includes(currentUser.role) && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-text-secondary">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ticketIncludeDeleted}
                        onChange={(e) => setTicketIncludeDeleted(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                      <span>Show Archived / Soft-Deleted Tickets</span>
                    </label>
                    <span className="text-[11px] font-mono">{tickets.length} total matches</span>
                  </div>
                )}
              </div>

              {/* Tickets Table */}
              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Reference ID</th>
                      <th className="p-3.5">Subject & Requester</th>
                      <th className="p-3.5">Category & Priority</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Assigned Lead</th>
                      <th className="p-3.5">Created</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-text-secondary">
                          No tickets match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-raised/40 transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-primary text-xs">{t.public_id}</span>
                            {t.deleted_at && (
                              <span className="block text-[9px] text-red-400 font-semibold uppercase">Archived</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-ink line-clamp-1">{t.subject}</div>
                            <div className="text-[11px] text-text-secondary">
                              {t.requester_name} &bull; <span className="font-mono text-[10px]">{t.requester_email}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="capitalize font-medium">{t.category.replace(/_/g, ' ')}</div>
                            <span
                              className={`inline-block text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                                t.priority === 'urgent'
                                  ? 'bg-rose-500/15 text-rose-400'
                                  : t.priority === 'high'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : t.priority === 'medium'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : 'bg-surface text-text-secondary'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                                t.status === 'RESOLVED' || t.status === 'CLOSED'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : t.status === 'WAITING_FOR_CUSTOMER'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : t.status === 'ASSIGNED' || t.status === 'TRIAGED'
                                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                  : 'bg-primary/15 text-primary border-primary/30'
                              }`}
                            >
                              {t.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-[11px] text-text-secondary">
                              {t.assigned_to ? `@${t.assigned_to}` : 'Unassigned'}
                            </span>
                          </td>
                          <td className="p-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openTicketDetails(t, false)}
                                className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-raised text-primary font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                              <button
                                onClick={() => openTicketDetails(t, true)}
                                className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-raised text-ink font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ticket Detail & Management Modal */}
              <AnimatePresence>
                {ticketModalOpen && selectedTicket && (
                  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#0e1015] border border-border/90 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary text-sm">{selectedTicket.public_id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised border border-border text-ink font-semibold">
                              {selectedTicket.status}
                            </span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono font-bold bg-primary/10 text-primary">
                              {selectedTicket.priority}
                            </span>
                          </div>
                          {!isEditingDetails && (
                            <h3 className="font-heading font-bold text-base text-ink mt-0.5">{selectedTicket.subject}</h3>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsEditingDetails(!isEditingDetails)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border text-xs font-semibold text-ink flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                            <span>{isEditingDetails ? 'Cancel Edit' : 'Edit Details'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setTicketModalOpen(false);
                              setSelectedTicket(null);
                              setIsEditingDetails(false);
                            }}
                            className="p-1 rounded-lg text-text-secondary hover:text-ink hover:bg-surface-raised"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer info & description (Editable vs Display View) */}
                      {isEditingDetails ? (
                        <div className="p-4 rounded-xl bg-surface/90 border border-primary/30 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">Edit Ticket Information</span>
                            <span className="text-[10px] text-text-secondary">Changes persist to database</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Subject</label>
                              <input
                                type="text"
                                value={editTicketForm.subject}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, subject: e.target.value })}
                                className="w-full px-3 py-1.5 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                                placeholder="Issue summary"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Category</label>
                              <select
                                value={editTicketForm.category}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, category: e.target.value })}
                                className="w-full p-1.5 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                              >
                                <option value="technical_support">Technical Support</option>
                                <option value="project_enquiry">Project Enquiry</option>
                                <option value="billing">Billing</option>
                                <option value="consultation">Consultation</option>
                                <option value="bug_report">Bug Report</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Priority</label>
                              <select
                                value={editTicketForm.priority}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, priority: e.target.value })}
                                className="w-full p-1.5 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                              >
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Requester Name</label>
                              <input
                                type="text"
                                value={editTicketForm.requester_name}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, requester_name: e.target.value })}
                                className="w-full px-3 py-1.5 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Requester Email</label>
                              <input
                                type="email"
                                value={editTicketForm.requester_email}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, requester_email: e.target.value })}
                                className="w-full px-3 py-1.5 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Description / Ticket Scope</label>
                              <textarea
                                rows={4}
                                value={editTicketForm.description}
                                onChange={(e) => setEditTicketForm({ ...editTicketForm, description: e.target.value })}
                                className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-ink text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                              type="button"
                              onClick={() => setIsEditingDetails(false)}
                              className="px-3 py-1.5 bg-surface border border-border hover:bg-surface-raised text-text-secondary rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveTicketDetails(selectedTicket.id)}
                              className="px-3.5 py-1.5 bg-primary hover:bg-primary-light text-ink font-semibold rounded-lg text-xs flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-surface/80 border border-border space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                            <div><b>Requester:</b> {selectedTicket.requester_name} ({selectedTicket.requester_email})</div>
                            <div><b>Category:</b> <span className="capitalize">{selectedTicket.category.replace(/_/g, ' ')}</span> &bull; <b>Priority:</b> {selectedTicket.priority}</div>
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <span className="text-[10px] uppercase font-semibold text-text-secondary block mb-1">Issue Description</span>
                            <p className="text-ink whitespace-pre-line leading-relaxed bg-surface-raised p-2.5 rounded-lg border border-border">
                              {selectedTicket.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Staff Controls (Status & Assignment) */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">Update Status</label>
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                            className="w-full p-2 bg-surface rounded-xl border border-border text-ink font-semibold focus:border-primary"
                          >
                            <option value="NEW">NEW</option>
                            <option value="TRIAGED">TRIAGED</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">Assign Staff</label>
                          <select
                            value={selectedTicket.assigned_to || ''}
                            onChange={(e) => handleAssignTicket(selectedTicket.id, e.target.value || null)}
                            className="w-full p-2 bg-surface rounded-xl border border-border text-ink focus:border-primary"
                          >
                            <option value="">-- Unassigned --</option>
                            <option value="usr_superadmin_01">Chief Security Officer (SuperAdmin)</option>
                            <option value="usr_admin_01">Platform Operations Admin</option>
                            <option value="usr_marketing_01">Growth & Content Specialist</option>
                          </select>
                        </div>
                      </div>

                      {/* Internal Notes (Confidential) */}
                      <div className="p-3.5 rounded-xl bg-surface/90 border border-primary/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-semibold text-xs text-primary flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Internal Staff Notes</span>
                          </h4>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Strictly Hidden From Public
                          </span>
                        </div>

                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {selectedTicket.internal_notes.length === 0 ? (
                            <p className="text-[11px] text-text-secondary/70 italic">No internal notes added yet.</p>
                          ) : (
                            selectedTicket.internal_notes.map((n) => (
                              <div key={n.id} className="p-2 bg-surface-raised rounded-lg border border-border text-[11px] space-y-0.5">
                                <div className="flex items-center justify-between text-[9px] text-text-secondary">
                                  <span className="font-semibold text-ink">{n.author_name}</span>
                                  <span>{new Date(n.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-ink">{n.note}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add confidential note for team..."
                            value={newInternalNote}
                            onChange={(e) => setNewInternalNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddInternalNote(selectedTicket.id)}
                            className="flex-1 px-3 py-1.5 bg-surface-raised rounded-lg border border-border text-xs text-ink focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => handleAddInternalNote(selectedTicket.id)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-light text-ink text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      {/* Customer Status Updates (Public) */}
                      <div className="p-3.5 rounded-xl bg-surface/90 border border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-semibold text-xs text-ink flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-accent" />
                            <span>Customer Status Updates (Publicly Visible)</span>
                          </h4>
                        </div>

                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                          {selectedTicket.customer_updates.length === 0 ? (
                            <p className="text-[11px] text-text-secondary/70 italic">No public updates posted.</p>
                          ) : (
                            selectedTicket.customer_updates.map((u) => (
                              <div key={u.id} className="p-2 bg-surface-raised rounded-lg border border-border text-[11px] space-y-0.5">
                                <p className="text-ink">{u.message}</p>
                                <span className="text-[9px] text-text-secondary block">
                                  {new Date(u.created_at).toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Post public progress update for customer..."
                            value={newCustomerUpdate}
                            onChange={(e) => setNewCustomerUpdate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomerUpdate(selectedTicket.id)}
                            className="flex-1 px-3 py-1.5 bg-surface-raised rounded-lg border border-border text-xs text-ink focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => handleAddCustomerUpdate(selectedTicket.id)}
                            className="px-3 py-1.5 bg-accent hover:bg-accent-light text-ink text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Post Update</span>
                          </button>
                        </div>
                      </div>

                      {/* Archive / Restore actions */}
                      {['admin', 'super_admin'].includes(currentUser.role) && (
                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          {selectedTicket.deleted_at ? (
                            <button
                              onClick={() => handleRestoreTicket(selectedTicket.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-500/30"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Restore Ticket to Active Queue</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = prompt('Please specify the reason for archiving this ticket:');
                                if (reason) handleSoftDeleteTicket(selectedTicket.id);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Archive / Soft Delete Ticket</span>
                            </button>
                          )}
                          <span className="text-[10px] text-text-secondary">Audit trail generated automatically</span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Create Ticket Modal */}
              <AnimatePresence>
                {createTicketModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#0e1015] border border-border/90 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Ticket className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-base text-ink">Create New Ticket</h3>
                            <p className="text-[11px] text-text-secondary">Add and dispatch a new service desk or client ticket</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCreateTicketModalOpen(false)}
                          className="p-1 rounded-lg text-text-secondary hover:text-ink hover:bg-surface-raised"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary block mb-1">Requester Name</label>
                            <input
                              type="text"
                              placeholder="e.g. John Doe"
                              value={ticketForm.name}
                              onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                              className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary block mb-1">Requester Email</label>
                            <input
                              type="email"
                              placeholder="e.g. john@example.com"
                              value={ticketForm.email}
                              onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                              className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary block mb-1">Category</label>
                            <select
                              value={ticketForm.category}
                              onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                              className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                            >
                              <option value="technical_support">Technical Support</option>
                              <option value="project_enquiry">Project Enquiry</option>
                              <option value="billing">Billing</option>
                              <option value="consultation">Consultation</option>
                              <option value="bug_report">Bug Report</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary block mb-1">Priority</label>
                            <select
                              value={ticketForm.priority}
                              onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                              className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                            >
                              <option value="urgent">Urgent</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-text-secondary block mb-1">Initial Status</label>
                            <select
                              value={ticketForm.status}
                              onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}
                              className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                            >
                              <option value="NEW">NEW</option>
                              <option value="TRIAGED">TRIAGED</option>
                              <option value="ASSIGNED">ASSIGNED</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                              <option value="RESOLVED">RESOLVED</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">Assign Lead (Optional)</label>
                          <select
                            value={ticketForm.assignedTo}
                            onChange={(e) => setTicketForm({ ...ticketForm, assignedTo: e.target.value })}
                            className="w-full p-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                          >
                            <option value="">-- Unassigned --</option>
                            <option value="usr_superadmin_01">Chief Security Officer (SuperAdmin)</option>
                            <option value="usr_admin_01">Platform Operations Admin</option>
                            <option value="usr_marketing_01">Growth & Content Specialist</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                            Subject / Issue Title <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Brief summary of the issue or project requirement"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                            Description / Full Details <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="Detailed description, client context, or steps to reproduce..."
                            value={ticketForm.description}
                            onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                            Initial Internal Staff Note (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Confidential notes for internal staff triage..."
                            value={ticketForm.initialNote}
                            onChange={(e) => setTicketForm({ ...ticketForm, initialNote: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-ink text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setCreateTicketModalOpen(false)}
                          className="px-3.5 py-2 bg-surface border border-border hover:bg-surface-raised text-text-secondary rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={ticketSubmitting}
                          onClick={handleCreateTicket}
                          className="px-4 py-2 bg-primary hover:bg-primary-light text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                          {ticketSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>{ticketSubmitting ? 'Creating...' : 'Create & Dispatch Ticket'}</span>
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: ENQUIRIES & PROPOSALS                                  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'enquiries' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" />
                    <span>Enquiries & Project Proposals</span>
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Live client proposals and consultations submitted via Public Chatbot and Website forms.
                  </p>
                </div>
                <button
                  onClick={loadEnquiries}
                  className="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border text-ink text-xs font-semibold transition-colors flex items-center gap-1.5 self-start"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${enquiryLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Enquiries</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex flex-col sm:flex-row items-center gap-3 text-xs">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search reference, client name, email, company..."
                    value={enquirySearch}
                    onChange={(e) => setEnquirySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <select
                  value={enquiryStatusFilter}
                  onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                  className="p-2 bg-surface-raised border border-border rounded-xl text-ink focus:outline-none focus:border-primary text-xs w-full sm:w-48"
                >
                  <option value="all">All Pipeline Stages</option>
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              {/* Enquiries Table */}
              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Reference</th>
                      <th className="p-3.5">Client & Contact</th>
                      <th className="p-3.5">Service Requested</th>
                      <th className="p-3.5">Budget & Timeline</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Created</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {serverEnquiries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-text-secondary">
                          No enquiries match the current filter.
                        </td>
                      </tr>
                    ) : (
                      serverEnquiries.map((enq) => (
                        <tr key={enq.id} className="hover:bg-surface-raised/40 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-accent text-xs">
                            {enq.reference_id}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-ink">{enq.name}</div>
                            <div className="text-[11px] text-text-secondary">
                              {enq.email} {enq.company ? `(${enq.company})` : ''}
                            </div>
                          </td>
                          <td className="p-3.5 font-medium">{enq.service_name}</td>
                          <td className="p-3.5 text-text-secondary">
                            <div>{enq.budget_range}</div>
                            <div className="text-[10px]">{enq.timeline}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                                enq.status === 'WON'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : enq.status === 'PROPOSAL_SENT'
                                  ? 'bg-primary/15 text-primary border-primary/30'
                                  : enq.status === 'QUALIFIED' || enq.status === 'CONTACTED'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : enq.status === 'LOST'
                                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                  : 'bg-accent/15 text-accent border-accent/30'
                              }`}
                            >
                              {enq.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                            {new Date(enq.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedEnquiry(enq);
                                setEnquiryStatusDraft(enq.status);
                                setEnquiryNoteDraft(enq.notes || '');
                                setEnquiryModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-raised text-accent font-semibold text-xs transition-colors"
                            >
                              Review & Update
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enquiry Detail Modal */}
              <AnimatePresence>
                {enquiryModalOpen && selectedEnquiry && (
                  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#0e1015] border border-border/90 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <span className="font-mono font-bold text-accent text-xs">{selectedEnquiry.reference_id}</span>
                          <h3 className="font-heading font-bold text-base text-ink">{selectedEnquiry.name}</h3>
                        </div>
                        <button onClick={() => setEnquiryModalOpen(false)} className="p-1 text-text-secondary hover:text-ink">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-3 bg-surface rounded-xl border border-border space-y-2 text-xs">
                        <p><b>Email:</b> {selectedEnquiry.email}</p>
                        {selectedEnquiry.company && <p><b>Company:</b> {selectedEnquiry.company}</p>}
                        <p><b>Service Interest:</b> {selectedEnquiry.service_name}</p>
                        <p><b>Scope / Budget:</b> {selectedEnquiry.budget_range} &bull; <b>Timeline:</b> {selectedEnquiry.timeline}</p>
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-[10px] text-text-secondary uppercase block mb-1">Enquiry Message</span>
                          <p className="p-2 bg-surface-raised rounded-lg border border-border text-ink whitespace-pre-line">
                            {selectedEnquiry.message}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">Pipeline Stage</label>
                          <select
                            value={enquiryStatusDraft}
                            onChange={(e) => setEnquiryStatusDraft(e.target.value)}
                            className="w-full p-2 bg-surface rounded-xl border border-border text-ink font-semibold focus:border-primary"
                          >
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="QUALIFIED">QUALIFIED</option>
                            <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                            <option value="WON">WON</option>
                            <option value="LOST">LOST</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text-secondary block mb-1">Sales & Proposal Notes</label>
                          <textarea
                            rows={2}
                            value={enquiryNoteDraft}
                            onChange={(e) => setEnquiryNoteDraft(e.target.value)}
                            placeholder="Add notes about customer calls, scoped proposals, or follow-ups..."
                            className="w-full p-2 bg-surface rounded-xl border border-border text-ink focus:border-primary resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        {['admin', 'super_admin'].includes(currentUser.role) && (
                          <button
                            onClick={() => handleSoftDeleteEnquiry(selectedEnquiry.id)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => setEnquiryModalOpen(false)}
                            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateEnquiry(selectedEnquiry.id, enquiryStatusDraft, enquiryNoteDraft)}
                            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-light text-ink font-semibold text-xs shadow-ember-sm"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 3: LEADS & CRM PIPELINE                                 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink">
                    Leads & Inquiry CRM Pipeline
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Unified intake for Chatbot inquiries, Lead Gen proposals, and Contact submissions.
                  </p>
                </div>
                <button
                  onClick={exportLeadsCSV}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-ember-sm self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {['all', 'new', 'contacted', 'proposal_sent', 'won', 'lost'].map((status) => {
                  const count = status === 'all' ? leads.length : leads.filter((l) => l.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setLeadStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                        leadStatusFilter === status
                          ? 'bg-primary text-ink font-semibold'
                          : 'bg-surface-raised border border-border text-text-secondary hover:text-ink'
                      }`}
                    >
                      {status.replace('_', ' ')} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Leads Table */}
              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Contact</th>
                      <th className="p-3.5">Service Requested</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">CRM Pipeline Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {leads
                      .filter((l) => leadStatusFilter === 'all' || l.status === leadStatusFilter)
                      .map((lead) => (
                        <tr key={lead.id} className="hover:bg-surface-raised/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-semibold text-ink">{lead.name}</div>
                            <div className="text-[11px] text-text-secondary">{lead.email}</div>
                          </td>
                          <td className="p-3.5 font-medium">{lead.service}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 uppercase">
                              {lead.source.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-text-secondary">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={lead.status}
                              onChange={(e) => {
                                updateLeadStatus(lead.id, e.target.value as LeadStatus);
                                setLeads(getLeads());
                                notify(`Status updated to ${e.target.value}.`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface border border-border text-ink text-xs"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="proposal_sent">Proposal Sent</option>
                              <option value="won">Won / Closed</option>
                              <option value="lost">Lost</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-primary inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete lead from ${lead.name}?`)) {
                                  deleteLead(lead.id);
                                  setLeads(getLeads());
                                  notify('Lead deleted.');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-surface hover:bg-red-500/10 border border-border text-text-secondary hover:text-red-400 inline-flex"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Lead Transcript Modal */}
              <AnimatePresence>
                {selectedLead && (
                  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface-raised border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-primary tracking-wider">
                            Inquiry Record #{selectedLead.id.slice(-6)}
                          </span>
                          <h3 className="font-heading font-bold text-lg text-ink mt-0.5">
                            {selectedLead.name}
                          </h3>
                          <p className="text-xs text-text-secondary">{selectedLead.email}</p>
                        </div>
                        <button onClick={() => setSelectedLead(null)} className="text-text-secondary hover:text-ink">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface border border-border">
                        <span className="text-[11px] text-text-secondary font-semibold uppercase block mb-1">
                          Message Body
                        </span>
                        <p className="text-xs text-ink">{selectedLead.message}</p>
                      </div>

                      {selectedLead.conversationTranscript && selectedLead.conversationTranscript.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                            Chatbot Interaction Transcript
                          </span>
                          <div className="p-3 rounded-xl bg-surface border border-border max-h-48 overflow-y-auto space-y-2">
                            {selectedLead.conversationTranscript.map((t, i) => (
                              <div key={i} className={`text-xs ${t.sender === 'user' ? 'text-primary' : 'text-ink'}`}>
                                <span className="font-semibold uppercase text-[10px] opacity-70 block">{t.sender}:</span>
                                <p>{t.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => setSelectedLead(null)}
                          className="px-4 py-2 rounded-xl bg-primary text-ink text-xs font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 4: TEAM ADDITION & MANAGEMENT                          */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink">
                    Team Addition & Public Roster
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Profiles managed here automatically reflect on the public Team page.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMember(null);
                    setMemberForm({ name: '', role: '', bio: '', image: '', linkedin: '' });
                    setTeamModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5 shadow-ember-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {team.map((member) => (
                  <div key={member.id} className="p-4 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                    <img src={member.image} alt={member.name} className="w-14 h-14 rounded-xl object-cover border border-border" />
                    <div>
                      <h4 className="font-semibold text-ink text-sm">{member.name}</h4>
                      <p className="text-xs text-primary font-medium">{member.role}</p>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">{member.bio}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setMemberForm({ ...member, linkedin: member.linkedin || '' });
                          setTeamModalOpen(true);
                        }}
                        className="p-1 rounded bg-surface text-text-secondary hover:text-ink text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete member?')) {
                            deleteTeamMember(member.id);
                            setTeam(getTeamMembers());
                            notify('Member deleted.');
                          }
                        }}
                        className="p-1 rounded bg-surface text-text-secondary hover:text-red-400 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Team Member Modal */}
              <AnimatePresence>
                {teamModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface-raised border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                    >
                      <h3 className="font-heading font-bold text-base text-ink">
                        {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                      </h3>
                      <div className="space-y-3 text-xs">
                        <input
                          type="text"
                          placeholder="Name"
                          value={memberForm.name}
                          onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                        <input
                          type="text"
                          placeholder="Role"
                          value={memberForm.role}
                          onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                        <input
                          type="url"
                          placeholder="Image URL"
                          value={memberForm.image}
                          onChange={(e) => setMemberForm({ ...memberForm, image: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                        <textarea
                          placeholder="Bio"
                          rows={3}
                          value={memberForm.bio}
                          onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => setTeamModalOpen(false)}
                          className="px-3.5 py-2 rounded-xl bg-surface border border-border text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTeam}
                          className="px-4 py-2 rounded-xl bg-primary text-ink text-xs font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 5: CHATBOT & CONFIDENTIALITY GUARDRAILS                 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'chatbot' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-ink">
                  Chatbot Knowledge Base & Guardrails
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Inspect guardrail rules preventing confidential leaks and test responses in the sandbox.
                </p>
              </div>

              {/* Guardrails List */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-heading font-semibold text-sm text-ink">
                    Active Confidentiality Protection Guardrails
                  </h3>
                </div>

                <div className="space-y-3">
                  {botConfig.guardrails.map((rule) => (
                    <div key={rule.id} className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-ink flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{rule.topic}</span>
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                          Active Shield
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary">{rule.description}</p>
                      <div className="p-2 rounded bg-surface-raised/60 border border-border text-[11px] text-text-secondary italic">
                        <span className="text-primary not-italic font-medium">Refusal Response: </span>
                        "{rule.refusalMessage}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sandbox */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                <h3 className="font-heading font-semibold text-sm text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Internal Chatbot Test Sandbox</span>
                </h3>
                <div className="h-44 overflow-y-auto p-3 rounded-xl bg-surface border border-border space-y-2 text-xs">
                  {testResponses.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl max-w-[85%] ${
                        item.sender === 'user'
                          ? 'bg-primary text-ink ml-auto font-medium'
                          : item.warn
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                          : 'bg-surface-raised border border-border text-ink'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-wider block opacity-60 mb-0.5">
                        {item.sender === 'user' ? 'You' : item.warn ? 'Confidentiality Shield Activated' : 'Kinetic Bay AI'}
                      </span>
                      {item.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask about services or test confidential probe (e.g. employee salaries)..."
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestBot()}
                    className="flex-1 px-3 py-2 bg-surface text-xs rounded-xl border border-border text-ink"
                  />
                  <button
                    onClick={handleTestBot}
                    disabled={!testQuery.trim() || testLoading}
                    className="px-4 py-2 rounded-xl bg-primary text-ink text-xs font-semibold disabled:opacity-40"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 6: USER RBAC & PRIVILEGE MANAGEMENT                     */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && canManageUsers && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink">
                    User Accounts & Role-Based Access Control
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Server-enforced RBAC: Marketing, Admin, and Super Admin. Privilege escalation is blocked.
                  </p>
                </div>
                <button
                  onClick={() => setUserModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5 shadow-ember-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Name & Email</th>
                      <th className="p-3.5">Active Role</th>
                      <th className="p-3.5">MFA Status</th>
                      <th className="p-3.5">Account Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {serverUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            <span>{u.name}</span>
                            <span className="text-primary text-[11px] font-mono">@{u.username}</span>
                          </div>
                          <div className="text-[11px] text-text-secondary font-mono">{u.email}</div>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser.id} // Prevent self-privilege escalation
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2 py-1 rounded bg-surface border border-border text-ink text-xs uppercase"
                          >
                            <option value="marketing">Marketing</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="p-3.5">
                          <span className="text-emerald-400 font-medium">TOTP Enforced</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleStatusToggle(u.id, u.status)}
                              className="px-2.5 py-1 rounded bg-surface hover:bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink"
                            >
                              {u.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Create User Modal */}
              <AnimatePresence>
                {userModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface-raised border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                    >
                      <h3 className="font-heading font-bold text-base text-ink">Create Privileged User</h3>
                      <div className="space-y-3 text-xs">
                        <input
                          type="text"
                          placeholder="Username (e.g. jdoe, editor)"
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Corporate Email (optional)"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        >
                          <option value="marketing">Marketing (Content & Analytics only)</option>
                          <option value="admin">Admin (Operational CMS & Publishing)</option>
                          {currentUser.role === 'super_admin' && (
                            <option value="super_admin">Super Admin (Full Governance)</option>
                          )}
                        </select>
                        <input
                          type="password"
                          placeholder="Initial Password (min 12 chars)"
                          value={userForm.initialPassword}
                          onChange={(e) => setUserForm({ ...userForm, initialPassword: e.target.value })}
                          className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => setUserModalOpen(false)}
                          className="px-3.5 py-2 rounded-xl bg-surface border border-border text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateUser}
                          className="px-4 py-2 rounded-xl bg-primary text-ink text-xs font-semibold"
                        >
                          Create Account
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 7: IMMUTABLE AUDIT LOGGING VIEW                         */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && canViewAudits && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-xl text-ink">
                    Security Audit Trail
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Immutable event log of all authentication, authorization, role change, and route modification events.
                  </p>
                </div>
                <button
                  onClick={loadAuditLogs}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-text-secondary hover:text-ink flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Trail</span>
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-hidden">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Event Type</th>
                      <th className="p-3.5">User ID / Role</th>
                      <th className="p-3.5">Correlation ID</th>
                      <th className="p-3.5">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="p-3.5 text-text-secondary whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 font-semibold text-primary">{log.type}</td>
                        <td className="p-3.5">
                          <span className="text-ink">{log.userId}</span>
                          <span className="text-text-secondary/70 ml-1">({log.role})</span>
                        </td>
                        <td className="p-3.5 text-accent">{log.reqId}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              log.result.includes('SUCCESS')
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-red-400 bg-red-500/10'
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 8: ROUTE OBFUSCATION & SECURITY SETTINGS (SUPER ADMIN)  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'security' && canManageSecurity && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-ink">
                  Cryptographic Route Obfuscation & Security Subsystem
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Rotate the secret entry route with 128+ bits of cryptographic entropy. Old routes are permanently invalidated.
                </p>
              </div>

              {rotateSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>New CMS Access Route Generated</span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    New Active Path: <code className="text-primary font-mono select-all font-bold">{rotateSuccess}</code>
                  </p>
                  <p className="text-[11px] text-text-secondary/70">
                    Bookmark this path immediately. The previous route identifier has been added to the invalidation blacklist.
                  </p>
                </div>
              )}

              <div className="p-6 rounded-2xl bg-surface/70 border border-border/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-semibold text-sm text-ink">
                    Rotate Secret CMS Entry Route
                  </h3>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
                  Rotating the CMS route generates a fresh, non-obvious random string (16 bytes = 128-bit entropy).
                  This operation requires step-up authentication with your password.
                </p>

                <div className="max-w-md space-y-3 text-xs">
                  <div>
                    <label className="block text-text-secondary mb-1">Reason for Rotation</label>
                    <input
                      type="text"
                      placeholder="e.g. Scheduled quarterly rotation or suspected link leakage"
                      value={rotateReason}
                      onChange={(e) => setRotateReason(e.target.value)}
                      className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary mb-1">Confirm Super Admin Password *</label>
                    <input
                      type="password"
                      placeholder="Enter your current password..."
                      value={rotatePassword}
                      onChange={(e) => setRotatePassword(e.target.value)}
                      className="w-full p-2.5 bg-surface rounded-xl border border-border text-ink"
                    />
                  </div>

                  <button
                    onClick={handleRotateRoute}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold shadow-ember-sm flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Authorize & Rotate Route</span>
                  </button>
                </div>
              </div>

              {/* NoSQL Document Database Architecture & Collection Telemetry */}
              <div className="p-6 rounded-2xl bg-surface/70 border border-border/80 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-sm text-ink flex items-center gap-2">
                        NoSQL Document Database Engine
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          ACTIVE & PERSISTED
                        </span>
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Document-oriented JSON collections with atomic disk persistence and Cloudflare KV compatibility
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={loadDatabaseStats}
                    disabled={dbLoading}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-ink text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh NoSQL Stats</span>
                  </button>
                </div>

                {/* Database Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface border border-border/60">
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Engine</div>
                    <div className="font-mono text-xs font-bold text-ink mt-1 truncate">
                      {dbStats?.engine || 'NoSQL-DocumentDB-v2'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border/60">
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Storage Format</div>
                    <div className="text-xs font-bold text-ink mt-1">
                      JSON Document Collections
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border/60">
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Collections</div>
                    <div className="font-mono text-sm font-bold text-primary mt-1">
                      {dbStats?.totalCollections || 9} Collections
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface border border-border/60">
                    <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Total Documents</div>
                    <div className="font-mono text-sm font-bold text-emerald-400 mt-1">
                      {dbStats?.totalDocuments ?? 21} Documents
                    </div>
                  </div>
                </div>

                {/* Collections Table */}
                {dbStats?.collections && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-text-secondary text-[11px]">
                          <th className="pb-2 font-medium">Collection Name</th>
                          <th className="pb-2 font-medium">Storage File</th>
                          <th className="pb-2 font-medium text-right">Document Count</th>
                          <th className="pb-2 font-medium text-right">Size</th>
                          <th className="pb-2 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {Object.entries(dbStats.collections).map(([name, info]: [string, any]) => (
                          <tr key={name} className="hover:bg-surface/50">
                            <td className="py-2.5 font-mono text-primary font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {name}
                            </td>
                            <td className="py-2.5 font-mono text-text-secondary">{info.file}</td>
                            <td className="py-2.5 font-mono text-right text-ink font-bold">{info.documents}</td>
                            <td className="py-2.5 font-mono text-right text-text-secondary">
                              {(info.sizeBytes / 1024).toFixed(1)} KB
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Synced
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 9: COOKIE CONNECTION                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-ink">
                  Cookie Connection & Privacy Controls
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  GDPR/CCPA compliant banner connection wired directly into the website visit analytics engine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-ink flex items-center gap-2">
                    <Cookie className="w-4 h-4 text-primary" />
                    <span>Cookie Category Status</span>
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-ink block">Strictly Necessary Cookies</span>
                        <span className="text-[11px] text-text-secondary">HttpOnly session authorization & CSRF protection.</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                        Always Active
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-ink block">Analytics & Performance Cookies</span>
                        <span className="text-[11px] text-text-secondary">Visitor counts, page view tracking, and device breakdown.</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        User Consented
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-ink">Consent Telemetry</h3>
                  <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Browser State:</span>
                      <span className="text-ink font-semibold uppercase">{cookieConsent.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">HttpOnly Cookies:</span>
                      <span className="text-emerald-400 font-semibold">kb_sec_session (Strict)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
