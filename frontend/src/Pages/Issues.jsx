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
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
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
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', marginBottom: '24px' }}>
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
              fontSize: '14px',
              color: filterTab === tab ? '#0ea5e9' : '#64748b',
              borderBottom: filterTab === tab ? '2px solid #0ea5e9' : 'none',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {tab === 'unresolved' ? 'UNRESOLVED' : 'SOLVED'}
          </button>
        ))}
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title.trim()) {
      setError('Issue title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      await api.issues.issues.createIssue({
        title: formData.title,
        description: formData.description,
        playerName: formData.playerName || null,
        priority: formData.priority
      });

      setSuccess('Issue submitted successfully!');

      // Reset form and close after short delay
      setTimeout(() => {
        if (onIssueCreated) {
          onIssueCreated();
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to submit issue');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '12px'
    }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Submit New Issue</h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
        Report and track player issues for resolution.
      </p>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div style={{
          padding: '12px 16px',
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '8px',
          color: '#166534',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: '#64748b', textTransform: 'uppercase' }}>
            Issue Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Brief title of the issue"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: '#64748b', textTransform: 'uppercase' }}>
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Detailed description of the issue"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              minHeight: '100px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Player & Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: '#64748b', textTransform: 'uppercase' }}>
              Player Name
            </label>
            <input
              type="text"
              name="playerName"
              value={formData.playerName}
              onChange={handleInputChange}
              placeholder="Enter player name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: '#64748b', textTransform: 'uppercase' }}>
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Submitting...' : '✓ Submit Issue'}
          </button>
        </div>
      </form>
    </div>
  );
}