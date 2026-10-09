import { router } from '@inertiajs/react';

const domains = {
    movie: {
        label: 'Movie',
        eyebrow: 'Film production',
        dashboard: 'Revenue intelligence, scenarios, and historical movie evidence.',
        workbench: 'Production plans, datasets, training, models, and comparisons.',
    },
    advertising: {
        label: 'Advertising',
        eyebrow: 'Campaign planning',
        dashboard: 'Revenue prediction, spend scenarios, and generated campaign dashboards.',
        workbench: 'Feature preparation, approved datasets, training, and deployed models.',
    },
};

export default function DomainSwitcher({ activeDomain, surface }) {
    const select = domain => {
        if (domain !== activeDomain) {
            router.visit(`/${surface}?domain=${domain}`, { preserveScroll: true });
        }
    };

    return <section className="rounded-2xl border border-[#dce2d5] bg-[#edf2e8] p-4 sm:p-5" aria-labelledby="domain-selector-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Decision domain</p>
                <h2 id="domain-selector-title" className="mt-1 text-lg font-semibold text-[#14281c]">Choose your working context</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">The selected domain controls the data, model, and tools shown on this {surface}.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[38rem]" role="tablist" aria-label="Decision domain">
                {Object.entries(domains).map(([id, domain]) => {
                    const active = id === activeDomain;
                    return <button key={id} type="button" role="tab" aria-selected={active} onClick={() => select(id)} className={`rounded-xl border p-3 text-left transition ${active ? 'border-emerald-700 bg-white shadow-sm ring-1 ring-emerald-700' : 'border-transparent bg-white/55 hover:border-emerald-300 hover:bg-white'}`}>
                        <span className="flex items-center justify-between gap-3">
                            <span><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">{domain.eyebrow}</span><span className="mt-0.5 block font-semibold text-slate-900">{domain.label}</span></span>
                            <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-slate-500">{domain[surface]}</span>
                    </button>;
                })}
            </div>
        </div>
    </section>;
}
