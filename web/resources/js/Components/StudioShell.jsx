import { Head } from '@inertiajs/react';
import AppSidebar from '@/Components/AppSidebar';
import DomainSwitcher from '@/Components/DomainSwitcher';

export default function StudioShell({ user, surface, domain, title, children }) {
    return <div className="min-h-screen bg-[#f3f4ef] font-sans antialiased text-[#1c1f1d] md:flex">
        <Head title={title} />
        <AppSidebar user={user} activeKey={surface} domain={domain} />
        <main className="min-h-screen min-w-0 flex-1 overflow-y-auto">
            <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#e2e5dc] bg-[#f3f4ef]/90 px-4 backdrop-blur sm:px-8">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">SURVIVE STUDIO</p><h1 className="text-lg font-semibold text-[#112316]">{surface === 'dashboard' ? 'Dashboard' : 'Workbench'}</h1></div>
            </header>
            <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-8">
                <DomainSwitcher activeDomain={domain} surface={surface} />
                {children}
            </div>
        </main>
    </div>;
}
