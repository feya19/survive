import DashboardCard from '@/Components/DashboardCard';

export default function DashboardGenerateForm({
    title = 'Generate dashboard',
    description,
    datasets = [],
    selectedDataset,
    onDatasetChange,
    templates = [],
    selectedTemplate,
    onTemplateChange,
    busy = false,
    disabled = false,
    emptyMessage,
    workbenchUrl,
    workbenchLabel = 'Open Workbench',
    buttonLabel = 'Generate dashboard and insight',
    onSubmit,
}) {
    const readyDatasets = datasets.filter(dataset => dataset.ready_for_analytics);
    const templateSelected = templates.some(item => item.id === selectedTemplate);
    const unavailable = !readyDatasets.length || !templateSelected;

    return <DashboardCard title={title} description={description}>
        {emptyMessage && !readyDatasets.length && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{emptyMessage}</span>{workbenchUrl && <a href={workbenchUrl} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">{workbenchLabel}</a>}</div>}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500" aria-label="Dashboard generation workflow">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">1. Validated dataset</span>
            <span aria-hidden="true">›</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">2. Dashboard layout</span>
            <span aria-hidden="true">›</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">3. Dashboard and insight</span>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
            <label className="block text-sm font-semibold text-slate-700">
                Validated dataset
                <select value={selectedDataset} onChange={event => onDatasetChange(event.target.value)} className="mt-1.5 w-full rounded-lg border-slate-300 text-sm" required>
                    <option value="">Select a validated dataset</option>
                    {readyDatasets.map(dataset => <option key={dataset.id} value={dataset.id}>
                        {dataset.filename}{dataset.production_name ? ` · ${dataset.production_name}` : ''}
                    </option>)}
                </select>
            </label>

            <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-700">Choose a dashboard layout</legend>
                <div className="grid gap-3 md:grid-cols-3" role="group" aria-label="Dashboard templates">
                    {templates.map(item => <button key={item.id} type="button" onClick={() => onTemplateChange(item.id)} aria-pressed={selectedTemplate === item.id} className={`rounded-xl border p-4 text-left transition ${selectedTemplate === item.id ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700' : 'border-slate-200 hover:border-emerald-400'}`}>
                        <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                    </button>)}
                </div>
            </fieldset>

            <div className="flex justify-end border-t border-[#eff1eb] pt-4">
                <button disabled={busy || disabled || unavailable || !selectedDataset} className="rounded-lg bg-[#14281c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                    {busy ? 'Generating dashboard…' : buttonLabel}
                </button>
            </div>
        </form>
    </DashboardCard>;
}
