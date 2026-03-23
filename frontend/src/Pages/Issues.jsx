import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { fmtTXDate, fmtTXTime } from '../utils/txTime';


export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('unresolved');
  const [showAddIssue, setShowAddIssue] = useState(false);

  // Load issues from backend
  useEffect(() => {
    const loadIssues = async () => {
      try {
        setLoading(true);
        const data = await api.issues.issues.getIssues(true);
        setIssues(data.data || []);
      } catch (error) {
        console.error('Failed to load issues:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIssues();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <p>Loading issues...</p>
      </div>
    );
  }

  const filtered = issues.filter(issue =>
    filterTab === 'unresolved'
      ? issue.status === 'UNRESOLVED' || issue.status === 'Unresolved'
      : issue.status === 'RESOLVED' || issue.status === 'Resolved'
  );

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': { bg: '#fee2e2', text: '#991b1b' },
      'MEDIUM': { bg: '#fef3c7', text: '#92400e' },
      'LOW': { bg: '#dcfce7', text: '#166534' },
      'High': { bg: '#fee2e2', text: '#991b1b' },
      'Medium': { bg: '#fef3c7', text: '#92400e' },
      'Low': { bg: '#dcfce7', text: '#166534' }
    };
    return colors[priority] || colors['MEDIUM'];
  };

  const handleMarkSolved = async (id) => {
    try {
      await api.issues.issues.resolveIssue(id);
      // Reload issues
      const data = await api.issues.issues.getIssues(true);
      setIssues(data.data || []);
    } catch (error) {
      console.error('Failed to resolve issue:', error);
    }
  };

  const handleIssueCreated = async () => {
    // Close the form and reload issues
    setShowAddIssue(false);
    try {
      const data = await api.issues.issues.getIssues(true);
      setIssues(data.data || []);
    } catch (error) {
      console.error('Failed to reload issues:', error);
    }
  };

  if (showAddIssue) {
    return <AddIssueForm onClose={() => setShowAddIssue(false)} onIssueCreated={handleIssueCreated} />;
  }

  return (
    <div >


      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '32px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        {['unresolved', 'resolved'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              color: filterTab === tab ? '#0ea5e9' : '#64748b',
              borderBottom: filterTab === tab ? '2px solid #0ea5e9' : 'none',
              borderBottomLeftRadius: '0px',
              borderBottomRightRadius: '0px',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {tab === 'unresolved' ? 'Unresolved' : 'Solved'}
          </button>
        ))}

        <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', width: '-webkit-fill-available' }}>
          {/* <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Issue Tracker</h1> */}
          <button
            onClick={() => setShowAddIssue(true)}
            style={{
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Submit Issue
          </button>
        </div>

      </div>

      {/* Issues List */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ fontSize: '14px' }}>
              {filterTab === 'unresolved' ? 'No unresolved issues' : 'No resolved issues'}
            </p>
          </div>
        ) : (
          filtered.map(issue => {
            const priorityColor = getPriorityColor(issue.priority);
            const issueDate = new Date(issue.createdAt || issue.date);
            const dateStr = fmtTXDate(issue.createdAt || issue.date) + ' ' + fmtTXTime(issue.createdAt || issue.date);
            // fmtTXDate(issue.createdAt |/| issue.date).

            return (
              <div
                key={issue.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                      {issue.title}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: priorityColor.bg,
                      color: priorityColor.text,
                      textTransform: 'uppercase'
                    }}>
                      {issue.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px 0' }}>
                    {issue.description}
                  </p>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '16px' }}>
                    <span>👤 {issue.playerName || 'Player'}</span>
                    <span>📅 {dateStr}</span>
                  </div>
                </div>

                {(filterTab === 'unresolved' && (issue.status === 'UNRESOLVED' || issue.status === 'Unresolved')) && (
                  <button
                    onClick={() => handleMarkSolved(issue.id)}
                    style={{
                      marginLeft: '16px',
                      padding: '8px 12px',
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      color: '#16a34a',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ✓ Mark as Solved
                  </button>
                )}
                {filterTab === 'resolved' && (
                  <div style={{
                    marginLeft: '16px',
                    padding: '6px 12px',
                    background: '#dcfce7',
                    borderRadius: '6px',
                    color: '#16a34a',
                    fontWeight: '600',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}>
                    ✓ SOLVED
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AddIssueForm({ onClose, onIssueCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    playerName: '',
    priority: 'MEDIUM'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!formData.title.trim()) { setError('Issue title is required'); return; }
    if (!formData.description.trim()) { setError('Description is required'); return; }
    try {
      setLoading(true);
      await api.issues.issues.createIssue({
        title: formData.title,
        description: formData.description,
        playerName: formData.playerName || null,
        priority: formData.priority
      });
      setSuccess('Issue submitted successfully!');
      setTimeout(() => { if (onIssueCreated) onIssueCreated(); }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: 'var(--color-input-bg, #fff)',
    color: 'var(--color-text, #0f172a)',
    outline: 'none',
    transition: 'border-color .15s',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '600',
    fontSize: '12px',
    marginBottom: '6px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };

  return (
    <>
      <style>{`
        .aif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) {
          .aif-grid { grid-template-columns: 1fr; }
          .aif-actions { flex-direction: column-reverse; }
          .aif-actions button { width: 100%; justify-content: center; }
        }
        .aif-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14,165,233,.15); }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        background: 'var(--color-cards, #fff)',
        borderRadius: '16px',
        border: '1px solid var(--color-border, #e2e8f0)',
        boxShadow: '0 4px 24px rgba(15,23,42,.07)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid var(--color-border, #e2e8f0)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 3px', color: 'var(--color-text, #0f172a)' }}>
              Submit New Issue
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Report and track player issues for resolution
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748b', fontSize: '16px', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'grid', gap: '16px' }}>

          {error && (
            <div style={{ padding: '11px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>⚠</span> {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '11px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>✓</span> {success}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>Issue Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              className="aif-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Brief title of the issue"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              className="aif-input"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of the issue…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '96px' }}
            />
          </div>

          {/* Player + Priority — stacks on mobile */}
          <div className="aif-grid">
            <div>
              <label style={labelStyle}>Player Name</label>
              <input
                className="aif-input"
                type="text"
                name="playerName"
                value={formData.playerName}
                onChange={handleInputChange}
                placeholder="Enter player name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                className="aif-input"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🔴 High</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="aif-actions" style={{
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px', background: 'var(--color-cards, #fff)',
                border: '1px solid #e2e8f0', borderRadius: '8px',
                fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px', color: '#64748b', opacity: loading ? 0.6 : 1,
                transition: 'all .15s',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px', background: loading ? '#7dd3fc' : '#0ea5e9',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background .15s',
              }}
            >
              {loading ? '⏳ Submitting…' : '✓ Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
