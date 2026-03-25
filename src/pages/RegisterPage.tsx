import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, Mail, Lock, User, Phone, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

type RegErrors = { email?: string; name?: string; phone?: string; password?: string; confirm?: string; };
type RegForm = { email: string; name: string; phone: string; password: string; confirm: string; };
const EMPTY: RegForm = { email: '', name: '', phone: '', password: '', confirm: '' };

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const StepNode: React.FC<{ n: number; label: string; step: number }> = ({ n, label, step }) => {
    const done = step > n; const active = step === n;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div className={`step-node ${done ? 'step-done' : active ? 'step-active' : 'step-idle'}`}>
                {done ? <Check size={13} /> : n}
            </div>
            <span style={{ fontSize: 11, color: active || done ? 'var(--indigo)' : 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
        </div>
    );
};

const RegisterPage: React.FC = () => {
    const { register, isLoading } = useApp();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<RegForm>(EMPTY);
    const [errors, setErrors] = useState<RegErrors>({});
    const [showPw, setShowPw] = useState(false);

    const set = (k: keyof RegForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const validate = (s: number): boolean => {
        const e: RegErrors = {};
        if (s === 1) {
            if (!form.email) e.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
        }
        if (s === 2) {
            if (!form.name.trim()) e.name = 'Full name required';
            if (!form.phone.trim()) e.phone = 'Phone number required';
        }
        if (s === 3) {
            if (!form.password) e.password = 'Password required';
            else if (form.password.length < 8) e.password = 'Minimum 8 characters';
            if (!form.confirm) e.confirm = 'Please confirm password';
            else if (form.confirm !== form.password) e.confirm = "Passwords don't match";
        }
        setErrors(e); return !Object.keys(e).length;
    };

    const next = () => { if (validate(step)) setStep(s => s + 1); };
    const back = () => { setErrors({}); setStep(s => s - 1); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate(3)) return;
        try {
            await register({ email: form.email, password: form.password, name: form.name, phone: form.phone });
            navigate('/dashboard');
        } catch (err) {
            // Expected error structure already handled in Context Toast
        }
    };

    const inputCls = (k: keyof RegErrors) => `input has-icon${errors[k] ? ' err' : ''}`;

    return (
        <div className="auth-wrap">
            {/* Left */}
            <div className="auth-left">
                <div style={{ maxWidth: 320 }} className="fade-up">
                    <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={20} color="#fff" />
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>SafeRoute</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.015em' }}>Create your account</h2>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                        Join SafeRoute to access AI-powered safety features, live tracking, and community-based safety reports.
                    </p>
                    <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                            🔒 Your data is encrypted and never shared with third parties.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right */}
            <div className="auth-right">
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <div className="fade-up" style={{ marginBottom: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Create Account</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Step {step} of 3</p>
                    </div>

                    {/* Stepper */}
                    <div className="fade-up d1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
                        <StepNode n={1} label="Account" step={step} />
                        <div className={`step-line ${step > 1 ? 'done' : 'idle'}`} style={{ marginTop: 14 }} />
                        <StepNode n={2} label="Profile" step={step} />
                        <div className={`step-line ${step > 2 ? 'done' : 'idle'}`} style={{ marginTop: 14 }} />
                        <StepNode n={3} label="Security" step={step} />
                    </div>

                    <form onSubmit={submit} className="fade-up d2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {step === 1 && (
                            <>
                                <div className="field">
                                    <label className="label-text">Email address</label>
                                    <div className="input-wrap">
                                        <Mail size={14} className="ic" />
                                        <input id="reg-email" type="email" value={form.email} onChange={set('email')}
                                            placeholder="priya@email.com" className={inputCls('email')} />
                                    </div>
                                    {errors.email && <span className="err-msg">{errors.email}</span>}
                                </div>
                                <button type="button" onClick={next} className="btn btn-primary btn-full" style={{ marginTop: 4, gap: 8 }}>
                                    Continue <ArrowRight size={15} />
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="field">
                                    <label className="label-text">Full name</label>
                                    <div className="input-wrap">
                                        <User size={14} className="ic" />
                                        <input id="reg-name" type="text" value={form.name} onChange={set('name')}
                                            placeholder="Priya Sharma" className={inputCls('name')} />
                                    </div>
                                    {errors.name && <span className="err-msg">{errors.name}</span>}
                                </div>
                                <div className="field">
                                    <label className="label-text">Phone number</label>
                                    <div className="input-wrap">
                                        <Phone size={14} className="ic" />
                                        <input id="reg-phone" type="tel" value={form.phone} onChange={set('phone')}
                                            placeholder="+91 98765 43210" className={inputCls('phone')} />
                                    </div>
                                    {errors.phone && <span className="err-msg">{errors.phone}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button type="button" onClick={back} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
                                    <button type="button" onClick={next} className="btn btn-primary" style={{ flex: 2, gap: 8 }}>
                                        Continue <ArrowRight size={15} />
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div className="field">
                                    <label className="label-text">Password</label>
                                    <div className="input-wrap">
                                        <Lock size={14} className="ic" />
                                        <input id="reg-password" type={showPw ? 'text' : 'password'}
                                            value={form.password} onChange={set('password')}
                                            placeholder="Minimum 8 characters"
                                            className={inputCls('password')} style={{ paddingRight: 36 }} />
                                        <button type="button" className="no-btn" onClick={() => setShowPw(!showPw)}
                                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="err-msg">{errors.password}</span>}
                                </div>
                                <div className="field">
                                    <label className="label-text">Confirm password</label>
                                    <div className="input-wrap">
                                        <Lock size={14} className="ic" />
                                        <input id="reg-confirm" type="password" value={form.confirm} onChange={set('confirm')}
                                            placeholder="Repeat password" className={inputCls('confirm')} />
                                    </div>
                                    {errors.confirm && <span className="err-msg">{errors.confirm}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button type="button" onClick={back} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
                                    <button type="submit" id="reg-submit" disabled={isLoading} className="btn btn-primary" style={{ flex: 2, gap: 8 }}>
                                        {isLoading ? <Spinner /> : <Check size={15} />}
                                        {isLoading ? 'Creating…' : 'Create Account'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <p className="fade-up d3" style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', marginTop: 24 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
