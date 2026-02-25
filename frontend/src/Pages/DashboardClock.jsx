import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── NTP-style Texas time hook ────────────────────────────────────────────────
function useTexasTime() {
    const offsetRef = useRef(0);
    const historyRef = useRef([]);
    const rafRef = useRef(null);
    const timerRef = useRef(null);

    const [display, setDisplay] = useState({ time: "", period: "", date: "", full: "" });

    const fmt = (ts) => {
        const base = {
            timeZone: "America/Chicago",
            hour12: true,
        };
        const timePart = new Intl.DateTimeFormat("en-US", { ...base, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(ts));
        const datePart = new Intl.DateTimeFormat("en-US", { ...base, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(ts));
        const [hms, period] = timePart.split(" ");
        return { time: hms, period, date: datePart };
    };

    const smoothOffset = (v) => {
        historyRef.current.push(v);
        if (historyRef.current.length > 10) historyRef.current.shift();
        return historyRef.current.length === 1 ? v : offsetRef.current * 0.7 + v * 0.3;
    };

    const sync = useCallback(async () => {
        try {
            const t1 = Date.now();
            const res = await fetch("/api/time");
            const t4 = Date.now();
            const { timestamp: t3 } = await res.json();
            offsetRef.current = smoothOffset(t3 + (t4 - t1) / 2 - t4);
        } catch { /* graceful degradation */ }
    }, []);

    const tick = useCallback(() => {
        setDisplay(fmt(Date.now() + offsetRef.current));
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        sync();
        rafRef.current = requestAnimationFrame(tick);
        timerRef.current = setInterval(sync, 15000);
        return () => {
            cancelAnimationFrame(rafRef.current);
            clearInterval(timerRef.current);
        };
    }, [sync, tick]);

    return display;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

function getTexasToday() {
    const texas = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
    return { year: texas.getFullYear(), month: texas.getMonth(), day: texas.getDate() };
}

function buildCells(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--)  cells.push({ day: daysInPrev - i, current: false });
    for (let d = 1; d <= daysInMonth; d++)    cells.push({ day: d, current: true });
    const trail = 42 - cells.length;
    for (let d = 1; d <= trail; d++)          cells.push({ day: d, current: false });
    return cells;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardClock() {
    const { time, period, date } = useTexasTime();
    const today = getTexasToday();

    const [view, setView] = useState({ year: today.year, month: today.month });
    const cells = buildCells(view.year, view.month);

    const prevMonth = () => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; });
    const nextMonth = () => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; });
    const goToday = () => setView({ year: today.year, month: today.month });

    const isToday = (day, current) => current && day === today.day && view.month === today.month && view.year === today.year;
    const isWeekend = (idx) => idx % 7 === 0 || idx % 7 === 6;

    if (!time) return null;

    const [hr, min, sec] = time.split(":");

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0",
            userSelect: "none",
            width: "100%",
        }}>

            {/* ── Live clock ────────────────────────────────────────────────── */}
            <div style={{
                background: "linear-gradient(135deg, #0c1a2e 0%, #0a192b 100%)",
                borderRadius: "14px 14px 0 0",
                padding: "18px 16px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                position: "relative",
                overflow: "hidden",
            }}>
                {/* decorative ring */}
                <div style={{
                    position: "absolute", right: "-24px", top: "-24px",
                    width: "90px", height: "90px",
                    borderRadius: "50%",
                    border: "24px solid rgba(14,165,233,0.06)",
                    pointerEvents: "none",
                }} />

                {/* Live dot */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" }}>
                    <div style={{
                        width: "6px", height: "6px",
                        borderRadius: "50%",
                        background: "#10b981",
                        animation: "dashClockPulse 2s infinite",
                    }} />
                    <span style={{ fontSize: "9px", fontWeight: "700", color: "#10b981", letterSpacing: "0.8px" }}>
                        LIVE · CST
                    </span>
                </div>

                {/* Time display */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                    <span style={{
                        fontSize: "38px",
                        fontWeight: "800",
                        color: "#f1f5f9",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-2px",
                    }}>
                        {hr}:{min}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", paddingBottom: "4px", gap: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#0ea5e9", lineHeight: 1 }}>
                            {period}
                        </span>
                        <span style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "rgba(241,245,249,0.35)",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                        }}>
                            :{sec}
                        </span>
                    </div>
                </div>

                {/* Date string */}
                <p style={{
                    fontSize: "11px",
                    color: "#475569",
                    marginTop: "6px",
                    fontWeight: "500",
                    letterSpacing: "0.3px",
                    lineHeight: 1.4,
                }}>
                    {date}
                </p>
            </div>

            {/* ── Calendar ─────────────────────────────────────────────────── */}
            <div style={{
                background: "#0f172a",
                borderRadius: "0 0 14px 14px",
                padding: "10px 12px 12px",
            }}>
                {/* Month nav */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                }}>
                    <button onClick={prevMonth} style={NAV_BTN}>
                        <ChevronLeft size={12} />
                    </button>

                    <button
                        onClick={goToday}
                        style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#cbd5e1",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                        title="Jump to today"
                    >
                        {MONTHS[view.month].slice(0, 3)} {view.year}
                    </button>

                    <button onClick={nextMonth} style={NAV_BTN}>
                        <ChevronRight size={12} />
                    </button>
                </div>

                {/* Day headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", marginBottom: "3px" }}>
                    {DAYS_SHORT.map((d, i) => (
                        <div key={d} style={{
                            textAlign: "center",
                            fontSize: "9px",
                            fontWeight: "700",
                            color: i === 0 || i === 6 ? "#334155" : "#334155",
                            padding: "2px 0",
                            letterSpacing: "0.3px",
                        }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px" }}>
                    {cells.map((cell, idx) => {
                        const _today = isToday(cell.day, cell.current);
                        const _weekend = isWeekend(idx);
                        return (
                            <div key={idx} style={{
                                textAlign: "center",
                                padding: "4px 0",
                                borderRadius: "6px",
                                fontSize: "10px",
                                fontWeight: _today ? "800" : cell.current ? "500" : "400",
                                color: _today
                                    ? "#fff"
                                    : !cell.current
                                        ? "#1e293b"
                                        : _weekend
                                            ? "#334155"
                                            : "#94a3b8",
                                background: _today
                                    ? "linear-gradient(135deg, #0ea5e9, #0b6ea8)"
                                    : "transparent",
                                boxShadow: _today ? "0 2px 6px rgba(14,165,233,0.35)" : "none",
                                lineHeight: 1.3,
                            }}>
                                {cell.day}
                            </div>
                        );
                    })}
                </div>

                {/* Today pill */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                    <button
                        onClick={goToday}
                        style={{
                            fontSize: "9px",
                            fontWeight: "700",
                            color: "#0ea5e9",
                            background: "rgba(14,165,233,0.08)",
                            border: "1px solid rgba(14,165,233,0.18)",
                            borderRadius: "20px",
                            padding: "3px 12px",
                            cursor: "pointer",
                            letterSpacing: "0.5px",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,233,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,233,0.08)"; }}
                    >
                        TODAY · {MONTHS[today.month].slice(0, 3).toUpperCase()} {today.day}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes dashClockPulse {
                    0%   { box-shadow: 0 0 0 0   rgba(16,185,129,0.5); }
                    70%  { box-shadow: 0 0 0 5px rgba(16,185,129,0);   }
                    100% { box-shadow: 0 0 0 0   rgba(16,185,129,0);   }
                }
            `}</style>
        </div>
    );
}

const NAV_BTN = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.04)",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.15s",
    padding: 0,
};