import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import StudioShell from '@/Components/StudioShell';

function FieldInputs({ values, onChange, fields, numericFields, dateFields, categoricalFields, fieldOptions, required, shown = fields }) {
    return <div className="grid gap-3 sm:grid-cols-2">
        {fields.filter(field => shown.includes(field)).map(field => <label key={field} className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block capitalize">{field.replace('_', ' ')}</span>
            {categoricalFields.includes(field)
                ? <select className="w-full rounded-lg border-slate-300 text-sm focus:border-emerald-600 focus:ring-emerald-600" value={values?.[field] ?? ''} onChange={e => onChange({ ...values, [field]: e.target.value })} required={required.includes(field)} disabled={!fieldOptions[field]?.length}>
                    <option value="">{fieldOptions[field]?.length ? `Select ${field.replace('_', ' ')}` : 'Supported values unavailable'}</option>
                    {(fieldOptions[field] ?? []).map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                : <input className="w-full rounded-lg border-slate-300 text-sm focus:border-emerald-600 focus:ring-emerald-600" type={numericFields.includes(field) ? 'number' : dateFields.includes(field) ? 'date' : 'text'} min={numericFields.includes(field) ? 0 : undefined} step={numericFields.includes(field) ? 'any' : undefined} value={values?.[field] ?? ''} onChange={e => onChange({ ...values, [field]: e.target.value })} required={required.includes(field)} />}
        </label>)}
    </div>;
}

function Card({ title, children, aside }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{aside}</div>
        {children}
    </section>;
}

function ErrorBox({ error }) {
    return error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null;
}

export default function Workbench({ productions, selectedProductionId, models, activeModel, apiError, maxUploadMb, domain = 'movie', domainConfig }) {
    const { auth } = usePage().props;
    const fields = domainConfig.fields;
    const numericFields = domainConfig.numeric_fields;
    const dateFields = domainConfig.date_fields;
    const categoricalFields = domainConfig.categorical_fields;
    const fieldOptions = domainConfig.field_options ?? {};
    const inputFields = domainConfig.features;
    const requiredBase = domainConfig.required_base_fields;
    const emptyPlan = useMemo(() => ({ name: '', base_features: Object.fromEntries(inputFields.map(field => [field, ''])) }), [domain]);
    const [selectedId, setSelectedId] = useState(selectedProductionId);
    const production = productions.find(item => item.id === Number(selectedId));
    const [tab, setTab] = useState(window.location.pathname === '/upload' ? 'datasets' : 'plans');
    const [form, setForm] = useState(emptyPlan);
    const [editPlan, setEditPlan] = useState(null);
    const [datasetId, setDatasetId] = useState(null);
    const [details, setDetails] = useState(null);
    const [mapping, setMapping] = useState({});
    const [jobs, setJobs] = useState({});
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(apiError);
    const [notice, setNotice] = useState('');
    const required = activeModel?.manifest?.feature_columns ?? requiredBase;
    const datasets = production?.datasets ?? [];
    const allJobs = useMemo(() => datasets.flatMap(dataset => (dataset.jobs ?? []).map(job => ({ ...job, dataset }))), [datasets]);

    useEffect(() => {
        setSelectedId(selectedProductionId);
        setForm(emptyPlan);
        setDatasetId(null);
        setDetails(null);
        setMapping({});
        setError(apiError);
        setNotice('');
    }, [domain, selectedProductionId, emptyPlan, apiError]);

    useEffect(() => {
        setEditPlan(production ? { name: production.name, base_features: production.base_features } : null);
        setDatasetId(null);
        setDetails(null);
        setMapping({});
    }, [domain, selectedId, production?.updated_at]);

    const message = e => {
        const errors = e.response?.data?.errors;
        return errors ? Object.values(errors).flat().join(' ') : (e.response?.data?.message ?? e.message ?? 'Request failed.');
    };
    const execute = async (action, success, refresh = true) => {
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await action();
            setNotice(success);
            if (refresh) router.reload({ only: ['productions', 'models', 'activeModel', 'apiError'], preserveState: true });
            return response.data;
        } catch (e) { setError(message(e)); return null; }
        finally { setBusy(false); setProgress(null); }
    };
    const selectDataset = async id => {
        setDatasetId(id); setDetails(null); setMapping({}); setError('');
        try {
            const { data } = await axios.get(`/workbench/datasets/${id}`);
            setDetails(data);
            const initial = {};
            (data.mapping?.mappings ?? []).forEach(item => { initial[item.source_column] = item.target_column; });
            setMapping(initial);
        } catch (e) { setError(message(e)); }
    };
    const suggest = async () => {
        const data = await execute(() => axios.post(`/workbench/datasets/${datasetId}/suggest`), 'Suggestions loaded. Review each mapping before saving.', false);
        if (data) {
            const next = {};
            (data.mappings ?? []).forEach(item => { next[item.source_column] = item.target_column; });
            setMapping(next);
            setNotice(data.warnings?.join(' ') || 'Suggestions loaded. Review each mapping before saving.');
        }
    };
    const saveMapping = async () => {
        const mappings = Object.entries(mapping).filter(([, target]) => target).map(([source_column, target_column]) => ({ source_column, target_column, transformation: numericFields.includes(target_column) ? 'numeric' : dateFields.includes(target_column) ? 'date' : 'categorical' }));
        const data = await execute(() => axios.put(`/workbench/datasets/${datasetId}/mapping`, { mappings }), 'Mapping saved. Approval is required before validation.', false);
        if (data) selectDataset(datasetId);
    };
    const refreshJob = async id => {
        try {
            const { data } = await axios.get(`/workbench/jobs/${id}`);
            setJobs(previous => ({ ...previous, [id]: data }));
            if (['completed', 'failed'].includes(data.status)) router.reload({ only: ['productions', 'models', 'activeModel'], preserveState: true });
        } catch (e) { setError(message(e)); }
    };

    useEffect(() => {
        const pending = allJobs.filter(job => !['completed', 'failed'].includes(jobs[job.id]?.status ?? job.last_status));
        if (!pending.length) return;
        const timer = setInterval(() => pending.forEach(job => refreshJob(job.id)), 5000);
        return () => clearInterval(timer);
    }, [allJobs, jobs]);

    const createPlan = async e => {
        e.preventDefault();
        const data = await execute(() => axios.post('/workbench/productions', { ...form, domain }), `${domainConfig.plan_label} created.`);
        if (data) { setSelectedId(data.id); setForm(emptyPlan); }
    };
    const updatePlan = async e => {
        e.preventDefault();
        await execute(() => axios.put(`/workbench/productions/${production.id}`, editPlan), `Base ${domainConfig.plan_label.toLowerCase()} saved.`);
    };
    const upload = async e => {
        e.preventDefault();
        const file = e.currentTarget.elements.file.files[0];
        if (!file) return;
        if (!/\.(csv|xlsx)$/i.test(file.name) || file.size > uploadLimit * 1024 * 1024) { setError(`Choose a CSV or XLSX file no larger than ${uploadLimit} MB.`); return; }
        const body = new FormData(); body.append('file', file);
        const data = await execute(() => axios.post(`/workbench/productions/${production.id}/datasets`, body, { onUploadProgress: event => event.total && setProgress(Math.round(event.loaded * 100 / event.total)) }), 'Dataset uploaded. Review its profile and mapping.');
        if (data) { e.target.reset(); selectDataset(data.id); }
    };
    const tabs = [['plans', 'Preparation'], ['datasets', 'Datasets'], ['training', 'Training'], ['models', 'Models']];

    return <StudioShell user={auth.user} surface="workbench" domain={domain} title={`${domainConfig.label} workbench`}>
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{domainConfig.label} model lifecycle</p><h2 className="text-2xl font-bold text-[#14281c]">Prepare data and manage models</h2><p className="mt-1 text-sm text-slate-600">{domainConfig.plan_label} setup, dataset mapping, training, evaluation, and deployment belong in this workbench.</p></div>
                    {productions.length > 0 && <label className="text-sm font-medium">{domainConfig.plan_label} <select className="ml-2 rounded-lg border-slate-300 text-sm" value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value))}>{productions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
                </div>
                <ErrorBox error={error} />{notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
                <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Workbench sections">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => { setTab(key); setError(''); }} className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold ${tab === key ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}>{label}</button>)}</nav>

                {tab === 'plans' && <div className="grid gap-5 lg:grid-cols-2">
                    <Card title={`Create ${domainConfig.plan_label.toLowerCase()}`}><form className="space-y-4" onSubmit={createPlan}><label className="block text-sm font-medium">Name<input className="mt-1 w-full rounded-lg border-slate-300" value={form.name} maxLength="255" onChange={e => setForm({ ...form, name: e.target.value })} required /></label><FieldInputs values={form.base_features} onChange={value => setForm({ ...form, base_features: value })} fields={inputFields} numericFields={numericFields} dateFields={dateFields} categoricalFields={categoricalFields} fieldOptions={fieldOptions} required={requiredBase} /><button disabled={busy} className="rounded-lg bg-[#14281c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create {domainConfig.plan_label.toLowerCase()}</button></form></Card>
                    <Card title={`Current base ${domainConfig.plan_label.toLowerCase()}`}>{production && editPlan ? <form className="space-y-4" onSubmit={updatePlan}><label className="block text-sm font-medium">Name<input className="mt-1 w-full rounded-lg border-slate-300" value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} required /></label><FieldInputs values={editPlan.base_features} onChange={value => setEditPlan({ ...editPlan, base_features: value })} fields={inputFields} numericFields={numericFields} dateFields={dateFields} categoricalFields={categoricalFields} fieldOptions={fieldOptions} required={requiredBase} /><button disabled={busy} className="rounded-lg border border-[#14281c] px-4 py-2 text-sm font-semibold text-[#14281c] disabled:opacity-50">Save base plan</button></form> : <p className="text-sm text-slate-500">Create a {domainConfig.plan_label.toLowerCase()} to begin.</p>}</Card>
                </div>}

                {tab === 'datasets' && <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-5"><Card title="Upload training data"><p className="mb-4 text-sm text-slate-600">CSV or XLSX, up to {uploadLimit} MB. Files are checked by FastAPI before being added here.</p>{production ? <form onSubmit={upload} className="space-y-3"><input name="file" type="file" accept=".csv,.xlsx" className="block w-full text-sm" required /><button disabled={busy} className="rounded-lg bg-[#14281c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Upload dataset</button>{progress != null && <p className="text-xs">Transferring: {progress}%</p>}</form> : <p className="text-sm text-slate-500">Create a production first.</p>}</Card>
                        <Card title="Uploaded datasets">{datasets.length ? <div className="space-y-2">{datasets.map(item => <button type="button" key={item.id} onClick={() => selectDataset(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${datasetId === item.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}><strong className="block break-all">{item.filename}</strong><span className="text-xs text-slate-500">{item.row_count.toLocaleString()} rows · {item.column_count} columns · {item.validation_report ? 'Validated' : 'Review needed'}</span></button>)}</div> : <p className="text-sm text-slate-500">No datasets uploaded for this production.</p>}</Card></div>
                    <Card title="Profile and mapping">{datasetId && !details && <p className="text-sm text-slate-500">Loading dataset...</p>}{!datasetId && <p className="text-sm text-slate-500">Select a dataset to review its columns.</p>}{details && <div className="space-y-5"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded bg-slate-100 px-2 py-1">{details.profile.sampled_rows} profiled rows</span><span className="rounded bg-slate-100 px-2 py-1">{details.profile.duplicate_rows} duplicate rows in sample</span><span className="rounded bg-slate-100 px-2 py-1">Mapping: {details.dataset.validation_report ? 'validated' : details.mapping ? 'saved, ready to validate' : 'not saved'}</span></div>
                        <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={suggest} className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800">Suggest mappings</button><button disabled={busy} onClick={saveMapping} className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800">Save mapping</button><button disabled={busy || !details.mapping || !!details.dataset.validation_report} onClick={async () => { if (await execute(() => axios.post(`/workbench/datasets/${datasetId}/validate`), 'Dataset validated. Training is available.')) selectDataset(datasetId); }} className="rounded-lg bg-[#14281c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Validate dataset</button></div>
                        <div className="max-h-[32rem] space-y-3 overflow-auto">{details.profile.columns.map(column => <div key={column.name} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">{column.name}</strong><span className="ml-2 text-xs text-slate-500">{column.dtype} · {((column.null_percentage ?? 0) * 100).toFixed(1)}% missing</span></div><select aria-label={`Map ${column.name}`} className="rounded-lg border-slate-300 text-xs" value={mapping[column.name] ?? ''} onChange={e => setMapping({ ...mapping, [column.name]: e.target.value })}><option value="">Exclude / unmapped</option>{fields.map(field => <option key={field} value={field}>{field}</option>)}</select></div><p className="mt-1 truncate text-xs text-slate-500">Sample: {(column.sample_values ?? []).map(String).join(', ') || 'No values'}</p></div>)}</div>
                        {details.dataset.validation_report && <div className="rounded-lg bg-emerald-50 p-3 text-sm">Validation passed: {details.dataset.validation_report.valid_rows} valid rows, {details.dataset.validation_report.invalid_rows} excluded.</div>}
                    </div>}</Card>
                </div>}

                {tab === 'training' && <div className="grid gap-5 lg:grid-cols-2"><Card title="Start LightGBM training"><p className="mb-4 text-sm text-slate-600">Runs the domain-specific trainer in FastAPI’s background worker. Only validated datasets can train.</p><div className="space-y-2">{datasets.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"><div><strong>{item.filename}</strong><div className="text-xs text-slate-500">{item.validation_report ? `${item.validation_report.valid_rows} valid rows` : 'Validation required'}</div></div><button disabled={busy || !item.standardized_version_id} onClick={() => execute(() => axios.post(`/workbench/datasets/${item.id}/train`), 'Training queued.')} className="rounded-lg bg-[#14281c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Train</button></div>)}{!datasets.length && <p className="text-sm text-slate-500">Upload and validate a dataset first.</p>}</div></Card>
                    <Card title="Training jobs"><div className="space-y-2">{allJobs.map(job => { const live = jobs[job.id]; return <div key={job.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{job.dataset.filename}</strong><button onClick={() => refreshJob(job.id)} className="text-xs font-semibold text-emerald-800 hover:underline">Refresh</button></div><p className="text-xs text-slate-500">{live?.status ?? job.last_status} · {job.api_id}</p>{live?.error && <p className="text-xs text-rose-700">{live.error}</p>}{live?.metrics && <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(live.metrics, null, 2)}</pre>}</div>; })}{!allJobs.length && <p className="text-sm text-slate-500">No jobs yet.</p>}</div></Card></div>}

                {tab === 'models' && <Card title="Model registry" aside={<span className="text-xs text-slate-500">Global deployment for all users</span>}><p className="mb-4 text-sm text-slate-600">The active version serves predictions. Review metrics before explicitly promoting a candidate or rolling back to a previously deployed version.</p><div className="space-y-3">{models.map(model => <div key={model.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm">{model.model_type}</strong><p className="break-all font-mono text-xs text-slate-500">{model.id}</p><p className="mt-1 text-xs">Status: <span className="font-semibold">{model.status}</span> · Features: {(model.manifest?.feature_columns ?? []).join(', ')}</p>{model.metrics && <p className="mt-1 text-xs text-slate-600">MAE: {model.metrics.mae?.toLocaleString() ?? '—'} · RMSE: {model.metrics.rmse?.toLocaleString() ?? '—'}</p>}</div>{['candidate', 'archived'].includes(model.status) && <button disabled={busy} onClick={() => { const action = model.status === 'candidate' ? 'promote' : 'rollback'; if (window.confirm(`${action === 'promote' ? 'Promote' : 'Roll back to'} this model for every user?`)) execute(() => axios.post(`/workbench/models/${model.id}/${action}`, { approved: true }), 'Active model updated.'); }} className="rounded-lg bg-[#14281c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{model.status === 'candidate' ? 'Promote' : 'Roll back'}</button>}</div></div>)}{!models.length && <p className="text-sm text-slate-500">No model versions are available.</p>}</div></Card>}

    </StudioShell>;
}
