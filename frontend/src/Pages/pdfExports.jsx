/**
 * pdfExports.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional PDF export utilities for Players, Operations, and Shift Reports.
 *
 * Exports:
 *   downloadPlayersPDF(filterTab, searchTerm)
 *   printDailyReport(report, date)
 *   printRangeReport(reports, startDate, endDate)
 *   printShiftPDF(shift)          ← NEW: replaces the HTML version in ShiftsPage
 *
 * Dependencies: jspdf, jspdf-autotable
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api';

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE  (RGB arrays — jsPDF format)
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
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

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const genStamp = () =>
  new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' CDT';

const r2 = (v) => Math.round((v ?? 0) * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Clip text to maxWidth mm with trailing ellipsis if needed. */
function fitText(doc, text, maxWidth) {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = '…';
  let t = text;
  while (t.length > 0 && doc.getTextWidth(t + ellipsis) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + ellipsis;
}

/** Wrap text to multiple lines, returning array of lines. */
function wrapText(doc, text, maxWidth) {
  if (!text) return [''];
  return doc.splitTextToSize(text, maxWidth);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATORS
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
        rows.push({ ...e, _teamRole: team.role, _memberName: shift.displayMember?.name || team.member?.name || '—' })
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
        rows.push({ ...t, _teamRole: team.role, _memberName: shift.displayMember?.name || team.member?.name || '—' })
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
        rows.push({ ...t, _teamRole: team.role, _memberName: shift.displayMember?.name || team.member?.name || '—' })
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
 */
function drawHeader(doc, { title, sub1, sub2, badge = 'CONFIDENTIAL' }) {
  const W = doc.internal.pageSize.width;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(...C.sky);
  doc.rect(0, 40, W, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...C.white);
  doc.text(title, 14, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  if (sub1) doc.text(fitText(doc, sub1, W - 80), 14, 27);
  if (sub2) doc.text(fitText(doc, sub2, W - 80), 14, 34);
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
 * Section heading with left accent bar and rule.
 * @returns {number} Y position after heading
 */
function sectionHead(doc, title, y, accent = C.sky) {
  const W = doc.internal.pageSize.width;
  doc.setFillColor(...accent);
  doc.rect(14, y, 3.5, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.text(title, 21, y + 6.2);
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(21, y + 10, W - 14, y + 10);
  return y + 15;
}

/**
 * KPI card grid — text is clipped to card width to prevent overflow.
 * @returns {number} Y position after the grid
 */
function kpiGrid(doc, items, y, cols = 5) {
  const W = doc.internal.pageSize.width;
  const pad = 14;
  const gap = 2.5;
  const colW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const rowH = 22;
  const rows = Math.ceil(items.length / cols);
  const textCenter = (x) => x + 3.5 + (colW - 3.5) / 2;

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
    doc.roundedRect(x, ky, 3.5, rowH, 1.5, 1.5, 'F');

    // Value — clipped
    const maxValW = colW - 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...color);
    const clippedVal = fitText(doc, value, maxValW);
    doc.text(clippedVal, textCenter(x), ky + 10, { align: 'center' });

    // Label — uppercase, clipped
    const maxLblW = colW - 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.gray);
    const clippedLbl = fitText(doc, label.toUpperCase(), maxLblW);
    doc.text(clippedLbl, textCenter(x), ky + 15.5, { align: 'center' });

    // Sub — smallest, clipped
    if (sub) {
      const maxSubW = colW - 6;
      doc.setFontSize(5.5);
      doc.setTextColor(...C.muted);
      const clippedSub = fitText(doc, sub, maxSubW);
      doc.text(clippedSub, textCenter(x), ky + 19.5, { align: 'center' });
    }
  });

  return y + rows * (rowH + gap) + 3;
}

/**
 * Status banner row (balanced / discrepancy).
 * @returns {number} Y after banner
 */
function statusBanner(doc, y, isOk, label, sub) {
  const W = doc.internal.pageSize.width;
  const h = 14;
  const bg = isOk ? [240, 253, 244] : [254, 242, 242];
  const border = isOk ? [134, 239, 172] : [252, 165, 165];
  const accent = isOk ? C.green : C.red;
  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, W - 28, h, 2, 2, 'FD');
  // Accent left strip
  doc.setFillColor(...accent);
  doc.rect(14, y, 3.5, h, 'F');
  // Icon + label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text((isOk ? '✓  ' : '⚠  ') + label, 21, y + 5.5);
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...(isOk ? C.greenDk : C.redDk));
    doc.text(fitText(doc, sub, W - 42), 21, y + 10.5);
  }
  return y + h + 4;
}

/**
 * Stamped footer on every page.
 */
function addFooters(doc, reportType, rangeLabel) {
  const n = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.bgSoft);
    doc.rect(0, H - 11, W, 11, 'F');
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.3);
    doc.line(0, H - 11, W, H - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`CONFIDENTIAL  ·  ${reportType}  ·  ${rangeLabel}  ·  Generated ${genStamp()}`, 14, H - 4);
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

export async function downloadPlayersPDF(filterTab, searchTerm) {
  const result = await api.players.getPlayers(1, 9999, searchTerm, filterTab === 'all' ? '' : filterTab);
  const players = result?.data || [];

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.width;

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

  const byStatus = players.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
  const byTier   = players.reduce((a, p) => { a[p.tier || 'BRONZE'] = (a[p.tier || 'BRONZE'] || 0) + 1; return a; }, {});
  const totalBal = players.reduce((s, p) => s + parseFloat(p.balance || 0), 0);
  const withSocials = players.filter(p => {
    const s = p.socials || {};
    return ['facebook','telegram','instagram','x','snapchat','email'].some(k => s[k]);
  }).length;

  const nextY = kpiGrid(doc, [
    { label: 'Total Players',         value: String(players.length),                                                color: C.blue },
    { label: 'Active',                value: String(byStatus.ACTIVE || 0),                                          color: C.green,  sub: 'Status: Active' },
    { label: 'Critical',              value: String((byStatus.CRITICAL || 0) + (byStatus.HIGHLY_CRITICAL || 0)),    color: C.amber,  sub: 'Needs attention' },
    { label: 'Inactive',              value: String(byStatus.INACTIVE || 0),                                        color: C.red },
    { label: 'Unreachable',           value: String(byStatus.UNREACHABLE || 0),                                     color: C.pink },
    { label: 'Suspended / Banned',    value: String((byStatus.SUSPENDED || 0) + (byStatus.BANNED || 0)),            color: C.purple },
    { label: 'Bronze Tier',           value: String(byTier.BRONZE || 0),                                            color: C.orange },
    { label: 'Silver Tier',           value: String(byTier.SILVER || 0),                                            color: C.blue },
    { label: 'Gold Tier',             value: String(byTier.GOLD || 0),                                              color: C.amber },
    { label: 'Total Balance on File', value: fmt$(totalBal),                                                        color: C.teal,   sub: `${withSocials} have contacts` },
  ], 46, 5);

  const tableY = sectionHead(doc, 'Player Registry', nextY + 2, C.sky);

  const SOCIAL_KEYS = ['email', 'facebook', 'telegram', 'instagram', 'x', 'snapchat'];

  autoTable(doc, {
    ...tbl(tableY),
    head: [['#', 'Full Name', 'Username', 'Email', 'Phone', 'Tier', 'Status', 'Balance', 'Cashout Limit', 'Social Channels', 'Member Since']],
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
    didParseCell(data) {
      if (data.section !== 'body') return;
      const raw = data.cell.raw;
      const col = data.column.index;
      if (col === 5) {
        const tc = { BRONZE: C.orange, SILVER: C.blue, GOLD: C.amber };
        if (tc[raw]) { data.cell.styles.textColor = tc[raw]; data.cell.styles.fontStyle = 'bold'; }
      }
      if (col === 6) {
        const sc = {
          ACTIVE: C.green, CRITICAL: C.amber, 'HIGHLY CRITICAL': C.orange,
          INACTIVE: C.red, UNREACHABLE: C.pink, SUSPENDED: C.red, BANNED: C.purple,
        };
        if (sc[raw]) { data.cell.styles.textColor = sc[raw]; data.cell.styles.fontStyle = 'bold'; }
      }
      if (col === 7) { data.cell.styles.textColor = C.green; data.cell.styles.fontStyle = 'bold'; }
    },
  });

  addFooters(doc, 'Players Directory', filterTab !== 'all' ? `Filter: ${filterTab}` : 'All Players');
  doc.save(`players-export-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY OPERATIONS REPORT PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function printDailyReport(report, date) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const s = report.summary || {};
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

  // ─── PAGE 1 · Executive Summary ──────────────────────────────────────────
  drawHeader(doc, {
    title: 'Daily Operations Report',
    sub1: fmtDate(date + 'T12:00:00'),
    sub2: `${s.totalShifts ?? 0} shift${(s.totalShifts ?? 0) !== 1 ? 's' : ''}  ·  ${s.transactionCount ?? 0} transactions  ·  Generated ${genStamp()}`,
  });

  const kpiY = kpiGrid(doc, [
    { label: 'Total Deposits',     value: fmt$(s.totalDeposits),  color: C.green,  sub: `${dayTxns.filter(t => t.type === 'DEPOSIT').length} txns` },
    { label: 'Total Cashouts',     value: fmt$(s.totalCashouts),  color: C.red,    sub: `${dayTxns.filter(t => t.type === 'WITHDRAWAL').length} txns` },
    { label: 'Total Bonuses',      value: fmt$(s.totalBonuses),   color: C.orange, sub: 'given to players' },
    { label: 'Net Profit',         value: fmt$(s.netProfit),      color: (s.netProfit ?? 0) >= 0 ? C.green : C.red, sub: 'Dep − Cash − Bonus' },
    { label: 'Total Expenses',     value: fmt$(totalExp),         color: C.amber,  sub: `${dayExp.length} items${totalPts > 0 ? ` · +${totalPts}pts` : ''}` },
    { label: 'Profit Takeouts',    value: fmt$(totalTake),        color: C.redDk,  sub: `${dayTake.length} records` },
    { label: 'Active Shifts',      value: String(s.activeShifts ?? 0),    color: C.teal,   sub: `of ${s.totalShifts ?? 0} total` },
    { label: 'Tasks Completed',    value: String(s.tasksCompleted ?? 0),  color: C.blue },
    { label: 'Players Added',      value: String(playersAdded),           color: C.violet },
    { label: 'Total Transactions', value: String(s.transactionCount ?? 0), color: C.sky },
  ], 46, 5);

  let y = sectionHead(doc, 'Member Shift Summary', kpiY + 2, C.sky);

  const shiftRows = [];
  (report.teams || []).forEach(team => {
    (team.shifts || []).forEach(shift => {
      const st = shift.stats || {};
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
    head: [['Member', 'Role', 'Start', 'End', 'Duration', 'Txns', 'Deposits', 'Cashouts', 'Net Profit', 'Bonuses', 'Expenses', 'Takeouts', 'Players+', 'Effort']],
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

  // ─── PAGE 2 · Transactions ───────────────────────────────────────────────
  if (dayTxns.length > 0) {
    doc.addPage();
    drawHeader(doc, {
      title: 'Daily Operations Report  —  Transactions',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayTxns.length} total transactions  ·  Generated ${genStamp()}`,
      badge: null,
    });

    const txnKpiY = kpiGrid(doc, [
      { label: 'Total Deposits',  value: fmt$(totalDep),              color: C.green,  sub: `${dayTxns.filter(t => t.type === 'DEPOSIT').length} txns` },
      { label: 'Total Cashouts',  value: fmt$(totalCash),             color: C.red,    sub: `${dayTxns.filter(t => t.type === 'WITHDRAWAL').length} txns` },
      { label: 'Bonuses / Other', value: fmt$(totalBonus),            color: C.orange, sub: `${dayTxns.filter(t => !['DEPOSIT','WITHDRAWAL'].includes(t.type)).length} txns` },
      { label: 'Net Position',    value: fmt$(totalDep - totalCash),  color: totalDep - totalCash >= 0 ? C.green : C.red, sub: 'Deposits − Cashouts' },
      { label: 'Total Volume',    value: fmt$(totalDep + totalCash + totalBonus), color: C.blue },
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
          if (v.includes('DEPOSIT'))    { data.cell.styles.textColor = C.green;  data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('WITHDRAWAL') || v.includes('CASHOUT')) { data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('BONUS'))      { data.cell.styles.textColor = C.orange; data.cell.styles.fontStyle = 'bold'; }
        }
        if (col === 8) {
          if (data.cell.raw === 'PENDING') { data.cell.styles.textColor = C.amber; data.cell.styles.fontStyle = 'bold'; }
          if (data.cell.raw === 'DONE')    { data.cell.styles.textColor = C.green; }
        }
      },
    });
  }

  // ─── PAGE 3 · Expenses ───────────────────────────────────────────────────
  if (dayExp.length > 0) {
    doc.addPage();
    const walletPaid = dayExp.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);
    drawHeader(doc, {
      title: 'Daily Operations Report  —  Expenses',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayExp.length} items  ·  Total: ${fmt$(totalExp)}${totalPts > 0 ? `  ·  +${totalPts} pts` : ''}  ·  Wallet paid: ${fmt$(walletPaid)}`,
      badge: null,
    });

    const byCat = dayExp.reduce((a, e) => {
      const c = (e.category || 'OTHER').replace(/_/g, ' ');
      a[c] = (a[c] || 0) + parseFloat(e.amount ?? 0);
      return a;
    }, {});

    const expKpiItems = [
      { label: 'Total Expense Cost', value: fmt$(totalExp),              color: C.amber,  sub: `${dayExp.length} items` },
      { label: 'Wallet Paid Out',    value: fmt$(walletPaid),            color: C.red },
      { label: 'Points Reloaded',    value: `+${totalPts} pts`,          color: C.violet },
      { label: 'Unique Categories',  value: String(Object.keys(byCat).length), color: C.grayDk },
      ...Object.entries(byCat).slice(0, 6).map(([cat, v]) => ({
        label: cat.length > 14 ? cat.slice(0, 13) + '…' : cat,
        value: fmt$(v), color: C.amber,
        sub: `${dayExp.filter(e => (e.category || 'OTHER').replace(/_/g,'') === cat.replace(/ /g,'')).length} items`,
      })),
    ];

    const expKpiY = kpiGrid(doc, expKpiItems, 46, 5);
    let expY = sectionHead(doc, `Expense Records — ${dayExp.length} Items`, expKpiY + 2, C.amber);

    autoTable(doc, {
      ...tbl(expY),
      headStyles: { ...tbl(expY).headStyles, fillColor: C.amber },
      head: [['Time', 'Member / Team', 'Description', 'Category', 'Game', 'Expense $', 'Pts Reloaded', 'Wallet Paid', 'Notes']],
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
        { content: fmt$(totalExp),   styles: { textColor: C.amber,  fontStyle: 'bold', halign: 'right' } },
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

  // ─── PAGE 4 · Profit Takeouts ────────────────────────────────────────────
  if (dayTake.length > 0) {
    doc.addPage();
    const byMethod = dayTake.reduce((a, t) => { const m = t.method || 'Cash'; a[m] = (a[m] || 0) + parseFloat(t.amount ?? 0); return a; }, {});
    const byPerson = dayTake.reduce((a, t) => { const p = t.takenBy || '—'; if (!a[p]) a[p] = { total: 0, count: 0 }; a[p].total += parseFloat(t.amount ?? 0); a[p].count++; return a; }, {});

    drawHeader(doc, {
      title: 'Daily Operations Report  —  Profit Takeouts',
      sub1: fmtDate(date + 'T12:00:00'),
      sub2: `${dayTake.length} records  ·  Total: ${fmt$(totalTake)}  ·  ${Object.keys(byPerson).length} recipient(s)`,
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

    if (Object.keys(byPerson).length > 1) {
      const afterY = doc.lastAutoTable?.finalY ?? takeY + 60;
      if (afterY + 50 < doc.internal.pageSize.height - 20) {
        const recY = sectionHead(doc, 'Breakdown by Recipient', afterY + 8, C.red);
        autoTable(doc, {
          ...tbl(recY),
          headStyles: { ...tbl(recY).headStyles, fillColor: C.red },
          head: [['Recipient', 'Records', 'Total Amount']],
          body: Object.entries(byPerson).sort((a, b) => b[1].total - a[1].total)
            .map(([person, { count, total }]) => [person, count, fmt$(total)]),
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
          },
        });
      }
    }
  }

  // ─── PAGE 5 · Member Feedback ────────────────────────────────────────────
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
      sub2: `${shiftsWithFeedback.length} shift(s) with feedback  ·  Avg effort: ${avgEffort.toFixed(1)} / 10`,
      badge: null,
    });

    const fbKpiY = kpiGrid(doc, [
      { label: 'Shifts w/ Feedback',   value: String(shiftsWithFeedback.length), color: C.teal },
      { label: 'Avg. Effort Rating',   value: `${avgEffort.toFixed(1)} / 10`, color: avgEffort >= 8 ? C.green : avgEffort >= 5 ? C.amber : C.red },
      { label: 'Excellent (≥ 8)',       value: String(shiftsWithFeedback.filter(sh => (sh.checkin?.effortRating ?? 0) >= 8).length), color: C.green },
      { label: 'Moderate (5–7)',        value: String(shiftsWithFeedback.filter(sh => { const r = sh.checkin?.effortRating ?? 0; return r >= 5 && r < 8; }).length), color: C.amber },
      { label: 'Low (< 5)',             value: String(shiftsWithFeedback.filter(sh => (sh.checkin?.effortRating ?? 0) > 0 && (sh.checkin?.effortRating ?? 0) < 5).length), color: C.red },
    ], 46, 5);

    let fbY = sectionHead(doc, 'Shift-by-Shift Feedback', fbKpiY + 2, C.teal);

    autoTable(doc, {
      ...tbl(fbY),
      headStyles: { ...tbl(fbY).headStyles, fillColor: C.teal },
      head: [['Member', 'Role', 'Shift Time', 'Effort', 'Reason / Notes', 'Work Summary', 'Issues Encountered']],
      body: shiftsWithFeedback.map(sh => {
        const ci = sh.checkin || {};
        // Parse additionalNotes JSON for extended feedback fields
        let parsedNotes = {};
        try { parsedNotes = JSON.parse(ci.additionalNotes ?? '{}'); } catch(_) {}
        return [
          sh._memberName,
          ROLE_LABEL[sh._teamRole] || sh._teamRole || '—',
          `${fmtTime(sh.startTime)} – ${sh.isActive ? 'Active' : fmtTime(sh.endTime)}`,
          ci.effortRating != null ? `${ci.effortRating} / 10` : '—',
          parsedNotes.effortReason || ci.additionalNotes?.startsWith('{') ? (parsedNotes.effortReason || '—') : (ci.additionalNotes || '—'),
          parsedNotes.workSummary || ci.workSummary || '—',
          parsedNotes.issuesEncountered || ci.issuesEncountered || '—',
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

export function printRangeReport(reports, startDate, endDate) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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
    acc.expenses     += exp.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    acc.takeouts     += tak.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    acc.ptsReloaded  += exp.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
    return acc;
  }, { deposits: 0, cashouts: 0, bonuses: 0, profit: 0, shifts: 0, transactions: 0, tasks: 0, expenses: 0, takeouts: 0, ptsReloaded: 0 });

  const allExpenses  = reports.flatMap(r => aggExpenses(r).map(e  => ({ ...e,  _date: r.date })));
  const allTakeouts  = reports.flatMap(r => aggTakeouts(r).map(t  => ({ ...t,  _date: r.date })));

  // ─── PAGE 1 · Executive Overview ─────────────────────────────────────────
  drawHeader(doc, {
    title: 'Range Operations Report',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}  ·  ${reports.length} day${reports.length !== 1 ? 's' : ''}`,
    sub2: `${totals.shifts} shifts  ·  ${totals.transactions} transactions  ·  Generated ${genStamp()}`,
  });

  const kpiY = kpiGrid(doc, [
    { label: 'Total Deposits',   value: fmt$(totals.deposits),    color: C.green,  sub: `across ${reports.length} days` },
    { label: 'Total Cashouts',   value: fmt$(totals.cashouts),    color: C.red },
    { label: 'Total Bonuses',    value: fmt$(totals.bonuses),     color: C.orange },
    { label: 'Net Profit',       value: fmt$(totals.profit),      color: totals.profit >= 0 ? C.green : C.red, sub: 'Dep − Cash − Bonus' },
    { label: 'Total Expenses',   value: fmt$(totals.expenses),    color: C.amber,  sub: `${allExpenses.length} items${totals.ptsReloaded > 0 ? ` · +${totals.ptsReloaded}pts` : ''}` },
    { label: 'Profit Takeouts',  value: fmt$(totals.takeouts),    color: C.redDk,  sub: `${allTakeouts.length} records` },
    { label: 'Total Shifts',     value: String(totals.shifts),    color: C.grayDk },
    { label: 'Transactions',     value: String(totals.transactions), color: C.blue },
    { label: 'Tasks Completed',  value: String(totals.tasks),     color: C.teal },
    { label: 'Days Covered',     value: String(reports.length),   color: C.violet },
  ], 46, 5);

  let y = sectionHead(doc, 'Day-by-Day Breakdown', kpiY + 2, C.sky);

  autoTable(doc, {
    ...tbl(y),
    head: [['Date', 'Deposits', 'Cashouts', 'Bonuses', 'Net Profit', 'Expenses', 'Takeouts', 'Shifts', 'Transactions', 'Tasks', 'Active']],
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
      { content: String(totals.shifts),        styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totals.transactions),  styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totals.tasks),         styles: { fontStyle: 'bold', halign: 'right' } },
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

  // ─── PAGE 2 · Member Performance ─────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, {
    title: 'Range Operations Report  —  Member Performance',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
    sub2: 'Aggregated performance per team member across the full date range',
    badge: null,
  });

  const memberMap = {};
  reports.forEach(r => {
    (r.teams || []).forEach(team => {
      (team.shifts || []).forEach(shift => {
        const name = shift.displayMember?.name || team.member?.name || shift.checkin?.user?.name || '—';
        const key  = `${name}__${team.role}`;
        if (!memberMap[key]) {
          memberMap[key] = { name, role: team.role, shifts: 0, duration: 0, deposits: 0, cashouts: 0, bonuses: 0, profit: 0, expenses: 0, takeouts: 0, transactions: 0, playersAdded: 0, effortRatings: [] };
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
    { label: 'Team Members',      value: String(memberRows.length),                                                    color: C.blue },
    { label: 'Total Shifts',      value: String(totals.shifts),                                                        color: C.grayDk },
    { label: 'Avg Shifts / Day',  value: totals.shifts > 0 ? (totals.shifts / reports.length).toFixed(1) : '0',        color: C.sky },
    { label: 'Best Profit',       value: memberRows.length > 0 ? fmt$(Math.max(...memberRows.map(m => m.profit))) : '—', color: C.green },
    { label: 'Total Players+',    value: String(memberRows.reduce((a, m) => a + m.playersAdded, 0)),                    color: C.violet },
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

  // ─── PAGE 3 · All Expenses ────────────────────────────────────────────────
  if (allExpenses.length > 0) {
    doc.addPage();
    const expTotal   = allExpenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    const walletPaid = allExpenses.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0);
    const ptsTotal   = allExpenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);

    drawHeader(doc, {
      title: 'Range Operations Report  —  All Expenses',
      sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
      sub2: `${allExpenses.length} items  ·  Total: ${fmt$(expTotal)}  ·  Wallet paid: ${fmt$(walletPaid)}${ptsTotal > 0 ? `  ·  +${ptsTotal} pts` : ''}`,
      badge: null,
    });

    const byCat = allExpenses.reduce((a, e) => {
      const c = (e.category || 'OTHER').replace(/_/g, ' ');
      a[c] = (a[c] || 0) + parseFloat(e.amount ?? 0);
      return a;
    }, {});

    const expKpiY = kpiGrid(doc, [
      { label: 'Total Expense Cost', value: fmt$(expTotal),   color: C.amber,  sub: `${allExpenses.length} items` },
      { label: 'Wallet Paid Out',    value: fmt$(walletPaid), color: C.red },
      { label: 'Points Reloaded',    value: `+${ptsTotal} pts`, color: C.violet },
      { label: 'Unique Categories',  value: String(Object.keys(byCat).length), color: C.grayDk },
      { label: 'Daily Avg Cost',     value: fmt$(expTotal / reports.length), color: C.amber },
    ], 46, 5);

    let expY = sectionHead(doc, `Consolidated Expenses — ${allExpenses.length} Items`, expKpiY + 2, C.amber);

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
        { content: walletPaid > 0 ? fmt$(walletPaid) : '—', styles: { textColor: C.red, fontStyle: 'bold', halign: 'right' } },
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

  // ─── PAGE 4 · All Takeouts ────────────────────────────────────────────────
  if (allTakeouts.length > 0) {
    doc.addPage();
    const takeTotal = allTakeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);
    const byMethod  = allTakeouts.reduce((a, t) => { const m = t.method || 'Cash'; a[m] = (a[m] || 0) + parseFloat(t.amount ?? 0); return a; }, {});
    const byPerson  = allTakeouts.reduce((a, t) => { const p = t.takenBy || '—'; if (!a[p]) a[p] = { total: 0, count: 0 }; a[p].total += parseFloat(t.amount ?? 0); a[p].count++; return a; }, {});

    drawHeader(doc, {
      title: 'Range Operations Report  —  Profit Takeouts',
      sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
      sub2: `${allTakeouts.length} records  ·  Total: ${fmt$(takeTotal)}  ·  ${Object.keys(byPerson).length} recipient(s)`,
      badge: null,
    });

    const takeKpis = [
      { label: 'Total Taken',      value: fmt$(takeTotal), color: C.redDk, sub: `${allTakeouts.length} records` },
      ...Object.entries(byMethod).map(([m, v]) => ({ label: `Via ${m}`, value: fmt$(v), color: C.red })),
      { label: 'Recipients',       value: String(Object.keys(byPerson).length), color: C.grayDk },
      { label: 'Daily Avg Taken',  value: fmt$(takeTotal / reports.length), color: C.redDk },
    ];
    const takeKpiY = kpiGrid(doc, takeKpis, 46, Math.min(takeKpis.length, 5));

    let recY = sectionHead(doc, 'Breakdown by Recipient', takeKpiY + 2, C.red);
    autoTable(doc, {
      ...tbl(recY),
      headStyles: { ...tbl(recY).headStyles, fillColor: C.red },
      head: [['Recipient', 'Total Records', 'Total Amount', '% of Total']],
      body: Object.entries(byPerson).sort((a, b) => b[1].total - a[1].total)
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

    const detailY = sectionHead(doc, `All Takeout Records — ${allTakeouts.length} Entries`, (doc.lastAutoTable?.finalY ?? recY + 30) + 8, C.redDk);
    autoTable(doc, {
      ...tbl(detailY),
      headStyles: { ...tbl(detailY).headStyles, fillColor: C.redDk },
      head: [['Date', 'Time', 'Member / Team', 'Taken By', 'Method', 'Amount', 'Wallet Ref', 'Notes']],
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

  // ─── PAGE 5 · Daily Shift Details ─────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, {
    title: 'Range Operations Report  —  Daily Shift Details',
    sub1: `${fmtDateShort(startDate + 'T12:00:00')} – ${fmtDateShort(endDate + 'T12:00:00')}`,
    sub2: 'Per-day shift breakdown for all team members',
    badge: null,
  });

  let detY = 46;
  const H = doc.internal.pageSize.height;

  reports.forEach((r, rIdx) => {
    const allShifts = (r.teams || []).flatMap(team =>
      (team.shifts || []).map(sh => ({ ...sh, _teamRole: team.role, _memberName: sh.displayMember?.name || team.member?.name || '—' }))
    );
    if (allShifts.length === 0) return;
    if (detY > H - 50 && rIdx > 0) { doc.addPage(); detY = 14; }
    detY = sectionHead(doc, fmtDate(r.date + 'T12:00:00'), detY, rIdx % 2 === 0 ? C.sky : C.teal);

    autoTable(doc, {
      ...tbl(detY),
      styles: { ...tbl(detY).styles, fontSize: 7 },
      head: [['Member', 'Role', 'Start', 'End', 'Dur.', 'Txns', 'Deposits', 'Cashouts', 'Profit', 'Bonuses', 'Expenses', 'Takeouts', 'Players+', 'Effort']],
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
          st.totalExpenses > 0 ? fmt$(st.totalExpenses) : '—',
          st.totalTakeouts > 0 ? fmt$(st.totalTakeouts) : '—',
          st.playersAdded  > 0 ? String(st.playersAdded) : '—',
          sh.checkin?.effortRating != null ? `${sh.checkin.effortRating}/10` : '—',
        ];
      }),
      columnStyles: {
        6:  { halign: 'right', textColor: C.green },
        7:  { halign: 'right', textColor: C.red   },
        8:  { halign: 'right', fontStyle: 'bold'  },
        9:  { halign: 'right', textColor: C.orange },
        10: { halign: 'right', textColor: C.amber  },
        11: { halign: 'right', textColor: C.redDk  },
        12: { halign: 'center' },
        13: { halign: 'center' },
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
        if (data.column.index === 13) {
          const v = parseFloat(data.cell.raw || '0');
          if (v >= 8) data.cell.styles.textColor = C.green;
          else if (v >= 5) data.cell.styles.textColor = C.amber;
          else if (v > 0) data.cell.styles.textColor = C.red;
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

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT REPORT PDF  (jsPDF — matches the style of all other reports)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and download a per-shift PDF in the same branded style as the
 * operations reports. Replaces the old HTML-window version in ShiftsPage.jsx.
 *
 * @param {object} shift  The shift object from pastShifts / getMyShifts
 */
export async function printShiftPDF(shift) {
  // ── API helper (mirrors fj() from ShiftsPage) ─────────────────────────────
  // const API_BASE = (typeof import !== 'undefined' && (import.meta?.env?.VITE_API_URL)) || 'http://localhost:3001/api';
  const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:3001/api';

  const fetchAPI = async (path) => {
    const token = localStorage.getItem('authToken');
    const storeId = localStorage.getItem('__obStoreId') || '1';
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        credentials: 'include', cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Id': String(storeId),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!r.ok) return null;
      return r.json();
    } catch(_) { return null; }
  };

  // ── Parse stored snapshots & feedback (fix JSON-string bug) ──────────────
  let startSnap = {};
  let endSnap   = {};
  let feedback  = { effortReason: '', improvements: '', workSummary: '', issuesEncountered: '', shiftWorkDescription: '', recommendationsLastShift: '', recommendationsOverall: '' };

  try { startSnap = JSON.parse(shift.checkin?.balanceNote ?? '{}') || {}; } catch(_) {}
  try {
    const p = JSON.parse(shift.checkin?.additionalNotes ?? '{}') || {};
    if (p && typeof p === 'object') {
      endSnap  = p.endSnapshot ?? {};
      feedback = {
        effortReason:              p.effortReason              ?? '',
        improvements:              p.improvements              ?? '',
        workSummary:               p.workSummary               ?? shift.checkin?.workSummary ?? '',
        issuesEncountered:         p.issuesEncountered         ?? shift.checkin?.issuesEncountered ?? '',
        shiftWorkDescription:      p.shiftWorkDescription      ?? '',
        recommendationsLastShift:  p.recommendationsLastShift  ?? '',
        recommendationsOverall:    p.recommendationsOverall    ?? '',
      };
    }
  } catch(_) {}

  // ── Financial figures ─────────────────────────────────────────────────────
  const stx         = shift.stats || {};
  const deposits    = r2(endSnap.deposits    ?? stx.totalDeposits  ?? 0);
  const cashouts    = r2(endSnap.cashouts    ?? stx.totalCashouts  ?? 0);
  const bonuses     = r2(endSnap.bonuses     ?? stx.totalBonuses   ?? 0);
  const netProfit   = r2(deposits - cashouts);
  const depFees     = r2(endSnap.depositFees  ?? 0);
  const cashFees    = r2(endSnap.cashoutFees  ?? 0);
  const totalFees   = r2(depFees + cashFees);
  const expWallet   = r2(endSnap.expenseWalletPaid  ?? 0);
  const takeWallet  = r2(endSnap.takeoutWalletPaid  ?? 0);
  const ptsReloaded = Math.round(endSnap.pointsReloaded ?? 0);
  const walletChange = r2(endSnap.walletChange ?? 0);
  const gameChange   = Math.round(endSnap.gameChange ?? 0);

  // Expected reconciliation formula
  const expectedWallet = r2(deposits - cashouts - totalFees - expWallet - takeWallet);
  const expectedGame   = Math.round(-(deposits + totalFees + bonuses - cashouts) + ptsReloaded);
  const walletDisc     = r2(endSnap.walletDiscrepancy ?? r2(walletChange - expectedWallet));
  const gameDisc       = Math.round(endSnap.gameDiscrepancy ?? (gameChange - expectedGame));
  const walletOk       = Math.abs(walletDisc) < 0.02;
  const gameOk         = Math.abs(gameDisc) < 2;
  const allOk          = walletOk && gameOk;

  const effort = shift.checkin?.effortRating ?? null;

  // Snapshot rows
  const startWallets = startSnap.walletSnapshot ?? [];
  const endWallets   = endSnap.walletSnapshot   ?? [];
  const startGames   = startSnap.gameSnapshot   ?? [];
  const endGames     = endSnap.gameSnapshot     ?? [];

  const startWMap = Object.fromEntries(startWallets.map(w => [String(w.id), w]));
  const endWMap   = Object.fromEntries(endWallets.map(w => [String(w.id), w]));
  const startGMap = Object.fromEntries(startGames.map(g => [String(g.id), g]));
  const endGMap   = Object.fromEntries(endGames.map(g => [String(g.id), g]));

  const allWIds = [...new Set([...Object.keys(startWMap), ...Object.keys(endWMap)])];
  const allGIds = [...new Set([...Object.keys(startGMap), ...Object.keys(endGMap)])];

  const walletRows = allWIds.map(id => {
    const sw = startWMap[id]; const ew = endWMap[id];
    const startBal = r2(sw?.balance ?? 0); const endBal = r2(ew?.balance ?? 0);
    return { id, name: (ew ?? sw)?.name ?? '?', method: (ew ?? sw)?.method ?? '?', startBal, endBal, delta: r2(endBal - startBal), isNew: !sw && !!ew, isRemoved: !!sw && !ew };
  });
  const gameRows = allGIds.map(id => {
    const sg = startGMap[id]; const eg = endGMap[id];
    const startPts = Math.round(sg?.pointStock ?? 0); const endPts = Math.round(eg?.pointStock ?? 0);
    return { id, name: (eg ?? sg)?.name ?? '?', isShared: (eg ?? sg)?.isShared, startPts, endPts, delta: endPts - startPts, isNew: !sg && !!eg, isRemoved: !!sg && !eg };
  });

  // ── Fetch live data ───────────────────────────────────────────────────────
  let transactions = [], expenses = [], takeouts = [];
  try {
    const fromDate = encodeURIComponent(new Date(shift.startTime).toISOString());
    const toDateParam = shift.endTime ? `&toDate=${encodeURIComponent(new Date(shift.endTime).toISOString())}` : '';
    const shiftStart = new Date(shift.startTime);
    const shiftEnd   = shift.endTime ? new Date(shift.endTime) : new Date();

    const [txRes, expRes, toRes] = await Promise.all([
      fetchAPI(`/transactions?limit=500&fromDate=${fromDate}${toDateParam}`),
      fetchAPI(`/expenses?fromDate=${fromDate}${toDateParam}`),
      fetchAPI(`/profit-takeouts?fromDate=${fromDate}${toDateParam}&limit=200`),
    ]);

    transactions = (txRes?.data ?? []).filter(t => {
      const d = new Date(t.createdAtISO ?? t.createdAt ?? t.date ?? 0);
      return d >= shiftStart && d <= shiftEnd;
    });
    expenses  = expRes?.data ?? [];
    takeouts  = toRes?.data  ?? [];
  } catch(_) {}

  const totalExpAmt    = r2(expenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0));
  const totalTakeoutAmt = r2(takeouts.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0));
  const startWalletTotal = r2(startSnap.totalWallet ?? startWallets.reduce((s, w) => s + (w.balance ?? 0), 0));
  const endWalletTotal   = r2(endSnap.totalWallet   ?? endWallets.reduce((s, w)   => s + (w.balance ?? 0), 0));
  const startGameTotal   = Math.round(startSnap.totalGames ?? startGames.reduce((s, g) => s + (g.pointStock ?? 0), 0));
  const endGameTotal     = Math.round(endSnap.totalGames   ?? endGames.reduce((s, g)   => s + (g.pointStock ?? 0), 0));

  // Shift label helpers
  const memberName = shift.performer?.name || shift.memberName || shift.displayMember?.name || shift.teamRole || '—';
  const roleLabel  = ROLE_LABEL[shift.teamRole] || shift.teamRole || '—';
  const dateLabel  = fmtDate(shift.startTime);
  const dateShort  = fmtDateShort(shift.startTime);
  const timeRange  = `${fmtTime(shift.startTime)} → ${fmtTime(shift.endTime)}${shift.duration != null ? `  ·  ${shift.duration} min` : ''}`;

  // ── BUILD PDF ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 · Shift Overview + Balance Audit
  // ═══════════════════════════════════════════════════════════════════════════
  drawHeader(doc, {
    title: 'Shift Report',
    sub1: `${memberName}  ·  ${roleLabel}  ·  ${dateLabel}`,
    sub2: `${timeRange}  ·  Generated ${genStamp()}`,
  });

  const kpiItems = [
    { label: 'Deposits',        value: fmt$(deposits),    color: C.green,  sub: `${transactions.filter(t => t.type === 'Deposit').length} txns` },
    { label: 'Cashouts',        value: fmt$(cashouts),    color: C.red,    sub: `${transactions.filter(t => t.type === 'Cashout').length} txns` },
    { label: 'Net Profit',      value: fmt$(netProfit),   color: netProfit >= 0 ? C.green : C.red, sub: 'Dep − Cash' },
    { label: 'Bonuses Given',   value: fmt$(bonuses),     color: C.orange, sub: 'to players' },
    ...(totalFees > 0     ? [{ label: 'Total Fees',      value: fmt$(totalFees),      color: C.amber }] : []),
    ...(totalExpAmt > 0   ? [{ label: 'Expenses',        value: fmt$(totalExpAmt),    color: C.amber,  sub: `${expenses.length} items` }] : []),
    ...(totalTakeoutAmt > 0 ? [{ label: 'Profit Takeouts', value: fmt$(totalTakeoutAmt), color: C.redDk, sub: `${takeouts.length} records` }] : []),
    ...(ptsReloaded > 0   ? [{ label: 'Pts Reloaded',   value: `+${ptsReloaded} pts`, color: C.violet }] : []),
    { label: 'Transactions',    value: String(transactions.length || stx.transactionCount || 0), color: C.blue },
    ...(effort != null    ? [{ label: 'Effort Rating',   value: `${effort} / 10`, color: effort >= 8 ? C.green : effort >= 5 ? C.amber : C.red }] : []),
  ];

  // Pad to nearest row of 5
  while (kpiItems.length % 5 !== 0) kpiItems.push({ label: '', value: '', color: C.light });

  const kpiY = kpiGrid(doc, kpiItems, 46, 5);

  // Rating from manager (if present)
  if (shift.rating) {
    const stars = '★'.repeat(Math.round(shift.rating.overallRating)) + '☆'.repeat(5 - Math.round(shift.rating.overallRating));
    let y2 = sectionHead(doc, 'Manager Rating', kpiY + 2, C.violet);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.violet);
    doc.text(stars, 21, y2 + 4);
    if (shift.rating.feedback) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.slate);
      doc.text(fitText(doc, shift.rating.feedback, doc.internal.pageSize.width - 70), 21, y2 + 11);
    }
    y2 += 18;
    // reuse y2 below
  }

  // Reconciliation status banner
  const reconY = kpiY + (shift.rating ? 22 : 4);
  let nextY = statusBanner(
    doc,
    reconY,
    allOk,
    allOk ? 'Shift Fully Balanced' : `Discrepancy Detected${!walletOk ? `  ·  Cash off $${Math.abs(walletDisc).toFixed(2)}` : ''}${!gameOk ? `  ·  Points off ${Math.abs(gameDisc)} pts` : ''}`,
    allOk
      ? 'All deposits, cashouts, fees, and expenses reconcile correctly.'
      : 'The numbers do not add up. See the reconciliation breakdown on this page.'
  );

  // Opening notes / discrepancy note
  if (startSnap.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.amber);
    doc.text(`Opening note: ${fitText(doc, startSnap.notes, doc.internal.pageSize.width - 30)}`, 14, nextY + 4);
    nextY += 9;
  }

  // Wallet comparison table
  if (walletRows.length > 0) {
    nextY = sectionHead(doc, 'Wallet Balance Audit', nextY + 2, C.blue);
    autoTable(doc, {
      ...tbl(nextY),
      headStyles: { ...tbl(nextY).headStyles, fillColor: C.blue },
      head: [['Method', 'Account', 'Start Balance', 'End Balance', 'Net Change', 'Note']],
      body: walletRows.map(w => [
        w.method,
        w.name,
        w.isNew ? 'N/A' : fmt$(w.startBal),
        w.isRemoved ? 'N/A' : fmt$(w.endBal),
        (w.isNew || w.isRemoved) ? 'N/A' : `${w.delta >= 0 ? '+' : '−'}${fmt$(Math.abs(w.delta))}`,
        w.isNew ? 'Added mid-shift' : w.isRemoved ? 'Removed mid-shift' : '',
      ]),
      foot: [[
        { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: fmt$(startWalletTotal), styles: { halign: 'right' } },
        { content: fmt$(endWalletTotal),   styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${walletChange >= 0 ? '+' : '−'}${fmt$(Math.abs(walletChange))}`, styles: { textColor: walletOk ? C.green : C.red, fontStyle: 'bold', halign: 'right' } },
        '',
      ]],
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell(data) {
        if (data.section !== 'body' || data.column.index !== 4) return;
        if (data.cell.raw === 'N/A') { data.cell.styles.textColor = C.muted; return; }
        const v = parseFloat((data.cell.raw || '').replace(/[$+−,]/g, '') || '0');
        data.cell.styles.textColor = v >= 0 ? C.green : C.red;
        data.cell.styles.fontStyle = 'bold';
      },
    });
    nextY = (doc.lastAutoTable?.finalY ?? nextY + 20) + 5;
  }

  // Game points comparison table
  if (gameRows.length > 0) {
    nextY = sectionHead(doc, 'Game Points Audit', nextY + 2, C.violet);
    autoTable(doc, {
      ...tbl(nextY),
      headStyles: { ...tbl(nextY).headStyles, fillColor: C.violet },
      head: [['Game', 'Start (pts)', 'End (pts)', 'Net Change', 'Shared', 'Note']],
      body: gameRows.map(g => [
        g.name,
        g.isNew ? 'N/A' : `${g.startPts} pts`,
        g.isRemoved ? 'N/A' : `${g.endPts} pts`,
        (g.isNew || g.isRemoved) ? 'N/A' : `${g.delta >= 0 ? '+' : ''}${g.delta} pts`,
        g.isShared ? 'Yes' : 'No',
        g.isNew ? 'Added mid-shift' : g.isRemoved ? 'Removed mid-shift' : '',
      ]),
      foot: [[
        { content: 'Total', styles: { fontStyle: 'bold' } },
        { content: `${startGameTotal} pts`, styles: { halign: 'right' } },
        { content: `${endGameTotal} pts`,   styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${gameChange >= 0 ? '+' : ''}${gameChange} pts`, styles: { textColor: gameOk ? C.green : C.red, fontStyle: 'bold', halign: 'right' } },
        '', '',
      ]],
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
      },
      didParseCell(data) {
        if (data.section !== 'body' || data.column.index !== 3) return;
        if (data.cell.raw === 'N/A') { data.cell.styles.textColor = C.muted; return; }
        const v = parseInt((data.cell.raw || '').replace(/[^0-9\-]/g, '') || '0');
        // For points: going DOWN is good (points spent = activity)
        data.cell.styles.textColor = v <= 0 ? C.green : C.red;
        data.cell.styles.fontStyle = 'bold';
      },
    });
    nextY = (doc.lastAutoTable?.finalY ?? nextY + 20) + 5;
  }

  // Reconciliation formula breakdown (compact row)
  if (endSnap && Object.keys(endSnap).length > 0) {
    const formulaRows = [
      ['+ Deposits received',           fmt$(deposits),     `−${fmt$(deposits)}`],
      ['− Cashouts completed',          `-${fmt$(cashouts)}`, `+${fmt$(cashouts)}`],
      ...(totalFees > 0   ? [['− Transaction fees',    `-${fmt$(totalFees)}`,  `−${fmt$(totalFees)}`]] : []),
      ...(bonuses > 0     ? [['− Bonuses granted',     '—',                    `-${fmt$(bonuses)}`]] : []),
      ...(ptsReloaded > 0 ? [['+ Points reloaded',     '—',                    `+${ptsReloaded} pts`]] : []),
      ...(expWallet > 0   ? [['− Expense wallet pmts', `-${fmt$(expWallet)}`,  '—']] : []),
      ...(takeWallet > 0  ? [['− Takeout wallet pmts', `-${fmt$(takeWallet)}`, '—']] : []),
    ];

    if (nextY + 15 + formulaRows.length * 6 + 20 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      nextY = 14;
    } else {
      nextY += 2;
    }

    nextY = sectionHead(doc, 'Reconciliation Formula', nextY, C.teal);
    autoTable(doc, {
      ...tbl(nextY),
      headStyles: { ...tbl(nextY).headStyles, fillColor: C.teal },
      head: [['Transaction Item', 'Effect on Cash ($)', 'Effect on Points']],
      body: formulaRows,
      foot: [
        ['Expected Change', `${expectedWallet >= 0 ? '+' : ''}${fmt$(expectedWallet)}`, `${expectedGame >= 0 ? '+' : ''}${expectedGame} pts`],
        ['Actual Change',   `${walletChange >= 0 ? '+' : ''}${fmt$(walletChange)}`,     `${gameChange >= 0 ? '+' : ''}${gameChange} pts`],
        [allOk ? '✓ Balanced' : '⚠ Discrepancy',
          !walletOk ? `$${Math.abs(walletDisc).toFixed(2)} off` : 'OK',
          !gameOk   ? `${Math.abs(gameDisc)} pts off` : 'OK'],
      ],
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right', fontStyle: 'bold' } },
      didParseCell(data) {
        if (data.section !== 'foot') return;
        const row = data.row.index;
        if (row === 2) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) data.cell.styles.textColor = allOk ? C.green : C.red;
          if (data.column.index === 1) data.cell.styles.textColor = walletOk ? C.green : C.red;
          if (data.column.index === 2) data.cell.styles.textColor = gameOk   ? C.green : C.red;
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 · Transactions
  // ═══════════════════════════════════════════════════════════════════════════
  if (transactions.length > 0) {
    doc.addPage();
    const depTxns  = transactions.filter(t => t.type === 'Deposit'  || t.type === 'DEPOSIT');
    const cashTxns = transactions.filter(t => t.type === 'Cashout'  || t.type === 'WITHDRAWAL');
    const bonTxns  = transactions.filter(t => !['Deposit','DEPOSIT','Cashout','WITHDRAWAL'].includes(t.type));
    const totalDepAmt  = r2(depTxns.reduce((s, t)  => s + (t.amount ?? 0), 0));
    const totalCashAmt = r2(cashTxns.reduce((s, t) => s + (t.amount ?? 0), 0));
    const totalBonAmt  = r2(bonTxns.reduce((s, t)  => s + (t.amount ?? 0), 0));

    drawHeader(doc, {
      title: `Shift Report  —  Transactions`,
      sub1:  `${memberName}  ·  ${roleLabel}  ·  ${dateLabel}`,
      sub2:  `${transactions.length} transactions  ·  ${timeRange}`,
      badge: null,
    });

    const txKpiY = kpiGrid(doc, [
      { label: 'Total Deposits',  value: fmt$(totalDepAmt),         color: C.green,  sub: `${depTxns.length} txns` },
      { label: 'Total Cashouts',  value: fmt$(totalCashAmt),        color: C.red,    sub: `${cashTxns.length} txns` },
      { label: 'Bonuses / Other', value: fmt$(totalBonAmt),         color: C.orange, sub: `${bonTxns.length} txns` },
      { label: 'Net Position',    value: fmt$(totalDepAmt - totalCashAmt), color: (totalDepAmt - totalCashAmt) >= 0 ? C.green : C.red, sub: 'Dep − Cash' },
      { label: 'Total Volume',    value: fmt$(totalDepAmt + totalCashAmt + totalBonAmt), color: C.blue },
    ], 46, 5);

    let txY = sectionHead(doc, `All Transactions (${transactions.length})`, txKpiY + 2, C.blue);

    autoTable(doc, {
      ...tbl(txY),
      headStyles: { ...tbl(txY).headStyles, fillColor: C.blue },
      head: [['Time', 'Player', 'Type', 'Game / Wallet', 'Points Before→After', 'Amount', 'Fee', 'Bal. After', 'Status']],
      body: transactions.map(t => {
        const pts = (t.gameStockBefore != null && t.gameStockAfter != null)
          ? `${Math.round(t.gameStockBefore)} → ${Math.round(t.gameStockAfter)}` : '—';
        return [
          fmtDateTime(t.createdAtISO ?? t.createdAt ?? t.date),
          t.playerName || t.user?.name || `#${t.playerId || t.userId || '?'}`,
          t.displayType || t.type,
          [t.gameName, t.walletMethod && `${t.walletMethod}${t.walletName ? ' · ' + t.walletName : ''}`].filter(Boolean).join(' / ') || '—',
          pts,
          fmt$(t.amount),
          t.fee > 0 ? `-${fmt$(t.fee)}` : '—',
          t.balanceAfter != null ? fmt$(t.balanceAfter) : '—',
          t.status === 'PENDING' ? 'PENDING' : 'DONE',
        ];
      }),
      foot: [[
        '', '', '', '', '',
        { content: `+${fmt$(totalDepAmt)} / −${fmt$(totalCashAmt)}`, styles: { fontStyle: 'bold', textColor: C.navy, halign: 'right' } },
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
        if (col === 2) {
          const v = (data.cell.raw || '').toUpperCase();
          if (v.includes('DEPOSIT'))               { data.cell.styles.textColor = C.green;  data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('CASHOUT') || v.includes('WITHDRAWAL')) { data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = 'bold'; }
          if (v.includes('BONUS'))                 { data.cell.styles.textColor = C.orange; data.cell.styles.fontStyle = 'bold'; }
        }
        if (col === 5) {
          const v = (data.cell.raw || '').replace(/[$,]/g, '');
          // no raw sign info — left to column style
        }
        if (col === 8) {
          if (data.cell.raw === 'PENDING') { data.cell.styles.textColor = C.amber; data.cell.styles.fontStyle = 'bold'; }
          if (data.cell.raw === 'DONE')    { data.cell.styles.textColor = C.green; }
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 · Expenses & Profit Takeouts
  // ═══════════════════════════════════════════════════════════════════════════
  if (expenses.length > 0 || takeouts.length > 0) {
    doc.addPage();
    drawHeader(doc, {
      title: `Shift Report  —  Expenses & Takeouts`,
      sub1:  `${memberName}  ·  ${roleLabel}  ·  ${dateLabel}`,
      sub2:  `${expenses.length} expenses  ·  ${takeouts.length} takeouts  ·  ${timeRange}`,
      badge: null,
    });

    const expPts      = expenses.reduce((s, e) => s + (e.pointsAdded ?? 0), 0);
    const expWalletAmt = r2(expenses.reduce((s, e) => s + parseFloat(e.paymentMade ?? 0), 0));

    const etKpiY = kpiGrid(doc, [
      { label: 'Expense Cost',     value: fmt$(totalExpAmt),       color: C.amber,  sub: `${expenses.length} items` },
      { label: 'Wallet Paid',      value: fmt$(expWalletAmt),      color: C.red },
      { label: 'Points Reloaded',  value: `+${expPts} pts`,        color: C.violet },
      { label: 'Profit Takeouts',  value: fmt$(totalTakeoutAmt),   color: C.redDk,  sub: `${takeouts.length} records` },
      { label: 'Takeout via Wallet', value: fmt$(takeWallet),      color: C.red },
    ], 46, 5);

    if (expenses.length > 0) {
      let expY = sectionHead(doc, `Expense Records — ${expenses.length} Items`, etKpiY + 2, C.amber);
      autoTable(doc, {
        ...tbl(expY),
        headStyles: { ...tbl(expY).headStyles, fillColor: C.amber },
        head: [['Time', 'Description', 'Category', 'Game', 'Amount', 'Pts Added', 'Wallet Paid', 'Notes']],
        body: expenses.map(e => [
          fmtDateTime(e.createdAt),
          e.details || '—',
          (e.category || '—').replace(/_/g, ' '),
          e.game?.name || '—',
          fmt$(e.amount ?? 0),
          (e.pointsAdded ?? 0) > 0 ? `+${e.pointsAdded} pts` : '—',
          parseFloat(e.paymentMade ?? 0) > 0 ? fmt$(e.paymentMade) : '—',
          e.notes || '—',
        ]),
        foot: [[
          '', { content: `TOTAL  (${expenses.length} items)`, styles: { fontStyle: 'bold', halign: 'right' } }, '', '',
          { content: fmt$(totalExpAmt),   styles: { textColor: C.amber,  fontStyle: 'bold', halign: 'right' } },
          { content: expPts > 0 ? `+${expPts} pts` : '—', styles: { textColor: C.violet, halign: 'right' } },
          { content: expWalletAmt > 0 ? fmt$(expWalletAmt) : '—', styles: { textColor: C.red, fontStyle: 'bold', halign: 'right' } },
          '',
        ]],
        columnStyles: {
          4: { halign: 'right', textColor: C.amber, fontStyle: 'bold' },
          5: { halign: 'right', textColor: C.violet },
          6: { halign: 'right', textColor: C.red },
        },
      });
    }

    if (takeouts.length > 0) {
      const afterExpY = (doc.lastAutoTable?.finalY ?? etKpiY + 40) + 8;
      let takeY = sectionHead(doc, `Profit Takeouts — ${takeouts.length} Records`, afterExpY, C.redDk);
      autoTable(doc, {
        ...tbl(takeY),
        headStyles: { ...tbl(takeY).headStyles, fillColor: C.redDk },
        head: [['Time', 'Taken By', 'Method', 'Amount', 'Wallet Used', 'Notes']],
        body: takeouts.map(t => [
          fmtDateTime(t.createdAt ?? t.takenAt),
          t.takenBy || '—',
          t.method || 'Cash',
          fmt$(t.amount),
          t.walletId ? `Wallet #${t.walletId}` : 'Cash / External',
          t.notes || '—',
        ]),
        foot: [[
          '', '', { content: 'TOTAL', styles: { fontStyle: 'bold' } },
          { content: fmt$(totalTakeoutAmt), styles: { textColor: C.redDk, fontStyle: 'bold', halign: 'right' } },
          { content: `Wallet deducted: ${fmt$(takeWallet)}`, styles: { textColor: C.red, fontSize: 7 } },
          '',
        ]],
        columnStyles: {
          3: { halign: 'right', textColor: C.redDk, fontStyle: 'bold' },
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 · Member Feedback
  // ═══════════════════════════════════════════════════════════════════════════
  const hasFeedback = Object.values(feedback).some(v => v && String(v).trim().length > 0);
  if (hasFeedback || effort != null) {
    doc.addPage();
    drawHeader(doc, {
      title: `Shift Report  —  Member Feedback`,
      sub1:  `${memberName}  ·  ${roleLabel}  ·  ${dateLabel}`,
      sub2:  effort != null ? `Effort rating: ${effort} / 10` : 'End-of-shift feedback',
      badge: null,
    });

    const effortColor = !effort ? C.muted : effort >= 8 ? C.green : effort >= 5 ? C.amber : C.red;
    const fbKpiY = kpiGrid(doc, [
      { label: 'Effort Rating',     value: effort != null ? `${effort} / 10` : '—', color: effortColor },
      { label: 'Rating Descriptor', value: !effort ? 'N/A' : effort >= 8 ? 'Excellent' : effort >= 5 ? 'Good' : 'Needs Work', color: effortColor },
      { label: 'Transactions',      value: String(transactions.length || stx.transactionCount || 0), color: C.blue },
      { label: 'Expenses Logged',   value: String(expenses.length),  color: C.amber },
      { label: 'Takeouts',          value: String(takeouts.length),  color: C.redDk },
    ], 46, 5);

    // Effort bar (visual)
    if (effort != null) {
      const barY = fbKpiY + 4;
      const barW = doc.internal.pageSize.width - 28;
      doc.setFillColor(...C.light);
      doc.roundedRect(14, barY, barW, 5, 1.5, 1.5, 'F');
      doc.setFillColor(...effortColor);
      doc.roundedRect(14, barY, (barW * effort) / 10, 5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...effortColor);
      doc.text(`${effort} / 10`, doc.internal.pageSize.width - 14, barY + 3.8, { align: 'right' });
    }

    // Feedback table
    const fbFields = [
      { label: 'Why this effort rating?', value: feedback.effortReason },
      { label: 'Shift Work Description', value: feedback.shiftWorkDescription },
      { label: 'Work Summary',           value: feedback.workSummary },
      { label: 'Issues Encountered',     value: feedback.issuesEncountered },
      { label: 'Could Do Better',        value: feedback.improvements },
      { label: 'Recommendations (Prev Shift)', value: feedback.recommendationsLastShift },
      { label: 'Overall Recommendations', value: feedback.recommendationsOverall },
    ].filter(f => f.value && String(f.value).trim());

    if (fbFields.length > 0) {
      const fbTableY = fbKpiY + (effort != null ? 16 : 4);
      const fbSectionY = sectionHead(doc, 'Shift Feedback Details', fbTableY, C.teal);
      const W = doc.internal.pageSize.width;

      autoTable(doc, {
        startY: fbSectionY,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', font: 'helvetica', lineColor: C.light, lineWidth: 0.2 },
        headStyles: { fillColor: C.teal, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: C.bg },
        head: [['Feedback Field', 'Response']],
        body: fbFields.map(f => [f.label, f.value]),
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', textColor: C.slate },
          1: { cellWidth: W - 78 },
        },
      });
    }
  }

  // ── Footers & save ────────────────────────────────────────────────────────
  addFooters(doc, 'Shift Report', `${memberName}  ·  ${dateShort}`);
  const safeDate = (shift.startTime || '').split('T')[0] || 'shift';
  doc.save(`shift-report-${safeDate}-${(memberName).replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
