export default function DashboardCard({ title, description, children, aside }) {
    return <section className="rounded-2xl border border-[#e1e4da] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#eff1eb] pb-3">
            <div><h2 className="text-lg font-semibold text-[#112316]">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}</div>
            {aside}
        </div>{children}
    </section>;
}
