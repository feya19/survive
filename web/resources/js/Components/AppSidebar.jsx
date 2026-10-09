import React from 'react';
import AppNavbar from '@/Components/AppNavbar';

export default function AppSidebar({ user, activeKey = 'dashboard', onNavigate, ...props }) {
    return <AppNavbar user={user} activeKey={activeKey} {...props} />;
}
