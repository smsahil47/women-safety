import React, { useState } from 'react';
import { FileText, MapPin, AlertTriangle, BadgeCheck, ThumbsUp, Clock } from 'lucide-react';
import SafetyBadge from '../components/ui/SafetyBadge';
import { MOCK_REPORTS } from '../services/mockData';
import { useApp } from '../context/AppContext';
import type { CommunityReport, IncidentType } from '../types';

const INCIDENT_TYPES: IncidentType[] = ['Harassment', 'Theft', 'Assault', 'Suspicious Activity', 'Poor Lighting', 'Unsafe Area', 'Other'];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const ReportsPage: React.FC = () => {
    const { addToast } = useApp();
    const [reports, setReports] = useState<CommunityReport[]>(MOCK_REPORTS);
    const [form, setForm] = useState({ location: '', incidentType: '' as IncidentType | '', description: '' });
    const [errors, setErrors] = useState<{ location?: string; incidentType?: string; description?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const e: { location?: string; incidentType?: string; description?: string } = {};
        if (!form.location.trim()) e.location = 'Location is required';
        if (!form.incidentType) e.incidentType = 'Select an incident type';
        if (!form.description.trim()) e.description = 'Description is required';
        else if (form.description.length < 20) e.description = 'Minimum 20 characters required';
        setErrors(e); return !Object.keys(e).length;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        await new Promise(r => setTimeout(r, 800));
        const report: CommunityReport = {
            id: `r-${Date.now()}`, userId: 'u1', userName: 'You',
            location: form.location, incidentType: form.incidentType as IncidentType,
            description: form.description, timestamp: new Date().toISOString(),
            upvotes: 0, isVerified: false, safetyLevel: 'moderate',
        };
        setReports(p => [report, ...p]);
        setForm({ location: '', incidentType: '', description: '' });
        setErrors({}); setSubmitting(false);
        addToast('Report submitted. Thank you for keeping the community safe.', 'success');
    };

    const upvote = (id: string) => setReports(p => p.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">Community Reports</h1>
                <p className="page-subtitle">Submit and browse community-reported safety incidents</p>
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
                    <AlertTriangle size={13} />Recent Reports ({reports.length})
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                    {reports.map((r, i) => (
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
                                <button className="no-btn"
                                    onClick={() => upvote(r.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--bg-hover)', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.color = 'var(--indigo)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-3)'; }}
                                >
                                    <ThumbsUp size={12} />{r.upvotes} helpful
                                </button>
                            </div>
                            {i < reports.length - 1 && <div className="divider" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
