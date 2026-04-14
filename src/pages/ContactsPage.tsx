import React, { useState } from 'react';
import { Users, Plus, Trash2, Phone, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ContactFormData, Relationship } from '../types';

const RELS: Relationship[] = ['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'];
const EMPTY: ContactFormData = { name: '', phone: '', relationship: 'Friend' };

const initials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

const ContactsPage: React.FC = () => {
    const { contacts, contactsLoading, addContact, removeContact, trackingSession, addToast } = useApp();
    const [form, setForm] = useState<ContactFormData>(EMPTY);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
    const [showForm, setShowForm] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const validate = () => {
        const e: { name?: string; phone?: string } = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.phone.trim()) e.phone = 'Phone number is required';
        else if (!/^\+?[\d\s\-]{10,}$/.test(form.phone)) e.phone = 'Invalid phone number';
        setErrors(e); return !Object.keys(e).length;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await addContact({ ...form, isNotified: false });
            setForm(EMPTY); setErrors({}); setShowForm(false);
        } finally {
            setSaving(false);
        }
    };

    const remove = (id: string) => {
        if (contacts.length <= 1) {
            addToast('You must keep at least one emergency contact.', 'warning');
            return;
        }
        if (trackingSession.status === 'active') {
            addToast('Cannot modify contacts while Live Tracking is active.', 'warning');
            return;
        }
        setRemoving(id);
        setTimeout(() => { removeContact(id); setRemoving(null); }, 250);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                    <h1 className="page-title">Emergency Contacts</h1>
                    <p className="page-subtitle">Manage contacts notified during SOS and live tracking</p>
                </div>
                <button id="add-contact-btn" onClick={() => setShowForm(!showForm)}
                    className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`} style={{ gap: 7 }}>
                    {showForm ? <><X size={14} />Cancel</> : <><Plus size={14} />Add Contact</>}
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="fade-up card card-pad" style={{ border: '1px solid var(--border)' }}>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={13} />New Emergency Contact
                    </div>
                    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div className="field">
                            <label className="label-text">Full name *</label>
                            <input id="contact-name" type="text" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ananya Sharma"
                                className={`input${errors.name ? ' err' : ''}`} />
                            {errors.name && <span className="err-msg">{errors.name}</span>}
                        </div>
                        <div className="field">
                            <label className="label-text">Phone number *</label>
                            <input id="contact-phone" type="tel" value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+91 98765 43210"
                                className={`input${errors.phone ? ' err' : ''}`} />
                            {errors.phone && <span className="err-msg">{errors.phone}</span>}
                        </div>
                        <div className="field">
                            <label className="label-text">Relationship</label>
                            <select id="contact-relationship" value={form.relationship}
                                onChange={e => setForm(f => ({ ...f, relationship: e.target.value as Relationship }))}
                                className="input select">
                                {RELS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                            <button type="submit" id="contact-submit" className="btn btn-primary" style={{ gap: 7 }} disabled={saving}>
                                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</> : <><Plus size={14} />Add Contact</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats row */}
            <div className="fade-up d1" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved</span>
                {contacts.length > 0 && <span className="badge badge-safe">Ready for SOS</span>}
                {contactsLoading && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
                        <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />syncing…
                    </span>
                )}
            </div>

            {/* Loading skeleton */}
            {contactsLoading && contacts.length === 0 ? (
                <div className="fade-up d2 card" style={{ overflow: 'hidden' }}>
                    {[1, 2].map(i => (
                        <div key={i} className="list-row" style={{ gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ height: 13, width: '40%', borderRadius: 6, background: 'var(--bg-hover)' }} />
                                <div style={{ height: 11, width: '60%', borderRadius: 6, background: 'var(--bg-hover)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : contacts.length === 0 ? (
                <div className="fade-up d2 card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '48px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} style={{ color: 'var(--text-3)' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No contacts added</p>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 280, lineHeight: 1.6 }}>
                            Add emergency contacts who will be alerted during SOS or live tracking.
                        </p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ gap: 7, marginTop: 4 }}>
                        <Plus size={14} />Add First Contact
                    </button>
                </div>
            ) : (
                <div className="fade-up d2 card" style={{ overflow: 'hidden' }}>
                    {contacts.map((c, _i) => (
                        <div key={c.id} className="list-row"
                            style={{ opacity: removing === c.id ? 0 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--indigo)', flexShrink: 0 }}>
                                {initials(c.name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="trunc" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{c.relationship}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{c.phone}</span>
                                </div>
                            </div>
                            <span className={`badge ${c.isNotified ? 'badge-safe' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                                {c.isNotified ? 'SOS Active' : 'Standby'}
                            </span>
                            <button id={`delete-contact-${c.id}`} onClick={() => remove(c.id)}
                                disabled={contacts.length <= 1 || trackingSession.status === 'active'}
                                className="no-btn" title="Remove"
                                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: (contacts.length <= 1 || trackingSession.status === 'active') ? 'var(--text-4)' : 'var(--text-3)', borderRadius: 6, transition: 'all 0.15s', flexShrink: 0, cursor: (contacts.length <= 1 || trackingSession.status === 'active') ? 'not-allowed' : 'pointer' }}
                                onMouseEnter={e => { if (contacts.length > 1 && trackingSession.status !== 'active') { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; } }}
                                onMouseLeave={e => { if (contacts.length > 1 && trackingSession.status !== 'active') { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; } }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
