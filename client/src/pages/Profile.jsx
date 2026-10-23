import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
    const { user, updateUser } = useAuth();

    // Form states
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [profilePic, setProfilePic] = useState(user?.profile_pic || '');
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [passMsg, setPassMsg] = useState({ type: '', text: '' });
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setProfilePic(user.profile_pic || '');
        }

        // Fetch fresh details if created_at is missing
        const fetchFreshUser = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data) {
                    updateUser(res.data);
                    setFullName(res.data.full_name || '');
                    setProfilePic(res.data.profile_pic || '');
                }
            } catch (err) {
                console.error("Failed to fetch profile details", err);
            }
        };

        if (!user?.created_at) {
            fetchFreshUser();
        }
    }, [user?.id]);

    if (!user) return null;

    // Format Joined Date safely
    let formattedJoinedDate = 'N/A';
    if (user.created_at) {
        const dateObj = new Date(user.created_at);
        if (!isNaN(dateObj.getTime())) {
            formattedJoinedDate = dateObj.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    // Handle File Upload to Base64 for Profile Pic
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setProfileMsg({ type: 'error', text: 'Image size should be less than 2MB' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Save Profile (Full Name & Profile Pic)
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileMsg({ type: '', text: '' });
        setProfileLoading(true);
        try {
            const res = await api.put('/auth/profile', {
                full_name: fullName,
                profile_pic: profilePic
            });
            updateUser(res.data.user);
            setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setProfileMsg({ 
                type: 'error', 
                text: err.response?.data?.error || 'Failed to update profile' 
            });
        } finally {
            setProfileLoading(false);
        }
    };

    // Change Password
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setPassMsg({ type: '', text: '' });

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPassMsg({ type: 'error', text: 'Please fill in all password fields' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPassMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 4) {
            setPassMsg({ type: 'error', text: 'New password must be at least 4 characters long' });
            return;
        }

        setPassLoading(true);
        try {
            const res = await api.put('/auth/password', {
                currentPassword,
                newPassword
            });
            setPassMsg({ type: 'success', text: res.data.message || 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPassMsg({ 
                type: 'error', 
                text: err.response?.data?.error || 'Failed to update password' 
            });
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <>
            <header>
                <h2>User Profile</h2>
                <p style={{ color: 'var(--text-muted)' }}>Manage your personal details and security settings</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* Profile Overview & Details Card */}
                <div className="card">
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ 
                            width: '110px', 
                            height: '110px', 
                            borderRadius: '50%', 
                            margin: '0 auto 15px',
                            overflow: 'hidden',
                            border: '3px solid var(--primary-light)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)'
                        }}>
                            {profilePic ? (
                                <img 
                                    src={profilePic} 
                                    alt="Profile Avatar" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = ''; setProfilePic(''); }}
                                />
                            ) : (
                                <span className="material-icons" style={{ fontSize: '70px' }}>account_circle</span>
                            )}
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{fullName || user.username}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>@{user.username}</p>
                        <span className="status-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                            {user.role}
                        </span>
                    </div>

                    <form onSubmit={handleSaveProfile} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Edit Profile Info</h4>

                        {profileMsg.text && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                fontSize: '0.9rem',
                                backgroundColor: profileMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                                color: profileMsg.type === 'success' ? '#166534' : '#991b1b',
                                border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
                            }}>
                                {profileMsg.text}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                placeholder="Enter your full name" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                            />
                        </div>

                        <div className="form-group">
                            <label>Profile Picture</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                                style={{ padding: '8px', fontSize: '0.85rem' }}
                            />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                                <strong>#{user.id}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Joined Date</span>
                                <strong>{formattedJoinedDate}</strong>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="cta-btn" 
                            style={{ width: '100%', marginTop: '10px' }}
                            disabled={profileLoading}
                        >
                            {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </form>
                </div>

                {/* Password Update Card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
                        <span className="material-icons" style={{ color: 'var(--primary)', fontSize: '28px' }}>lock_reset</span>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Update Password</h3>
                    </div>

                    {passMsg.text && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            fontSize: '0.9rem',
                            backgroundColor: passMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color: passMsg.type === 'success' ? '#166534' : '#991b1b',
                            border: `1px solid ${passMsg.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
                        }}>
                            {passMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword}>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input 
                                type={showPasswords ? 'text' : 'password'} 
                                placeholder="Enter current password" 
                                value={currentPassword} 
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input 
                                type={showPasswords ? 'text' : 'password'} 
                                placeholder="Enter new password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input 
                                type={showPasswords ? 'text' : 'password'} 
                                placeholder="Confirm new password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                id="showPassToggle" 
                                checked={showPasswords} 
                                onChange={(e) => setShowPasswords(e.target.checked)} 
                                style={{ width: 'auto', cursor: 'pointer' }}
                            />
                            <label htmlFor="showPassToggle" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                                Show Passwords
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            className="cta-btn" 
                            style={{ width: '100%', backgroundColor: 'var(--secondary)' }}
                            disabled={passLoading}
                        >
                            {passLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

            </div>
        </>
    );
};

export default Profile;
