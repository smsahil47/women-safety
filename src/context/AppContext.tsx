import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, EmergencyContact, TrackingSession, SOSStatus, Toast, ToastType } from '../types';
import { MOCK_CONTACTS, MOCK_TRACKING_SESSION } from '../services/mockData';
import { supabase } from '../services/supabase';
// ─── App Context Types ────────────────────────────────────────────────────────

interface AppContextType {
    // Auth
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    register: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;

    // Emergency Contacts
    contacts: EmergencyContact[];
    addContact: (contact: Omit<EmergencyContact, 'id'>) => void;
    removeContact: (id: string) => void;

    // Tracking
    trackingSession: TrackingSession;
    startTracking: () => void;
    stopTracking: () => void;

    // SOS
    sosStatus: SOSStatus;
    triggerSOS: () => void;
    cancelSOS: () => void;
    resetSOS: () => void;

    // Toast
    toasts: Toast[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;

    // Loading
    isLoading: boolean;
}

// ─── Context Creation ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [contacts, setContacts] = useState<EmergencyContact[]>(MOCK_CONTACTS);
    const [trackingSession, setTrackingSession] = useState<TrackingSession>(MOCK_TRACKING_SESSION);
    const [sosStatus, setSosStatus] = useState<SOSStatus>('idle');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ── Toast ───────────────────────────────────────────────────────────────────

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Auth ────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const u = session.user;
                setUser({
                    id: u.id,
                    email: u.email || '',
                    name: u.user_metadata?.name || 'User',
                    phone: u.user_metadata?.phone || '',
                    avatar: u.user_metadata?.avatar,
                    createdAt: u.created_at || new Date().toISOString(),
                    isVerified: true
                });
                setIsAuthenticated(true);
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session?.user) {
                const u = session.user;
                setUser({
                    id: u.id,
                    email: u.email || '',
                    name: u.user_metadata?.name || 'User',
                    phone: u.user_metadata?.phone || '',
                    avatar: u.user_metadata?.avatar,
                    createdAt: u.created_at || new Date().toISOString(),
                    isVerified: true
                });
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        });
        
        return () => subscription.unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            const firstName = data.user?.user_metadata?.name?.split(' ')[0] || 'there';
            addToast(`Welcome back, ${firstName}! Stay safe 💜`, 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to login', 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const register = useCallback(async (data: { name: string; email: string; phone: string; password: string }) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        phone: data.phone,
                    }
                }
            });
            
            if (error) throw error;
            
            addToast('Account created! Welcome to SafeRoute 💜', 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to register', 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const resetPassword = useCallback(async (email: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            addToast('Password reset link sent to your email!', 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to send reset link', 'error');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setSosStatus('idle');
        addToast('Logged out successfully.', 'info');
    }, [addToast]);

    // ── Emergency Contacts ──────────────────────────────────────────────────────

    const addContact = useCallback((contact: Omit<EmergencyContact, 'id'>) => {
        const newContact: EmergencyContact = { ...contact, id: `contact-${Date.now()}` };
        setContacts(prev => [...prev, newContact]);
        addToast(`${contact.name} added as emergency contact.`, 'success');
    }, [addToast]);

    const removeContact = useCallback((id: string) => {
        setContacts(prev => {
            const contact = prev.find(c => c.id === id);
            if (contact) addToast(`${contact.name} removed from contacts.`, 'info');
            return prev.filter(c => c.id !== id);
        });
    }, [addToast]);

    // ── Tracking ────────────────────────────────────────────────────────────────

    const startTracking = useCallback(() => {
        setTrackingSession(prev => ({
            ...prev,
            status: 'active',
            startTime: new Date().toISOString(),
        }));
        addToast('Live tracking started. Contacts notified.', 'success');
    }, [addToast]);

    const stopTracking = useCallback(() => {
        setTrackingSession(prev => ({
            ...prev,
            status: 'inactive',
            endTime: new Date().toISOString(),
        }));
        addToast('Tracking session ended.', 'info');
    }, [addToast]);

    // ── SOS ─────────────────────────────────────────────────────────────────────

    const triggerSOS = useCallback(async () => {
        setSosStatus('sending');
        await new Promise(r => setTimeout(r, 2000));
        setSosStatus('sent');
        addToast('🚨 SOS Alert sent to all emergency contacts!', 'error');
    }, [addToast]);

    const cancelSOS = useCallback(() => {
        setSosStatus('idle');
        addToast('SOS cancelled.', 'info');
    }, [addToast]);

    const resetSOS = useCallback(() => {
        setSosStatus('idle');
    }, []);

    // ── Context Value ───────────────────────────────────────────────────────────

    const value: AppContextType = {
        user, isAuthenticated, login, logout, register, resetPassword,
        contacts, addContact, removeContact,
        trackingSession, startTracking, stopTracking,
        sosStatus, triggerSOS, cancelSOS, resetSOS,
        toasts, addToast, removeToast,
        isLoading,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useApp = (): AppContextType => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};
