import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Clock,
    Database,
    DollarSign,
    FileSpreadsheet,
    Film,
    Layers,
    Menu,
    ShieldCheck,
    Sliders,
    Sparkles,
    TrendingUp,
    Tv,
    X,
    ChevronRight,
    Bot,
} from 'lucide-react';

export default function Welcome({ auth, canLogin = true, canRegister = true }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDemoTab, setActiveDemoTab] = useState('movie');

    // Interactive demo data reflecting the app's machine learning models and features.
    const demoTabs = {
        movie: {
            id: 'movie',
            tabTitle: 'Movie Prediction (LightGBM)',
            domainBadge: 'Domain: Film Production & Box Office',
            headline: 'Machine Learning for Movie Revenue Modeling',
            inputSummary: 'Production budget: $25.0M • Genres: Science Fiction & Action',
            kpis: [
                {
                    label: 'Estimated Box Office Revenue',
                    value: '$68.4M',
                    subtext: 'Estimated gross revenue',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Projected Studio ROI',
                    value: '2.74×',
                    subtext: 'Revenue-to-budget ratio',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Active Model Version',
                    value: 'v1.4.0 (LGBM)',
                    subtext: 'Trained on 45,000+ movie records',
                    color: 'text-gray-800',
                },
                {
                    label: 'Data Validation Status',
                    value: '100% Verified',
                    subtext: 'Dataset has been standardized',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Historical Revenue Comparison by Movie Genre',
            bars: [
                { label: 'Science Fiction & Action (Selected)', value: '$68.4M', percent: 85, highlight: true },
                { label: 'Action', value: '$52.1M', percent: 65, highlight: false },
                { label: 'Science Fiction', value: '$46.8M', percent: 58, highlight: false },
                { label: 'Drama & Thriller Average', value: '$29.3M', percent: 36, highlight: false },
            ],
            provenance: 'Model: movie_lgbm_models.joblib • Validation: Evaluated against historical box office data',
            ctaText: 'Try Movie Prediction in the Studio',
        },
        advertising: {
            id: 'advertising',
            tabTitle: 'Advertising Workspace',
            domainBadge: 'Domain: Campaigns & Ad Spend',
            headline: 'Media Spend Planning & Multi-Channel Revenue Estimates',
            inputSummary: 'Ad spend: $5.0M • Platform: Online Video • Campaign: Awareness • Industry: Entertainment • Country: United States',
            kpis: [
                {
                    label: 'Estimated Advertising Revenue',
                    value: '$14.2M',
                    subtext: 'Projected campaign outcome',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Target Return on Ad Spend (ROAS)',
                    value: '2.84×',
                    subtext: 'Return relative to advertising spend',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Advertising Model',
                    value: 'LightGBM Regression',
                    subtext: 'Model using campaign features',
                    color: 'text-gray-800',
                },
                {
                    label: 'Top-Performing Channel',
                    value: 'Video (62% share)',
                    subtext: 'Channel with the largest contribution',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Estimated Revenue by Marketing Channel',
            bars: [
                { label: 'Online Video (Streaming & YouTube)', value: '$8.8M', percent: 88, highlight: true },
                { label: 'Social Media & Content Partners', value: '$3.4M', percent: 52, highlight: false },
                { label: 'Search & Performance Ads', value: '$2.0M', percent: 34, highlight: false },
            ],
            provenance: 'Model: lightgbm_advertising_revenue.joblib • Dataset: global_ads_performance_dataset.csv',
            ctaText: 'Open Advertising Workspace',
        },
        workbench: {
            id: 'workbench',
            tabTitle: 'Data Workbench',
            domainBadge: 'Upload, map, validate, and train',
            headline: 'Dataset Preparation & Dashboard Generation',
            inputSummary: 'File formats: CSV & XLSX • Suggested column mapping • Validated analytics',
            kpis: [
                {
                    label: 'Supported File Formats',
                    value: 'CSV & XLSX',
                    subtext: 'Column checks and validation',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Column Mapping',
                    value: 'Suggested mappings',
                    subtext: 'Automatic detection of budget and genre fields',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Validated Data Insights',
                    value: 'Evidence-based',
                    subtext: 'Generated from verified analytics',
                    color: 'text-gray-800',
                },
                {
                    label: 'Dashboard Generation',
                    value: 'Automated',
                    subtext: 'KPI cards, bar charts, and tables',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Workbench Data Processing Steps',
            bars: [
                { label: '1. Upload files (CSV & XLSX)', value: '100% complete', percent: 100, highlight: false },
                { label: '2. Profile data & map columns', value: '100% validated', percent: 100, highlight: false },
                { label: '3. Standardize data for analytics', value: 'Ready for analysis', percent: 100, highlight: true },
            ],
            provenance: 'Workflow: Upload → Validation → Data standardization → Model training & deployment',
            ctaText: 'Explore Data Management',
        },
    };

    const currentTab = demoTabs[activeDemoTab];

    return (
        <div className="min-h-screen bg-[#f3f4ef] text-[#112316] font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414] relative overflow-x-hidden">
            <Head title="SURVIVE — Film & Media Studio Decision Workspace" />

            {/* Background glow coordinated with the sign-in page */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-[#9de062]/20 blur-3xl rounded-full pointer-events-none -z-0" />
            <div className="absolute top-[800px] -right-40 w-[600px] h-[400px] bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none -z-0" />
            <div className="absolute top-[1800px] -left-40 w-[600px] h-[400px] bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none -z-0" />

            {/* ─────────────────────────────────────────────────────────
                NAVIGATION BAR
            ────────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-[#f3f4ef]/85 backdrop-blur-md border-b border-[#e2e7dc]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo and brand identity */}
                        <Link href="/" className="inline-flex items-center space-x-3 group">
                            <div className="w-11 h-11 rounded-2xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                S
                            </div>
                            <div className="text-left">
                                <span className="font-black text-lg tracking-wider uppercase text-[#112316] block leading-none">
                                    SURVIVE STUDIO
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[#2d5822] block mt-1">
                                    Studio Workspace
                                </span>
                            </div>
                        </Link>

                        {/* Desktop navigation links */}
                        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-gray-700">
                            <a href="#fitur" className="hover:text-[#14281c] transition-colors">
                                Features
                            </a>
                            <a href="#demo" className="hover:text-[#14281c] transition-colors">
                                Model Preview
                            </a>
                            <a href="#alur-kerja" className="hover:text-[#14281c] transition-colors">
                                Workflow
                            </a>
                            <a href="#keunggulan" className="hover:text-[#14281c] transition-colors">
                                Advantages
                            </a>
                            <a href="#faq" className="hover:text-[#14281c] transition-colors">
                                FAQ
                            </a>
                        </nav>

                        {/* Account access buttons */}
                        <div className="hidden sm:flex items-center space-x-3">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-4 py-2.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs"
                                >
                                    <span>Open Studio</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#9de062]" />
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-[#14281c] hover:bg-black/5 transition-colors"
                                        >
                                            Sign in
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="px-4 py-2.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs group"
                                        >
                                            <span>Get started for free</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-[#9de062] group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>

                {/* Mobile menu button */}
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-xl text-gray-700 hover:text-black hover:bg-black/5"
                                aria-label="Open navigation menu"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-[#e2e7dc] px-4 pt-3 pb-6 space-y-3">
                        <a
                            href="#fitur"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Features
                        </a>
                        <a
                            href="#demo"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Model Preview
                        </a>
                        <a
                            href="#alur-kerja"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Workflow
                        </a>
                        <a
                            href="#keunggulan"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Advantages
                        </a>
                        <a
                            href="#faq"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            FAQ
                        </a>

                        <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="w-full py-2.5 rounded-xl bg-[#14281c] text-white text-center font-semibold text-xs flex items-center justify-center space-x-2"
                                >
                                    <span>Open Studio</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#9de062]" />
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="w-full py-2.5 text-center text-xs font-bold text-[#14281c] border border-[#e2e7dc] rounded-xl hover:bg-gray-50"
                                        >
                                            Sign in to the Studio
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="w-full py-2.5 rounded-xl bg-[#14281c] text-white text-center font-semibold text-xs flex items-center justify-center space-x-2"
                                        >
                                            <span>Create an account</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-[#9de062]" />
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* ─────────────────────────────────────────────────────────
                HERO SECTION
            ────────────────────────────────────────────────────────── */}
            <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Main heading */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#112316] leading-[1.12]">
                            Make Measurable Film Production Decisions,{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#14281c] underline decoration-[#9de062] decoration-4 underline-offset-8">
                                    Beyond Gut Feeling.
                                </span>
                            </span>
                        </h1>

                        {/* Short introduction */}
                        <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                            SURVIVE combines machine learning models (LightGBM), historical data analysis, and validated insights
                            to estimate movie revenue and advertising performance.
                        </p>

                        {/* Call to action buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-sm shadow-lg shadow-emerald-950/15 flex items-center justify-center space-x-2.5 transition-all group"
                                >
                                    <span>Open Studio</span>
                                    <ArrowRight className="w-4 h-4 text-[#9de062] group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('register')}
                                        className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-sm shadow-lg shadow-emerald-950/15 flex items-center justify-center space-x-2.5 transition-all group"
                                    >
                                        <span>Create a free Studio account</span>
                                        <ArrowRight className="w-4 h-4 text-[#9de062] group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        href={route('login')}
                                        className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-[#112316] font-bold text-sm border border-[#e2e7dc] shadow-sm flex items-center justify-center space-x-2 transition-all"
                                    >
                                        <span>Sign in to the Studio</span>
                                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Credibility points */}
                        <div className="mt-10 pt-8 border-t border-[#e2e7dc]/80 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-gray-600 font-medium">
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Validated machine learning model (LightGBM)</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Two domains: Film & Advertising</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Transparent data and model provenance</span>
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────
                        LIVE APPLICATION PREVIEW
                    ────────────────────────────────────────────────────────── */}
                    <div className="mt-14 max-w-5xl mx-auto">
                        <div className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-[#14281c] to-[#1a3424] border border-[#2b543b] shadow-2xl shadow-emerald-950/25">
                            {/* Studio window bar */}
                            <div className="px-4 py-3 flex items-center justify-between text-xs text-gray-300 border-b border-[#244b20]">
                                <div className="flex items-center space-x-2">
                                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                                    <span className="ml-3 font-mono text-[11px] text-emerald-200/80 tracking-wider hidden sm:inline">
                                        SURVIVE STUDIO // Workspace & Model Analytics
                                    </span>
                                </div>
                            </div>

                            {/* Dashboard image */}
                            <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-[#112316] border border-[#2b543b]">
                                <img
                                    src="/assets/dashboard.png"
                                    alt="SURVIVE Studio dashboard interface"
                                    className="w-full h-auto object-cover object-top block hover:scale-[1.01] transition-transform duration-500"
                                    loading="eager"
                                />
                            </div>

                            {/* Dashboard feature captions */}
                            <div className="px-4 py-3 bg-[#14281c]/90 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-100/80">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1.5">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#9de062]" />
                                        <span>Campaign and media spend predictions</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#9de062]" />
                                        <span>Model insights based on historical data</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#9de062]" />
                                        <span>Dashboard generation from validated datasets</span>
                                    </div>
                                </div>
                                <span className="text-[11px] text-emerald-300 font-mono shrink-0">
                                    Dataset: global_ads_performance_dataset.csv
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                FEATURES
            ────────────────────────────────────────────────────────── */}
            <section id="fitur" className="py-20 bg-white border-y border-[#e2e7dc]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section heading */}
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                            KEY FEATURES
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#112316]">
                            Analytics for Better Production Decisions
                        </h2>
                        <p className="text-sm sm:text-base text-gray-500 mt-3">
                            Each feature connects to SURVIVE’s machine learning models and data sources.
                        </p>
                    </div>

                    {/* Feature grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Feature 1: Movie revenue prediction */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <Film className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Movie Revenue Prediction (LightGBM)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Enter a production budget and select supported genres to estimate potential box office revenue.
                            </p>
                        </div>

                        {/* Feature 2: Advertising workspace */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <Tv className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Advertising & Media Spend Workspace
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Evaluate campaigns by platform, campaign type, industry, and country. Compare ad spend scenarios and review estimated return on ad spend (ROAS).
                            </p>
                        </div>

                        {/* Feature 3: Visual dashboards and templates */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <BarChart3 className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Interactive Dashboards & Templates
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Generate a dashboard from validated historical data, with KPI cards, charts, and tables to support decision-making.
                            </p>
                        </div>

                        {/* Feature 4: Dataset management (CSV/XLSX) */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <FileSpreadsheet className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Dataset Upload (CSV & XLSX)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Upload movie production or advertising campaign data. The workbench profiles files, suggests column mappings, validates data, and prepares it for training and analysis.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                WORKFLOW
            ────────────────────────────────────────────────────────── */}
            <section id="alur-kerja" className="py-20 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                            THE WORKFLOW
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#112316]">
                            From Raw Data to Evidence-Based Decisions
                        </h2>
                        <p className="text-sm sm:text-base text-gray-500 mt-3">
                            Three structured steps in the Studio workspace.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Step 1 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                01
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Enter Inputs or Upload a Dataset
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Enter a movie production budget and select genres, or upload a CSV/XLSX dataset to the workbench.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                02
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Run a Prediction and Review Insights
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                LightGBM evaluates the inputs and returns a revenue estimate. Compare a budget or spend scenario to review how the model responds.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                03
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Generate and Save a Dashboard
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Build an interactive dashboard from validated data and save it with its dataset and model provenance.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                ADVANTAGES & ANALYTICS
            ────────────────────────────────────────────────────────── */}
            <section id="keunggulan" className="py-20 bg-[#14281c] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-5 space-y-5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9de062] bg-[#1f3a28] px-3 py-1 rounded-full border border-[#3b7335] inline-block">
                                ANALYTICS FOUNDATION
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                                Make Decisions with Historical Evidence.
                            </h2>
                            <p className="text-sm text-emerald-100/70 leading-relaxed">
                                SURVIVE provides quantitative estimates using predictive models evaluated against historical movie and advertising data.
                            </p>
                            <div className="pt-2">
                                <Link
                                    href={route('register')}
                                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#9de062] hover:bg-[#8fd452] text-[#102414] font-bold text-xs transition-colors shadow-sm"
                                >
                                    <span>Get started</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">

                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    45.000+
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Historical Movie Records
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Historical benchmarks to put your financial estimates in context.
                                </p>
                            </div>

                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    2 Domain
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Film & Advertising
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Switch between movie revenue planning and advertising campaign analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                FREQUENTLY ASKED QUESTIONS (FAQ)
            ────────────────────────────────────────────────────────── */}
            <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                        FAQ
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#112316]">
                        Frequently Asked Questions
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#e2e7dc]">
                        <h3 className="text-sm font-bold text-[#112316] mb-2">
                            How does SURVIVE estimate movie and advertising revenue?
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            SURVIVE uses LightGBM models trained on historical movie and advertising data. The movie model uses production budget and genres; the advertising model uses campaign inputs such as platform, campaign type, industry, country, and ad spend.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-[#e2e7dc]">
                        <h3 className="text-sm font-bold text-[#112316] mb-2">
                            Which file formats does the workbench support?
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            The workbench supports CSV and XLSX files. It profiles uploaded data, suggests column mappings, and validates datasets before training or dashboard analysis.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                FINAL CALL TO ACTION
            ────────────────────────────────────────────────────────── */}
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl border border-[#e2e7dc] p-8 sm:p-12 text-center shadow-xl shadow-emerald-950/5 relative overflow-hidden">
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#9de062]/20 blur-3xl rounded-full pointer-events-none" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <div className="w-12 h-12 rounded-2xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-xl mx-auto mb-5 shadow-sm">
                                S
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#112316] tracking-tight">
                                Ready to Make More Informed Studio Decisions?
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-3 mb-8">
                                Sign in to the Studio workspace or create an account in just a few steps.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                {auth?.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <span>Open Studio</span>
                                        <ArrowRight className="w-4 h-4 text-[#9de062]" />
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <span>Create a Studio account</span>
                                            <ArrowRight className="w-4 h-4 text-[#9de062]" />
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#edf4e5] hover:bg-[#e2edd4] text-[#14281c] font-bold text-xs sm:text-sm border border-[#d2e4c2] transition-colors"
                                        >
                                            <span>Sign in to the Studio</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                FOOTER
            ────────────────────────────────────────────────────────── */}
            <footer className="border-t border-[#e2e7dc] bg-[#f3f4ef] py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-sm">
                                S
                            </div>
                            <span className="font-bold text-sm tracking-wider uppercase text-[#112316]">
                                SURVIVE STUDIO
                            </span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-500">
                                Decision support for producers
                            </span>
                        </div>

                        <div className="text-xs text-gray-500 text-center sm:text-right">
                            <span>SURVIVE Decision Intelligence © 2026 • All rights reserved</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <Link href={route('login')} className="hover:text-[#14281c] transition-colors font-medium">
                                Sign in
                            </Link>
                            <span className="mx-2 text-gray-300">•</span>
                            <Link href={route('register')} className="hover:text-[#14281c] transition-colors font-medium">
                                Register
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
