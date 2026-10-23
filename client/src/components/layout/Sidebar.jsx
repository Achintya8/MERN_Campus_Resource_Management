import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();

    return (
        <div className="sidebar">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                    src="/logo.jpg" 
                    alt="RV Logo" 
                    style={{ 
                        width: '36px', 
                        height: '36px', 
                        objectFit: 'contain',
                        borderRadius: '6px',
                        background: '#fff',
                        padding: '2px'
                    }} 
                />
                <span>CRM</span>
            </div>
            <ul className="nav-links">
                <li>
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">grid_view</span> 
                        <span>Dashboard</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/resources" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">meeting_room</span> 
                        <span>Resources</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">event_note</span> 
                        <span>Bookings</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                        <span className="material-icons">account_circle</span> 
                        <span>Profile</span>
                    </NavLink>
                </li>
                {user?.role === 'admin' && (
                    <li className="admin-only">
                        <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="material-icons">verified_user</span> 
                            <span>Approvals</span>
                        </NavLink>
                    </li>
                )}
                <li style={{ marginTop: 'auto' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                        <span className="material-icons">logout</span> 
                        <span>Logout</span>
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
