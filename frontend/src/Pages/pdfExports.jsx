/**
 * pdfExports.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional PDF export utilities for Players and Operations Reports.
 *
 * Usage:
 *   import { downloadPlayersPDF, printDailyReport, printRangeReport } from './pdfExports';
 *
 * Replace the three inline functions in Players.jsx and AdminReportPage.jsx with
 * these imports — no other changes needed in those files.
 *
 * Dependencies: jspdf, jspdf-autotable  (already in your project)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api'; // used only in downloadPlayersPDF

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE  (RGB arrays — jsPDF format)
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  // Neutrals
  navy:    [15,  23,  42],
  navyMd:  [30,  41,  59],
  slate:   [51,  65,  85],
  grayDk:  [71,  85, 105],
  gray:    [100,116, 139],
  muted:   [148,163, 184],
  light:   [203,213, 225],
  bgSoft:  [241,245, 249],
  bg:      [248,250, 252],
  white:   [255,255, 255],
  // Accents
  sky:     [14, 165, 233],
  blue:    [37,  99, 235],
  green:   [22, 163,  74],
  greenDk: [20,  83,  45],
  teal:    [15, 118, 110],
  amber:   [180, 83,   9],
  orange:  [194, 65,  12],
  red:     [220, 38,  38],
  redDk:   [153, 27,  27],
  violet:  [109, 40, 217],
  purple:  [124, 58, 237],
  pink:    [134, 25, 143],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════
const fmt$ = (n) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const fmtDateShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const genStamp = () =>
  new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' CDT';

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATORS  (mirror the helpers already in AdminReportPage)
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_LABEL = {
  TEAM1: 'Team 1', TEAM2: 'Team 2', TEAM3: 'Team 3', TEAM4: 'Team 4',
  TEAM5: 'Team 5', TEAM6: 'Team 6', TEAM7: 'Team 7', TEAM8: 'Team 8',
};

function aggExpenses(report) {
  const rows = [];
  (report.teams || []).forEach(team =>
    (team.shifts || []).forEach(shift =>
      (shift.expenses || []).forEach(e =>
        rows.push({
          ...e,
          _teamRole: team.role,
          _memberName: shift.displayMember?.name || team.member?.name || '—',
        })
      )
    )
  );
  return rows;
}

function aggTakeouts(report) {
  const rows = [];
  (report.teams || []).forEach(team =>
    (team.shifts || []).forEach(shift =>
      (shift.profitTakeouts || []).forEach(t =>
        rows.push({
          ...t,
          _teamRole: team.role,
          _memberName: shift.displayMember?.name || team.member?.name || '—',
        })
      )
    )
  );
  return rows;
}

function aggTransactions(report) {
  const rows = [];
  (report.teams || []).forEach(team =>
    (team.shifts || []).forEach(shift =>
      (shift.transactions || []).forEach(t =>
        rows.push({
          ...t,
          _teamRole: team.role,
          _memberName: shift.displayMember?.name || team.member?.name || '—',
        })
      )
    )
  );
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full-width branded header band.
 * @param {jsPDF} doc
 * @param {{ title: string, sub1?: string, sub2?: string, badge?: string|null }} opts
 */
function drawHeader(doc, { title, sub1, sub2, badge = 'CONFIDENTIAL' }) {
  const W = doc.internal.pageSize.width;
  // Dark navy band
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 40, 'F');
  // Sky-blue accent strip below
  doc.setFillColor(...C.sky);
  doc.rect(0, 40, W, 2.5, 'F');
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...C.white);
  doc.text(title, 14, 17);
  // Sub-lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  if (sub1) doc.text(sub1, 14, 27);
  if (sub2) doc.text(sub2, 14, 34);
  // Confidential badge (top-right)
  if (badge) {
    doc.setFillColor(...C.red);
    doc.roundedRect(W - 56, 9, 42, 13, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(badge, W - 35, 17, { align: 'center' });
  }
}

/**
 * Section heading: coloured left bar + title + thin rule.
 * @returns {number} Y after the section heading (ready for next content)
 */
function sectionHead(doc, title, y, accent = C.sky) {
  const W = doc.internal.pageSize.width;
  // Left accent rect
  doc.setFillColor(...accent);
  doc.rect(14, y, 3.5, 9, 'F');
  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.text(title, 21, y + 6.2);
  // Thin rule
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(21, y + 10, W - 14, y + 10);
  return y + 15;
}

/**
 * KPI card grid.
 * @param {jsPDF} doc
 * @param {Array<{label:string, value:string, color?:number[], sub?:string}>} items
 * @param {number} y  Starting Y
 * @param {number} cols  Cards per row (default 5)
 * @returns {number} Y after the grid
 */
function kpiGrid(doc, items, y, cols = 5) {
  const W = doc.internal.pageSize.width;
  const pad = 14;
  const gap = 2.5;
  const colW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const rowH = 21;
  const rows = Math.ceil(items.length / cols);

  items.forEach(({ label, value, color = C.blue, sub }, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (colW + gap);
    const ky = y + row * (rowH + gap);

    // Card background
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, ky, colW, rowH, 2, 2, 'FD');

    // Left accent strip
    doc.setFillColor(...color);
    doc.rect(x, ky, 3.5, rowH, 'F');
    doc.roundedRect(x, ky, 3.5, rowH, 1.5, 1.5, 'F'); // rounded left edge

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...color);
    doc.text(value, x + (colW + 3.5) / 2 + 1, ky + 10.5, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray);
    doc.text(label.toUpperCase(), x + (colW + 3.5) / 2 + 1, ky + 16, { align: 'center' });

    // Optional sub-text
    if (sub) {
      doc.setFontSize(5.8);
      doc.setTextColor(...C.muted);
      doc.text(sub, x + (colW + 3.5) / 2 + 1, ky + 19.5, { align: 'center' });
    }
  });

  return y + rows * (rowH + gap) + 3;
}

/**
 * Divider rule with optional label.
 */
function divider(doc, y, label = '') {
  const W = doc.internal.pageSize.width;
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  if (label) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(label, W / 2, y - 1, { align: 'center' });
  }
}

/**
 * Stamped footer on every page: thin rule + label left, page counter right.
 */
function addFooters(doc, reportType, rangeLabel) {
  const n = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    // Footer band
    doc.setFillColor(...C.bgSoft);
    doc.rect(0, H - 11, W, 11, 'F');
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.3);
    doc.line(0, H - 11, W, H - 11);
    // Left: report meta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`CONFIDENTIAL  ·  ${reportType}  ·  ${rangeLabel}  ·  Generated ${genStamp()}`, 14, H - 4);
    // Right: page counter
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text(`${i} / ${n}`, W - 14, H - 4, { align: 'right' });
  }
}

/** Shared autoTable defaults */
const tbl = (startY) => ({
  startY,
  margin: { left: 14, right: 14 },
  styles: {
    fontSize: 7.5,
    cellPadding: 3,
    overflow: 'ellipsize',
    font: 'helvetica',
    lineColor: C.light,
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: C.navy,
    textColor: C.white,
    fontStyle: 'bold',
    fontSize: 7.5,
    cellPadding: 3.5,
  },
  alternateRowStyles: { fillColor: C.bg },
  footStyles: {
    fillColor: C.bgSoft,
    textColor: C.navy,
    fontStyle: 'bold',
    lineColor: C.light,
    lineWidth: 0.3,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYERS DIRECTORY PDF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and download the Players Directory PDF.
 * Call signature matches the original downloadPlayersPDF in Players.jsx.
 */
export async function downloadPlayersPDF(filterTab, searchTerm) {
  const result = await api.players.getPlayers(1, 9999, searchTerm, filterTab === 'all' ? '' : filterTab);
  const players = result?.data || [];

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.width;

  // ── Header ────────────────────────────────────────────────────────────────
  drawHeader(doc, {
    title: 'Players Directory',
    sub1: [
      `Generated: ${genStamp()}`,
      `${players.length} player${players.length !== 1 ? 's' : ''} exported`,
    ].join('  ·  '),
    sub2: [
      filterTab !== 'all' ? `Status filter: ${filterTab}` : 'All statuses',
      searchTerm ? `Search: "${searchTerm}"` : null,
      'Internal use only — do not distribute',
    ].filter(Boolean).join('  ·  '),
  });

  // ── Summary KPIs ──────────────────────────────────────────────────────────
  const byStatus = players.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
  const byTier   = players.reduce((a, p) => { a[p.tier || 'BRONZE'] = (a[p.tier || 'BRONZE'] || 0) + 1; return a; }, {});
  const totalBal = players.reduce((s, p) => s + parseFloat(p.balance || 0), 0);
  const withSocials = players.filter(p => {
    const s = p.socials || {};
    return ['facebook','telegram','instagram','x','snapchat','email'].some(k => s[k]);
  }).length;

  const nextY = kpiGrid(doc, [
    { label: 'Total Players',         value: String(players.length),                                      color: C.blue },
    { label: 'Active',                value: String(byStatus.ACTIVE || 0),                                color: C.green,  sub: 'Status: Active' },
    { label: 'Critical / High Crit.', value: String((byStatus.CRITICAL || 0) + (byStatus.HIGHLY_CRITICAL || 0)), color: C.amber, sub: 'Needs attention' },
    { label: 'Inactive',              value: String(byStatus.INACTIVE || 0),                              color: C.red },
    { label: 'Unreachable',           value: String(byStatus.UNREACHABLE || 0),                           color: C.pink },
    { label: 'Suspended / Banned',    value: String((byStatus.SUSPENDED || 0) + (byStatus.BANNED || 0)),  color: C.purple },
    { label: 'Bronze Tier',           value: String(byTier.BRONZE || 0),                                  color: C.orange },
    { label: 'Silver Tier',           value: String(byTier.SILVER || 0),                                  color: C.blue },
    { label: 'Gold Tier',             value: String(byTier.GOLD || 0),                                    color: C.amber },
    { label: 'Total Balance on File', value: fmt$(totalBal),                                              color: C.teal, sub: `${withSocials} have social contacts` },
  ], 46, 5);

  // ── Player table ──────────────────────────────────────────────────────────
  const tableY = sectionHead(doc, 'Player Registry', nextY + 2, C.sky);

  const SOCIAL_KEYS = ['email', 'facebook', 'telegram', 'instagram', 'x', 'snapchat'];

  autoTable(doc, {
    ...tbl(tableY),
    head: [[
      '#', 'Full Name', 'Username', 'Email', 'Phone',
      'Tier', 'Status', 'Balance', 'Cashout Limit', 'Social Channels', 'Member Since',
    ]],
    body: players.map((p, i) => {
      const soc = p.socials || {};
      const present = SOCIAL_KEYS.filter(k => soc[k]).map(k => k === 'x' ? 'X/Twitter' : k.charAt(0).toUpperCase() + k.slice(1)).join(', ') || '—';
      return [
        i + 1,
        p.name || '—',
        `@${p.username || '—'}`,
        soc.email || p.email || '—',
        soc.phone || p.phone || '—',
        p.tier || 'BRONZE',
        (p.status || 'ACTIVE').replace('_', ' '),
        fmt$(p.balance),
        `$${parseFloat(p.cashoutLimit || 250).toFixed(0)}`,
        present,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
      ];
    }),
    foot: [[
      { content: `${players.length} players total`, colSpan: 7, styles: { halign: 'left' } },
      { content: fmt$(totalBal), styles: { textColor: C.green, fontStyle: 'bold', halign: 'right' } },
      '', '', '',
    ]],
    columnStyles: {
      0:  { cellWidth: 8,  halign: 'center', textColor: C.muted },
      5:  { cellWidth: 18 },
      6:  { cellWidth: 24 },
      7:  { cellWidth: 22, halign: 'right' },
      8:  { cellWidth: 22, halign: 'right' },
      10: { cellWidth: 26 },
    },
    // ── Color-code tier and status (correct approach: didParseCell) ──────────
    didParseCell(data) {
      if (data.section !== 'body') return;
      const raw  = data.cell.raw;
      const col  = data.column.index;

      if (col === 5) { // Tier
        const tc = { BRONZE: C.orange, SILVER: C.blue, GOLD: C.amber };
        if (tc[raw]) { data.cell.styles.textColor = tc[raw]; data.cell.styles.fontStyle = 'bold'; }
      }
      if (col === 6) { // Status
        const sc = {
          ACTIVE:          C.green,
          CRITICAL:        C.amber,
          'HIGHLY CRITICAL': C.orange,
          'HIGH CRIT.':    C.orange,
          INACTIVE:        C.red,
          UNREACHABLE:     C.pink,
          SUSPENDED:       C.red,
          BANNED:          C.purple,
        };
        if (sc[raw]) { data.cell.styles.textColor = sc[raw]; data.cell.styles.fontStyle = 'bold'; }
      }
      if (col === 7) {
        data.cell.styles.textColor = C.green;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooters(doc, 'Players Directory', filterTab !== 'all' ? `Filter: ${filterTab}` : 'All Players');
  doc.save(`players-export-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY OPERATIONS REPORT PDF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and download the Daily Operations Report PDF.
 * Drop-in replacement for printReport() in AdminReportPage.jsx.
 */
export function printDailyReport(report, date) {
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const s     = report.summary || {};
  const dayExp    = aggExpenses(report);
  const dayTake   = aggTakeouts(report);
  const dayTxns   = aggTransactions(report);
  const totalExp  = dayExp.reduce((a, e)  => a + parseFloat(e.amount   ?? 0), 0);
  const totalTake = dayTake.reduce((a, t)  => a + parseFloat(t.amount   ?? 0), 0);
  const totalPts  = dayExp.reduce((a, e)  => a + (e.pointsAdded ?? 0), 0);
  const totalDep  = dayTxns.filter(t => t.type === 'DEPOSIT').reduce((a, t) => a + parseFloat(t.amount ?? 0), 0);
  const totalCash = dayTxns.filter(t => t.type === 'WITHDRAWAL').reduce((a, t) => a + parseFloat(t.amount ?? 0), 0);
  const totalBonus = dayTxns.filter(t => !['DEPOSIT','WITHDRAWAL'].includes(t.type)).reduce((a, t) => a + parseFloat(t.amount ?? 0), 0);
  const playersAdded = (report.teams || []).reduce((a, t) =>
    a + (t.shifts || []).reduce((b, sh) => b + (sh.stats?.playersAdded || 0), 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 · Executive Summary
  // ─────────────────────────────────────────────────────────────────────────
  drawHeader(doc, {
    title: 'Daily Operations Report',
    sub1: fmtDate(date + 'T12:00:00'),
    sub2: `${s.totalShifts ?? 0} shift${(s.totalShifts ?? 0) !== 1 ? 's' : ''}  ·  ${s.transactionCount ?? 0} transactions  ·  Generated ${genStamp()}`,
  });

  const kpiY = kpiGrid(doc, [
    { label: 'Total Deposits',   value: fmt$(s.totalDeposits),  color: C.green,  sub: `${dayTxns.filter(t => t.type === 'DEPOSIT').length} transactions` },
    { label: 'Total Cashouts',   value: fmt$(s.totalCashouts),  color: C.red,    sub: `${dayTxns.filter(t => t.type === 'WITHDRAWAL').length} transactions` },
    { label: 'Total Bonuses',    value: fmt$(s.totalBonuses),   color: C.orange, sub: `given to players` },
    { label: 'Net Profit',       value: fmt$(s.netProfit),      color: (s.netProfit ?? 0) >= 0 ? C.green : C.red, sub: 'Deposits − Cashouts − Bonuses' },
    { label: 'Total Expenses',   value: fmt$(totalExp),         color: C.amber,  sub: `${dayExp.length} item${dayExp.length !== 1 ? 's' : ''}${totalPts > 0 ? ` · +${totalPts} pts` : ''}` },
    { label: 'Profit Takeouts',  value: fmt$(totalTake),        color: C.redDk,  sub: `${dayTake.length} record${dayTake.length !== 1 ? 's' : ''}` },
    { label: 'Active Shifts',    value: String(s.activeShifts ?? 0),    color: C.teal,  sub: `of ${s.totalShifts ?? 0} total` },
    { label: 'Tasks Completed',  value: String(s.tasksCompleted ?? 0),  color: C.blue },
    { label: 'Players Added',    value: String(playersAdded),           color: C.violet },
    { label: 'Total Transactions', value: String(s.transactionCount ?? 0), color: C.sky },
  ], 46, 5);

  // ── Member Shift Summary table ─────────────────────────────────────────
  let y = sectionHead(doc, 'Member Shift Summary', kpiY + 2, C.sky);

  const shiftRows = [];
  (report.teams || []).forEach(team => {
    (team.shifts || []).forEach(shift => {
      const st   = shift.stats || {};
      const name = shift.displayMember?.name || team.member?.name || shift.checkin?.user?.name || '—';
      shiftRows.push([
        name,
        ROLE_LABEL[team.role] || team.role,
        fmtTime(shift.startTime),
        shift.isActive ? 'ACTIVE NOW' : fmtTime(shift.endTime),
        shift.duration != null ? `${shift.duration} min` : 'Ongoing',
        st.transactionCount ?? 0,
        fmt$(st.totalDeposits),
        fmt$(st.totalCashouts),
        fmt$(st.netProfit),
        fmt$(st.totalBonuses),
        st.totalExpenses  > 0 ? fmt$(st.totalExpenses)  : '—',
        st.totalTakeouts  > 0 ? fmt$(st.totalTakeouts)  : '—',
        st.playersAdded   > 0 ? String(st.playersAdded) : '—',
        shift.checkin?.effortRating != null ? `${shift.checkin.effortRating} / 10` : '—',
      ]);
    });
  });

  autoTable(doc, {
    ...tbl(y),
    head: [[
      'Member', 'Role', 'Start', 'End', 'Duration', 'Txns',
      'Deposits', 'Cashouts', 'Net Profit', 'Bonuses',
      'Expenses', 'Takeouts', 'Players+', 'Effort',
    ]],
    body: shiftRows,
    columnStyles: {
      6:  { textColor: C.green,  fontStyle: 'bold', halign: 'right' },
      7:  { textColor: C.red,    fontStyle: 'bold', halign: 'right' },
      8:  { fontStyle: 'bold',   halign: 'right' },
      9:  { textColor: C.orange, halign: 'right' },
      10: { textColor: C.amber,  halign: 'right' },
      11: { textColor: C.redDk,  halign: 'right' },
      12: { halign: 'center' },
      13: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const col = data.column.index;
      if (col === 8) {
        const v = parseFloat((data.cell.raw || '').replace(/[$,]/g, '') || '0');
        data.cell.styles.textColor = v >= 0 ? C.green : C.red;
        data.cell.styles.fontStyle = 'bold';
      }
      if (col === 3 && data.cell.raw === 'ACTIVE NOW') {
        data.cell.styles.textColor = C.teal;
        data.cell.styles.fontStyle = 'bold';
      }
      if (col === 13) {
        const v = parseFloat(data.cell.raw || '0');
        if (v >= 8) data.cell.styles.textColor = C.green;
        else if (v >= 5) data.cell.styles.textColor = C.amber;
        else if (v > 0) data.cell.styles.textColor = C.red;
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 · Transactions
  // ─────────────────────────────────────────────────────────────────────────
  if (dayTxns.length > 0) {
    doc.addPage();
    drawHeader(doc, {
      title: 'Daily Operations Report  —  Transactions',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayTxns.length} total transactions  ·  Generated ${genStamp()}`,
      badge: null,
    });

    const txnKpiY = kpiGrid(doc, [
      { label: 'Total Deposits',   value: fmt$(totalDep),   color: C.green,  sub: `${dayTxns.filter(t => t.type === 'DEPOSIT').length} transactions` },
      { label: 'Total Cashouts',   value: fmt$(totalCash),  color: C.red,    sub: `${dayTxns.filter(t => t.type === 'WITHDRAWAL').length} transactions` },
      { label: 'Bonuses / Other',  value: fmt$(totalBonus), color: C.orange, sub: `${dayTxns.filter(t => !['DEPOSIT','WITHDRAWAL'].includes(t.type)).length} transactions` },
      { label: 'Net Position',     value: fmt$(totalDep - totalCash), color: totalDep - totalCash >= 0 ? C.green : C.red, sub: 'Deposits − Cashouts' },
      { label: 'Total Volume',     value: fmt$(totalDep + totalCash + totalBonus), color: C.blue },
    ], 46, 5);

    let txnY = sectionHead(doc, `All Transactions (${dayTxns.length})`, txnKpiY + 2, C.blue);

    autoTable(doc, {
      ...tbl(txnY),
      headStyles: { ...tbl(txnY).headStyles, fillColor: C.blue },
      head: [['Time', 'Member / Team', 'Player', 'Type', 'Game / Wallet', 'Amount', 'Fee', 'Bal. After', 'Status']],
      body: dayTxns.map(t => [
        fmtTime(t.createdAt),
        `${t._memberName} (${ROLE_LABEL[t._teamRole] || t._teamRole || '—'})`,
        t.user?.name || t.playerName || `#${t.userId || '?'}`,
        t.displayType || t.type,
        [t.gameName, t.walletMethod && `${t.walletMethod}${t.walletName ? ' · ' + t.walletName : ''}`].filter(Boolean).join(' / ') || '—',
        fmt$(t.amount),
        t.fee > 0 ? `-${fmt$(t.fee)}` : '—',
        t.balanceAfter != null ? fmt$(t.balanceAfter) : '—',
        t.status === 'PENDING' ? 'PENDING' : 'DONE',
      ]),
      foot: [[
        '', '', '', '',
        { content: 'TOTALS', styles: { fontStyle: 'bold' } },
        { content: `+${fmt$(totalDep)}  /  −${fmt$(totalCash)}`, styles: { fontStyle: 'bold', textColor: C.navy, halign: 'right' } },
        '', '', '',
      ]],
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'right', textColor: C.amber },
        7: { halign: 'right' },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        const col = data.column.index;
        if (col === 3) {
          const v = (data.cell.raw || '').toUpperCase();
          if (v.includes('DEPOSIT'))   { data.cell.styles.textColor = C.green;  data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('WITHDRAWAL') || v.includes('CASHOUT')) { data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('BONUS'))     { data.cell.styles.textColor = C.orange; data.cell.styles.fontStyle = 'bold'; }
        }
        if (col === 5) {
          // Can't easily know dep vs cash here — rely on column style
        }
        if (col === 8) {
          if (data.cell.raw === 'PENDING') { data.cell.styles.textColor = C.amber; data.cell.styles.fontStyle = 'bold'; }
          if (data.cell.raw === 'DONE')    { data.cell.styles.textColor = C.green; }
        }
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 3 · Expenses
  // ─────────────────────────────────────────────────────────────────────────
  if (dayExp.length > 0) {
    doc.addPage();
    const walletPaid = dayExp.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);

    drawHeader(doc, {
      title: 'Daily Operations Report  —  Expenses',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayExp.length} expense item${dayExp.length !== 1 ? 's' : ''}  ·  Total cost: ${fmt$(totalExp)}${totalPts > 0 ? `  ·  +${totalPts} pts reloaded` : ''}  ·  Wallet paid: ${fmt$(walletPaid)}`,
      badge: null,
    });

    // Category breakdown
    const byCat = dayExp.reduce((a, e) => {
      const c = (e.category || 'OTHER').replace(/_/g, ' ');
      a[c] = (a[c] || 0) + parseFloat(e.amount ?? 0);
      return a;
    }, {});

    const expKpiItems = [
      { label: 'Total Expense Cost', value: fmt$(totalExp),   color: C.amber, sub: `${dayExp.length} items` },
      { label: 'Wallet Paid Out',    value: fmt$(walletPaid), color: C.red },
      { label: 'Points Reloaded',    value: `+${totalPts} pts`, color: C.violet },
      { label: 'Unique Categories',  value: String(Object.keys(byCat).length), color: C.grayDk },
      ...Object.entries(byCat).slice(0, 6).map(([cat, v]) => ({
        label: cat, value: fmt$(v), color: C.amber,
        sub: `${dayExp.filter(e => (e.category || 'OTHER').replace(/_/g,'') === cat.replace(/ /g,'')).length} items`,
      })),
    ];

    const expKpiY = kpiGrid(doc, expKpiItems, 46, 5);
    let expY = sectionHead(doc, `Expense Records — ${dayExp.length} Items`, expKpiY + 2, C.amber);

    autoTable(doc, {
      ...tbl(expY),
      headStyles: { ...tbl(expY).headStyles, fillColor: C.amber },
      head: [['Time', 'Member / Team', 'Description / Details', 'Category', 'Game', 'Expense $', 'Pts Reloaded', 'Wallet Paid', 'Notes']],
      body: dayExp.map(e => [
        fmtTime(e.createdAt),
        `${e._memberName} (${ROLE_LABEL[e._teamRole] || e._teamRole || '—'})`,
        e.details || '—',
        (e.category || '—').replace(/_/g, ' '),
        e.game?.name || '—',
        fmt$(e.amount ?? 0),
        (e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—',
        parseFloat(e.paymentMade ?? 0) > 0 ? fmt$(e.paymentMade) : '—',
        e.notes || '—',
      ]),
      foot: [[
        '', '', '', '',
        { content: `TOTAL  (${dayExp.length} items)`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fmt$(totalExp),                    styles: { textColor: C.amber,  fontStyle: 'bold', halign: 'right' } },
        { content: totalPts > 0 ? `+${totalPts} pts` : '—', styles: { textColor: C.violet } },
        { content: walletPaid > 0 ? fmt$(walletPaid) : '—', styles: { textColor: C.red, fontStyle: 'bold', halign: 'right' } },
        '',
      ]],
      columnStyles: {
        5: { halign: 'right', textColor: C.amber, fontStyle: 'bold' },
        6: { halign: 'right', textColor: C.violet },
        7: { halign: 'right', textColor: C.red },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 4 · Profit Takeouts
  // ─────────────────────────────────────────────────────────────────────────
  if (dayTake.length > 0) {
    doc.addPage();
    const byMethod = dayTake.reduce((a, t) => { const m = t.method || 'Cash'; a[m] = (a[m] || 0) + parseFloat(t.amount ?? 0); return a; }, {});
    const byPerson = dayTake.reduce((a, t) => { const p = t.takenBy || '—'; if (!a[p]) a[p] = { total: 0, count: 0 }; a[p].total += parseFloat(t.amount ?? 0); a[p].count++; return a; }, {});

    drawHeader(doc, {
      title: 'Daily Operations Report  —  Profit Takeouts',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayTake.length} takeout record${dayTake.length !== 1 ? 's' : ''}  ·  Total taken: ${fmt$(totalTake)}  ·  ${Object.keys(byPerson).length} recipient${Object.keys(byPerson).length !== 1 ? 's' : ''}`,
      badge: null,
    });

    const takeKpis = [
      { label: 'Total Taken',  value: fmt$(totalTake), color: C.redDk,  sub: `${dayTake.length} records` },
      ...Object.entries(byMethod).map(([m, v]) => ({ label: `Via ${m}`, value: fmt$(v), color: C.red })),
      { label: 'Recipients',  value: String(Object.keys(byPerson).length), color: C.grayDk },
    ];
    const takeKpiY = kpiGrid(doc, takeKpis, 46, Math.min(takeKpis.length, 5));

    let takeY = sectionHead(doc, `Takeout Records — ${dayTake.length} Entries`, takeKpiY + 2, C.redDk);

    autoTable(doc, {
      ...tbl(takeY),
      headStyles: { ...tbl(takeY).headStyles, fillColor: C.redDk },
      head: [['Time', 'Member / Team', 'Taken By', 'Method', 'Amount', 'Wallet Reference', 'Notes']],
      body: dayTake.map(t => [
        fmtTime(t.takenAt || t._shiftTime),
        `${t._memberName} (${ROLE_LABEL[t._teamRole] || t._teamRole || '—'})`,
        t.takenBy,
        t.method || 'Cash',
        fmt$(t.amount),
        t.walletId ? `Wallet #${t.walletId}` : '—',
        t.notes || '—',
      ]),
      foot: [['', '', '', { content: 'TOTAL', styles: { fontStyle: 'bold' } },
        { content: fmt$(totalTake), styles: { textColor: C.redDk, fontStyle: 'bold', halign: 'right' } }, '', '']],
      columnStyles: {
        4: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
      },
    });

    // By-recipient breakdown
    if (Object.keys(byPerson).length > 1) {
      const afterY = doc.lastAutoTable?.finalY ?? takeY + 60;
      if (afterY + 50 < doc.internal.pageSize.height - 20) {
        const recY = sectionHead(doc, 'Breakdown by Recipient', afterY + 8, C.red);
        autoTable(doc, {
          ...tbl(recY),
          headStyles: { ...tbl(recY).headStyles, fillColor: C.red },
          head: [['Recipient', 'Records', 'Total Amount']],
          body: Object.entries(byPerson)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([person, { count, total }]) => [person, count, fmt$(total)]),
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 5 · Member Feedback (only if any shift has feedback)
  // ─────────────────────────────────────────────────────────────────────────
  const shiftsWithFeedback = (report.teams || []).flatMap(team =>
    (team.shifts || [])
      .filter(sh => sh.checkin?.effortRating || sh.checkin?.workSummary || sh.checkin?.issuesEncountered)
      .map(sh => ({ ...sh, _teamRole: team.role, _memberName: sh.displayMember?.name || team.member?.name || '—' }))
  );

  if (shiftsWithFeedback.length > 0) {
    doc.addPage();
    const avgEffort = shiftsWithFeedback
      .filter(sh => sh.checkin?.effortRating != null)
      .reduce((a, sh, _, arr) => a + sh.checkin.effortRating / arr.length, 0);

    drawHeader(doc, {
      title: 'Daily Operations Report  —  Member Feedback',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${shiftsWithFeedback.length} shift${shiftsWithFeedback.length !== 1 ? 's' : ''} with feedback  ·  Avg. effort: ${avgEffort.toFixed(1)} / 10`,
      badge: null,
    });

    let fbKpiY = kpiGrid(doc, [
      { label: 'Shifts w/ Feedback', value: String(shiftsWithFeedback.length), color: C.teal },
      { label: 'Avg. Effort Rating', value: `${avgEffort.toFixed(1)} / 10`,
        color: avgEffort >= 8 ? C.green : avgEffort >= 5 ? C.amber : C.red },
      { label: 'Rated ≥ 8 (Excellent)', value: String(shiftsWithFeedback.filter(sh => (sh.checkin?.effortRating ?? 0) >= 8).length), color: C.green },
      { label: 'Rated 5–7 (Moderate)',  value: String(shiftsWithFeedback.filter(sh => { const r = sh.checkin?.effortRating ?? 0; return r >= 5 && r < 8; }).length), color: C.amber },
      { label: 'Rated < 5 (Low)',       value: String(shiftsWithFeedback.filter(sh => (sh.checkin?.effortRating ?? 0) > 0 && (sh.checkin?.effortRating ?? 0) < 5).length), color: C.red },
    ], 46, 5);

    let fbY = sectionHead(doc, 'Shift-by-Shift Feedback', fbKpiY + 2, C.teal);

    autoTable(doc, {
      ...tbl(fbY),
      headStyles: { ...tbl(fbY).headStyles, fillColor: C.teal },
      head: [['Member', 'Role', 'Shift Time', 'Effort', 'Effort Reason / Notes', 'Work Summary', 'Issues Encountered']],
      body: shiftsWithFeedback.map(sh => {
        const ci = sh.checkin || {};
        return [
          sh._memberName,
          ROLE_LABEL[sh._teamRole] || sh._teamRole || '—',
          `${fmtTime(sh.startTime)} – ${sh.isActive ? 'Active' : fmtTime(sh.endTime)}`,
          ci.effortRating != null ? `${ci.effortRating} / 10` : '—',
          ci.additionalNotes || sh.effortReason || '—',
          ci.workSummary || '—',
          ci.issuesEncountered || '—',
        ];
      }),
      columnStyles: {
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        4: { cellWidth: 45 },
        5: { cellWidth: 50 },
        6: { cellWidth: 45 },
      },
      didParseCell(data) {
        if (data.section !== 'body' || data.column.index !== 3) return;
        const v = parseFloat(data.cell.raw || '0');
        if (v >= 8) data.cell.styles.textColor = C.green;
        else if (v >= 5) data.cell.styles.textColor = C.amber;
        else if (v > 0) data.cell.styles.textColor = C.red;
      },
    });
  }

  addFooters(doc, 'Daily Operations Report', fmtDate(date + 'T12:00:00'));
  doc.save(`report-${date}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANGE OPERATIONS REPORT PDF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and download the Range Operations Report PDF.
 * Drop-in replacement for printRangeReport() in AdminReportPage.jsx.
 */
export function printRangeReport(reports, startDate, endDate) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Aggregate totals across all days
  const totals = reports.reduce((acc, r) => {
    const s   = r.summary || {};
    const exp = aggExpenses(r);
    const tak = aggTakeouts(r);
    acc.deposits     += s.totalDeposits    || 0;
    acc.cashouts     += s.totalCashouts    || 0;
    acc.bonuses      += s.totalBonuses     || 0;
    acc.profit       += s.netProfit        || 0;
    acc.shifts       += s.totalShifts      || 0;
    acc.transactions += s.transactionCount || 0;
    acc.tasks        += s.tasksCompleted   || 0;
    acc.expenses     += exp.reduce((s, e) => s + parseFloat(e.amount    ?? 0), 0);
    acc.takeouts     += tak.reduce((s, t) => s + parseFloat(t.amount    ?? 0), 0);
    acc.ptsReloaded  += exp.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
    return acc;
  }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0, expenses: 0, takeouts: 0, ptsReloaded: 0 });

  const allExpenses  = reports.flatMap(r => aggExpenses(r).map(e  => ({ ...e,  _date: r.date })));
  const allTakeouts  = reports.flatMap(r => aggTakeouts(r).map(t  => ({ ...t,  _date: r.date })));
  const allTxns      = reports.flatMap(r => aggTransactions(r).map(t => ({ ...t, _date: r.date })));

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 · Executive Overview
  // ─────────────────────────────────────────────────────────────────────────
  drawHeader(doc, {
    title: 'Range Operations Report',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}  ·  ${reports.length} day${reports.length !== 1 ? 's' : ''}`,
    sub2: `${totals.shifts} shifts  ·  ${totals.transactions} transactions  ·  Generated ${genStamp()}`,
  });

  const kpiY = kpiGrid(doc, [
    { label: 'Total Deposits',    value: fmt$(totals.deposits),    color: C.green,  sub: `across ${reports.length} days` },
    { label: 'Total Cashouts',    value: fmt$(totals.cashouts),    color: C.red },
    { label: 'Total Bonuses',     value: fmt$(totals.bonuses),     color: C.orange },
    { label: 'Net Profit',        value: fmt$(totals.profit),      color: totals.profit >= 0 ? C.green : C.red, sub: 'Deposits − Cashouts − Bonuses' },
    { label: 'Total Expenses',    value: fmt$(totals.expenses),    color: C.amber,  sub: `${allExpenses.length} items${totals.ptsReloaded > 0 ? ` · +${totals.ptsReloaded} pts` : ''}` },
    { label: 'Profit Takeouts',   value: fmt$(totals.takeouts),    color: C.redDk,  sub: `${allTakeouts.length} records` },
    { label: 'Total Shifts',      value: String(totals.shifts),    color: C.grayDk },
    { label: 'Transactions',      value: String(totals.transactions), color: C.blue },
    { label: 'Tasks Completed',   value: String(totals.tasks),     color: C.teal },
    { label: 'Days Covered',      value: String(reports.length),   color: C.violet },
  ], 46, 5);

  // ── Day-by-Day Breakdown table ─────────────────────────────────────────
  let y = sectionHead(doc, 'Day-by-Day Breakdown', kpiY + 2, C.sky);

  autoTable(doc, {
    ...tbl(y),
    head: [['Date', 'Deposits', 'Cashouts', 'Bonuses', 'Net Profit', 'Expenses', 'Takeouts', 'Shifts', 'Transactions', 'Tasks', 'Active Shifts']],
    body: reports.map(r => {
      const s   = r.summary || {};
      const exp = aggExpenses(r).reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
      const tak = aggTakeouts(r).reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
      return [
        fmtDateShort(r.date + 'T12:00:00'),
        fmt$(s.totalDeposits),
        fmt$(s.totalCashouts),
        fmt$(s.totalBonuses),
        fmt$(s.netProfit),
        exp  > 0 ? fmt$(exp)  : '—',
        tak  > 0 ? fmt$(tak)  : '—',
        s.totalShifts      ?? 0,
        s.transactionCount ?? 0,
        s.tasksCompleted   ?? 0,
        s.activeShifts     ?? 0,
      ];
    }),
    foot: [[
      `TOTAL  (${reports.length} days)`,
      { content: fmt$(totals.deposits),    styles: { textColor: C.green,  fontStyle: 'bold', halign: 'right' } },
      { content: fmt$(totals.cashouts),    styles: { textColor: C.red,    fontStyle: 'bold', halign: 'right' } },
      { content: fmt$(totals.bonuses),     styles: { textColor: C.orange, fontStyle: 'bold', halign: 'right' } },
      { content: fmt$(totals.profit),      styles: { textColor: totals.profit >= 0 ? C.green : C.red, fontStyle: 'bold', halign: 'right' } },
      { content: totals.expenses > 0 ? fmt$(totals.expenses) : '—', styles: { textColor: C.amber, fontStyle: 'bold', halign: 'right' } },
      { content: totals.takeouts > 0 ? fmt$(totals.takeouts) : '—', styles: { textColor: C.redDk, fontStyle: 'bold', halign: 'right' } },
      { content: String(totals.shifts),       styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totals.transactions), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totals.tasks),        styles: { fontStyle: 'bold', halign: 'right' } },
      '',
    ]],
    columnStyles: {
      0:  { fontStyle: 'bold' },
      1:  { halign: 'right' },
      2:  { halign: 'right' },
      3:  { halign: 'right' },
      4:  { halign: 'right', fontStyle: 'bold' },
      5:  { halign: 'right' },
      6:  { halign: 'right' },
      7:  { halign: 'right' },
      8:  { halign: 'right' },
      9:  { halign: 'right' },
      10: { halign: 'right' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const col = data.column.index;
      if (col === 1) { data.cell.styles.textColor = C.green; }
      if (col === 2) { data.cell.styles.textColor = C.red;   }
      if (col === 4) {
        const v = parseFloat((data.cell.raw || '').replace(/[$,]/g, '') || '0');
        data.cell.styles.textColor = v >= 0 ? C.green : C.red;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 · Member Performance Summary
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, {
    title: 'Range Operations Report  —  Member Performance',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
    sub2: `Aggregated performance per team member across the full date range`,
    badge: null,
  });

  // Build member map
  const memberMap = {};
  reports.forEach(r => {
    (r.teams || []).forEach(team => {
      (team.shifts || []).forEach(shift => {
        const name = shift.displayMember?.name || team.member?.name || shift.checkin?.user?.name || '—';
        const key  = `${name}__${team.role}`;
        if (!memberMap[key]) {
          memberMap[key] = {
            name, role: team.role, shifts: 0, duration: 0, deposits: 0, cashouts: 0,
            bonuses: 0, profit: 0, expenses: 0, takeouts: 0, transactions: 0,
            playersAdded: 0, effortRatings: [],
          };
        }
        const m  = memberMap[key];
        const st = shift.stats || {};
        m.shifts++;
        m.duration     += shift.duration || 0;
        m.deposits     += st.totalDeposits    || 0;
        m.cashouts     += st.totalCashouts    || 0;
        m.bonuses      += st.totalBonuses     || 0;
        m.profit       += st.netProfit        || 0;
        m.expenses     += st.totalExpenses    || 0;
        m.takeouts     += st.totalTakeouts    || 0;
        m.transactions += st.transactionCount || 0;
        m.playersAdded += st.playersAdded     || 0;
        if (shift.checkin?.effortRating != null) m.effortRatings.push(shift.checkin.effortRating);
      });
    });
  });

  const memberRows = Object.values(memberMap).sort((a, b) => b.profit - a.profit);

  const memKpiY = kpiGrid(doc, [
    { label: 'Team Members',    value: String(memberRows.length),                                    color: C.blue },
    { label: 'Total Shifts',    value: String(totals.shifts),                                        color: C.grayDk },
    { label: 'Avg Shifts / Day', value: totals.shifts > 0 ? (totals.shifts / reports.length).toFixed(1) : '0', color: C.sky },
    { label: 'Best Profit',
      value: memberRows.length > 0 ? fmt$(Math.max(...memberRows.map(m => m.profit))) : '—',         color: C.green },
    { label: 'Total Players Added',
      value: String(memberRows.reduce((a, m) => a + m.playersAdded, 0)),                             color: C.violet },
  ], 46, 5);

  let memY = sectionHead(doc, `Member Performance — ${memberRows.length} Team Members`, memKpiY + 2, C.blue);

  autoTable(doc, {
    ...tbl(memY),
    headStyles: { ...tbl(memY).headStyles, fillColor: C.blue },
    head: [['Member', 'Role', 'Shifts', 'Total Time', 'Txns', 'Deposits', 'Cashouts', 'Net Profit', 'Bonuses', 'Expenses', 'Takeouts', 'Players+', 'Avg Effort']],
    body: memberRows.map(m => [
      m.name,
      ROLE_LABEL[m.role] || m.role,
      m.shifts,
      m.duration > 0 ? `${m.duration} min` : '—',
      m.transactions,
      fmt$(m.deposits),
      fmt$(m.cashouts),
      fmt$(m.profit),
      fmt$(m.bonuses),
      m.expenses > 0 ? fmt$(m.expenses) : '—',
      m.takeouts > 0 ? fmt$(m.takeouts) : '—',
      m.playersAdded > 0 ? String(m.playersAdded) : '—',
      m.effortRatings.length > 0
        ? `${(m.effortRatings.reduce((a, v) => a + v, 0) / m.effortRatings.length).toFixed(1)} / 10`
        : '—',
    ]),
    columnStyles: {
      2:  { halign: 'center' },
      3:  { halign: 'right' },
      4:  { halign: 'right' },
      5:  { halign: 'right', textColor: C.green,  fontStyle: 'bold' },
      6:  { halign: 'right', textColor: C.red,    fontStyle: 'bold' },
      7:  { halign: 'right', fontStyle: 'bold' },
      8:  { halign: 'right', textColor: C.orange },
      9:  { halign: 'right', textColor: C.amber  },
      10: { halign: 'right', textColor: C.redDk  },
      11: { halign: 'center', textColor: C.violet },
      12: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      if (data.column.index === 7) {
        const v = parseFloat((data.cell.raw || '').replace(/[$,]/g, '') || '0');
        data.cell.styles.textColor = v >= 0 ? C.green : C.red;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 12) {
        const v = parseFloat(data.cell.raw || '0');
        if (v >= 8) data.cell.styles.textColor = C.green;
        else if (v >= 5) data.cell.styles.textColor = C.amber;
        else if (v > 0) data.cell.styles.textColor = C.red;
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 3 · All Expenses
  // ─────────────────────────────────────────────────────────────────────────
  if (allExpenses.length > 0) {
    doc.addPage();
    const expTotal   = allExpenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    const walletPaid = allExpenses.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);
    const ptsTotal   = allExpenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);

    drawHeader(doc, {
      title: 'Range Operations Report  —  All Expenses',
      sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
      sub2: `${allExpenses.length} expense item${allExpenses.length !== 1 ? 's' : ''}  ·  Total: ${fmt$(expTotal)}  ·  Wallet paid: ${fmt$(walletPaid)}${ptsTotal > 0 ? `  ·  +${ptsTotal} pts reloaded` : ''}`,
      badge: null,
    });

    const byCat = allExpenses.reduce((a, e) => {
      const c = (e.category || 'OTHER').replace(/_/g, ' ');
      a[c] = (a[c] || 0) + parseFloat(e.amount ?? 0);
      return a;
    }, {});

    const expKpiY = kpiGrid(doc, [
      { label: 'Total Expense Cost',   value: fmt$(expTotal),   color: C.amber,  sub: `${allExpenses.length} items` },
      { label: 'Wallet Paid Out',      value: fmt$(walletPaid), color: C.red },
      { label: 'Points Reloaded',      value: `+${ptsTotal} pts`, color: C.violet },
      { label: 'Unique Categories',    value: String(Object.keys(byCat).length), color: C.grayDk },
      { label: 'Daily Average Cost',   value: fmt$(expTotal / reports.length), color: C.amber },
    ], 46, 5);

    let expY = sectionHead(doc, `Consolidated Expense Records — ${allExpenses.length} Items`, expKpiY + 2, C.amber);

    autoTable(doc, {
      ...tbl(expY),
      headStyles: { ...tbl(expY).headStyles, fillColor: C.amber },
      head: [['Date', 'Time', 'Member / Team', 'Description', 'Category', 'Game', 'Expense $', 'Pts Reloaded', 'Wallet Paid', 'Notes']],
      body: allExpenses.map(e => [
        fmtDateShort((e._date || '') + 'T12:00:00'),
        fmtTime(e.createdAt),
        `${e._memberName} (${ROLE_LABEL[e._teamRole] || e._teamRole || '—'})`,
        e.details || '—',
        (e.category || '—').replace(/_/g, ' '),
        e.game?.name || '—',
        fmt$(e.amount ?? 0),
        (e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—',
        parseFloat(e.paymentMade ?? 0) > 0 ? fmt$(e.paymentMade) : '—',
        e.notes || '—',
      ]),
      foot: [[
        { content: `${allExpenses.length} items total`, colSpan: 6, styles: { halign: 'left' } },
        { content: fmt$(expTotal),   styles: { textColor: C.amber,  fontStyle: 'bold', halign: 'right' } },
        { content: ptsTotal > 0 ? `+${ptsTotal} pts` : '—', styles: { textColor: C.violet, halign: 'right' } },
        { content: walletPaid > 0 ? fmt$(walletPaid) : '—', styles: { textColor: C.red,    fontStyle: 'bold', halign: 'right' } },
        '',
      ]],
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        6: { halign: 'right', textColor: C.amber, fontStyle: 'bold' },
        7: { halign: 'right', textColor: C.violet },
        8: { halign: 'right', textColor: C.red },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 4 · All Takeouts
  // ─────────────────────────────────────────────────────────────────────────
  if (allTakeouts.length > 0) {
    doc.addPage();
    const takeTotal = allTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const byMethod  = allTakeouts.reduce((a, t) => { const m = t.method || 'Cash'; a[m] = (a[m] || 0) + parseFloat(t.amount ?? 0); return a; }, {});
    const byPerson  = allTakeouts.reduce((a, t) => { const p = t.takenBy || '—'; if (!a[p]) a[p] = { total: 0, count: 0 }; a[p].total += parseFloat(t.amount ?? 0); a[p].count++; return a; }, {});

    drawHeader(doc, {
      title: 'Range Operations Report  —  Profit Takeouts',
      sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
      sub2: `${allTakeouts.length} records  ·  Total: ${fmt$(takeTotal)}  ·  ${Object.keys(byPerson).length} recipient${Object.keys(byPerson).length !== 1 ? 's' : ''}`,
      badge: null,
    });

    const takeKpis = [
      { label: 'Total Taken',       value: fmt$(takeTotal), color: C.redDk, sub: `${allTakeouts.length} records` },
      ...Object.entries(byMethod).map(([m, v]) => ({ label: `Via ${m}`, value: fmt$(v), color: C.red })),
      { label: 'Recipients',        value: String(Object.keys(byPerson).length), color: C.grayDk },
      { label: 'Daily Avg. Taken',  value: fmt$(takeTotal / reports.length), color: C.redDk },
    ];
    const takeKpiY = kpiGrid(doc, takeKpis, 46, Math.min(takeKpis.length, 5));

    // Recipient summary
    let recY = sectionHead(doc, 'Breakdown by Recipient', takeKpiY + 2, C.red);
    autoTable(doc, {
      ...tbl(recY),
      headStyles: { ...tbl(recY).headStyles, fillColor: C.red },
      head: [['Recipient', 'Total Records', 'Total Amount', '% of Total']],
      body: Object.entries(byPerson)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([person, { count, total }]) => [
          person, count, fmt$(total),
          `${((total / takeTotal) * 100).toFixed(1)}%`,
        ]),
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
        3: { halign: 'right', textColor: C.gray },
      },
    });

    // Full detail table
    const detailY = sectionHead(doc, `All Takeout Records — ${allTakeouts.length} Entries`, (doc.lastAutoTable?.finalY ?? recY + 30) + 8, C.redDk);
    autoTable(doc, {
      ...tbl(detailY),
      headStyles: { ...tbl(detailY).headStyles, fillColor: C.redDk },
      head: [['Date', 'Time', 'Member / Team', 'Taken By', 'Method', 'Amount', 'Wallet Reference', 'Notes']],
      body: allTakeouts.map(t => [
        fmtDateShort((t._date || '') + 'T12:00:00'),
        fmtTime(t.takenAt || t._shiftTime),
        `${t._memberName} (${ROLE_LABEL[t._teamRole] || t._teamRole || '—'})`,
        t.takenBy,
        t.method || 'Cash',
        fmt$(t.amount),
        t.walletId ? `Wallet #${t.walletId}` : '—',
        t.notes || '—',
      ]),
      foot: [[
        { content: `${allTakeouts.length} records`, colSpan: 4, styles: { halign: 'left' } },
        { content: 'TOTAL' },
        { content: fmt$(takeTotal), styles: { textColor: C.redDk, fontStyle: 'bold', halign: 'right' } },
        '', '',
      ]],
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        5: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 5 · Daily Shift Details (compact — one table per day)
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, {
    title: 'Range Operations Report  —  Daily Shift Details',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
    sub2: `Per-day shift breakdown for all team members`,
    badge: null,
  });

  let detY = 46;
  const H = doc.internal.pageSize.height;

  reports.forEach((r, rIdx) => {
    const allShifts = (r.teams || []).flatMap(team =>
      (team.shifts || []).map(sh => ({ ...sh, _teamRole: team.role, _memberName: sh.displayMember?.name || team.member?.name || '—' }))
    );
    if (allShifts.length === 0) return;

    // Need a new page if not enough space
    if (detY > H - 50 && rIdx > 0) {
      doc.addPage();
      detY = 14;
    }

    detY = sectionHead(doc, fmtDate(r.date + 'T12:00:00'), detY, rIdx % 2 === 0 ? C.sky : C.teal);

    autoTable(doc, {
      ...tbl(detY),
      styles: { ...tbl(detY).styles, fontSize: 7 },
      head: [['Member', 'Role', 'Start', 'End', 'Dur.', 'Txns', 'Deposits', 'Cashouts', 'Profit', 'Bonuses', 'Effort']],
      body: allShifts.map(sh => {
        const st = sh.stats || {};
        return [
          sh._memberName,
          ROLE_LABEL[sh._teamRole] || sh._teamRole || '—',
          fmtTime(sh.startTime),
          sh.isActive ? 'ACTIVE' : fmtTime(sh.endTime),
          sh.duration != null ? `${sh.duration}m` : '—',
          st.transactionCount ?? 0,
          fmt$(st.totalDeposits),
          fmt$(st.totalCashouts),
          fmt$(st.netProfit),
          fmt$(st.totalBonuses),
          sh.checkin?.effortRating != null ? `${sh.checkin.effortRating}/10` : '—',
        ];
      }),
      columnStyles: {
        6: { halign: 'right', textColor: C.green },
        7: { halign: 'right', textColor: C.red   },
        8: { halign: 'right', fontStyle: 'bold'  },
        9: { halign: 'right', textColor: C.orange },
        10:{ halign: 'center' },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        if (data.column.index === 8) {
          const v = parseFloat((data.cell.raw || '').replace(/[$,]/g, '') || '0');
          data.cell.styles.textColor = v >= 0 ? C.green : C.red;
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 3 && data.cell.raw === 'ACTIVE') {
          data.cell.styles.textColor = C.teal;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    detY = (doc.lastAutoTable?.finalY ?? detY + 20) + 6;
  });

  addFooters(
    doc,
    'Range Operations Report',
    `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}  ·  ${reports.length} days`
  );
  doc.save(`range-report-${startDate}-to-${endDate}.pdf`);
}
