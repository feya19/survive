import { Head, Link, usePage } from '@inertiajs/react';
import AppNavbar from '@/Components/AppNavbar';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

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
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[10px] text-slate-400">{source.metadata?.model_version && <span>Model {source.metadata.model_version}</span>}{source.metadata?.dataset_version_id && <span>Dataset version {source.metadata.dataset_version_id}</span>}{source.metadata?.row_count !== undefined && <span>{Number(source.metadata.row_count).toLocaleString()} source rows</span>}</div>
    </section>;
}

function DashboardViewer({ dashboard }) {
    const widgets = useMemo(() => [...(dashboard?.spec?.widgets ?? [])].sort((left, right) => (left.y - right.y) || (left.x - right.x)), [dashboard]);
    if (!dashboard) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">Generate a dashboard from an approved dataset or open one you saved.</div>;
    return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Movie dashboard</p><h2 className="mt-1 text-2xl font-bold text-[#14281c]">{dashboard.spec.title}</h2>{dashboard.spec.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{dashboard.spec.description}</p>}</div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{dashboard.saved_at ? 'Saved snapshot' : 'Generated draft'}</span></div>
        <div className="movie-dashboard-grid">{widgets.map(widget => <DashboardWidget key={widget.id} widget={widget} sources={dashboard.sources ?? {}} />)}</div>
        {dashboard.provenance && <p className="mt-4 break-words text-xs text-slate-500">Provenance: {[(dashboard.provenance.model_versions ?? []).length ? 'model ' + dashboard.provenance.model_versions.join(', ') : null, (dashboard.provenance.dataset_version_ids ?? []).length ? 'dataset version ' + dashboard.provenance.dataset_version_ids.join(', ') : null].filter(Boolean).join(' · ') || 'Model and dataset version information was not returned by the source.'}</p>}
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
                <p className="font-semibold">{String(result.tool ?? 'Model operation').replaceAll('_', ' ')}</p>
                <p className="mt-1 leading-5">{result.error?.message ?? 'The operation could not be completed.'}</p>
                {result.error?.code && <p className="mt-1 font-mono text-[10px] text-slate-500">{result.error.code}</p>}
            </div>)}
        </div>}
        {service?.needs_input && <p className="mt-3 border-t border-[#eed9d1] pt-3 text-xs">The request needs more information. Review the selected dataset and dashboard request, then try again.</p>}
    </section>;
}

function Card({ title, description, children }) {
    return (
        <section className="rounded-2xl border border-[#e2e6de] bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold text-[#14281c]">{title}</h2>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {children}
        </section>
    );
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
        {!availableOptions.length && <p className="mt-2 text-xs text-amber-800">This model has not reported its supported genre list.</p>}
    </div>;
}

function ToolResultCard({ result }) {
    const data = result.data ?? {};
    const rows = data.dashboard_data?.rows ?? [];
    const fields = data.dashboard_data?.fields ?? [];
    const facts = [
        data.model_version ? ['Model', data.model_version] : null,
        data.dataset_version_id ? ['Dataset version', data.dataset_version_id] : null,
        data.row_count !== undefined ? ['Source rows', Number(data.row_count).toLocaleString()] : null,
        data.currency ? ['Currency', data.currency] : null,
    ].filter(Boolean);

    return <details className="mt-2 rounded-xl border border-slate-200 bg-white text-xs">
        <summary className="cursor-pointer list-inside px-3 py-2.5 font-semibold text-emerald-800">Verified {String(result.tool ?? 'result').replaceAll('_', ' ')}</summary>
        <div className="space-y-2 border-t border-slate-100 p-3">
            {!!facts.length && <dl className="flex flex-wrap gap-x-4 gap-y-1">{facts.map(([label, value]) => <div key={label} className="flex gap-1"><dt className="text-slate-500">{label}:</dt><dd className="font-medium text-slate-700">{value}</dd></div>)}</dl>}
            {!!fields.length && !!rows.length && <div className="overflow-x-auto"><table className="min-w-full text-left"><thead><tr>{fields.slice(0, 5).map(field => <th key={field} className="px-2 py-1.5 font-semibold text-slate-500">{field.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.slice(0, 3).map((row, index) => <tr key={index} className="border-t border-slate-100">{fields.slice(0, 5).map(field => <td key={field} className="max-w-36 truncate px-2 py-1.5 text-slate-700">{Array.isArray(row[field]) ? row[field].join(', ') : String(row[field] ?? '—')}</td>)}</tr>)}</tbody></table>{rows.length > 3 && <p className="mt-1 text-slate-500">Showing 3 of {rows.length.toLocaleString()} result rows.</p>}</div>}
            {!fields.length && <p className="text-slate-500">The verified operation completed. No tabular result was returned.</p>}
        </div>
    </details>;
}

function scenarioSignature(value) {
    if (!value) return '';
    return JSON.stringify({ budget: Number(value.budget), genres: value.genres });
}

export default function MovieDashboard({ datasets = [], savedDashboards: initialSaved = [], dashboardTemplates = [], activeModel, modelError }) {
    const { auth } = usePage().props;
    const genreFeature = activeModel?.features?.genres ?? {};
    const genreOptions = genreFeature.options ?? [];
    const optionalFeatures = activeModel?.features ?? {};
    const [savedDashboards, setSavedDashboards] = useState(initialSaved);
    const [form, setForm] = useState({ budget: '', genres: [] });
    const [prediction, setPrediction] = useState(null);
    const [predictionInputs, setPredictionInputs] = useState(null);
    const [predictionBusy, setPredictionBusy] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState('');
    const [dashboardPrompt, setDashboardPrompt] = useState('Generate a dashboard comparing average historical revenue by genre and highlighting the active model version.');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [chatPrompt, setChatPrompt] = useState('');
    const [chat, setChat] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [errorTitle, setErrorTitle] = useState('Request could not be completed');
    const [errorResponse, setErrorResponse] = useState(null);
    const [notice, setNotice] = useState('');
    const [currentDashboard, setCurrentDashboard] = useState(null);
    const [draftName, setDraftName] = useState('');
    const chatLauncherRef = useRef(null);
    const chatInputRef = useRef(null);
    const dashboardBuilderRef = useRef(null);
    const readyDatasets = useMemo(() => datasets.filter(dataset => dataset.ready_for_analytics), [datasets]);
    const selectedDatasetInfo = useMemo(() => datasets.find(dataset => String(dataset.id) === String(selectedDataset)), [datasets, selectedDataset]);
    const money = value => formatValue(value, 'currency', prediction?.currency ?? 'USD');
    const updateForm = updates => setForm(previous => ({ ...previous, ...updates }));
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

    useEffect(() => {
        if (!chatOpen) return undefined;
        chatInputRef.current?.focus();
        const onKeyDown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setChatOpen(false);
                requestAnimationFrame(() => chatLauncherRef.current?.focus());
                return;
            }
            if (event.key !== 'Tab') return;
            const dialog = document.getElementById('survive-assistant-dialog');
            const focusable = [...(dialog?.querySelectorAll('button:not([disabled]),textarea:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])') ?? [])]
                .filter(element => element.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [chatOpen]);

    const closeAssistant = () => {
        setChatOpen(false);
        requestAnimationFrame(() => chatLauncherRef.current?.focus());
    };
    const openAssistant = suggestion => {
        if (suggestion) setChatPrompt(suggestion);
        setChatOpen(true);
    };

    const predict = async event => {
        event.preventDefault(); setPredictionBusy(true); setError(''); setNotice('');
        try {
            const payload = { budget: Number(form.budget), genres: form.genres };
            const response = await axios.post('/movie/predictions', payload);
            setPrediction(response.data); setPredictionInputs(payload); setNotice('Prediction returned by the active movie model.');
        } catch (requestError) { reportError(requestError, 'Prediction could not run'); }
        finally { setPredictionBusy(false); }
    };

    const sendChat = async event => {
        event.preventDefault();
        const message = chatPrompt.trim();
        if (!message) return;
        setChat(previous => [...previous, { role: 'user', content: message }]); setChatPrompt(''); setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/chat', {
                message,
                conversation: chat.slice(-12).map(turn => ({ role: turn.role, content: turn.content })),
                dataset_id: selectedDataset || null,
                scenario_context: context(),
            });
            setChat(previous => [...previous, { role: 'assistant', content: response.data.answer, tool_execution: response.data.tool_execution }]);
            if (response.data.dashboard) {
                setCurrentDashboard(response.data.dashboard); setDraftName(response.data.dashboard.name);
                setNotice('The AI generated a dashboard from verified model results. Save it to your dashboard library.');
            }
        } catch (requestError) {
            setChat(previous => [...previous, {
                role: 'assistant',
                content: errorMessage(requestError),
                tool_execution: requestError.response?.data?.tool_execution,
            }]);
            reportError(requestError, 'Assistant request could not be completed');
        }
        finally { setBusy(false); }
    };

    const generateDashboard = async event => {
        event.preventDefault(); setBusy(true); setError(''); setNotice('');
        try {
            const response = await axios.post('/movie/dashboards/generate', { message: dashboardPrompt, dataset_id: Number(selectedDataset), scenario_context: currentScenario, template_id: selectedTemplate || null });
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
            setNotice(response.data.answer || 'Dashboard refreshed from the current verified dataset and model results.');
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

    return <>
        <Head title="Movie dashboard" />
        <div className="min-h-screen bg-[#f3f4ef] text-slate-800">
            <AppNavbar title="Revenue dashboard" />
            <main className="w-full space-y-5 px-6 py-6 sm:px-8 lg:px-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c5332]">Model-backed decisions</p>
                        <h2 className="mt-1 text-2xl font-bold text-[#14281c] sm:text-3xl">Explore movie revenue with verified evidence</h2>
                        <p className="mt-2 text-sm text-slate-600">Run a revenue prediction, ask the assistant to analyze it, and build dashboards from approved historical data.</p>
                    </div>
                    {activeModel && (
                        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-right shadow-xs">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Active model</div>
                            <div className="mt-1 truncate font-mono text-xs text-slate-700">{activeModel.model_version}</div>
                            <div className="mt-1 text-xs text-slate-500">{activeModel.model_type} · {activeModel.currency ?? 'currency undeclared'}</div>
                        </div>
                    )}
                </div>

                {modelError && (
                    <div role="alert" className="rounded-xl border border-[#faecc4] bg-[#fffcf0] px-4 py-3.5 text-sm text-[#825b18] shadow-2xs">
                        {modelError} Use the separate production workbench to review model availability.
                    </div>
                )}
                {error && <ErrorNotice title={errorTitle} message={error} response={errorResponse} />}
                {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

                <div className="space-y-5">
                    <Card title="Movie revenue prediction" description="Run the active trained model for a USD point estimate. Inputs and model version stay visible with the result.">
                        {!activeModel && (
                            <p className="mb-4 rounded-xl border border-[#faecc4] bg-[#fffcf0] px-4 py-3 text-sm text-[#825b18]">
                                No active movie model is available right now. Review model availability in the separate production workbench.
                            </p>
                        )}
                        <form onSubmit={predict} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Production budget (USD)
                                    <BudgetInput value={form.budget} onChange={budget => updateForm({ budget })} />
                                </label>
                                <fieldset className="min-w-0 rounded-lg border border-slate-300 p-3">
                                    <legend className="px-1 text-sm font-semibold text-slate-700">Movie genres</legend>
                                    <GenrePicker options={genreOptions} multiple={genreFeature.multiple} value={form.genres} onChange={genres => updateForm({ genres })} />
                                    <span className="mt-2 block text-xs font-normal text-slate-500">Search the active model's vocabulary and select up to 16 genres.</span>
                                </fieldset>
                            </div>
                            {genreOptions.length === 0 && activeModel && (
                                <p className="text-sm text-amber-800">The active model did not report supported genre options; the API will validate submitted genres.</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    disabled={!activeModel || predictionBusy || !currentScenario}
                                    className="rounded-lg bg-[#6d7e73] px-4 py-2.5 text-sm font-semibold text-white shadow-2xs transition hover:bg-[#14281c] disabled:cursor-not-allowed disabled:bg-[#78887e] disabled:opacity-90"
                                >
                                    {predictionBusy ? 'Running prediction...' : 'Predict revenue'}
                                </button>
                                {prediction && <span className="text-xs text-slate-500">Model version {prediction.model_version}</span>}
                            </div>
                        </form>
                        {prediction && (
                            <div className={'mt-5 rounded-2xl border p-4 sm:p-5 ' + (predictionIsStale ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                                {predictionIsStale && (
                                    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900">
                                        <span><strong>Inputs changed.</strong> This result is stale and will not be attached to AI requests or new dashboards.</span>
                                        <button type="button" onClick={() => setForm(previous => ({ ...previous, budget: String(predictionInputs?.budget ?? ''), genres: predictionInputs?.genres ?? [] }))} className="font-semibold underline">Restore predicted inputs</button>
                                    </div>
                                )}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Predicted revenue</div><div className="mt-1 text-3xl font-bold tracking-tight text-[#14281c]">{money(prediction.prediction?.revenue ?? prediction.predicted_revenue)}</div><p className="mt-1 text-xs text-emerald-900">Point estimate · {prediction.currency ?? 'currency undeclared'}</p></div>
                                    <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Predicted for</div><div className="mt-1 text-sm font-semibold text-emerald-950">{money(predictionInputs?.budget)} · {(predictionInputs?.genres ?? []).join(', ')}</div></div>
                                    <div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Model version</div><div className="mt-1 break-all font-mono text-xs text-emerald-950">{prediction.model_version}</div></div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-200 pt-4">
                                    <button type="button" onClick={() => openAssistant('Explain this verified point prediction, including the model version and its limitations.')} className="rounded-lg border border-emerald-800/20 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100" disabled={!readyPrediction}>Ask AI to explain</button>
                                    <button type="button" onClick={() => openAssistant('Compare the current budget with a 20% budget reduction using the active model. Label this as a non-causal what-if estimate.')} className="rounded-lg border border-emerald-800/20 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100" disabled={!readyPrediction}>Compare −20% scenario</button>
                                    <button type="button" onClick={() => { setDashboardPrompt('Include my current verified movie revenue prediction and compare it with historical average revenue by genre.'); const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; dashboardBuilderRef.current?.scrollIntoView({ behavior, block: 'start' }); }} className="rounded-lg border border-emerald-800/20 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">Add to dashboard request</button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <div ref={dashboardBuilderRef} id="dashboard-builder" className="scroll-mt-5">
                        <Card title="Build a movie dashboard" description="Choose an approved historical source, start from an optional template, and generate a validated view from actual model or dataset results.">
                            {!readyDatasets.length && (
                                <div className="mb-4 rounded-xl border border-[#faecc4] bg-[#fffcf0] p-4 text-sm text-[#825b18]">
                                    <p className="font-semibold">No analytics-ready dataset is linked to this account.</p>
                                    <p className="mt-1 leading-5">Approve and validate a dataset in the <Link href="/workbench" className="font-semibold underline text-[#825b18]">production workbench</Link>, then return here.</p>
                                </div>
                            )}
                            <form onSubmit={generateDashboard} className="space-y-4">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                                    <div className="rounded-xl border border-[#e1e4da] bg-[#fafbf9] p-4">
                                        <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dce9d3] text-[11px] font-bold text-[#20401b]">1</span><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#596657]">Data source</p></div>
                                        <label className="block text-sm font-semibold text-slate-700">Approved historical dataset
                                            <select className="mt-1.5 w-full rounded-lg border-[#d9ded3] bg-white text-sm font-normal focus:border-emerald-700 focus:ring-emerald-700" value={selectedDataset} onChange={event => setSelectedDataset(event.target.value)} required>
                                                <option value="">Select a validated dataset</option>
                                                {datasets.map(dataset => <option key={dataset.id} value={dataset.id} disabled={!dataset.ready_for_analytics}>{dataset.filename}{dataset.production_name ? ' · ' + dataset.production_name : ''}{dataset.ready_for_analytics ? '' : ' · validate in workbench first'}</option>)}
                                            </select>
                                        </label>
                                        {selectedDatasetInfo?.ready_for_analytics ? <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600"><span className="rounded-full border border-[#e1e4da] bg-white px-2.5 py-1">{selectedDatasetInfo.row_count?.toLocaleString?.() ?? '—'} source rows</span><span className="rounded-full border border-[#e1e4da] bg-white px-2.5 py-1">Approved + validated</span></div> : <p className="mt-2 text-xs leading-5 text-slate-500">The source must pass approval and validation in the production workbench.</p>}
                                    </div>
                                    <div className="min-w-0 rounded-xl border border-[#e1e4da] bg-[#fafbf9] p-4">
                                        <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4e1d6] text-[11px] font-bold text-[#8f482e]">2</span><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#596657]">Dashboard request</p></div>
                                        {dashboardTemplates.length > 0 && <div className="mb-3 flex flex-wrap gap-2" aria-label="Dashboard templates">
                                            {dashboardTemplates.map(template => <button key={template.id} type="button" aria-pressed={selectedTemplate === template.id} onClick={() => { setSelectedTemplate(template.id); setDashboardPrompt(template.description); }} className={'rounded-lg border px-3 py-2 text-left text-xs transition ' + (selectedTemplate === template.id ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-500')}>
                                                <span className="block font-semibold">{template.title}</span><span className="mt-1 block leading-4">{template.description}</span>
                                            </button>)}
                                        </div>}
                                        <label className="block text-sm font-semibold text-slate-700">What should this dashboard show?
                                            <textarea className="mt-1.5 min-h-24 w-full resize-y rounded-lg border-[#d9ded3] bg-white text-sm font-normal leading-6 focus:border-emerald-700 focus:ring-emerald-700" maxLength="4000" value={dashboardPrompt} onChange={event => setDashboardPrompt(event.target.value)} required />
                                        </label>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eff1eb] pt-4">
                                    <p className="text-xs leading-5 text-slate-500">{readyPrediction ? 'Your current verified prediction can be included.' : predictionIsStale ? 'The visible prediction is stale; run it again before including it.' : 'Dashboard output will use only results returned by the selected dataset and active model.'}</p>
                                    <button disabled={busy || !activeModel || !selectedDatasetInfo?.ready_for_analytics} className="inline-flex items-center gap-2 rounded-lg bg-[#14281c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203a2a] disabled:cursor-not-allowed disabled:opacity-50" aria-busy={busy}>
                                        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                                        {busy ? 'Building dashboard...' : 'Generate dashboard'}
                                    </button>
                                </div>
                            </form>
                        </Card>
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
                                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(source.metadata ?? {}).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="break-all font-medium text-slate-700">{String(value)}</dd></div>)}</dl>
                            </section>)}
                        </div>}
                    </section>}

                    <Card title="Dashboard preview" description="Validated charts, tables, KPIs, and insights render from this dashboard's verified result snapshot."><DashboardViewer dashboard={currentDashboard} /></Card>

                    <div className="grid gap-3 md:grid-cols-2">
                        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Recent dashboards <span className="font-normal text-slate-500">({savedDashboards.length})</span></summary>
                            <div className="mt-3 space-y-2">{savedDashboards.slice(0, 5).map(item => <button key={item.id} disabled={busy} onClick={() => openDashboard(item.id)} className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><span className="block truncate font-semibold text-slate-800">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{item.title} · {item.saved_at ? new Date(item.saved_at).toLocaleDateString() : 'Saved'}</span></button>)}{!savedDashboards.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Generate and save a dashboard to keep a verified snapshot here.</p>}</div>
                        </details>
                        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Active model details <span className="font-normal text-slate-500">· {activeModel?.model_type ?? 'unavailable'}</span></summary>
                            {activeModel ? <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm">
                                <div><span className="block text-xs text-slate-500">Model version</span><span className="break-all font-mono text-xs text-slate-800">{activeModel.model_version}</span></div>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs"><span>Target: <strong>{(activeModel.prediction_targets ?? []).join(', ') || 'Not reported'}</strong></span><span>Output: <strong>{activeModel.prediction_type ?? 'Not reported'}</strong></span><span>Currency: <strong>{activeModel.currency ?? 'Not declared'}</strong></span></div>
                                <div className="flex flex-wrap gap-3 text-xs">{Object.entries(activeModel.evaluation_metrics ?? {}).map(([name, value]) => <p key={name} className="rounded-lg bg-slate-50 px-3 py-2"><span className="capitalize text-slate-500">{name.replaceAll('_', ' ')}</span><br /><strong>{activeModel.currency === 'USD' && ['mae', 'rmse'].includes(name.toLowerCase()) ? money(value) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}</strong></p>)}</div>
                                <p className="text-xs leading-5 text-slate-500">MAE is the average absolute difference between predicted and actual revenue on the evaluation set. Registration and validation do not guarantee predictive accuracy.</p>
                                {!!activeModel.limitations?.length && <div><p className="font-semibold text-slate-700">Limitations</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-500">{activeModel.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></div>}
                            </div> : <p className="mt-3 text-sm text-slate-500">Model metadata is unavailable. Check availability in the separate production workbench.</p>}
                        </details>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-[#e9eee8] p-4 text-xs leading-5 text-slate-600">Dataset upload, approval, validation, training, and model promotion stay in the separate <Link href="/workbench" className="font-semibold text-emerald-800 underline">production workbench</Link>.</div>
                </div>
            </main>
            <button ref={chatLauncherRef} type="button" onClick={() => openAssistant()} className="assistant-launcher fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#14281c] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[#24422e] focus:outline-none focus:ring-4 focus:ring-emerald-300 sm:bottom-6 sm:right-6" aria-haspopup="dialog" aria-expanded={chatOpen} aria-controls="survive-assistant-dialog"><span aria-hidden="true">✦</span> Ask SURVIVE</button>
            {chatOpen && <div className="assistant-backdrop fixed inset-0 z-50 flex items-end justify-end bg-slate-950/30 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeAssistant(); }}>
                <section id="survive-assistant-dialog" role="dialog" aria-modal="true" aria-labelledby="assistant-title" aria-describedby="assistant-description" className="assistant-drawer flex h-[min(88dvh,760px)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-[#f8f9f6] shadow-2xl sm:h-[min(760px,calc(100dvh-2rem))] sm:max-w-xl sm:rounded-2xl">
                    <header className="flex items-start justify-between gap-3 bg-[#14281c] px-4 py-4 text-white sm:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300">SURVIVE assistant</p><h2 id="assistant-title" className="mt-1 text-lg font-semibold">Movie intelligence</h2><p id="assistant-description" className="mt-1 text-xs text-emerald-100">Answers cite verified model or dataset results.</p></div><button type="button" onClick={closeAssistant} className="rounded-lg p-2 text-xl leading-none text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lime-300" aria-label="Close assistant">×</button></header>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 text-xs sm:px-5"><span className="font-semibold uppercase tracking-wide text-slate-500">Selected dataset</span><span className="max-w-[65%] truncate font-medium text-[#20401b]">{selectedDatasetInfo?.filename ?? 'No dataset selected'}{selectedDatasetInfo && !selectedDatasetInfo.ready_for_analytics ? ' · validate in workbench first' : ''}</span></div>
                    {!chat.length && <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-5"><button type="button" onClick={() => setChatPrompt('What happens if this movie budget is reduced by 20%?')} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-emerald-500 hover:text-emerald-900">Compare a −20% budget</button><button type="button" onClick={() => setChatPrompt('Compare historical average revenue by genre in the selected dataset.')} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-emerald-500 hover:text-emerald-900">Analyze revenue by genre</button></div>}
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-relevant="additions text" role="log">{!chat.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">Ask about your current prediction, a budget what-if comparison, model facts, or historical analytics. Any numerical answer must come from a verified tool result.</p>}{chat.map((turn, index) => <article key={index} className={turn.role === 'user' ? 'ml-6 rounded-2xl rounded-br-md bg-[#14281c] p-3.5 text-sm text-white sm:ml-12' : 'mr-4 rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3.5 text-sm text-slate-800 sm:mr-8'}><div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-60">{turn.role === 'user' ? 'You' : 'SURVIVE'}</div><p className="whitespace-pre-wrap leading-6">{turn.content}</p>{turn.tool_execution?.results?.filter(result => result.ok).map((result, resultIndex) => <ToolResultCard key={resultIndex} result={result} />)}{turn.tool_execution?.results?.filter(result => !result.ok).map((result, resultIndex) => <p key={'error-' + resultIndex} className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{String(result.tool ?? 'Operation').replaceAll('_', ' ')}: {result.error?.message ?? 'The operation did not complete.'}</p>)}</article>)}</div>
                    <form onSubmit={sendChat} className="border-t border-slate-200 bg-white p-3 sm:p-4"><label htmlFor="assistant-message" className="sr-only">Message SURVIVE</label><div className="flex items-end gap-2"><textarea id="assistant-message" ref={chatInputRef} className="min-h-12 max-h-36 min-w-0 flex-1 resize-y rounded-xl border-[#d9ded3] text-sm focus:border-emerald-700 focus:ring-emerald-700" maxLength="4000" rows="2" value={chatPrompt} onChange={event => setChatPrompt(event.target.value)} placeholder="Ask about a movie or dataset..." required /><button disabled={busy} className="rounded-xl bg-[#14281c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#203a2a] disabled:opacity-50">{busy ? 'Working…' : 'Send'}</button></div><p className="mt-2 text-[10px] text-slate-500">Model estimates are non-causal and use the active model version shown on this page.</p></form>
                </section>
            </div>}
        </div>
    </>;
}
