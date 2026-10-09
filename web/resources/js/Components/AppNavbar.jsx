import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function AppNavbar({
    title = 'Revenue dashboard',
    subtitle = 'SURVIVE · MOVIE INTELLIGENCE',
    activeKey,
    actions,
    user: propUser,
}) {
    const { auth } = usePage().props;
    const url = usePage().url || '';
    const user = propUser ?? auth?.user;

    const safeRoute = (name, fallback) => {
        try {
            return typeof route === 'function' ? route(name) : fallback;
        } catch {
            return fallback;
        }
    };

    const currentKey = activeKey ?? (
        url.startsWith('/scenario-lab') ? 'scenario-lab' :
        url.startsWith('/workbench') || url.startsWith('/upload') ? 'workbench' :
        url.startsWith('/profile') ? 'profile' :
        url.startsWith('/dashboard') || url === '/' ? 'dashboard' : ''
    );

    const navLinks = [
        { key: 'dashboard', label: 'Movie dashboard', href: '/dashboard' },
        { key: 'scenario-lab', label: 'Scenario lab', href: '/scenario-lab' },
        { key: 'workbench', label: 'Production workbench', href: '/workbench' },
    ];

    return (
        <header className="w-full bg-[#14281c] text-white">
            <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3.5 sm:px-8 lg:px-10">
                {/* Brand & Page Title */}
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="group flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9de062] text-xs font-black text-[#102414] shadow-sm transition group-hover:bg-lime-200">
                            S
                        </div>
                    </Link>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-lime-300">
                            {subtitle}
                        </div>
                        <h1 className="mt-0.5 text-xl font-semibold leading-tight text-white">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Right side navigation matching screenshot */}
                <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs font-medium">
                    {navLinks.map((item) => {
                        const isActive = currentKey === item.key;
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`rounded-lg px-3.5 py-1.5 transition ${
                                    isActive
                                        ? 'bg-[#22442e] text-[#a6ec6c] border border-[#315e41] shadow-2xs'
                                        : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}

                    {actions}

                    {user?.name && (
                        <span className="text-emerald-100/90 max-w-36 truncate ml-1.5" title={user.name}>
                            {user.name}
                        </span>
                    )}

                    <Link
                        href={safeRoute('profile.edit', '/profile')}
                        className={`transition hover:underline ${
                            currentKey === 'profile' ? 'text-lime-300 font-semibold underline' : 'text-emerald-100/90 hover:text-white'
                        }`}
                    >
                        Profile
                    </Link>
                    <Link
                        href={safeRoute('logout', '/logout')}
                        method="post"
                        as="button"
                        className="text-emerald-100/90 hover:text-white hover:underline cursor-pointer"
                    >
                        Log out
                    </Link>
                </div>
            </div>
        </header>
    );
}
