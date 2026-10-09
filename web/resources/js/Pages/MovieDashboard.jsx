import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useRef, useState } from 'react';
import StudioShell from '@/Components/StudioShell';
import DashboardCard from '@/Components/DashboardCard';
import DashboardGenerateForm from '@/Components/DashboardGenerateForm';

const currencyLabel = currency => currency === 'USD' ? 'USD' : null;
const numericValue = value => value === null || value === undefined || value === '' ? NaN : Number(value);

function formatValue(value, format, currency) {
    if (value === null || value === undefined || value === '') return '—';
    if (format === 'text' || format === 'date' || (typeof value === 'string' && !Number.isFinite(Number(value)))) return String(value);
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    if (format === 'percent') return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(number);
    if (format === 'currency' && currencyLabel(currency)) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(number);
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number);
}

function filterRows(rows, filters = []) {
    return rows.filter(row => filters.every(filter => {
        const actual = row[filter.field];
        const expected = filter.value;
        if (filter.operator === 'contains') {
            return Array.isArray(actual)
                ? actual.some(value => String(value).toLowerCase().includes(String(expected).toLowerCase()))
                : String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());
        }
        if (filter.operator === 'eq') return actual === expected || String(actual) === String(expected);
        if (filter.operator === 'neq') return actual !== expected && String(actual) !== String(expected);
        const left = Number(actual), right = Number(expected);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        if (filter.operator === 'gt') return left > right;
        if (filter.operator === 'gte') return left >= right;
        if (filter.operator === 'lt') return left < right;
        if (filter.operator === 'lte') return left <= right;
        return true;
    }));
}

function AccessibleChartData({ rows, xField, yField, title, currency, format }) {
    return <table className="sr-only"><caption>{title} chart data</caption><thead><tr><th scope="col">{xField}</th><th scope="col">{yField}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><th scope="row">{String(row[xField] ?? index + 1)}</th><td>{formatValue(row[yField], format, currency)}</td></tr>)}</tbody></table>;
}

function DataChart({ widget, source }) {
    const rows = filterRows(source?.rows ?? [], widget.filters);
    const values = rows.map(row => numericValue(row[widget.y_field])).filter(Number.isFinite);
    const max = Math.max(1, ...values.map(Math.abs));
    const width = 720;
    const height = 270;
    const plotTop = 14;
    const plotBottom = 218;
    const plotHeight = plotBottom - plotTop;
    if (!rows.length) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No rows are available for this chart.</p>;

    if (widget.type === 'scatter_chart') {
        const points = rows.map(row => ({ row, x: numericValue(row[widget.x_field]), y: numericValue(row[widget.y_field]) }))
            .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
        const maxX = Math.max(1, ...points.map(point => point.x));
        const maxY = Math.max(1, ...points.map(point => point.y));
        return <div className="overflow-x-auto">
            <svg viewBox={'0 0 ' + width + ' ' + height} className="min-w-[520px] w-full" role="img" aria-label={widget.title}>
                <line x1="54" y1={plotTop} x2="54" y2={plotBottom} stroke="#cbd5e1" />
                <line x1="54" y1={plotBottom} x2="704" y2={plotBottom} stroke="#cbd5e1" />
                {points.map((point, index) => {
                    const x = 62 + point.x / maxX * 632;
                    const y = plotBottom - point.y / maxY * (plotHeight - 10);
                    return <circle key={index} cx={x} cy={y} r="5" fill="#16805d" fillOpacity="0.65" className="transition hover:fill-[#e4a73a] hover:fill-opacity-100">
                        <title>{String(point.row[widget.x_field]) + ': ' + formatValue(point.y, widget.display_format, source?.metadata?.currency)}</title>
                    </circle>;
                })}
                <text x="370" y="258" textAnchor="middle" className="fill-slate-500 text-[12px]">{widget.x_field}</text>
                <text x="16" y="120" textAnchor="middle" transform="rotate(-90 16 120)" className="fill-slate-500 text-[12px]">{widget.y_field}</text>
            </svg>
            <AccessibleChartData rows={points.map(point => point.row)} xField={widget.x_field} yField={widget.y_field} title={widget.title} currency={source?.metadata?.currency} format={widget.display_format} />
        </div>;
    }

    const slot = 650 / rows.length;
    const pathPoints = rows.map((row, index) => {
        const value = numericValue(row[widget.y_field]);
        if (!Number.isFinite(value)) return null;
        return (62 + index * slot + slot / 2) + ',' + (plotBottom - value / max * (plotHeight - 10));
    }).filter(Boolean);
    return <div className="overflow-x-auto">
        <svg viewBox={'0 0 ' + width + ' ' + height} className="min-w-[520px] w-full" role="img" aria-label={widget.title}>
            <line x1="54" y1={plotTop} x2="54" y2={plotBottom} stroke="#cbd5e1" />
            <line x1="54" y1={plotBottom} x2="704" y2={plotBottom} stroke="#cbd5e1" />
            {widget.type === 'line_chart' && <polyline points={pathPoints.join(' ')} fill="none" stroke="#16805d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
            {rows.map((row, index) => {
                const value = numericValue(row[widget.y_field]);
                if (!Number.isFinite(value)) return null;
                const barHeight = Math.max(2, Math.abs(value) / max * (plotHeight - 10));
                const x = 62 + index * slot + Math.min(8, slot * 0.18);
                const barWidth = Math.max(3, slot - Math.min(16, slot * 0.36));
                const y = plotBottom - barHeight;
                const label = String(row[widget.x_field] ?? index + 1);
                if (widget.type === 'line_chart') {
                    const pointX = 62 + index * slot + slot / 2;
                    return <g key={index}>
                        <circle cx={pointX} cy={y} r="5" fill="#16805d" className="transition hover:fill-[#e4a73a]">
                            <title>{label + ': ' + formatValue(value, widget.display_format, source?.metadata?.currency)}</title>
                        </circle>
                        <text x={pointX} y="242" textAnchor="middle" className="fill-slate-500 text-[10px]">{label.slice(0, 14)}</text>
                    </g>;
                }
                return <g key={index}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} rx="5" fill="#16805d" className="transition hover:fill-[#e4a73a]">
                        <title>{label + ': ' + formatValue(value, widget.display_format, source?.metadata?.currency)}</title>
                    </rect>
                    <text x={x + barWidth / 2} y="242" textAnchor="middle" className="fill-slate-500 text-[10px]">{label.slice(0, 14)}</text>
                </g>;
            })}
        </svg>
        <AccessibleChartData rows={rows} xField={widget.x_field} yField={widget.y_field} title={widget.title} currency={source?.metadata?.currency} format={widget.display_format} />
    </div>;
}

function DashboardWidget({ widget, sources }) {
    const source = sources?.[widget.data_ref];
    const rows = filterRows(source?.rows ?? [], widget.filters);
    const currency = source?.metadata?.currency;
    if (!source) return <section className="movie-dashboard-widget rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Verified source for “{widget.title}” is unavailable.</section>;

    return <section className="movie-dashboard-widget min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ '--widget-width': Math.max(1, Math.min(12, Number(widget.width) || 12)) }}>
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{widget.title}</h3><p className="mt-1 text-xs text-slate-500">Verified from {source.tool.replaceAll('_', ' ')}</p></div>
            {source.metadata?.currency === null && widget.display_format === 'currency' && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">Currency undeclared</span>}
        </div>
        {widget.type === 'ai_insight' && <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">{widget.insight_text}</p>}
        {widget.type === 'kpi' && (() => {
            const numeric = rows.map(row => numericValue(row[widget.metric_field])).filter(Number.isFinite);
            const value = numeric.length === 1 ? numeric[0] : numeric.length ? numeric.reduce((sum, item) => sum + item, 0) / numeric.length : null;
            return <div className="rounded-xl bg-slate-50 p-5"><div className="text-3xl font-bold tracking-tight text-[#14281c]">{formatValue(value, widget.display_format, currency)}</div>{numeric.length > 1 && <p className="mt-1 text-xs text-slate-500">Average of {numeric.length.toLocaleString()} verified rows</p>}{widget.display_format === 'currency' && !currency && <p className="mt-1 text-xs text-slate-500">Currency was not declared for this source.</p>}</div>;
        })()}
        {['bar_chart', 'line_chart', 'scatter_chart'].includes(widget.type) && <DataChart widget={widget} source={{ ...source, rows }} />}
        {widget.type === 'comparison' && <div className="space-y-3">{rows.map((row, rowIndex) => {
            const metrics = widget.series_fields.map(field => ({ field, value: numericValue(row[field]) })).filter(item => Number.isFinite(item.value));
            const scale = Math.max(1, ...metrics.map(item => Math.abs(item.value)));
            return <div key={rowIndex} className="rounded-xl bg-slate-50 p-3"><div className="mb-2 text-sm font-semibold text-slate-800">{row.scenario ?? 'Scenario ' + (rowIndex + 1)}</div><div className="space-y-2">{metrics.map(metric => <div key={metric.field} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-2 text-xs"><span className="capitalize text-slate-500">{metric.field.replaceAll('_', ' ')}</span><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: Math.max(2, Math.abs(metric.value) / scale * 100) + '%' }} /></div><strong className="text-slate-800">{formatValue(metric.value, widget.display_format, currency)}</strong></div>)}</div></div>;
        })}</div>}
        {widget.type === 'data_table' && <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500">{widget.table_fields.map(field => <th key={field} className="px-2 py-2 font-semibold">{field.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0">{widget.table_fields.map(field => <td key={field} className="max-w-48 truncate px-2 py-2 text-slate-700">{Array.isArray(row[field]) ? row[field].join(', ') : formatValue(row[field], field === 'revenue' || field === 'budget' ? 'currency' : 'text', currency)}</td>)}</tr>)}</tbody></table>{rows.length > 12 && <p className="mt-2 text-xs text-slate-500">Showing 12 of {rows.length.toLocaleString()} verified rows.</p>}</div>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[10px] text-slate-400">{source.metadata?.dataset_version_id && <span>Dataset version {source.metadata.dataset_version_id}</span>}{source.metadata?.row_count !== undefined && <span>{Number(source.metadata.row_count).toLocaleString()} source rows</span>}</div>
    </section>;
}

function DashboardViewer({ dashboard }) {
    const widgets = useMemo(() => [...(dashboard?.spec?.widgets ?? [])].sort((left, right) => (left.y - right.y) || (left.x - right.x)), [dashboard]);
    if (!dashboard) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">Generate a dashboard from a validated dataset or open one you saved.</div>;
    return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Movie dashboard</p><h2 className="mt-1 text-2xl font-bold text-[#14281c]">{dashboard.spec.title}</h2>{dashboard.spec.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{dashboard.spec.description}</p>}</div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{dashboard.saved_at ? 'Saved snapshot' : 'Generated draft'}</span></div>
        {dashboard.insight && <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Business insight"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Insight from verified results</p><p className="mt-1 text-sm leading-6 text-emerald-950">{dashboard.insight}</p></section>}
        <div className="movie-dashboard-grid">{widgets.map(widget => <DashboardWidget key={widget.id} widget={widget} sources={dashboard.sources ?? {}} />)}</div>
        {dashboard.provenance && <p className="mt-4 break-words text-xs text-slate-500">Provenance: {(dashboard.provenance.dataset_version_ids ?? []).length ? 'dataset version ' + dashboard.provenance.dataset_version_ids.join(', ') : 'Dataset version information was not returned by the source.'}</p>}
    </div>;
}

function errorMessage(error) {
    const errors = error.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    const body = error.response?.data;
    const detail = body?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail.message === 'string') return detail.message;
    return body?.message ?? error.message ?? 'The request could not be completed.';
}

function ErrorNotice({ title, message, response }) {
    const detail = response?.detail;
    const service = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : response;
    const execution = service?.tool_execution ?? response?.tool_execution;
    const failedResults = (execution?.results ?? []).filter(result => result.ok === false);
    const validationIssues = Array.isArray(detail)
        ? detail.map(issue => [Array.isArray(issue.loc) ? issue.loc.join('.') : '', issue.msg].filter(Boolean).join(': ')).filter(Boolean)
        : [];

    return <section role="alert" className="rounded-2xl border border-[#e8c8bb] bg-[#fff8f5] p-4 text-sm text-[#7d3423] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-semibold">{title}</p><p className="mt-1 leading-6">{message}</p></div>
            {(service?.code || response?.service_status) && <div className="flex shrink-0 gap-2 text-[10px] font-semibold uppercase tracking-wide">
                {service?.code && <span className="rounded-full bg-white px-2.5 py-1 text-[#8d4937]">{service.code}</span>}
                {response?.service_status && <span className="rounded-full bg-white px-2.5 py-1 text-[#8d4937]">ML {response.service_status}</span>}
            </div>}
        </div>
        {validationIssues.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">{validationIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
        {failedResults.length > 0 && <div className="mt-3 space-y-2 border-t border-[#eed9d1] pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8d4937]">Verified operation status</p>
            {failedResults.map((result, index) => <div key={index} className="rounded-xl border border-[#eed9d1] bg-white/80 p-3 text-xs">
                <p className="font-semibold">{String(result.tool ?? 'Operation').replaceAll('_', ' ')}</p>
                <p className="mt-1 leading-5">{result.error?.message ?? 'The operation could not be completed.'}</p>
                {result.error?.code && <p className="mt-1 font-mono text-[10px] text-slate-500">{result.error.code}</p>}
            </div>)}
        </div>}
        {service?.needs_input && <p className="mt-3 border-t border-[#eed9d1] pt-3 text-xs">The request needs more information. Review the selected dataset and dashboard request, then try again.</p>}
    </section>;
}


function BudgetInput({ value, onChange }) {
    const [focused, setFocused] = useState(false);
    const display = focused || value === '' || !Number.isFinite(Number(value))
        ? value
        : new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(Number(value));

    return <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-emerald-700 focus-within:ring-1 focus-within:ring-emerald-700">
        <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">$</span>
        <input className="min-w-0 flex-1 border-0 focus:ring-0" type="text" inputMode="decimal" value={display} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={event => onChange(event.target.value.replace(/[^0-9.]/g, ''))} aria-label="Production budget in US dollars" required />
    </div>;
}

function GenrePicker({ options = [], multiple, value = [], onChange }) {
    const availableOptions = Array.isArray(options) ? options : [];
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const optionRefs = useRef([]);
    const filtered = availableOptions.filter(option => !value.includes(option) && option.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40);
    const add = genre => {
        if (!genre || value.includes(genre)) return;
        onChange(multiple === false ? [genre] : [...value, genre].slice(0, 16));
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    };
    const remove = genre => onChange(value.filter(item => item !== genre));

    return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-emerald-700 focus-within:ring-1 focus-within:ring-emerald-700">
            {value.map(genre => <span key={genre} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                {genre}<button type="button" onClick={() => remove(genre)} className="rounded-full px-1 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700" aria-label={'Remove ' + genre}>×</button>
            </span>)}
            <input ref={inputRef} className="min-w-24 flex-1 border-0 p-1 text-sm focus:ring-0" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={event => {
                if (event.key === 'Escape') setOpen(false);
                if (event.key === 'Enter' && filtered.length) { event.preventDefault(); add(filtered[0]); }
            if (event.key === 'ArrowDown' && filtered.length) { event.preventDefault(); optionRefs.current[0]?.focus(); }
                if (event.key === 'Backspace' && !query && value.length) remove(value[value.length - 1]);
            }} placeholder={value.length ? 'Add a genre…' : 'Search supported genres…'} role="combobox" aria-autocomplete="list" aria-expanded={open && filtered.length > 0} aria-controls="movie-genre-options" aria-label="Search supported movie genres" />
        </div>
        {open && filtered.length > 0 && <ul id="movie-genre-options" role="listbox" aria-label="Supported genres" className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {filtered.map((genre, index) => <li key={genre} role="none"><button ref={element => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected="false" tabIndex={-1} onMouseDown={event => event.preventDefault()} onKeyDown={event => {
                if (event.key === 'ArrowDown') { event.preventDefault(); optionRefs.current[index + 1]?.focus(); }
                if (event.key === 'ArrowUp') { event.preventDefault(); (optionRefs.current[index - 1] ?? inputRef.current)?.focus(); }
                if (event.key === 'Escape') { setOpen(false); inputRef.current?.focus(); }
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); add(genre); }
            }} onClick={() => add(genre)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none">{genre}</button></li>)}
        </ul>}
        {!availableOptions.length && <p className="mt-2 text-xs text-amber-800">No genre suggestions are available.</p>}
    </div>;
}

function scenarioSignature(value) {
    if (!value) return '';
    return JSON.stringify({ budget: Number(value.budget), genres: value.genres });
}

export default function MovieDashboard({ datasets = [], savedDashboards: initialSaved = [], dashboardTemplates = [], activeModel, modelError }) {
    const { auth } = usePage().props;
    const genreFeature = activeModel?.features?.genres ?? {};
    const genreOptions = genreFeature.options ?? [];
    const [savedDashboards, setSavedDashboards] = useState(initialSaved);
    const [form, setForm] = useState({ budget: '', genres: [] });
    const [prediction, setPrediction] = useState(null);
    const [predictionInputs, setPredictionInputs] = useState(null);
    const [scenario, setScenario] = useState(null);
    const [predictionBusy, setPredictionBusy] = useState(false);
    const [scenarioBusy, setScenarioBusy] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState(String(datasets.find(dataset => dataset.ready_for_analytics)?.id ?? ''));
    const [selectedTemplate, setSelectedTemplate] = useState(dashboardTemplates[0]?.id ?? '');
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [errorTitle, setErrorTitle] = useState('Request could not be completed');
    const [errorResponse, setErrorResponse] = useState(null);
    const [notice, setNotice] = useState('');
    const [currentDashboard, setCurrentDashboard] = useState(null);
    const [draftName, setDraftName] = useState('');
    const dashboardBuilderRef = useRef(null);
    const readyDatasets = useMemo(() => datasets.filter(dataset => dataset.ready_for_analytics), [datasets]);
    const money = value => formatValue(value, 'currency', prediction?.currency ?? 'USD');
    const updateForm = updates => {
        setScenario(null);
        setForm(previous => ({ ...previous, ...updates }));
    };
    const reportError = (requestError, title = 'Request could not be completed') => {
        setError(errorMessage(requestError));
        setErrorTitle(title);
        setErrorResponse(requestError.response?.data ?? null);
    };
    const context = () => {
        if (!form.budget || !form.genres.length) return null;
        const budget = Number(form.budget);
        if (!Number.isFinite(budget) || budget < 0) return null;
        return { budget, genres: form.genres, currency: 'USD' };
    };
    const currentScenario = context();
    const predictionIsStale = Boolean(prediction && (
        scenarioSignature(currentScenario) !== scenarioSignature(predictionInputs)
        || prediction.model_version !== activeModel?.model_version
    ));
    const readyPrediction = prediction && !predictionIsStale ? prediction : null;

    const predict = async event => {
        event.preventDefault(); setPredictionBusy(true); setError(''); setNotice('');
        try {
            const payload = { budget: Number(form.budget), genres: form.genres };
            const response = await axios.post('/movie/predictions', payload);
            setPrediction(response.data); setPredictionInputs(payload); setScenario(null); setNotice('Prediction returned.');
        } catch (requestError) { reportError(requestError, 'Prediction could not run'); }
        finally { setPredictionBusy(false); }
    };

    const compareBudgetScenario = async () => {
        if (!readyPrediction || !predictionInputs) return;
        setScenarioBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/scenarios', { ...predictionInputs, budget_change_percent: -20 });
            setScenario(response.data);
        } catch (requestError) { reportError(requestError, 'Budget scenario could not run'); }
        finally { setScenarioBusy(false); }
    };

    const generateDashboard = async event => {
        event.preventDefault(); setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/dashboards/generate', { dataset_id: Number(selectedDataset), scenario_context: currentScenario, template_id: selectedTemplate });
            setCurrentDashboard(response.data.dashboard); setDraftName(response.data.dashboard.name);
            setSourcesOpen(false);
            setNotice(response.data.answer || 'Dashboard generated from verified data.');
        } catch (requestError) { reportError(requestError, 'Dashboard generation did not complete'); }
        finally { setBusy(false); }
    };

    const saveDashboard = async event => {
        event.preventDefault();
        if (!currentDashboard?.id) return;
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/dashboards/' + currentDashboard.id + '/save', { name: draftName });
            const saved = response.data;
            setCurrentDashboard(saved);
            setSavedDashboards(previous => [{ id: saved.id, name: saved.name, title: saved.spec?.title ?? saved.name, saved_at: saved.saved_at, created_at: saved.created_at, provenance: saved.provenance }, ...previous.filter(item => item.id !== saved.id)]);
            setNotice('Dashboard snapshot saved. You can reopen it from your library.');
        } catch (requestError) { reportError(requestError); }
        finally { setBusy(false); }
    };

    const openDashboard = async id => {
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.get('/movie/dashboards/' + id);
            setCurrentDashboard(response.data); setDraftName(response.data.name);
            setNotice('Saved dashboard opened with its verified data snapshot.');
        } catch (requestError) { reportError(requestError); }
        finally { setBusy(false); }
    };

    const refreshDashboard = async () => {
        if (!currentDashboard?.id) return;
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/dashboards/' + currentDashboard.id + '/refresh');
            setCurrentDashboard(response.data.dashboard);
            setDraftName(response.data.dashboard.name);
            setNotice(response.data.answer || 'Dashboard refreshed from current verified results.');
        } catch (requestError) { reportError(requestError, 'Dashboard refresh did not complete'); }
        finally { setBusy(false); }
    };

    const generateAnother = () => {
        setCurrentDashboard(null);
        setSourcesOpen(false);
        setNotice('Choose a data source and request to build another dashboard.');
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        dashboardBuilderRef.current?.scrollIntoView({ behavior, block: 'start' });
    };

    return <StudioShell user={auth?.user} surface="dashboard" domain="movie" title="Movie dashboard">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Movie revenue planning</p><h2 className="mt-1 text-2xl font-bold text-[#14281c] sm:text-3xl">Explore movie revenue with verified evidence</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Run a revenue prediction, review its model insight, and build dashboards from validated historical data.</p></div>
                {modelError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Revenue predictions are temporarily unavailable. Please try again later.</div>}
                {error && <ErrorNotice title={errorTitle} message={error} response={errorResponse} />}
                {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

                <div className="space-y-5">
                    <DashboardCard title="Movie revenue prediction" description="Enter planning details to get a USD revenue estimate.">
                        {!activeModel && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Revenue predictions are temporarily unavailable. Please try again later.</p>}
                        <form onSubmit={predict} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Production budget (USD)
                                    <BudgetInput value={form.budget} onChange={budget => updateForm({ budget })} />
                                </label>
                                <fieldset className="min-w-0 rounded-lg border border-slate-300 p-3">
                                    <legend className="px-1 text-sm font-semibold text-slate-700">Movie genres</legend>
                                    <GenrePicker options={genreOptions} multiple={genreFeature.multiple} value={form.genres} onChange={genres => updateForm({ genres })} />
                                    <span className="mt-2 block text-xs font-normal text-slate-500">Search and select up to 16 genres.</span>
                                </fieldset>
                            </div>
                            {genreOptions.length === 0 && activeModel && <p className="text-sm text-amber-800">Genre options are unavailable; submitted values will be validated.</p>}
                            <div className="flex flex-wrap items-center gap-3">
                                <button disabled={!activeModel || predictionBusy || !currentScenario} className="rounded-lg bg-[#14281c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203a2a] disabled:cursor-not-allowed disabled:opacity-50">{predictionBusy ? 'Running prediction...' : 'Predict revenue'}</button>
                            </div>
                        </form>
                        {prediction && <div className={'mt-5 rounded-2xl border p-4 sm:p-5 ' + (predictionIsStale ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                            {predictionIsStale && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900"><span><strong>Inputs changed.</strong> This result is stale and will not be attached to AI requests or new dashboards.</span><button type="button" onClick={() => setForm(previous => ({ ...previous, budget: String(predictionInputs?.budget ?? ''), genres: predictionInputs?.genres ?? [] }))} className="font-semibold underline">Restore predicted inputs</button></div>}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Predicted revenue</div><div className="mt-1 text-3xl font-bold tracking-tight text-[#14281c]">{money(prediction.prediction?.revenue ?? prediction.predicted_revenue)}</div><p className="mt-1 text-xs text-emerald-900">Point estimate · {prediction.currency ?? 'currency undeclared'}</p></div>
                                <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Predicted for</div><div className="mt-1 text-sm font-semibold text-emerald-950">{money(predictionInputs?.budget)} · {(predictionInputs?.genres ?? []).join(', ')}</div></div>
                            </div>
                            {readyPrediction && predictionInputs && <div className="mt-4 rounded-xl border border-emerald-200 bg-white/80 p-3 text-sm leading-6 text-emerald-950"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Model insight</p><p className="mt-1">For {(predictionInputs.genres ?? []).join(', ')}, the model estimates {money(prediction.prediction?.revenue ?? prediction.predicted_revenue)} in revenue from a {money(predictionInputs.budget)} production budget{Number(predictionInputs.budget) > 0 ? `, or ${(Number(prediction.prediction?.revenue ?? prediction.predicted_revenue) / Number(predictionInputs.budget)).toFixed(1)}× the production budget` : ''}. This point estimate does not account for marketing, distribution, or other costs.</p></div>}
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-200 pt-4">
                                <button type="button" onClick={compareBudgetScenario} className="rounded-lg border border-emerald-800/20 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50" disabled={!readyPrediction || scenarioBusy}>{scenarioBusy ? 'Comparing…' : 'Compare −20% scenario'}</button>

                            </div>
                            {scenario && <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Baseline · {money(scenario.baseline.inputs.budget)}</p><p className="mt-1 text-lg font-bold text-slate-900">{money(scenario.baseline.prediction.revenue)}</p></div><div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs uppercase text-emerald-700">Modified · {money(scenario.modified.inputs.budget)}</p><p className="mt-1 text-lg font-bold text-emerald-950">{money(scenario.modified.prediction.revenue)}</p></div></div>
                                <p className="text-xs leading-5 text-slate-600">Revenue difference: <strong>{money(scenario.revenue_change)}</strong>. This model-based comparison is not a causal estimate.</p>
                                <p className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">{Math.abs(Number(scenario.revenue_change)) < 0.005 ? 'The model returns the same revenue estimate at both budgets for these genres. It does not distinguish this budget range; that is not evidence that real-world revenue would be unaffected.' : `The model estimates ${money(Math.abs(Number(scenario.revenue_change)))} ${Number(scenario.revenue_change) > 0 ? 'more' : 'less'} revenue at the modified budget, with genres held constant. This is a non-causal what-if estimate.`}</p>
                            </div>}
                        </div>}
                    </DashboardCard>

                    <div ref={dashboardBuilderRef} id="dashboard-builder" className="scroll-mt-5">
                        <DashboardGenerateForm title="Build a movie dashboard" description="Choose a validated historical source and layout. Charts and insight are generated from verified results." datasets={datasets} selectedDataset={selectedDataset} onDatasetChange={setSelectedDataset} templates={dashboardTemplates} selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} busy={busy} emptyMessage="No analytics-ready dataset is linked to this account. Validate a dataset in the production workbench, then return here." workbenchUrl="/workbench?domain=movie" workbenchLabel="Open Movie Workbench" onSubmit={generateDashboard} />
                    </div>

                    {currentDashboard && <section className="rounded-2xl border border-[#e1e4da] bg-white p-4 shadow-sm sm:p-5" aria-label="Dashboard actions">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{currentDashboard.saved_at ? 'Saved dashboard' : 'Generated dashboard'}</p><p className="mt-1 truncate font-semibold text-slate-900">{currentDashboard.spec?.title ?? currentDashboard.name}</p></div>
                            {!currentDashboard.saved_at && <form onSubmit={saveDashboard} className="flex min-w-0 flex-1 gap-2 lg:max-w-md"><input className="min-w-0 flex-1 rounded-lg border-slate-300 text-sm" maxLength="160" value={draftName} onChange={event => setDraftName(event.target.value)} required aria-label="Saved dashboard name" /><button disabled={busy} className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Save dashboard</button></form>}
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={refreshDashboard} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh data</button>
                                <button type="button" onClick={generateAnother} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Generate another</button>
                                <button type="button" onClick={() => setSourcesOpen(open => !open)} aria-expanded={sourcesOpen} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{sourcesOpen ? 'Hide data sources' : 'View data sources'}</button>
                            </div>
                        </div>
                        {sourcesOpen && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                            {Object.values(currentDashboard.sources ?? {}).map(source => <section key={source.result_id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <h3 className="text-sm font-semibold text-slate-800">{String(source.tool ?? 'verified source').replaceAll('_', ' ')}</h3>
                                <p className="mt-1 text-xs text-slate-500">{source.rows?.length?.toLocaleString?.() ?? 0} snapshot rows · {source.fields?.join(', ')}</p>
                                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(source.metadata ?? {}).filter(([key]) => !['model_version', 'model_type', 'prediction_type'].includes(key)).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="break-all font-medium text-slate-700">{String(value)}</dd></div>)}</dl>
                            </section>)}
                        </div>}
                    </section>}

                    <DashboardCard title="Dashboard preview" description="Validated charts, tables, KPIs, and insights render from this dashboard's verified result snapshot."><DashboardViewer dashboard={currentDashboard} /></DashboardCard>

                    <div className="grid gap-3 md:grid-cols-2">
                        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Recent dashboards <span className="font-normal text-slate-500">({savedDashboards.length})</span></summary>
                            <div className="mt-3 space-y-2">{savedDashboards.slice(0, 5).map(item => <button key={item.id} disabled={busy} onClick={() => openDashboard(item.id)} className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><span className="block truncate font-semibold text-slate-800">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{item.title} · {item.saved_at ? new Date(item.saved_at).toLocaleDateString() : 'Saved'}</span></button>)}{!savedDashboards.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Generate and save a dashboard to keep a verified snapshot here.</p>}</div>
                        </details>
                    </div>
                </div>
    </StudioShell>;
}
