import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Trash2, CheckCircle, Clock, AlertCircle, Circle,
  BarChart2, Users, TrendingUp, List, Filter, RefreshCw,
  ChevronDown, ChevronUp, Zap, User, Calendar, Tag
} from 'lucide-react';

// ============================================================
// AdminTaskPage — Full task management for admins
// Supports: STANDARD, DAILY_CHECKLIST, PLAYER_ADDITION, REVENUE_TARGET
// Real-time updates via SSE
// ============================================================

const TASK_TYPES = [
  { value: 'STANDARD',        label: 'Standard Task',      icon: List,        desc: 'Custom task with optional notes and due date', color: '#64748b' },
  { value: 'DAILY_CHECKLIST', label: 'Daily Checklist',    icon: CheckCircle, desc: 'Recurring daily checklist for all or specific members', color: '#0ea5e9' },
  { value: 'PLAYER_ADDITION', label: 'Player Addition',    icon: Users,       desc: 'Assign a player-addition goal with per-member tracking', color: '#8b5cf6' },
  { value: 'REVENUE_TARGET',  label: 'Revenue Target',     icon: TrendingUp,  desc: 'Set a profit goal with member sub-allocations', color: '#22c55e' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_TABS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

const C = {
  border: '#e2e8f0', text: '#0f172a', muted: '#64748b', faint: '#94a3b8',
  green: '#16a34a', greenBg: '#dcfce7',
  red: '#dc2626', redBg: '#fee2e2',
  blue: '#2563eb', blueBg: '#dbeafe',
  amber: '#d97706', amberBg: '#fef3c7',
  purple: '#7c3aed', purpleBg: '#ede9fe',
};

const INPUT = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: `1.5px solid ${C.border}`, borderRadius: '10px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  color: C.text,
};

const LABEL = {
  fontSize: '12px', fontWeight: '600', color: '#374151',
  display: 'block', marginBottom: '5px',
};

export default function AdminTaskPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);

  // SSE ref
  const sseRef = useRef(null);

  function emptyForm() {
    return {
      title: '', description: '', priority: 'MEDIUM', dueDate: '', notes: '',
      taskType: 'STANDARD', targetValue: '', assignToAll: false,
      assignedToId: '', checklistItems: [], subTasks: [], isDaily: false,
    };
  }

  useEffect(() => {
    loadTasks();
    loadMembers();
    setupSSE();
    return () => sseRef.current?.close();
  }, []);

  function setupSSE() {
    // Replace /api/events with your actual SSE endpoint
    const sse = new EventSource('/api/events', { withCredentials: true });
    sse.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === 'task_created') {
          setTasks(prev => {
            const exists = prev.find(t => t.id === data.id);
            return exists ? prev.map(t => t.id === data.id ? data : t) : [data, ...prev];
          });
        } else if (type === 'task_updated') {
          setTasks(prev => prev.map(t => t.id === data.id ? data : t));
        } else if (type === 'task_deleted') {
          setTasks(prev => prev.filter(t => t.id !== data.id));
        }
      } catch (_) {}
    };
    sseRef.current = sse;
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', { credentials: 'include' });
      const data = await res.json();
      setTasks(data.data || []);
    } catch (_) {} finally { setLoading(false); }
  }

  async function loadMembers() {
    try {
      const res = await fetch('/api/team-members', { credentials: 'include' });
      const data = await res.json();
      setTeamMembers(data.data || data || []);
    } catch (_) {}
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (['PLAYER_ADDITION', 'REVENUE_TARGET'].includes(form.taskType) && !form.targetValue) {
      setFormError('Target value is required for this task type'); return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE', credentials: 'include' });
    } catch (_) {}
  }

  async function handleStatusChange(taskId, status) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
    } catch (_) {}
  }

  async function handleDailyReset() {
    if (!confirm('Reset all daily checklist tasks for today?')) return;
    await fetch('/api/tasks/daily-reset', { method: 'POST', credentials: 'include' });
    loadTasks();
  }

  // Filter tasks
  const filtered = tasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && t.taskType !== typeFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by type
  const grouped = {
    DAILY_CHECKLIST: filtered.filter(t => t.taskType === 'DAILY_CHECKLIST'),
    PLAYER_ADDITION: filtered.filter(t => t.taskType === 'PLAYER_ADDITION'),
    REVENUE_TARGET:  filtered.filter(t => t.taskType === 'REVENUE_TARGET'),
    STANDARD:        filtered.filter(t => t.taskType === 'STANDARD'),
  };

  return (
    <div style={{ padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: 0 }}>Task Management</h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '2px 0 0' }}>
            {tasks.length} tasks · {tasks.filter(t => t.status === 'COMPLETED').length} completed
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleDailyReset} style={{ ...BTN_SECONDARY, fontSize: '12px' }}>
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            Reset Daily Tasks
          </button>
          <button onClick={() => { setShowForm(true); setForm(emptyForm()); }} style={BTN_PRIMARY}>
            <Plus style={{ width: '16px', height: '16px' }} />
            New Task
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {TASK_TYPES.map(tt => {
          const count = tasks.filter(t => t.taskType === tt.value).length;
          const done = tasks.filter(t => t.taskType === tt.value && t.status === 'COMPLETED').length;
          const Icon = tt.icon;
          return (
            <div key={tt.value} style={{ padding: '12px 14px', border: `1px solid ${tt.color}25`, borderRadius: '12px', background: `${tt.color}08` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: tt.color }}>{count}</div>
                <Icon style={{ width: '16px', height: '16px', color: tt.color, opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, marginTop: '3px' }}>{tt.label}</div>
              <div style={{ fontSize: '10px', color: C.faint }}>{done} completed</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ ...INPUT, maxWidth: '220px' }}
          placeholder="Search tasks..."
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              ...FILTER_BTN,
              background: statusFilter === s ? C.text : '#f8fafc',
              color: statusFilter === s ? '#fff' : C.muted,
            }}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...INPUT, maxWidth: '160px' }}>
          <option value="ALL">All Types</option>
          {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Task list — grouped by type */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.faint }}>Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.faint }}>
          No tasks found. Create one to get started.
        </div>
      ) : (
        Object.entries(grouped).map(([type, typeTasks]) => {
          if (typeTasks.length === 0) return null;
          const meta = TASK_TYPES.find(t => t.value === type);
          const Icon = meta.icon;
          return (
            <div key={type} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Icon style={{ width: '14px', height: '14px', color: meta.color }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{meta.label}</span>
                <span style={{ fontSize: '11px', color: C.faint }}>({typeTasks.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {typeTasks.map(task => (
                  <AdminTaskRow
                    key={task.id}
                    task={task}
                    expanded={expandedTask === task.id}
                    onExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    teamMembers={teamMembers}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Create Task Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '540px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: C.text }}>Create New Task</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Task Type Selector */}
              <div>
                <label style={LABEL}>Task Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {TASK_TYPES.map(tt => {
                    const Icon = tt.icon;
                    const selected = form.taskType === tt.value;
                    return (
                      <button key={tt.value} onClick={() => setForm(f => ({ ...f, taskType: tt.value }))} style={{
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        border: `2px solid ${selected ? tt.color : C.border}`,
                        background: selected ? `${tt.color}10` : '#fafafa',
                        textAlign: 'left', fontFamily: 'inherit',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <Icon style={{ width: '13px', height: '13px', color: selected ? tt.color : C.faint }} />
                          <span style={{ fontSize: '12px', fontWeight: '700', color: selected ? tt.color : C.text }}>{tt.label}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: C.faint }}>{tt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={LABEL}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={INPUT} placeholder="Task title..." />
              </div>

              {/* Description */}
              <div>
                <label style={LABEL}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...INPUT, minHeight: '70px', resize: 'vertical' }} placeholder="What needs to be done..." />
              </div>

              {/* Priority + Due Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={LABEL}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={INPUT}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Due Date</label>
                  <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={INPUT} />
                </div>
              </div>

              {/* Target Value — for PLAYER_ADDITION / REVENUE_TARGET */}
              {['PLAYER_ADDITION', 'REVENUE_TARGET'].includes(form.taskType) && (
                <div>
                  <label style={LABEL}>
                    {form.taskType === 'PLAYER_ADDITION' ? 'Players to Add' : 'Revenue Target ($)'}
                    <span style={{ color: '#ef4444' }}> *</span>
                  </label>
                  <input
                    type="number" min="1"
                    value={form.targetValue}
                    onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                    style={INPUT}
                    placeholder={form.taskType === 'PLAYER_ADDITION' ? 'e.g. 5' : 'e.g. 1000'}
                  />
                </div>
              )}

              {/* Assign To */}
              <div>
                <label style={LABEL}>Assign To</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    <input
                      type="checkbox"
                      checked={form.assignToAll}
                      onChange={e => setForm(f => ({ ...f, assignToAll: e.target.checked, assignedToId: '' }))}
                    />
                    Assign to ALL members
                  </label>
                </div>
                {!form.assignToAll && (
                  <select value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))} style={INPUT}>
                    <option value="">Select member (or leave unassigned)</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                )}
              </div>

              {/* Daily toggle for DAILY_CHECKLIST */}
              {form.taskType === 'DAILY_CHECKLIST' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isDaily} onChange={e => setForm(f => ({ ...f, isDaily: e.target.checked }))} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Auto-reset daily</div>
                    <div style={{ fontSize: '11px', color: C.muted }}>Checklist resets every day automatically</div>
                  </div>
                </label>
              )}

              {/* Checklist Builder */}
              {['DAILY_CHECKLIST', 'STANDARD'].includes(form.taskType) && (
                <div>
                  <label style={LABEL}>Checklist Items</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                    {form.checklistItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          value={item.label}
                          onChange={e => setForm(f => ({ ...f, checklistItems: f.checklistItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it) }))}
                          style={{ ...INPUT, flex: 1 }}
                          placeholder={`Item ${i + 1}`}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600', color: C.muted, cursor: 'pointer', flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={item.required}
                            onChange={e => setForm(f => ({ ...f, checklistItems: f.checklistItems.map((it, idx) => idx === i ? { ...it, required: e.target.checked } : it) }))}
                          />
                          Req
                        </label>
                        <button onClick={() => setForm(f => ({ ...f, checklistItems: f.checklistItems.filter((_, idx) => idx !== i) }))} style={ICON_BTN}>
                          <X style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, checklistItems: [...f.checklistItems, { id: `item_${Date.now()}`, label: '', required: true, done: false }] }))}
                    style={{ fontSize: '12px', color: C.blue, background: 'none', border: `1px dashed ${C.blue}60`, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + Add checklist item
                  </button>
                </div>
              )}

              {/* Sub-task allocations */}
              {['PLAYER_ADDITION', 'REVENUE_TARGET'].includes(form.taskType) && (
                <div>
                  <label style={LABEL}>Member Allocations <span style={{ color: C.faint, fontWeight: '400' }}>(optional)</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                    {form.subTasks.map((st, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select
                          value={st.assignedToId}
                          onChange={e => setForm(f => ({ ...f, subTasks: f.subTasks.map((s, idx) => idx === i ? { ...s, assignedToId: e.target.value } : s) }))}
                          style={{ ...INPUT, flex: 2 }}
                        >
                          <option value="">Select member</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input
                          type="number"
                          value={st.targetValue}
                          onChange={e => setForm(f => ({ ...f, subTasks: f.subTasks.map((s, idx) => idx === i ? { ...s, targetValue: e.target.value } : s) }))}
                          style={{ ...INPUT, width: '100px' }}
                          placeholder={form.taskType === 'REVENUE_TARGET' ? '$200' : '1'}
                        />
                        <button onClick={() => setForm(f => ({ ...f, subTasks: f.subTasks.filter((_, idx) => idx !== i) }))} style={ICON_BTN}>
                          <X style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, subTasks: [...f.subTasks, { assignedToId: '', targetValue: '', label: '' }] }))}
                    style={{ fontSize: '12px', color: C.purple, background: 'none', border: `1px dashed ${C.purple}60`, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + Add allocation
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={LABEL}>Admin Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...INPUT, minHeight: '60px', resize: 'vertical' }} placeholder="Internal notes (not shown to members)..." />
              </div>

              {formError && <div style={{ padding: '10px 12px', background: '#fff1f2', border: `1px solid #fecaca`, borderRadius: '8px', fontSize: '13px', color: C.red }}>{formError}</div>}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => setShowForm(false)} style={{ ...BTN_SECONDARY, flex: 1 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ ...BTN_PRIMARY, flex: 2, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Creating...' : form.assignToAll ? 'Assign to All Members' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin task row component ─────────────────────────────────
function AdminTaskRow({ task, expanded, onExpand, onStatusChange, onDelete, teamMembers }) {
  const pMeta = { URGENT: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
  const tMeta = TASK_TYPES.find(t => t.value === task.taskType) || TASK_TYPES[0];
  const TypeIcon = tMeta.icon;
  const isCompleted = task.status === 'COMPLETED';

  const pct = task.targetValue > 0 ? Math.min(100, Math.round((task.currentValue / task.targetValue) * 100)) : null;
  const checklist = task.checklistItems || [];
  const checkedPct = checklist.length > 0 ? Math.round((checklist.filter(i => i.done).length / checklist.length) * 100) : null;

  return (
    <div style={{
      border: `1px solid ${isCompleted ? '#dcfce7' : C.border}`,
      borderLeft: `3px solid ${pMeta[task.priority] || C.border}`,
      borderRadius: '12px',
      background: isCompleted ? '#fafffe' : '#fff',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Status toggle */}
        <button onClick={() => onStatusChange(task.id, isCompleted ? 'PENDING' : 'COMPLETED')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          {isCompleted
            ? <CheckCircle style={{ width: '18px', height: '18px', color: '#22c55e' }} />
            : <Circle style={{ width: '18px', height: '18px', color: '#cbd5e1' }} />}
        </button>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: isCompleted ? C.faint : C.text, textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {task.title}
            </span>
            <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: `${tMeta.color}18`, color: tMeta.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TypeIcon style={{ width: '9px', height: '9px' }} /> {tMeta.label}
            </span>
            {task.assignToAll && (
              <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: '#f5f3ff', color: '#7c3aed' }}>
                All Members
              </span>
            )}
            {task.isDaily && (
              <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: '#eff6ff', color: '#2563eb' }}>
                Daily
              </span>
            )}
          </div>
          {task.assignedTo && (
            <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>
              → {task.assignedTo.name} ({task.assignedTo.role})
            </div>
          )}
        </div>

        {/* Progress indicators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {pct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '50px', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22c55e' : '#3b82f6', borderRadius: '999px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: pct >= 100 ? '#22c55e' : C.muted }}>{pct}%</span>
            </div>
          )}
          {checkedPct !== null && (
            <span style={{ fontSize: '11px', color: C.muted }}>
              {checklist.filter(i => i.done).length}/{checklist.length} ✓
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={onExpand} style={{ ...ICON_BTN, color: C.muted }}>
            {expanded ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
          </button>
          <button onClick={() => onDelete(task.id)} style={{ ...ICON_BTN, color: '#ef4444' }}>
            <Trash2 style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: `1px solid #f1f5f9`, padding: '12px 14px', background: '#fafbfc' }}>
          {task.description && <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 10px', lineHeight: '1.5' }}>{task.description}</p>}

          {/* Full progress bar */}
          {pct !== null && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, marginBottom: '3px' }}>
                <span>{task.taskType === 'REVENUE_TARGET' ? `$${task.currentValue} / $${task.targetValue}` : `${task.currentValue} / ${task.targetValue} players`}</span>
                <span style={{ fontWeight: '700', color: pct >= 100 ? '#22c55e' : C.text }}>{pct}%</span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22c55e' : '#3b82f6', borderRadius: '999px', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Sub-tasks */}
          {task.subTasks?.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Member Allocations
              </div>
              {task.subTasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ flex: 1, color: C.muted }}>{st.assignedTo?.name || 'Unassigned'}</span>
                  <span style={{ fontWeight: '600' }}>{st.currentValue} / {st.targetValue}</span>
                  {st.status === 'COMPLETED' && <CheckCircle style={{ width: '12px', height: '12px', color: '#22c55e' }} />}
                </div>
              ))}
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Checklist ({checklist.filter(i => i.done).length}/{checklist.length})
              </div>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '3px', color: item.done ? C.faint : C.text }}>
                  {item.done
                    ? <CheckCircle style={{ width: '12px', height: '12px', color: '#22c55e', flexShrink: 0 }} />
                    : <Circle style={{ width: '12px', height: '12px', color: '#cbd5e1', flexShrink: 0 }} />}
                  <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                  {item.required && <span style={{ color: '#ef4444', fontSize: '10px' }}>*</span>}
                </div>
              ))}
            </div>
          )}

          {/* Progress logs */}
          {task.progressLogs?.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Activity Log
              </div>
              {task.progressLogs.slice(0, 5).map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '11px', color: C.muted, marginBottom: '3px' }}>
                  <Zap style={{ width: '10px', height: '10px', color: '#8b5cf6', flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontWeight: '600', color: C.text }}>{log.user?.name}</span>
                  <span>{log.action?.replace(/_/g, ' ').toLowerCase()}</span>
                  {log.value > 0 && <span style={{ color: '#22c55e', fontWeight: '700' }}>+{log.value}</span>}
                  <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BTN_PRIMARY = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  padding: '9px 16px', background: '#0f172a', color: '#fff',
  border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
  cursor: 'pointer', fontFamily: 'inherit',
};

const BTN_SECONDARY = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', background: '#fff', color: '#374151',
  border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: 'inherit',
};

const FILTER_BTN = {
  padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.border}`,
  fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.15s',
};

const ICON_BTN = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
  borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
