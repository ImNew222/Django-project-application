import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
    Settings, Lock, Trash2, AlertTriangle,
    Save, Eye, EyeOff, Shield
} from 'lucide-react';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Password change
    const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', new_password2: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // Delete account
    const [showDelete, setShowDelete] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.new_password2) {
            addToast('New passwords do not match.', 'error');
            return;
        }
        setPwLoading(true);
        try {
            await authAPI.changePassword(pwForm);
            addToast('Password changed successfully!', 'success');
            setPwForm({ old_password: '', new_password: '', new_password2: '' });
        } catch (err) {
            const data = err.response?.data;
            const msg = data?.old_password || data?.new_password || data?.new_password2 || 'Failed to change password.';
            addToast(msg, 'error');
        } finally {
            setPwLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await authAPI.deleteAccount({ password: deletePassword });
            addToast('Account deleted.', 'info');
            logout();
            navigate('/login');
        } catch (err) {
            const msg = err.response?.data?.password || 'Failed to delete account.';
            addToast(msg, 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <h1><Settings size={28} /> Settings</h1>

            {/* Account Info */}
            <div className="settings-card">
                <h2><Shield size={20} /> Account Information</h2>
                <div className="settings-info-row">
                    <span className="info-label">Username</span>
                    <span>{user?.username}</span>
                </div>
                <div className="settings-info-row">
                    <span className="info-label">Email</span>
                    <span>{user?.email}</span>
                </div>
                <div className="settings-info-row">
                    <span className="info-label">Role</span>
                    <span className={`profile-role role-${user?.role}`}>{user?.role}</span>
                </div>
            </div>

            {/* Change Password */}
            <div className="settings-card">
                <h2><Lock size={20} /> Change Password</h2>
                <form onSubmit={handlePasswordChange} className="settings-form">
                    <div className="form-field">
                        <label>Current Password</label>
                        <div className="input-with-icon">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={pwForm.old_password}
                                onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
                                required
                            />
                            <button type="button" className="btn-icon" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-field">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={pwForm.new_password}
                            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                            minLength={6}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={pwForm.new_password2}
                            onChange={(e) => setPwForm({ ...pwForm, new_password2: e.target.value })}
                            minLength={6}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                        <Save size={14} /> {pwLoading ? 'Saving...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="settings-card danger-zone">
                <h2><AlertTriangle size={20} /> Danger Zone</h2>
                <p>Deleting your account is permanent. All your data, quiz history, and posts will be lost.</p>
                {!showDelete ? (
                    <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
                        <Trash2 size={14} /> Delete My Account
                    </button>
                ) : (
                    <div className="delete-confirm">
                        <p><strong>Enter your password to confirm:</strong></p>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Your password"
                        />
                        <div className="delete-actions">
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading || !deletePassword}
                            >
                                <Trash2 size={14} /> {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowDelete(false); setDeletePassword(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
