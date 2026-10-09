import React from 'react';
import AppNavbar from '@/Components/AppNavbar';

/**
 * AppSidebar — Sidebar bersama untuk semua halaman SURVIVE.
 *
 * Props:
 *  - user: { name, email }          — data user dari auth
 *  - activeKey: string              — key nav yang sedang aktif ('dashboard' | 'upload')
 *  - onNavigate(page): func         — callback untuk navigasi di dalam ScenarioDashboard (tanpa refresh)
 *                                     Jika undefined, navigasi menggunakan <Link href>
 */
export default function AppSidebar({ user, activeKey = 'dashboard', onNavigate, domain = 'movie' }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Tutup dropdown profil jika klik di luar
    useEffect(() => {
        function handleOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleLogout = () => router.post('/logout');

    const applicationNavItems = [
        {
            key: 'dashboard',
            label: 'Dashboard',
            href: `/dashboard?domain=${domain}`,
            icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
        },
        {
            key: 'workbench',
            label: 'Workbench',
            href: `/workbench?domain=${domain}`,
            icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3 9.5A2.5 2.5 0 015.5 7h13A2.5 2.5 0 0121 9.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 18.5v-9zM8 7V5.5A2.5 2.5 0 0110.5 3h3A2.5 2.5 0 0116 5.5V7m-5 5h2m-10 0h18" />
                </svg>
            ),
        },
    ];
    const legacyNavItems = [
        { ...applicationNavItems[0], href: '/scenario-lab' },
        { ...applicationNavItems[1], key: 'upload', label: 'Unggah Berkas', href: '/upload' },
    ];
    const navItems = onNavigate ? legacyNavItems : applicationNavItems;

    const handleNavClick = (item) => {
        // Jika page in-app (dashboard/upload) dan ada callback onNavigate
        if (onNavigate && (item.key === 'dashboard' || item.key === 'upload')) {
            onNavigate(item.key);
        }
        setMobileOpen(false);
    };

    const initials = user?.name?.charAt(0).toUpperCase() ?? 'A';

    // ──────────────────────────────────────────────
    // Shared nav button (desktop sidebar)
    // ──────────────────────────────────────────────
    const NavButton = ({ item }) => {
        const isActive = activeKey === item.key;
        const className = `
            ${collapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-2.5 space-x-3 justify-start'}
            rounded-xl flex items-center transition-all duration-150
            ${isActive
                ? 'bg-[#1f3a27] text-[#9de062]'
                : 'text-emerald-100/60 hover:bg-[#1a3122] hover:text-white'}
        `;

        const inner = (
            <>
                {item.icon}
                {!collapsed && (
                    <span className="text-xs font-bold truncate leading-none">{item.label}</span>
                )}
            </>
        );

        // Navigasi internal (ScenarioDashboard) vs Link biasa
        if (onNavigate && (item.key === 'dashboard' || item.key === 'upload')) {
            return (
                <button
                    title={item.label}
                    onClick={() => handleNavClick(item)}
                    className={className}
                >
                    {inner}
                </button>
            );
        }

        return (
            <Link href={item.href} title={item.label} className={className}>
                {inner}
            </Link>
        );
    };

    return (
        <>
            {/* ═══════════════════════════════════
                MOBILE: Top Header
            ═══════════════════════════════════ */}
            <div className="md:hidden bg-[#122318] text-white px-4 py-3 flex items-center justify-between border-b border-[#1d3525] sticky top-0 z-40">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#9de062] flex items-center justify-center text-[#102414] font-bold text-base shadow-sm">S</div>
                    <span className="text-[10px] tracking-wider uppercase text-emerald-300 font-bold">SURVIVE</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg bg-[#1a3323] text-emerald-200 hover:text-white"
                    aria-label="Toggle Navigasi"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {mobileOpen
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        }
                    </svg>
                </button>
            </div>

            {/* ═══════════════════════════════════
                MOBILE: Drawer
            ═══════════════════════════════════ */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex"
                    onClick={() => setMobileOpen(false)}
                >
                    <div
                        className="w-64 bg-[#122318] h-full p-5 flex flex-col justify-between shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-[#1e3827] pb-4">
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-bold text-lg">S</div>
                                    <span className="font-extrabold text-sm tracking-wider uppercase text-white">SURVIVE</span>
                                </div>
                                <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <nav className="space-y-1">
                                {navItems.map(item => {
                                    const isActive = activeKey === item.key;
                                    const cls = `w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                        isActive
                                            ? 'bg-[#1f3a27] text-[#9de062]'
                                            : 'text-gray-300 hover:bg-[#1a3122] hover:text-white'
                                    }`;
                                    if (onNavigate && (item.key === 'dashboard' || item.key === 'upload')) {
                                        return (
                                            <button key={item.key} onClick={() => handleNavClick(item)} className={cls}>
                                                {item.icon}<span>{item.label}</span>
                                            </button>
                                        );
                                    }
                                    return (
                                        <Link key={item.key} href={item.href} className={cls} onClick={() => setMobileOpen(false)}>
                                            {item.icon}<span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        <div className="pt-4 border-t border-[#1e3827] flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {initials}
                            </div>
                            <div className="truncate flex-1">
                                <div className="text-xs font-bold text-white truncate">{user?.name ?? 'Producer Admin'}</div>
                                <div className="text-[10px] text-gray-400 truncate">{user?.email ?? ''}</div>
                            </div>
                            <button onClick={handleLogout} title="Keluar" className="text-rose-400 hover:text-rose-300 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════
                DESKTOP: Sidebar (collapsible)
            ═══════════════════════════════════ */}
            <aside
                className={`
                    hidden md:flex flex-col bg-[#122318] shrink-0 border-r border-[#1a3122]
                    h-screen sticky top-0 justify-between py-5
                    transition-all duration-300 ease-in-out relative
                    ${collapsed ? 'w-16 items-center' : 'w-52 items-stretch'}
                `}
            >
                {/* ─── TOP: Logo + Toggle + Nav ─── */}
                <div className="flex flex-col flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
                    {/* Brand row */}
                    {collapsed ? (
                        <div className="flex flex-col items-center space-y-2 mb-6 shrink-0 w-full px-2">
                            <div className="w-9 h-9 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-bold text-lg shadow-sm shrink-0">
                                S
                            </div>
                            <button
                                onClick={() => setCollapsed(false)}
                                title="Perluas sidebar"
                                className="w-7 h-7 rounded-lg bg-[#1a3122] text-emerald-300 hover:bg-[#1f3a27] hover:text-[#9de062] transition-all flex items-center justify-center shadow-2xs"
                            >
                                <svg
                                    className="w-3.5 h-3.5 rotate-180"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between px-3 mb-7 shrink-0 w-full">
                            <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-bold text-lg shadow-sm shrink-0">
                                    S
                                </div>
                                <div className="truncate">
                                    <span className="font-extrabold text-sm tracking-wider uppercase text-white truncate block">
                                        SURVIVE
                                    </span>
                                </div>
                            </div>

                            {/* Tombol Toggle Collapse */}
                            <button
                                onClick={() => setCollapsed(true)}
                                title="Perkecil sidebar"
                                className="shrink-0 w-6 h-6 rounded-lg bg-[#1a3122] text-emerald-300 hover:bg-[#1f3a27] hover:text-[#9de062] transition-all flex items-center justify-center"
                            >
                                <svg
                                    className="w-3.5 h-3.5 transition-transform duration-300"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Nav items */}
                    <nav className={`flex flex-col space-y-1.5 shrink-0 ${collapsed ? 'items-center w-full px-2' : 'px-2'}`}>
                        {navItems.map(item => <NavButton key={item.key} item={item} />)}
                    </nav>
                </div>

                {/* ─── BOTTOM: User profile dropdown ─── */}
                <div className={`shrink-0 w-full relative ${collapsed ? 'px-2 flex flex-col items-center' : 'px-2'}`} ref={profileRef}>
                    {/* Profile dropdown — muncul ke samping kanan jika collapsed, atau ke atas jika expanded */}
                    {profileOpen && (
                        <div className={`bg-[#0d1c12] border border-[#1e3827] rounded-xl overflow-hidden shadow-2xl z-50 ${
                            collapsed
                                ? 'absolute left-full ml-3 bottom-0 w-60'
                                : 'mb-2 w-full'
                        }`}>
                            <div className="px-3 py-3 border-b border-[#1e3827]">
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">{user?.name ?? 'Producer Admin'}</div>
                                        <div className="text-[10px] text-emerald-400/70 truncate">{user?.email ?? ''}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="py-1">
                                <Link
                                    href="/profile"
                                    onClick={() => setProfileOpen(false)}
                                    className={`flex items-center space-x-2.5 px-3 py-2 text-xs w-full transition-colors ${
                                        activeKey === 'profile'
                                            ? 'text-[#9de062] bg-[#1f3a27]'
                                            : 'text-gray-300 hover:bg-[#1a3122] hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Profil Saya</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-[#2a1a1a] hover:text-rose-300 transition-colors w-full"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Keluar</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Avatar button */}
                    <div className="w-full pt-3 border-t border-[#1d3525] flex justify-center">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            title={user?.name ?? 'Profil'}
                            className={`
                                group transition-all flex items-center
                                ${collapsed ? 'w-10 h-10 justify-center rounded-xl hover:bg-[#1a3122]' : 'w-full space-x-2.5 justify-start px-1 py-1 rounded-xl hover:bg-[#1a3122]/50'}
                            `}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all">
                                {initials}
                            </div>
                            {!collapsed && (
                                <>
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                        <div className="text-xs font-bold text-white truncate w-full text-left">{user?.name ?? 'Producer'}</div>
                                        <div className="text-[10px] text-emerald-400/60 truncate w-full text-left">{user?.email ?? ''}</div>
                                    </div>
                                    <svg
                                        className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
