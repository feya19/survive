import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import StudioShell from '@/Components/StudioShell';
import DashboardCard from '@/Components/DashboardCard';
import DashboardGenerateForm from '@/Components/DashboardGenerateForm';

const money = value => value == null || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));

const templates = [
    { id: 'executive', title: 'Executive overview', description: 'Channel, industry, and spend overview.' },
    { id: 'channel_mix', title: 'Channel mix', description: 'Platform and campaign type comparison.' },
    { id: 'industry', title: 'Industry benchmark', description: 'Industry revenue with channel context.' },
];

const operationConfig = {
    average_revenue_by_platform: { title: 'Average revenue by platform', category: 'platform' },
    average_revenue_by_campaign_type: { title: 'Average revenue by campaign type', category: 'campaign_type' },
    average_revenue_by_industry: { title: 'Average revenue by industry', category: 'industry' },
};



function FieldSelect({ label, field, form, update, feature }) {
    return <label className="text-sm font-semibold text-slate-700">{label}<select value={form[field]} onChange={event => update({ [field]: event.target.value })} className="mt-1.5 w-full rounded-lg border-slate-300 text-sm" required><option value="">Select {label.toLowerCase()}</option>{(feature?.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function RevenueBars({ result, category }) {
    const rows = result?.rows ?? [];
    const max = Math.max(1, ...rows.map(row => Number(row.average_revenue) || 0));
    return <div className="space-y-3">{rows.map(row => <div key={row[category]} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_8rem] sm:items-center">
        <div><p className="truncate text-sm font-semibold text-slate-700">{row[category]}</p><p className="text-[10px] text-slate-400">{Number(row.campaign_count).toLocaleString()} campaigns</p></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: Math.max(2, Number(row.average_revenue) / max * 100) + '%' }} title={money(row.average_revenue)} /></div>
        <strong className="col-start-2 text-xs text-slate-700 sm:col-start-auto sm:text-right">{money(row.average_revenue)}</strong>
    </div>)}</div>;
}

function Scatter({ result }) {
    const rows = result?.rows ?? [];
    const points = rows.map(row => ({ ...row, x: Number(row.ad_spend), y: Number(row.revenue) })).filter(row => Number.isFinite(row.x) && Number.isFinite(row.y));
    const maxX = Math.max(1, ...points.map(row => row.x));
    const maxY = Math.max(1, ...points.map(row => row.y));
    return <div className="overflow-x-auto"><svg viewBox="0 0 720 280" className="min-w-[540px] w-full" role="img" aria-label="Historical ad spend and revenue">
        <line x1="58" y1="15" x2="58" y2="230" stroke="#cbd5e1" /><line x1="58" y1="230" x2="705" y2="230" stroke="#cbd5e1" />
        {points.map((point, index) => <circle key={index} cx={65 + point.x / maxX * 630} cy={225 - point.y / maxY * 200} r="4" fill="#16805d" fillOpacity=".58" className="transition hover:fill-[#e4a73a] hover:fill-opacity-100"><title>{point.platform}: {money(point.ad_spend)} spend → {money(point.revenue)} revenue</title></circle>)}
        <text x="380" y="266" textAnchor="middle" className="fill-slate-500 text-[12px]">Ad spend (USD)</text><text x="16" y="120" textAnchor="middle" transform="rotate(-90 16 120)" className="fill-slate-500 text-[12px]">Revenue (USD)</text>
    </svg></div>;
}

function GeneratedDashboard({ dashboard }) {
    if (!dashboard) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">Choose a template and generate an advertising dashboard from verified historical results.</div>;
    return <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Generated advertising dashboard</p><h2 className="mt-1 text-2xl font-bold text-[#14281c]">{dashboard.title}</h2><p className="mt-1 text-sm text-slate-600">{dashboard.description}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Verified snapshot</span></div>
        {dashboard.insight && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Business insight"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Insight from historical data</p><p className="mt-1 text-sm leading-6 text-emerald-950">{dashboard.insight}</p></section>}
        <div className="grid gap-5 xl:grid-cols-2">{dashboard.operations.map(operation => operation === 'spend_revenue_scatter'
            ? <DashboardCard key={operation} title="Spend and revenue distribution" description="Historical campaign sample from the validated dataset."><Scatter result={dashboard.sources[operation]} /></DashboardCard>
            : <DashboardCard key={operation} title={operationConfig[operation].title} description="Average historical revenue with campaign counts."><RevenueBars result={dashboard.sources[operation]} category={operationConfig[operation].category} /></DashboardCard>
        )}</div>
        <p className="text-xs text-slate-500">Provenance: dataset version {dashboard.provenance?.dataset_version_id ?? 'unavailable'} · {Number(dashboard.provenance?.record_count ?? 0).toLocaleString()} source rows · {dashboard.provenance?.currency ?? 'currency undeclared'}</p>
    </div>;
}

function DashboardSurface({ activeModel, modelError, datasets = [] }) {
    const [form, setForm] = useState({ ad_spend: '', campaign_date: new Date().toISOString().slice(0, 10), platform: '', campaign_type: '', industry: '', country: '' });
    const [spendChange, setSpendChange] = useState('-20');
    const [prediction, setPrediction] = useState(null);
    const [scenario, setScenario] = useState(null);
    const [template, setTemplate] = useState('executive');
    const [dashboard, setDashboard] = useState(null);
    const readyDatasets = datasets.filter(dataset => dataset.ready_for_analytics);
    const [selectedDataset, setSelectedDataset] = useState(String(readyDatasets[0]?.id ?? ''));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const update = values => setForm(current => ({ ...current, ...values }));
    const payload = () => ({ ...form, ad_spend: Number(form.ad_spend) });
    const ready = activeModel && form.ad_spend !== '' && Number(form.ad_spend) >= 0 && ['platform', 'campaign_type', 'industry', 'country'].every(field => form[field]);
    const predictionInsight = result => {
        const spend = Number(result.inputs.ad_spend);
        const revenue = Number(result.prediction.revenue);
        const ratio = spend > 0 ? ` That's ${(revenue / spend).toFixed(2)}× predicted revenue per dollar of spend.` : '';
        return `For ${result.inputs.platform} ${result.inputs.campaign_type} campaigns, the model estimates ${money(revenue)} in revenue from ${money(spend)} in spend.${ratio} This is a point estimate, not causal return on advertising.`;
    };
    const scenarioInsight = result => {
        const baseline = Number(result.baseline.prediction.revenue);
        const modified = Number(result.modified.prediction.revenue);
        const difference = modified - baseline;
        if (Math.abs(difference) < 0.005) {
            return `The model returns the same revenue estimate at ${money(result.baseline.inputs.ad_spend)} and ${money(result.modified.inputs.ad_spend)} for this campaign setup. It does not distinguish these spend levels; that is not evidence that real campaign revenue would be unaffected.`;
        }
        return `With other campaign settings held constant, the model estimates ${money(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} revenue at ${money(result.modified.inputs.ad_spend)} spend than at ${money(result.baseline.inputs.ad_spend)}. This is a non-causal what-if estimate.`;
    };
    const message = requestError => {
        const errors = requestError.response?.data?.errors;
        return errors ? Object.values(errors).flat().join(' ') : requestError.response?.data?.message ?? 'The request could not be completed.';
    };
    const submit = async (event, compare = false) => {
        event.preventDefault(); setBusy(compare ? 'scenario' : 'prediction'); setError('');
        try {
            const response = await axios.post(compare ? '/advertising/scenarios' : '/advertising/predictions', compare ? { ...payload(), spend_change_percent: Number(spendChange) } : payload());
            if (compare) setScenario(response.data); else { setPrediction(response.data); setScenario(null); }
        } catch (requestError) { setError(message(requestError)); }
        finally { setBusy(''); }
    };
    const generate = async event => {
        event.preventDefault(); setBusy('dashboard'); setError('');
        try {
            const response = await axios.post('/advertising/dashboards/generate', { template_id: template, dataset_id: Number(selectedDataset) });
            setDashboard(response.data.dashboard);
        } catch (requestError) { setError(message(requestError)); }
        finally { setBusy(''); }
    };

    return <>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700">Advertising intelligence</p><h2 className="mt-1 text-3xl font-bold text-[#14281c]">Predict campaign revenue and build a decision dashboard</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Configure a campaign, compare a spend scenario, and generate visual analysis from verified historical records.</p></div></div>
        {modelError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Revenue predictions are temporarily unavailable. Please try again later.</div>}{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <DashboardCard title="Campaign prediction" description="Enter campaign details to get a revenue estimate."><form onSubmit={event => submit(event, false)} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Ad spend (USD)<div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-300"><span className="bg-slate-50 px-3 py-2 text-slate-500">$</span><input type="number" min="0" step="any" value={form.ad_spend} onChange={event => update({ ad_spend: event.target.value })} className="min-w-0 flex-1 border-0 text-sm focus:ring-0" required /></div></label><label className="text-sm font-semibold text-slate-700">Campaign date<input type="date" value={form.campaign_date} onChange={event => update({ campaign_date: event.target.value })} className="mt-1.5 w-full rounded-lg border-slate-300 text-sm" required /></label><FieldSelect label="Platform" field="platform" form={form} update={update} feature={activeModel?.features?.platform} /><FieldSelect label="Campaign type" field="campaign_type" form={form} update={update} feature={activeModel?.features?.campaign_type} /><FieldSelect label="Industry" field="industry" form={form} update={update} feature={activeModel?.features?.industry} /><FieldSelect label="Country" field="country" form={form} update={update} feature={activeModel?.features?.country} /></div><button disabled={!ready || busy} className="rounded-lg bg-[#14281c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy === 'prediction' ? 'Running model…' : 'Predict campaign revenue'}</button></form></DashboardCard>
            <DashboardCard title="Prediction and spend scenario" description="The comparison holds campaign settings constant and is explicitly non-causal.">{!prediction && !scenario && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Run a campaign prediction to see the prediction result and compare a spend change.</div>}{prediction && !scenario && <div className="space-y-5"><div className="rounded-2xl bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Predicted revenue</p><p className="mt-1 text-4xl font-bold text-[#14281c]">{money(prediction.prediction?.revenue)}</p><p className="mt-2 text-xs text-emerald-900">Point estimate · {prediction.inputs.platform} · {prediction.inputs.campaign_type}</p></div><div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm leading-6 text-emerald-950"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Model insight</p><p className="mt-1">{predictionInsight(prediction)}</p></div><form onSubmit={event => submit(event, true)} className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold text-slate-700">Spend change (%)<input type="number" min="-100" max="1000" step="any" value={spendChange} onChange={event => setSpendChange(event.target.value)} className="mt-1 block w-40 rounded-lg border-slate-300" required /></label><button disabled={!ready || busy} className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-40">{busy === 'scenario' ? 'Comparing…' : 'Compare scenario'}</button></form></div>}{scenario && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Baseline · {money(scenario.baseline.inputs.ad_spend)}</p><p className="mt-1 text-2xl font-bold">{money(scenario.baseline.prediction.revenue)}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs uppercase text-emerald-700">Modified · {money(scenario.modified.inputs.ad_spend)}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{money(scenario.modified.prediction.revenue)}</p></div></div><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Revenue difference: <strong>{money(scenario.revenue_change)}</strong>. This is a what-if comparison, not a causal estimate.</p><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Scenario insight</p><p className="mt-1">{scenarioInsight(scenario)}</p></div><button type="button" onClick={() => setScenario(null)} className="text-xs font-semibold text-emerald-800 underline">Back to prediction</button></div>}</DashboardCard>
        </div>
        <DashboardGenerateForm title="Generate dashboard" description="Choose a validated campaign dataset and layout. Visuals and insights use the selected dataset's verified analytics." datasets={datasets} selectedDataset={selectedDataset} onDatasetChange={setSelectedDataset} templates={templates} selectedTemplate={template} onTemplateChange={setTemplate} busy={busy === 'dashboard'} emptyMessage="Upload, map, and validate an advertising dataset in Workbench before generating a dashboard." workbenchUrl="/workbench?domain=advertising" workbenchLabel="Open Advertising Workbench" onSubmit={generate} />
        <GeneratedDashboard dashboard={dashboard} />
    </>;
}

export default function AdvertisingWorkspace({ activeModel, modelError, datasets = [] }) {
    const { auth } = usePage().props;
    return <StudioShell user={auth?.user} surface="dashboard" domain="advertising" title="Advertising dashboard"><DashboardSurface activeModel={activeModel} modelError={modelError} datasets={datasets} /></StudioShell>;
}
