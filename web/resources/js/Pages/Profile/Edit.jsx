import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import AppNavbar from '@/Components/AppNavbar';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const handleLogout = () => router.post('/logout');

    // 2 initials for the circular avatar (e.g. "MC" or "TU")
    const initials = (() => {
        if (!user?.name) return 'MC';
        const parts = user.name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return user.name.substring(0, 2).toUpperCase();
    })();

    const memberSince = (() => {
        if (user?.created_at) {
            try {
                const d = new Date(user.created_at);
                return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } catch {
                return 'March 2024';
            }
        }
        return 'March 2024';
    })();

    return (
        <div className="min-h-screen bg-[#f3f4ef] text-[#1c1f1d] flex flex-col font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414]">
            <Head title="Profile — Survive" />

            <AppNavbar user={user} activeKey="profile" title="Profil Saya" />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">

                <div className="w-full px-6 py-8 sm:px-8 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column: Profile Card */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-2xl border border-[#e5e9df] p-7 flex flex-col items-center text-center shadow-2xs">
                                {/* Circular Avatar */}
                                <div className="w-20 h-20 rounded-full bg-[#ebdcd0] text-[#78593e] flex items-center justify-center font-bold text-2xl shadow-xs">
                                    {initials}
                                </div>

                                {/* Name & Titles from users table */}
                                <h2 className="text-lg font-bold text-[#112316] mt-4">
                                    {user?.name || 'Producer'}
                                </h2>
                                <p className="text-xs text-gray-500 font-normal mt-0.5">
                                    {user?.email || ''}
                                </p>
                                <div className="mt-2">
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#ebf3e2] text-[#2c551f] text-[11px] font-semibold border border-[#d6e7c7]">
                                        Producer · Admin
                                    </span>
                                </div>

                                {/* Change photo button */}
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl border border-[#d2d7cb] bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 mt-5 shadow-2xs transition-all"
                                >
                                    Change photo
                                </button>

                                {/* Divider */}
                                <div className="border-t border-[#edf0ea] w-full my-6"></div>

                                {/* Meta details from users table */}
                                <div className="text-left w-full space-y-4">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                            MEMBER SINCE
                                        </span>
                                        <span className="text-xs font-bold text-[#112316] mt-1 block">
                                            {memberSince}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                            ACCESS LEVEL
                                        </span>
                                        <span className="text-xs font-bold text-[#112316] mt-1 block">
                                            Producer · Admin
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Cards */}
                        <div className="lg:col-span-8 space-y-6">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />

                            <UpdatePasswordForm />

                            <DeleteUserForm />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
