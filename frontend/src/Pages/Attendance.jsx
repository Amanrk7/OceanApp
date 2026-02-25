import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { api } from '../api';

export default function Attendance() {
  // ===== STATE =====
  const [data, setData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    critical: 0,
    highlyCritical: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Active'); // Default: Active
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ===== LOAD DATA WHEN FILTER OR PAGE CHANGES =====
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        console.log('📥 Loading attendance for status:', filterStatus);

        // Fetch attendance data with current filter and page
        const result = await api.attendance.getAttendance(filterStatus, currentPage, itemsPerPage);

        // Set the data
        setData(result);

        // Set stats from backend (real counts from database)
        if (result.stats) {
          setStats({
            total: result.stats.total,
            active: result.stats.active,
            critical: result.stats.critical,
            highlyCritical: result.stats.highlyCritical,
            inactive: result.stats.inactive
          });
          console.log('✓ Stats updated:', result.stats);
        }
      } catch (error) {
        console.error('❌ Failed to load attendance:', error);
        // Set empty data on error
        setData({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [filterStatus, currentPage]); // ⭐ CRITICAL: Include filterStatus and currentPage

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  // ===== DATA EXTRACTION =====
  const allData = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  // ===== STATUS COLOR MAPPING =====
  const getStatusColor = (attendanceStatus) => {
    const colors = {
      'Active': { bg: '#dcfce7', text: '#166534', label: '✓ ACTIVE' },
      'Critical': { bg: '#fef3c7', text: '#92400e', label: '▲ CRITICAL' },
      'Highly-Critical': { bg: '#fee2e2', text: '#991b1b', label: '✕ HIGHLY CRITICAL' },
      'Inactive': { bg: '#e5e7eb', text: '#374151', label: '○ INACTIVE' }
    };
    return colors[attendanceStatus] || colors['Inactive'];
  };

  // ===== HANDLER FOR STATUS FILTER BUTTON =====
  const handleStatusFilter = (newStatus) => {
    console.log('🔄 Filter changed to:', newStatus);
    setFilterStatus(newStatus);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // ===== RENDER =====
  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        {/* <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Attendance Dashboard</h1> */}
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Filter players by current attendance status and recent activity.
        </p>
      </div>

      {/* Stats Cards - Click to Filter */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'ACTIVE', value: stats.active, color: '#10b981', bg: '#dcfce7', statusValue: 'Active' },
          { label: 'CRITICAL', value: stats.critical, color: '#f59e0b', bg: '#fef3c7', statusValue: 'Critical' },
          { label: 'HIGHLY CRITICAL', value: stats.highlyCritical, color: '#ef4444', bg: '#fee2e2', statusValue: 'Highly-Critical' },
          { label: 'INACTIVE', value: stats.inactive, color: '#64748b', bg: '#e5e7eb', statusValue: 'Inactive' }
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={() => handleStatusFilter(stat.statusValue)}
            style={{
              padding: '16px',
              background: stat.bg,
              border: `2px solid ${filterStatus === stat.statusValue ? stat.color : '#e2e8f0'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: filterStatus === stat.statusValue ? 1 : 0.7,
              transform: filterStatus === stat.statusValue ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: stat.color, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Player Status List */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>
          Player Status List
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          Based on each player's most recent deposit date.
        </p>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>Player</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allData.length > 0 ? (
                allData.map(player => {
                  const statusColor = getStatusColor(player.attendanceStatus || 'Inactive');

                  return (
                    <tr key={player.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                      {/* Player Column */}
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#6366f1',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {(player.name || player.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '13px' }}>
                            {player.name || player.username}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            ID: {player.id}
                          </div>
                        </div>
                      </td>

                      {/* Email Column */}
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                        {player.email}
                      </td>

                      {/* Status Column */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: statusColor.bg,
                          color: statusColor.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          {statusColor.label}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{
                          background: 'none',
                          border: 'none',
                          color: '#0ea5e9',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                          transition: 'color 0.2s'
                        }}
                          onMouseEnter={(e) => e.target.style.color = '#0b6ea8'}
                          onMouseLeave={(e) => e.target.style.color = '#0ea5e9'}
                        >
                          <Eye size={16} /> View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                    No players found with {filterStatus} status
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {allData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} results
          </p>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Previous Button */}
            {currentPage > 1 && (
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                style={{
                  padding: '6px 10px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#0ea5e9',
                  fontWeight: '600',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                ← Prev
              </button>
            )}

            {/* Page Numbers */}
            {Array.from({ length: Math.min(pagination.pages || 1, 10) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                style={{
                  padding: '6px 10px',
                  background: currentPage === i + 1 ? '#0ea5e9' : '#fff',
                  color: currentPage === i + 1 ? '#fff' : '#0ea5e9',
                  border: `1px solid ${currentPage === i + 1 ? '#0ea5e9' : '#e2e8f0'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                {i + 1}
              </button>
            ))}

            {/* Next Button */}
            {currentPage < (pagination.pages || 1) && (
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                style={{
                  padding: '6px 10px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#0ea5e9',
                  fontWeight: '600',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}