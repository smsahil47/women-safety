import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, EmergencyContact, TrackingSession, SOSStatus, Toast, ToastType } from '../types';
import { MOCK_TRACKING_SESSION } from '../services/mockData';
import { supabase } from '../services/supabase';
import {
    fetchContacts,
    addContactDb,
    removeContactDb,
    upsertProfile,
    createSOSAlert,
    startTrackingSession,
    stopTrackingSession,
} from '../services/api';

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
    contactsLoading: boolean;
    addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
    removeContact: (id: string) => Promise<void>;
    refreshContacts: () => Promise<void>;

    // Tracking
    trackingSession: TrackingSession;
    startTracking: (contactIds?: string[]) => Promise<void>;
    stopTracking: () => Promise<void>;

    // SOS
    sosStatus: SOSStatus;
    sosCountdown: number;
    triggerSOS: (contactIds?: string[]) => void;
    cancelSOS: () => void;
    resetSOS: () => void;

    // Toast
    toasts: Toast[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;

    // Loading
    isLoading: boolean;

    // Active tracking session ID (for location push)
    activeTrackingId: string | null;
}

// ─── Context Creation ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [trackingSession, setTrackingSession] = useState<TrackingSession>(MOCK_TRACKING_SESSION);
    const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
    const [sosStatus, setSosStatus] = useState<SOSStatus>('idle');
    const [sosCountdown, setSosCountdown] = useState(5);
    const sosTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const sosIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingSosContactIds = React.useRef<string[] | undefined>(undefined);
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

    // ── Contacts ─────────────────────────────────────────────────────────────────

    // localStorage helpers — per-user backup so contacts survive even if Supabase is
    // temporarily down or the table hasn't been created yet.
    const lsKey = (uid: string) => `saferoute_contacts_${uid}`;

    const saveContactsLocally = (uid: string, data: EmergencyContact[]) => {
        try { localStorage.setItem(lsKey(uid), JSON.stringify(data)); } catch {}
    };

    const loadContactsLocally = (uid: string): EmergencyContact[] => {
        try {
            const raw = localStorage.getItem(lsKey(uid));
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    };

    const refreshContacts = useCallback(async () => {
        if (!user?.id) return;
        setContactsLoading(true);
        try {
            const data = await fetchContacts(user.id);

            // If Supabase is empty but localStorage has contacts, push them to Supabase
            if (data.length === 0) {
                const local = loadContactsLocally(user.id);
                if (local.length > 0) {
                    console.info(`[Contacts] Syncing ${local.length} local contact(s) to Supabase...`);
                    const synced: EmergencyContact[] = [];
                    for (const c of local) {
                        try {
                            const saved = await addContactDb(user.id, c);
                            synced.push(saved);
                        } catch {
                            synced.push(c); // keep local version if push fails
                        }
                    }
                    setContacts(synced);
                    saveContactsLocally(user.id, synced);
                    return;
                }
            }

            setContacts(data);
            // Keep localStorage in sync with Supabase
            saveContactsLocally(user.id, data);
        } catch (err: any) {
            console.error('Failed to load contacts from Supabase:', err);
            // Fall back to locally-stored contacts so the user still sees their data
            const local = loadContactsLocally(user.id);
            if (local.length > 0) {
                setContacts(local);
                console.info(`[Contacts] Loaded ${local.length} contact(s) from localStorage (Supabase unavailable).`);
            }
        } finally {
            setContactsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ── Auth ────────────────────────────────────────────────────────────────────

    const mapSupabaseUser = (u: any): User => ({
        id: u.id,
        email: u.email || '',
        name: u.user_metadata?.name || 'User',
        phone: u.user_metadata?.phone || '',
        avatar: u.user_metadata?.avatar,
        createdAt: u.created_at || new Date().toISOString(),
        isVerified: Boolean(u.email_confirmed_at),
    });

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const mapped = mapSupabaseUser(session.user);
                setUser(mapped);
                setIsAuthenticated(true);
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session?.user) {
                const mapped = mapSupabaseUser(session.user);
                setUser(mapped);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setContacts([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load contacts whenever user changes
    useEffect(() => {
        if (user?.id) {
            refreshContacts();
        }
    }, [user?.id, refreshContacts]);

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
            const { data: authData, error } = await supabase.auth.signUp({
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

            // Create profile in DB
            if (authData.user) {
                try {
                    await upsertProfile(authData.user.id, {
                        name: data.name,
                        phone: data.phone,
                        email: data.email,
                    });
                } catch (profileError) {
                    console.warn('Profile creation failed (non-fatal):', profileError);
                }
            }

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
        setActiveTrackingId(null);
        setTrackingSession(MOCK_TRACKING_SESSION);
        addToast('Logged out successfully.', 'info');
    }, [addToast]);

    // ── Emergency Contacts ──────────────────────────────────────────────────────

    const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
        if (!user?.id) { addToast('Please log in first', 'error'); return; }
        try {
            // Try saving to Supabase first
            const newContact = await addContactDb(user.id, contact);
            setContacts(prev => {
                const updated = [...prev, newContact];
                saveContactsLocally(user.id!, updated);
                return updated;
            });
            addToast(`${contact.name} added as emergency contact.`, 'success');
        } catch (err: any) {
            console.error('Supabase addContact failed, saving locally:', err);
            // Fallback: save locally with a generated ID so the UI stays functional
            const localContact: EmergencyContact = {
                ...contact,
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            };
            setContacts(prev => {
                const updated = [...prev, localContact];
                saveContactsLocally(user.id!, updated);
                return updated;
            });
            addToast(`${contact.name} saved locally (will sync when connection is restored).`, 'warning');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, addToast]);

    const removeContact = useCallback(async (id: string) => {
        if (!user?.id) return;
        // Optimistically remove from UI + localStorage immediately
        setContacts(prev => {
            const contact = prev.find(c => c.id === id);
            if (contact) addToast(`${contact.name} removed from contacts.`, 'info');
            const updated = prev.filter(c => c.id !== id);
            saveContactsLocally(user.id!, updated);
            return updated;
        });
        // Then try to remove from Supabase (skip local IDs)
        if (!id.startsWith('local-')) {
            try {
                await removeContactDb(id, user.id);
            } catch (err: any) {
                console.warn('Failed to remove contact from Supabase (already removed locally):', err);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, addToast]);

    // ── Tracking ────────────────────────────────────────────────────────────────

    const startTracking = useCallback(async (_contactIds?: string[]) => {
        if (!user?.id) { addToast('Please log in first', 'error'); return; }

        // Get current GPS location
        let location: { lat?: number; lng?: number } = {};
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
            console.warn('Could not get GPS location for tracking start');
        }

        try {
            // Call backend — saves session to DB AND sends SMS to all contacts
            const response = await fetch('http://localhost:5000/api/tracking/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, location }),
            });
            if (!response.ok) throw new Error('Backend unreachable');
            const data = await response.json();
            setActiveTrackingId(data.sessionId);
            addToast(`📍 Live tracking started. ${data.notifiedCount} contact(s) notified via SMS.`, 'success');
        } catch (err) {
            console.warn('Backend tracking/start failed, saving locally:', err);
            // Fallback: save directly to Supabase without SMS
            try {
                const session = await startTrackingSession(user.id);
                setActiveTrackingId(session.id);
            } catch {}
            addToast('Live tracking started (SMS notification unavailable).', 'warning');
        }

        setTrackingSession(prev => ({
            ...prev,
            status: 'active',
            startTime: new Date().toISOString(),
            sharedWith: [],
        }));
    }, [user?.id, addToast]);

    const stopTracking = useCallback(async () => {
        setTrackingSession(prev => ({
            ...prev,
            status: 'inactive',
            endTime: new Date().toISOString(),
        }));
        addToast('Tracking session ended.', 'info');

        if (activeTrackingId) {
            try {
                await stopTrackingSession(activeTrackingId);
                setActiveTrackingId(null);
            } catch (err) {
                console.warn('Failed to end tracking session in DB:', err);
            }
        }
    }, [activeTrackingId, addToast]);

    // ── SOS ─────────────────────────────────────────────────────────────────────

    const dispatchSOS = useCallback(async (contactIds?: string[]) => {
        setSosStatus('sending');

        // Get location if available
        let location: { lat?: number; lng?: number; address?: string } = {};
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
            location = { address: 'Location unavailable' };
        }

        if (user?.id) {
            try {
                const response = await fetch('http://localhost:5000/api/sos/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, location, contactIds })
                });
                if (!response.ok) throw new Error('Backend failed to send SOS');
                setSosStatus('sent');
                addToast('🚨 SOS Alert sent!', 'error');
            } catch (err) {
                console.warn('Backend SOS call failed, falling back to database save:', err);
                try {
                    await createSOSAlert(user.id, location);
                    setSosStatus('sent');
                    addToast('🚨 SOS Alert saved (Backend unreachable for SMS)', 'warning');
                } catch {
                    addToast('Failed to trigger SOS', 'error');
                    setSosStatus('idle');
                }
            }
        } else {
            addToast('Please login to trigger SOS', 'error');
            setSosStatus('idle');
        }
    }, [user?.id, addToast]);

    // triggerSOS starts a 5-second countdown so the user can cancel a mis-tap
    const triggerSOS = useCallback((contactIds?: string[]) => {
        // Clear any existing timers
        if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
        if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);

        pendingSosContactIds.current = contactIds;
        setSosCountdown(5);
        setSosStatus('confirming');

        // Tick countdown every second
        let remaining = 5;
        sosIntervalRef.current = setInterval(() => {
            remaining -= 1;
            setSosCountdown(remaining);
        }, 1000);

        // After 5 s fire the real SOS
        sosTimerRef.current = setTimeout(() => {
            if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
            dispatchSOS(pendingSosContactIds.current);
        }, 5000);
    }, [dispatchSOS]);

    const cancelSOS = useCallback(() => {
        if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
        if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
        setSosStatus('idle');
        setSosCountdown(5);
        addToast('SOS cancelled.', 'info');
    }, [addToast]);

    const resetSOS = useCallback(() => {
        setSosStatus('idle');
        setSosCountdown(5);
    }, []);

    // ── Context Value ───────────────────────────────────────────────────────────

    const value: AppContextType = {
        user, isAuthenticated, login, logout, register, resetPassword,
        contacts, contactsLoading, addContact, removeContact, refreshContacts,
        trackingSession, startTracking, stopTracking,
        sosStatus, sosCountdown, triggerSOS, cancelSOS, resetSOS,
        toasts, addToast, removeToast,
        isLoading,
        activeTrackingId,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useApp = (): AppContextType => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};
