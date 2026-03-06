import { useState } from 'react';
import { Star, CheckCircle, MessageSquare, ThumbsUp, AlertTriangle, X } from 'lucide-react';

// ============================================================
// ShiftEndModal — End-of-shift form for members
// Appears when member ends their shift. Captures effort rating,
// work summary, issues encountered, shoutouts, and any notes.
// This data is included in the admin shift report.
//
// Usage:
//   <ShiftEndModal
//     shift={activeShift}
//     onSubmit={() => { endShift(); setShowEndModal(false); }}
//     onSkip={() => endShift()}   // if you allow skipping
//   />
// ============================================================

export default function ShiftEndModal({ shift, onSubmit, onSkip }) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [workSummary, setWorkSummary] = useState('');
    const [issuesEncountered, setIssuesEncountered] = useState('');
    const [shoutouts, setShoutouts] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('form'); // 'form' | 'success'

    const ratingLabels = ['', 'Rough Day', 'Below Average', 'Average', 'Good Work', 'Outstanding!'];
    const ratingColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9'];

    async function handleSubmit() {
        if (!rating) { setError('Please rate your effort for this shift.'); return; }
        if (!workSummary.trim()) { setError('Please provide a brief summary of your work.'); return; }
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/shifts/${shift.id}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ effortRating: rating, workSummary, issuesEncountered, shoutouts, additionalNotes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setStep('success');
            setTimeout(() => onSubmit?.(), 1800);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (step === 'success') {
        return (
            <Overlay>
                <div style={S.card}>
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={S.successIcon}>
                            <CheckCircle style={{ width: '36px', height: '36px', color: '#16a34a' }} />
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                            Great work today!
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                            Your shift summary has been submitted.
                        </div>
                    </div>
                </div>
            </Overlay>
        );
    }

    const displayRating = hovered || rating;

    return (
        <Overlay>
            <div style={S.card}>
                {/* Header */}
                <div style={S.header}>
                    <div>
                        <div style={S.headerTitle}>End of Shift Summary</div>
                        <div style={S.headerSub}>This report helps your team improve</div>
                    </div>
                    {onSkip && (
                        <button onClick={onSkip} style={S.skipBtn} title="Skip (not recommended)">
                            <X style={{ width: '16px', height: '16px' }} />
                        </button>
                    )}
                </div>

                <div style={S.body}>
                    {/* Effort rating */}
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <Star style={{ width: '14px', height: '14px' }} />
                            How would you rate your effort today?
                            <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                        </div>
                        <div style={S.starsRow}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    onMouseEnter={() => setHovered(n)}
                                    onMouseLeave={() => setHovered(0)}
                                    onClick={() => { setRating(n); setError(''); }}
                                    style={{
                                        ...S.starBtn,
                                        color: n <= displayRating ? (ratingColors[displayRating] || '#eab308') : '#e2e8f0',
                                        transform: n <= displayRating ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                >
                                    <Star style={{ width: '32px', height: '32px' }} fill={n <= displayRating ? 'currentColor' : 'none'} />
                                </button>
                            ))}
                        </div>
                        {displayRating > 0 && (
                            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: ratingColors[displayRating], marginTop: '4px' }}>
                                {ratingLabels[displayRating]}
                            </div>
                        )}
                    </div>

                    {/* Work summary */}
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <MessageSquare style={{ width: '14px', height: '14px' }} />
                            What did you work on today?
                            <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                        </div>
                        <textarea
                            value={workSummary}
                            onChange={e => { setWorkSummary(e.target.value); setError(''); }}
                            style={S.textarea}
                            placeholder="Briefly describe your main activities this shift..."
                            rows={3}
                        />
                    </div>

                    {/* Issues */}
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <AlertTriangle style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                            Any issues or challenges?
                            <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '4px', fontWeight: '400' }}>optional</span>
                        </div>
                        <textarea
                            value={issuesEncountered}
                            onChange={e => setIssuesEncountered(e.target.value)}
                            style={S.textarea}
                            placeholder="Any problems, player complaints, technical issues, or anything the admin should know..."
                            rows={2}
                        />
                    </div>

                    {/* Shoutouts */}
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <ThumbsUp style={{ width: '14px', height: '14px', color: '#22c55e' }} />
                            Shoutouts or wins?
                            <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '4px', fontWeight: '400' }}>optional</span>
                        </div>
                        <textarea
                            value={shoutouts}
                            onChange={e => setShoutouts(e.target.value)}
                            style={{ ...S.textarea, minHeight: '56px' }}
                            placeholder="Any wins, shoutouts to teammates, or positive highlights..."
                            rows={2}
                        />
                    </div>

                    {/* Additional notes */}
                    <div style={S.section}>
                        <div style={S.sectionTitle}>Additional notes</div>
                        <textarea
                            value={additionalNotes}
                            onChange={e => setAdditionalNotes(e.target.value)}
                            style={{ ...S.textarea, minHeight: '50px' }}
                            placeholder="Anything else to add..."
                            rows={2}
                        />
                    </div>

                    {error && <div style={S.error}>{error}</div>}
                </div>

                {/* Footer */}
                <div style={S.footer}>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{ ...S.btn, opacity: submitting ? 0.6 : 1 }}
                    >
                        {submitting ? 'Submitting...' : 'Submit & End Shift'}
                    </button>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                        This summary will be included in the admin report
                    </div>
                </div>
            </div>
        </Overlay>
    );
}

function Overlay({ children }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', overflowY: 'auto',
        }}>
            {children}
        </div>
    );
}

const S = {
    card: {
        background: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    header: {
        padding: '22px 20px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
    },
    headerTitle: { fontSize: '18px', fontWeight: '800', color: '#0f172a' },
    headerSub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
    skipBtn: {
        background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
        padding: '6px', cursor: 'pointer', color: '#94a3b8',
        display: 'flex', alignItems: 'center',
    },
    body: { padding: '4px 20px 8px' },
    section: { marginBottom: '18px' },
    sectionTitle: {
        fontSize: '12px', fontWeight: '700', color: '#374151',
        display: 'flex', alignItems: 'center', gap: '5px',
        marginBottom: '8px', letterSpacing: '0.1px',
    },
    starsRow: {
        display: 'flex', justifyContent: 'center', gap: '4px',
        padding: '8px 0',
    },
    starBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
        transition: 'color 0.15s, transform 0.15s',
        fontFamily: 'inherit',
    },
    textarea: {
        width: '100%', padding: '10px 12px', fontSize: '13px',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        fontFamily: 'inherit', outline: 'none', resize: 'vertical',
        boxSizing: 'border-box', color: '#0f172a',
        lineHeight: '1.5',
    },
    error: {
        fontSize: '12px', color: '#dc2626',
        padding: '8px 12px', background: '#fff1f2',
        borderRadius: '8px', marginBottom: '12px',
    },
    footer: {
        padding: '12px 20px 20px',
        borderTop: '1px solid #f1f5f9',
        position: 'sticky', bottom: 0, background: '#fff',
    },
    btn: {
        width: '100%', padding: '13px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontSize: '14px', fontWeight: '700',
        fontFamily: 'inherit', cursor: 'pointer',
    },
    successIcon: {
        width: '72px', height: '72px', borderRadius: '50%',
        background: '#dcfce7', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
    },
};
