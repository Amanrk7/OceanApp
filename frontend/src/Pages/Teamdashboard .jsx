import { useState, useEffect, useRef } from 'react';
import {
  LogIn, LogOut, CheckCircle, Clock, AlertCircle, RefreshCw,
  TrendingUp, DollarSign, Users, Activity, ChevronDown, ChevronUp,
  Wifi, WifiOff, Bell
} from 'lucide-react';
import TaskCard from './TaskCard';
import ShiftStartModal from './ShiftStartModal';
import ShiftEndModal from './ShiftEndModal';

// ─── Colours ───────────────────────────────────────────────────────────────
const C = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2',
  amber: '#d97706',
  amberBg: '#fffbeb',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtMoney(v) {
  const n = parseFloat(v) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start, end) {
  if (!start) return '—';
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color = C.blue, bg = C.blueBg }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '14px', padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: '18px', height: '18px', color }} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: C.faint, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: C.text, marginTop: '1px' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ online }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: online ? '#22c55e' : '#ef4444',
        boxShadow: online ? '0 0 0 2px #dcfce7' : 'none',
      }} />
      <span style={{ fontSize: '11px', color: C.muted }}>
        {online ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function TeamDashboard() {
  // ── Auth / user ──────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);

  // ── Shift state ──────────────────────────────────────────────
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [shiftError, setShiftError] = useState('');

  // ── Shift modals ─────────────────────────────────────────────
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [liveBalance, setLiveBalance] = useState(null);

  // ── Stats ─────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);

  // ── Tasks ─────────────────────────────────────────────────────
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'pending' | 'done'

  // ── SSE ───────────────────────────────────────────────────────
  const [sseOnline, setSseOnline] = useState(false);
  const sseRef = useRef(null);

  // ── Notifications ─────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);

  // ─── Bootstrap ────────────────────────────────────────────────
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadShift();
    loadTasks();
    connectSSE();
    return () => sseRef.current?.close();
  }, [currentUser]);

  // Poll shift stats every 30s while on shift
  useEffect(() => {
    if (!activeShift) return;
    loadShiftStats(activeShift.id);
    const iv = setInterval(() => loadShiftStats(activeShift.id), 30000);
    return () => clearInterval(iv);
  }, [activeShift?.id]);

  // ─── Data loaders ─────────────────────────────────────────────
  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || data.data);
      }
    } catch (_) {}
  }

  async function loadShift() {
    setShiftLoading(true);
    try {
      const res = await fetch('/api/shifts/active', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.data || null);
      } else {
        setActiveShift(null);
      }
    } catch (_) {
      setActiveShift(null);
    } finally {
      setShiftLoading(false);
    }
  }

  async function loadShiftStats(shiftId) {
    try {
      const res = await fetch(`/api/shifts/${shiftId}/stats`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.data || data);
      }
    } catch (_) {}
  }

  async function loadTasks() {
    setTasksLoading(true);
    try {
      const res = await fetch('/api/tasks?myTasks=true', { credentials: 'include' });
      const data = await res.json();
      setTasks(data.data || []);
    } catch (_) {}
    finally { setTasksLoading(false); }
  }

  // ─── SSE connection ───────────────────────────────────────────
  function connectSSE() {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource('/api/events', { withCredentials: true });
    sseRef.current = es;

    es.onopen = () => setSseOnline(true);
    es.onerror = () => setSseOnline(false);

    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        switch (type) {
          case 'task_created':
            setTasks(prev => {
              const exists = prev.find(t => t.id === data.id);
              if (exists) return prev.map(t => t.id === data.id ? data : t);
              if (data.assignToAll || data.assignedToId === currentUser?.id) {
                addNotification(`New task assigned: "${data.title}"`);
                return [data, ...prev];
              }
              return prev;
            });
            break;
          case 'task_updated':
            setTasks(prev => prev.map(t => t.id === data.id ? data : t));
            break;
          case 'task_deleted':
            setTasks(prev => prev.filter(t => t.id !== data.id));
            break;
          case 'shift_started':
            if (data.userId === currentUser?.id) setActiveShift(data);
            break;
          case 'shift_ended':
            if (data.userId === currentUser?.id) {
              setActiveShift(null);
              setStats(null);
            }
            break;
          default:
            break;
        }
      } catch (_) {}
    };
  }

  function addNotification(message) {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }

  // ─── Shift actions ────────────────────────────────────────────
  async function handleStartShift() {
    setStartingShift(true);
    setShiftError('');
    try {
      const res = await fetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start shift');

      const shift = data.data || data;
      setActiveShift(shift);

      // Fetch live balance and check if confirmation needed
      try {
        const [checkinRes, balRes] = await Promise.all([
          fetch(`/api/shifts/${shift.id}/checkin`, { credentials: 'include' }),
          fetch('/api/balance/live', { credentials: 'include' }),
        ]);
        const checkinData = await checkinRes.json();
        const balData = await balRes.json();
        setLiveBalance(balData.balance ?? balData.data?.balance ?? null);

        if (!checkinData.data?.balanceConfirmedAt) {
          setShowStartModal(true);
        }
      } catch (_) {
        // Balance check failed — show modal anyway
        setShowStartModal(true);
      }
    } catch (err) {
      setShiftError(err.message);
    } finally {
      setStartingShift(false);
    }
  }

  async function handleEndShift() {
    // Show the end-of-shift form modal instead of ending immediately
    setShowEndModal(true);
  }

  async function doEndShift() {
    setEndingShift(true);
    try {
      const res = await fetch('/api/shifts/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to end shift');
      }
      setActiveShift(null);
      setStats(null);
      setShowEndModal(false);
    } catch (err) {
      setShiftError(err.message);
    } finally {
      setEndingShift(false);
    }
  }

  // ─── Task handlers ────────────────────────────────────────────
  async function handleChecklistToggle(taskId, itemId, done) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId, done }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  async function handleStatusChange(taskId, status) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  async function handleProgressLog(taskId, value) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value, action: 'MANUAL_PROGRESS' }),
      });
      const data = await res.json();
      if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
    } catch (_) {}
  }

  // ─── Derived values ───────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status !== 'COMPLETED';
    if (taskFilter === 'done') return t.status === 'COMPLETED';
    return true;
  });

  const dailyTasks = filteredTasks.filter(t => t.taskType === 'DAILY_CHECKLIST');
  const otherTasks = filteredTasks.filter(t => t.taskType !== 'DAILY_CHECKLIST');
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdueCount = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
  ).length;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: C.text,
    }}>
      {/* ── Modals ── */}
      {showStartModal && activeShift && (
        <ShiftStartModal
          shift={activeShift}
          currentBalance={liveBalance}
          onConfirm={() => setShowStartModal(false)}
        />
      )}
      {showEndModal && activeShift && (
        <ShiftEndModal
          shift={activeShift}
          onSubmit={async () => {
            await doEndShift();
          }}
          onCancel={() => setShowEndModal(false)}
        />
      )}

      {/* ── Toast Notifications ── */}
      <div style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 9000,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            padding: '10px 16px', background: '#0f172a', color: '#fff',
            borderRadius: '10px', fontSize: '13px', fontWeight: '500',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Bell style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
            {n.message}
          </div>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity style={{ width: '14px', height: '14px', color: '#fff' }} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700' }}>Team Dashboard</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <StatusDot online={sseOnline} />
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: '#e0e7ff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#4338ca',
              }}>
                {(currentUser.name || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: C.muted }}>
                {currentUser.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Shift Card ── */}
        <div style={{
          background: activeShift
            ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
            : C.card,
          border: activeShift ? 'none' : `1px solid ${C.border}`,
          borderRadius: '18px',
          padding: '20px 24px',
          color: activeShift ? '#fff' : C.text,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              {shiftLoading ? (
                <div style={{ fontSize: '14px', opacity: 0.6 }}>Loading shift...</div>
              ) : activeShift ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
                      boxShadow: '0 0 0 3px rgba(34,197,94,0.3)',
                    }} />
                    <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Shift Active
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800' }}>
                    {fmtDuration(activeShift.startTime)}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>
                    Started at {fmtTime(activeShift.startTime)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>No Active Shift</div>
                  <div style={{ fontSize: '13px', color: C.muted, marginTop: '2px' }}>Start your shift to begin tracking</div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {activeShift && (
                <button
                  onClick={() => loadShiftStats(activeShift.id)}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', borderRadius: '10px', padding: '8px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: '600',
                  }}
                >
                  <RefreshCw style={{ width: '12px', height: '12px' }} />
                  Refresh
                </button>
              )}

              {activeShift ? (
                <button
                  onClick={handleEndShift}
                  disabled={endingShift}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none',
                    borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700',
                    cursor: endingShift ? 'not-allowed' : 'pointer', opacity: endingShift ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                  End Shift
                </button>
              ) : (
                <button
                  onClick={handleStartShift}
                  disabled={startingShift}
                  style={{
                    background: '#0f172a', color: '#fff', border: 'none',
                    borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700',
                    cursor: startingShift ? 'not-allowed' : 'pointer', opacity: startingShift ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <LogIn style={{ width: '14px', height: '14px' }} />
                  {startingShift ? 'Starting...' : 'Start Shift'}
                </button>
              )}
            </div>
          </div>

          {shiftError && (
            <div style={{
              marginTop: '12px', padding: '8px 12px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '8px',
              fontSize: '12px', color: '#dc2626',
            }}>
              {shiftError}
            </div>
          )}
        </div>

        {/* ── Stats grid (only while on shift) ── */}
        {activeShift && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            <KpiCard icon={TrendingUp} label="Net Profit" value={fmtMoney(stats.netProfit)}
              color={parseFloat(stats.netProfit) >= 0 ? C.green : C.red}
              bg={parseFloat(stats.netProfit) >= 0 ? C.greenBg : C.redBg} />
            <KpiCard icon={DollarSign} label="Deposits" value={fmtMoney(stats.totalDeposits)} color={C.green} bg={C.greenBg} />
            <KpiCard icon={DollarSign} label="Cashouts" value={fmtMoney(stats.totalCashouts)} color={C.red} bg={C.redBg} />
            <KpiCard icon={Users} label="Players Added" value={stats.playersAdded ?? 0} color={C.purple} bg={C.purpleBg} />
            <KpiCard icon={CheckCircle} label="Tasks Done" value={stats.tasksCompleted ?? 0} color={C.blue} bg={C.blueBg} />
            <KpiCard icon={Activity} label="Transactions" value={stats.transactionCount ?? 0} color={C.muted} bg={C.bg} />
          </div>
        )}

        {/* ── Tasks Section ── */}
        <div>
          {/* Tasks header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>My Tasks</h2>
              <span style={{
                padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                background: C.blueBg, color: C.blue,
              }}>
                {completedCount}/{tasks.length} done
              </span>
              {overdueCount > 0 && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                  background: C.redBg, color: C.red, display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <AlertCircle style={{ width: '10px', height: '10px' }} />
                  {overdueCount} overdue
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'pending', 'done'].map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    padding: '5px 12px', border: '1px solid',
                    borderColor: taskFilter === f ? '#0f172a' : C.border,
                    borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                    background: taskFilter === f ? '#0f172a' : C.card,
                    color: taskFilter === f ? '#fff' : C.muted,
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={loadTasks}
                style={{
                  padding: '5px 10px', border: `1px solid ${C.border}`,
                  borderRadius: '8px', background: C.card, cursor: 'pointer',
                  color: C.muted, display: 'flex', alignItems: 'center',
                }}
              >
                <RefreshCw style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          </div>

          {/* Tasks list */}
          {tasksLoading ? (
            <div style={{
              padding: '40px 0', textAlign: 'center', color: C.faint,
              fontSize: '13px',
            }}>
              <Clock style={{ width: '20px', height: '20px', margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{
              padding: '40px 24px', textAlign: 'center', color: C.faint,
              fontSize: '13px', background: C.card, borderRadius: '14px',
              border: `1px solid ${C.border}`,
            }}>
              <CheckCircle style={{ width: '24px', height: '24px', margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
              {taskFilter === 'done' ? 'No completed tasks yet' :
               taskFilter === 'pending' ? 'All tasks completed! 🎉' :
               'No tasks assigned to you'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Daily checklists always first */}
              {dailyTasks.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 2px' }}>
                    Daily Checklists
                  </div>
                  {dailyTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onChecklistToggle={handleChecklistToggle}
                      onProgressLog={handleProgressLog}
                      currentUserId={currentUser?.id}
                    />
                  ))}
                </>
              )}

              {/* Other tasks */}
              {otherTasks.length > 0 && (
                <>
                  {dailyTasks.length > 0 && (
                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 2px 0' }}>
                      Other Tasks
                    </div>
                  )}
                  {otherTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onChecklistToggle={handleChecklistToggle}
                      onProgressLog={handleProgressLog}
                      currentUserId={currentUser?.id}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
