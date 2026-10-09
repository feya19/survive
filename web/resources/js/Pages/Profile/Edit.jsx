import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import AppSidebar from '@/Components/AppSidebar';
import { ArrowLeft, LogOut } from 'lucide-react';

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
        <div className="min-h-screen bg-[#f3f4ef] text-[#1c1f1d] flex flex-col md:flex-row font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414]">
            <Head title="Profile — Survive" />

            <AppSidebar user={user} activeKey="profile" />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto min-h-screen">
                {/* Top Nav Header */}
                <header className="h-16 px-4 sm:px-8 border-b border-[#e2e5dc] flex items-center justify-between bg-[#f3f4ef]/90 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center space-x-3">
                        {/* Brand Badge */}
                        <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-bold text-sm shadow-xs shrink-0">
                                S
                            </div>
                            <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-[#112316]">
                                SURVIVE
                            </span>
                        </div>

                        <span className="h-4 w-px bg-[#d8dcd0] hidden sm:block"></span>

                        <Link
                            href="/scenario-lab"
                            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-[#112316] transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Kembali ke Dasbor</span>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-semibold text-emerald-800 bg-[#e7f6d9] px-2.5 py-0.5 rounded-full border border-[#cde8b4]">
                                Produser Aktif
                            </span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 rounded-lg border border-[#d2d7cb] bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center space-x-1.5 shadow-2xs transition-all"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </header>

                <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
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
