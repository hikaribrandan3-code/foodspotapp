// src/pages/customer/Info.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import './Info.css';

const Info = () => {
    const navigate = useNavigate();
    const { tenantSlug } = useTenant();

    return (
        <div className="info-container">
            <h1 className="info-title">Restaurant Information</h1>
            <div className="info-buttons">
                <button className="info-button staff-button" onClick={() => navigate(`/${tenantSlug}/staff`)}>
                    Staff Portal
                </button>
                <button className="info-button admin-button" onClick={() => navigate(`/${tenantSlug}/owner`)}>
                    Admin Dashboard
                </button>
            </div>
        </div>
    );
};
export default Info;
