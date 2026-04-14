import React, { useState, useEffect } from 'react';
import { FileText, MapPin, AlertTriangle, BadgeCheck, ThumbsUp, Clock, RefreshCw } from 'lucide-react';
import SafetyBadge from '../components/ui/SafetyBadge';
import { useApp } from '../context/AppContext';
import type { CommunityReport, IncidentType } from '../types';
import { fetchReports, createReport, upvoteReport, deleteReport } from '../services/api';

const INCIDENT_TYPES: IncidentType[] = ['Harassment', 'Theft', 'Assault', 'Suspicious Activity', 'Poor Lighting', 'Unsafe Area', 'Other'];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const LoadingRow = () => (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--indigo)', animation: 'spin 0.7s linear infinite' }} />
        Loading reports…
    </div>
);

const ReportsPage: React.FC = () => {
    const { addToast, user } = useApp();
    const [reports, setReports] = useState<CommunityReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ location: '', incidentType: '' as IncidentType | '', description: '' });
    const [errors, setErrors] = useState<{ location?: string; incidentType?: string; description?: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

    // ── Load reports from Supabase ──────────────────────────────────────────────

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await fetchReports();
            setReports(data);
        } catch (err: any) {
            console.error('Failed to load reports:', err);
            addToast('Could not load reports. Showing cached data.', 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    // ── Validate ────────────────────────────────────────────────────────────────

    const validate = () => {
        const e: { location?: string; incidentType?: string; description?: string } = {};
        if (!form.location.trim()) e.location = 'Location is required';
        if (!form.incidentType) e.incidentType = 'Select an incident type';
        if (!form.description.trim()) e.description = 'Description is required';
        else if (form.description.length < 20) e.description = 'Minimum 20 characters required';
        setErrors(e); return !Object.keys(e).length;
    };

    // ── Submit ──────────────────────────────────────────────────────────────────

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!user?.id) { addToast('Please log in to submit a report.', 'error'); return; }

        setSubmitting(true);
        try {
            const newReport = await createReport(user.id, {
                location: form.location,
                incidentType: form.incidentType as string,
                description: form.description,
            });
            setReports(p => [newReport, ...p]);
            setForm({ location: '', incidentType: '', description: '' });
            setErrors({});
            addToast('Report submitted. Thank you for keeping the community safe.', 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to submit report. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Upvote ──────────────────────────────────────────────────────────────────

    const upvote = async (id: string) => {
        if (upvotedIds.has(id)) return;
        setUpvotedIds(prev => new Set([...prev, id]));
        setReports(p => p.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));
        try {
            await upvoteReport(id);
        } catch {
            // Revert on error
            setUpvotedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            setReports(p => p.map(r => r.id === id ? { ...r, upvotes: r.upvotes - 1 } : r));
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────

    const removeReport = async (id: string) => {
        if (!user?.id) return;
        if (!window.confirm('Are you sure you want to delete this report?')) return;
        try {
            await deleteReport(id, user.id);
            setReports(p => p.filter(r => r.id !== id));
            addToast('Report deleted successfully.', 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to delete report.', 'error');
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                    <h1 className="page-title">Community Reports</h1>
                    <p className="page-subtitle">Submit and browse community-reported safety incidents</p>
                </div>
                <button onClick={loadReports} className="btn btn-outline btn-sm" style={{ gap: 6 }}>
                    <RefreshCw size={13} />Refresh
                </button>
            </div>

            {/* Form */}
            <div className="fade-up d1 card card-pad">
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    <FileText size={13} />Submit a Report
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        <div className="field">
                            <label className="label-text">Location *</label>
                            <div className="input-wrap">
                                <MapPin size={14} className="ic" />
                                <input id="report-location" type="text" value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Old Market Lane, Sector 4"
                                    className={`input has-icon${errors.location ? ' err' : ''}`} />
                            </div>
                            {errors.location && <span className="err-msg">{errors.location}</span>}
                        </div>

                        <div className="field">
                            <label className="label-text">Incident Type *</label>
                            <div className="input-wrap">
                                <AlertTriangle size={14} className="ic" />
                                <select id="report-incident-type" value={form.incidentType}
                                    onChange={e => setForm(f => ({ ...f, incidentType: e.target.value as IncidentType }))}
                                    className={`input select has-icon${errors.incidentType ? ' err' : ''}`}>
                                    <option value="">Select type…</option>
                                    {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            {errors.incidentType && <span className="err-msg">{errors.incidentType}</span>}
                        </div>
                    </div>

                    <div className="field">
                        <label className="label-text">
                            Description *
                            <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>({form.description.length} chars)</span>
                        </label>
                        <textarea id="report-description" value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Describe what happened in detail…"
                            className={`input textarea${errors.description ? ' err' : ''}`} />
                        {errors.description && <span className="err-msg">{errors.description}</span>}
                    </div>

                    <div>
                        <button type="submit" id="report-submit" disabled={submitting} className="btn btn-primary" style={{ gap: 8 }}>
                            {submitting ? <Spinner /> : <FileText size={14} />}
                            {submitting ? 'Submitting…' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Reports list */}
            <div className="fade-up d2">
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} />Recent Reports {!loading && `(${reports.length})`}
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <LoadingRow />
                    ) : reports.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                            No reports yet. Be the first to report an incident.
                        </div>
                    ) : (
                        reports.map((r, i) => (
                            <div key={r.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: '14px 16px' }}>
                                {/* Meta row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{r.incidentType}</span>
                                    <SafetyBadge level={r.safetyLevel} size="sm" />
                                    {r.isVerified && (
                                        <span className="badge badge-indigo" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <BadgeCheck size={10} />Verified
                                        </span>
                                    )}
                                </div>

                                {/* Location */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-2)' }}>
                                    <MapPin size={11} style={{ flexShrink: 0 }} />{r.location}
                                </div>

                                {/* Description */}
                                <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{r.description}</p>

                                {/* Footer */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-3)' }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-2)' }}>{r.userName}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{fmtDate(r.timestamp)}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {user?.id === r.userId && (
                                            <button className="no-btn"
                                                onClick={() => removeReport(r.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                                                    color: 'var(--red)',
                                                    padding: '4px 10px', borderRadius: 6,
                                                    border: '1px solid var(--border-soft)',
                                                    background: 'var(--bg-hover)',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}>
                                                Delete
                                            </button>
                                        )}
                                        <button className="no-btn"
                                            onClick={() => upvote(r.id)}
                                            disabled={upvotedIds.has(r.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                                            color: upvotedIds.has(r.id) ? 'var(--indigo)' : 'var(--text-3)',
                                            padding: '4px 10px', borderRadius: 6,
                                            border: `1px solid ${upvotedIds.has(r.id) ? 'var(--indigo)' : 'var(--border-soft)'}`,
                                            background: upvotedIds.has(r.id) ? 'var(--indigo-dim)' : 'var(--bg-hover)',
                                            cursor: upvotedIds.has(r.id) ? 'default' : 'pointer', transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => { if (!upvotedIds.has(r.id)) { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.color = 'var(--indigo)'; } }}
                                        onMouseLeave={e => { if (!upvotedIds.has(r.id)) { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-3)'; } }}
                                    >
                                        <ThumbsUp size={12} />{r.upvotes} helpful
                                    </button>
                                </div>
                                </div>
                                {i < reports.length - 1 && <div className="divider" />}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
