import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const LoginPage: React.FC = () => {
    const { login, resetPassword, isLoading } = useApp();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isForgot, setIsForgot] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = () => {
        const e: { email?: string; password?: string } = {};
        if (!email) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
        if (!password) e.password = 'Password is required';
        setErrors(e); return !Object.keys(e).length;
    };

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        
        if (isForgot) {
            const e: { email?: string } = {};
            if (!email) e.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
            setErrors(e);
            if (Object.keys(e).length) return;

            try {
                await resetPassword(email);
                setIsForgot(false);
            } catch (err) {}
            return;
        }

        if (!validate()) return;
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (e) {
            // Error managed by Context Toasts
        }
    };

    return (
        <div className="auth-wrap">
            {/* Left – branding */}
            <div className="auth-left">
                <div style={{ maxWidth: 340 }} className="fade-up">
                    <div className="flex items-center gap-3 mb-4" style={{ marginBottom: 24 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={20} color="#fff" />
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>SafeRoute</span>
                    </div>

                    <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.25 }}>
                        Your personal<br />safety companion
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 32 }}>
                        AI-powered route safety, live location sharing, and instant emergency alerts.
                    </p>

                    <div className="flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { icon: '🗺️', text: 'Safest route recommendations' },
                            { icon: '📍', text: 'Real-time location tracking' },
                            { icon: '🚨', text: 'One-tap SOS emergency alerts' },
                            { icon: '👥', text: 'Community safety reports' },
                        ].map(f => (
                            <div key={f.text} className="flex items-center gap-3"
                                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                                <span style={{ fontSize: 16 }}>{f.icon}</span>
                                {f.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right – form */}
            <div className="auth-right">
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <div className="fade-up" style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                            {isForgot ? 'Reset Password' : 'Sign in'}
                        </h2>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                            {isForgot ? 'Enter your email to receive a reset link' : 'Welcome back to SafeRoute'}
                        </p>
                    </div>

                    <form onSubmit={submit} className="fade-up d1" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="field">
                            <label className="label-text">Email</label>
                            <div className="input-wrap">
                                <Mail size={14} className="ic" />
                                <input id="login-email" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="priya@email.com"
                                    className={`input has-icon${errors.email ? ' err' : ''}`} />
                            </div>
                            {errors.email && <span className="err-msg">{errors.email}</span>}
                        </div>

                        {!isForgot && (
                            <div className="field">
                                <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label className="label-text" style={{ marginBottom: 0 }}>Password</label>
                                    <button type="button" onClick={() => setIsForgot(true)} style={{ fontSize: 12, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot?</button>
                                </div>
                                <div className="input-wrap">
                                    <Lock size={14} className="ic" />
                                    <input id="login-password" type={showPw ? 'text' : 'password'}
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`input has-icon${errors.password ? ' err' : ''}`}
                                        style={{ paddingRight: 36 }} />
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="no-btn"
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {errors.password && <span className="err-msg">{errors.password}</span>}
                            </div>
                        )}

                        <button type="submit" id="login-submit" disabled={isLoading}
                            className="btn btn-primary btn-full" style={{ marginTop: 4, gap: 8 }}>
                            {isLoading ? <Spinner /> : null}
                            {isForgot ? (isLoading ? 'Sending...' : 'Send Reset Link') : (isLoading ? 'Signing in…' : 'Sign In')}
                            {!isLoading && !isForgot && <ArrowRight size={15} />}
                        </button>
                    </form>

                    {!isForgot ? (
                        <>
                            <p className="fade-up d3" style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', marginTop: 24 }}>
                                Don't have an account?{' '}
                                <Link to="/register" style={{ color: 'var(--indigo)', fontWeight: 500, textDecoration: 'none' }}>Create account</Link>
                            </p>
                        </>
                    ) : (
                        <p className="fade-up d2" style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', marginTop: 24 }}>
                            Remembered your password?{' '}
                            <button type="button" onClick={() => setIsForgot(false)} style={{ color: 'var(--indigo)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Back to login</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
