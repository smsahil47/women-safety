import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useApp } from '../context/AppContext';

const UpdatePasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useApp();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!password || password.length < 6) {
            addToast('Password must be at least 6 characters', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            addToast('Password updated successfully! Welcome back.', 'success');
            navigate('/dashboard');
        } catch (err: any) {
            addToast(err.message || 'Failed to update password', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="auth-left">
                <div style={{ maxWidth: 340 }} className="fade-up">
                    <div className="flex items-center gap-3 mb-4" style={{ marginBottom: 24 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={20} color="#fff" />
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>SafeRoute</span>
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.25 }}>
                        Secure your account
                    </h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                        Update your password to something memorable yet hard to guess to keep your data protected.
                    </p>
                </div>
            </div>

            <div className="auth-right">
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <div className="fade-up" style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                            Update Password
                        </h2>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                            Enter your new secure password below to regain access.
                        </p>
                    </div>

                    <form onSubmit={submit} className="fade-up d1" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="field">
                            <label className="label-text">New Password</label>
                            <div className="input-wrap">
                                <Lock size={14} className="ic" />
                                <input id="update-password" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input has-icon" />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn btn-primary btn-full" style={{ marginTop: 4, gap: 8 }}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                            {!isLoading && <ArrowRight size={15} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordPage;
