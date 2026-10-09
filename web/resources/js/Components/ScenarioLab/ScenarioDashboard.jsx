import React, { useState, useEffect } from 'react';
import FileUploadView from './FileUploadView';
import AppNavbar from '@/Components/AppNavbar';
import { Calendar, TrendingUp, AlertTriangle, Sparkles, Check, DollarSign } from 'lucide-react';

export default function ScenarioDashboard({ user, initialPage = 'dashboard' }) {
    // Current Active Page in Sidebar ('dashboard' | 'upload')
    const [currentPage, setCurrentPage] = useState(initialPage);

    // Active Scenario in Dashboard
    const [activeScenario, setActiveScenario] = useState('crew-cost');
    const [activeTab, setActiveTab] = useState('overview');
    const [assumptionFilter, setAssumptionFilter] = useState('all');

    // Interactive Shocks (Monte Carlo Simulator)
    const [shocks, setShocks] = useState({
        budgetCuts: false,
        releaseDelay: true,
        leadUnavailable: false,
        locationLost: false,
        audienceDrop: true,
    });

    // Added mitigations
    const [addedMitigations, setAddedMitigations] = useState({});

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/upload')) {
            setCurrentPage('upload');
        }
    }, []);

    // Scenario data mapping
    const scenarios = {
        'crew-cost': {
            name: 'Crew cost +15%',
            dotColor: 'bg-amber-600',
            totalCost: '$27.1M',
            costDiff: '+$2.3M • +9.3%',
            costDiffBase: 'vs $24.8M base',
            finishDate: 'Oct 18, 2025',
            finishDiff: 'No change',
            finishDiffBase: 'vs Oct 18 base',
            revenue: '$68.4M',
            revenueDiff: '2.5× ROI',
            revenueDiffBase: 'vs $68.4M base',
            planRisk: 'Medium',
            riskScore: '41 risk score',
            riskDiffBase: 'vs Medium base',
            barData: [
                { category: 'Above the line', base: 8.6, scenario: 8.6, baseLabel: '$8.6M', scenarioLabel: '$8.6M' },
                { category: 'Production', base: 11.2, scenario: 13.4, baseLabel: '$11.2M', scenarioLabel: '$13.4M' },
                { category: 'Post-production', base: 3.2, scenario: 3.2, baseLabel: '$3.2M', scenarioLabel: '$3.2M' },
                { category: 'Finance & other', base: 1.8, scenario: 1.9, baseLabel: '$1.8M', scenarioLabel: '$1.9M' },
            ],
            primaryDriver: 'Production accounts for 96% of the variance. The model applies the crew rate increase to 74 shoot days and 12 prep weeks.',
            riskGauge: 41,
            riskToleranceText: 'Within tolerance — No critical thresholds exceeded.',
            risks: {
                budget: { label: 'Elevated', color: 'bg-amber-500', width: '72%' },
                schedule: { label: 'Low', color: 'bg-emerald-500', width: '22%' },
                revenue: { label: 'Moderate', color: 'bg-amber-400', width: '48%' },
            }
        },
        'delay': {
            name: '6-week delay',
            dotColor: 'bg-rose-500',
            totalCost: '$28.5M',
            costDiff: '+$3.7M • +14.9%',
            costDiffBase: 'vs $24.8M base',
            finishDate: 'Nov 29, 2025',
            finishDiff: '+6 weeks',
            finishDiffBase: 'vs Oct 18 base',
            revenue: '$64.1M',
            revenueDiff: '2.2× ROI',
            revenueDiffBase: 'vs $68.4M base',
            planRisk: 'Elevated',
            riskScore: '59 risk score',
            riskDiffBase: 'vs Medium base',
            barData: [
                { category: 'Above the line', base: 8.6, scenario: 9.1, baseLabel: '$8.6M', scenarioLabel: '$9.1M' },
                { category: 'Production', base: 11.2, scenario: 12.8, baseLabel: '$11.2M', scenarioLabel: '$12.8M' },
                { category: 'Post-production', base: 3.2, scenario: 4.5, baseLabel: '$3.2M', scenarioLabel: '$4.5M' },
                { category: 'Finance & other', base: 1.8, scenario: 2.1, baseLabel: '$1.8M', scenarioLabel: '$2.1M' },
            ],
            primaryDriver: 'Post-production and studio carrying costs drive 78% of variance under holiday distribution crunch.',
            riskGauge: 59,
            riskToleranceText: 'Elevated exposure — Window overlaps with tentpole competitor.',
            risks: {
                budget: { label: 'Elevated', color: 'bg-amber-500', width: '78%' },
                schedule: { label: 'High', color: 'bg-rose-500', width: '85%' },
                revenue: { label: 'Moderate', color: 'bg-amber-400', width: '55%' },
            }
        },
        'revenue-downside': {
            name: 'Revenue downside',
            dotColor: 'bg-purple-500',
            totalCost: '$24.8M',
            costDiff: 'No change',
            costDiffBase: 'vs $24.8M base',
            finishDate: 'Oct 18, 2025',
            finishDiff: 'No change',
            finishDiffBase: 'vs Oct 18 base',
            revenue: '$54.2M',
            revenueDiff: '1.8× ROI',
            revenueDiffBase: 'vs $68.4M base',
            planRisk: 'High',
            riskScore: '74 risk score',
            riskDiffBase: 'vs Medium base',
            barData: [
                { category: 'Above the line', base: 8.6, scenario: 8.6, baseLabel: '$8.6M', scenarioLabel: '$8.6M' },
                { category: 'Production', base: 11.2, scenario: 11.2, baseLabel: '$11.2M', scenarioLabel: '$11.2M' },
                { category: 'Post-production', base: 3.2, scenario: 3.2, baseLabel: '$3.2M', scenarioLabel: '$3.2M' },
                { category: 'Finance & other', base: 1.8, scenario: 1.8, baseLabel: '$1.8M', scenarioLabel: '$1.8M' },
            ],
            primaryDriver: 'Domestic box office softening triggers subordinate waterfall deficit without pre-sales buffer.',
            riskGauge: 74,
            riskToleranceText: 'Breaches downside threshold — Debt service coverage ratio at 1.1x.',
            risks: {
                budget: { label: 'Low', color: 'bg-emerald-500', width: '15%' },
                schedule: { label: 'Low', color: 'bg-emerald-500', width: '18%' },
                revenue: { label: 'Critical', color: 'bg-rose-600', width: '92%' },
            }
        }
    };

    const current = scenarios[activeScenario];

    // Calculate survival score based on active shocks
    const shockCount = Object.values(shocks).filter(Boolean).length;
    const survivalScore = Math.max(28, 92 - shockCount * 14 + (addedMitigations[1] ? 8 : 0) + (addedMitigations[2] ? 6 : 0));
    const lossProb = Math.min(68, 8 + shockCount * 12 - (addedMitigations[1] ? 5 : 0));

    // Mitigation options list
    const mitigations = [
        {
            id: 1,
            num: '01',
            title: 'Shift domestic release by two weeks',
            desc: 'Avoids the strongest competing title and recovers audience reach.',
            lift: '+11 pts',
            cost: '$180K'
        },
        {
            id: 2,
            num: '02',
            title: 'Secure cast schedule hold now',
            desc: 'Reduces lead unavailability exposure from 18% to 6%.',
            lift: '+8 pts',
            cost: '$95K'
        },
        {
            id: 3,
            num: '03',
            title: 'Pre-approve backup location package',
            desc: 'Caps relocation delay at four shoot days.',
            lift: '+6 pts',
            cost: '$240K'
        },
        {
            id: 4,
            num: '04',
            title: 'Stage marketing spend at greenlight gates',
            desc: 'Protects $1.2M if early demand signals soften.',
            lift: '+5 pts',
            cost: '$35K'
        }
    ];

    // Assumptions data
    const assumptions = [
        {
            area: 'PRODUCTION',
            title: 'Principal photography',
            base: '74 shoot days',
            scenario: '74 shoot days',
            isChanged: false,
            source: 'Schedule v18',
            ownerInitials: 'MC',
            ownerName: 'M. Chen',
            status: 'Locked',
            statusType: 'locked'
        },
        {
            area: 'CREW',
            title: 'Average crew day rate',
            base: '$186,400 / day',
            scenario: '$214,360 / day',
            isChanged: true,
            source: 'Union rates',
            ownerInitials: 'JA',
            ownerName: 'J. Alves',
            status: 'Changed',
            statusType: 'changed'
        },
        {
            area: 'POST',
            title: 'Post-production duration',
            base: '22 weeks',
            scenario: '22 weeks',
            isChanged: false,
            source: 'Post bid v4',
            ownerInitials: 'KS',
            ownerName: 'K. Shah',
            status: 'Verified',
            statusType: 'verified'
        },
        {
            area: 'REVENUE',
            title: 'Domestic box office',
            base: '$42.0M',
            scenario: '$42.0M',
            isChanged: false,
            source: 'Sales forecast',
            ownerInitials: 'LB',
            ownerName: 'L. Brooks',
            status: 'Review',
            statusType: 'review'
        },
        {
            area: 'REVENUE',
            title: 'International pre-sales',
            base: '$18.4M',
            scenario: '$18.4M',
            isChanged: false,
            source: 'Territory comps',
            ownerInitials: 'SI',
            ownerName: 'S. Ito',
            status: 'Verified',
            statusType: 'verified'
        },
        {
            area: 'FINANCE',
            title: 'Production contingency',
            base: '8.0%',
            scenario: '8.0%',
            isChanged: false,
            source: 'Finance policy',
            ownerInitials: 'MC',
            ownerName: 'M. Chen',
            status: 'Locked',
            statusType: 'locked'
        },
        {
            area: 'FINANCE',
            title: 'Bridge facility interest',
            base: '7.25% APR',
            scenario: '7.25% APR',
            isChanged: false,
            source: 'Term sheet',
            ownerInitials: 'JA',
            ownerName: 'J. Alves',
            status: 'Review',
            statusType: 'review'
        },
        {
            area: 'RISK',
            title: 'Weather hold allowance',
            base: '4 days',
            scenario: '4 days',
            isChanged: false,
            source: 'Location study',
            ownerInitials: 'KS',
            ownerName: 'K. Shah',
            status: 'Verified',
            statusType: 'verified'
        }
    ];

    const filteredAssumptions = assumptions.filter((item) => {
        if (assumptionFilter === 'changed') return item.isChanged;
        if (assumptionFilter === 'review') return item.statusType === 'review';
        return true;
    });

    const toggleShock = (key) => {
        setShocks((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleMitigation = (id) => {
        setAddedMitigations((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="h-screen bg-[#f3f4ef] text-[#1c1f1d] flex flex-col font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414] overflow-hidden">
            <AppNavbar
                user={user}
                title="Scenario lab"
                activeKey="scenario-lab"
                actions={
                    <div className="flex items-center space-x-2">
                        <div className="hidden lg:flex items-center space-x-2 text-xs text-emerald-200/80 font-medium mr-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live preview</span>
                        </div>
                        <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-[#112316]">
                            SURVIVE STUDIO
                        </span>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Saved 2 min ago</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setCurrentPage(currentPage === 'dashboard' ? 'upload' : 'dashboard')}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-100/30 bg-white/10 hover:bg-white/20 text-xs font-semibold text-emerald-100 flex items-center space-x-1.5 transition"
                        >
                            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>{currentPage === 'dashboard' ? 'Upload Data' : 'View Lab'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage('upload')}
                            className="px-2.5 py-1.5 rounded-lg bg-[#9de062] hover:bg-lime-200 text-[#102414] text-xs font-bold flex items-center space-x-1 transition shadow-xs"
                        >
                            <span>+</span>
                            <span className="hidden sm:inline">New scenario</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                }
            />

            {/* Main Content Area — scrollable */}
            <main className="flex-1 overflow-y-auto">
                <div className="w-full space-y-6 px-6 py-6 sm:px-8 lg:px-10">
                    {/* Render Page Based on Sidebar Selection */}
                    {currentPage === 'upload' ? (
                        <FileUploadView onSwitchToDashboard={() => setCurrentPage('dashboard')} />
                    ) : (
                        <>
                            {/* Breadcrumbs & Title */}
                            <div>
                                <div className="text-xs text-gray-500 font-medium mb-1 space-x-1.5">
                                    <span>Survive</span>
                                    <span>/</span>
                                    <span className="text-gray-800 font-semibold">Scenario lab</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#112316]">Scenario lab</h1>
                                        <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                                            Decision support for producers—stress-test the plan, challenge assumptions, and make the final call.
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center space-x-1 self-start md:self-auto">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Model updated May 7, 2025</span>
                                    </div>
                                </div>
                            </div>

                            {/* Producer In Control Banner */}
                            <div className="bg-[#e9eee2] border border-[#d6decd] rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#d5e4c6] text-[#213f1b] flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#142918]">Producer in control</h4>
                                        <p className="text-[11px] text-[#3e5643]">
                                            Models surface ranges and trade-offs. Nothing changes the plan without producer approval.
                                        </p>
                                    </div>
                                </div>

                                {/* Template Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
                                    <span className="text-[10px] tracking-wider font-semibold text-gray-500 uppercase mr-1">TEMPLATE</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#d2e7bf] text-[#1b3d17] font-semibold text-xs border border-[#bdd5a8]">
                                        Film <span className="ml-1 text-[9px] bg-[#275320] text-white px-1 rounded">MVP</span>
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/70 text-gray-600 font-medium text-xs border border-[#cfd6c7]">
                                        Event <span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 rounded">NEXT</span>
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/70 text-gray-600 font-medium text-xs border border-[#cfd6c7]">
                                        Music <span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 rounded">NEXT</span>
                                    </span>
                                </div>
                            </div>

                            {/* Compare Against Bar */}
                            <div className="bg-white border border-[#e1e4da] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mr-2">
                                        COMPARE AGAINST <strong className="text-gray-800 ml-1">Base plan</strong>
                                    </span>

                                    {/* Pill: Crew cost +15% */}
                                    <button
                                        onClick={() => setActiveScenario('crew-cost')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 border transition-all ${
                                            activeScenario === 'crew-cost'
                                                ? 'bg-[#f4efe6] border-[#cf8b4e] text-gray-900 shadow-2xs'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                        <span className="font-semibold">Crew cost +15%</span>
                                        {activeScenario === 'crew-cost' && <Check className="w-3.5 h-3.5 text-[#a16207]" />}
                                    </button>

                                    {/* Pill: 6-week delay */}
                                    <button
                                        onClick={() => setActiveScenario('delay')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 border transition-all ${
                                            activeScenario === 'delay'
                                                ? 'bg-[#faecee] border-[#d86877] text-gray-900 shadow-2xs'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span className="font-semibold">6-week delay</span>
                                        {activeScenario === 'delay' && <Check className="w-3.5 h-3.5 text-rose-600" />}
                                    </button>

                                    {/* Pill: Revenue downside */}
                                    <button
                                        onClick={() => setActiveScenario('revenue-downside')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 border transition-all ${
                                            activeScenario === 'revenue-downside'
                                                ? 'bg-[#f2edfa] border-[#a074d9] text-gray-900 shadow-2xs'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        <span className="font-semibold">Revenue downside</span>
                                        {activeScenario === 'revenue-downside' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                    </button>
                                </div>

                                <button className="text-gray-400 hover:text-gray-700 text-sm px-2">•••</button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex border-b border-[#d8dcd0] space-x-6 text-sm">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`pb-2.5 font-semibold transition-colors relative ${
                                        activeTab === 'overview'
                                            ? 'text-[#122318] border-b-2 border-[#122318]'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('assumptions')}
                                    className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 ${
                                        activeTab === 'assumptions'
                                            ? 'text-[#122318] border-b-2 border-[#122318]'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <span>Assumptions</span>
                                    <span className="text-[10px] bg-[#e1e5da] text-gray-700 px-1.5 py-0.2 rounded-full font-bold">
                                        8
                                    </span>
                                </button>
                            </div>

                            {/* Top 4 Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Metric 1: Total Cost */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                                                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                                            </div>
                                            <span>TOTAL COST</span>
                                        </div>
                                        <span className="text-gray-300">•••</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-extrabold text-[#112316] tracking-tight">
                                            {current.totalCost}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#fcedeb] text-[#b93826]">
                                                {current.costDiff}
                                            </span>
                                            <span className="text-xs text-gray-500">{current.costDiffBase}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metric 2: Finish Date */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                            </div>
                                            <span>FINISH DATE</span>
                                        </div>
                                        <span className="text-gray-300">•••</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-extrabold text-[#112316] tracking-tight">
                                            {current.finishDate}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                                {current.finishDiff}
                                            </span>
                                            <span className="text-xs text-gray-500">{current.finishDiffBase}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metric 3: Projected Revenue */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                                            </div>
                                            <span>PROJECTED REVENUE</span>
                                        </div>
                                        <span className="text-gray-300">•••</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-extrabold text-[#112316] tracking-tight">
                                            {current.revenue}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#e7f6d9] text-[#245217]">
                                                {current.revenueDiff}
                                            </span>
                                            <span className="text-xs text-gray-500">{current.revenueDiffBase}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metric 4: Plan Risk */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                            </div>
                                            <span>PLAN RISK</span>
                                        </div>
                                        <span className="text-gray-300">•••</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-extrabold text-[#112316] tracking-tight">
                                            {current.planRisk}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">
                                                {current.riskScore}
                                            </span>
                                            <span className="text-xs text-gray-500">{current.riskDiffBase}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Section: Cost Comparison & Risk Signals */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Cost Comparison (2 Cols on lg) */}
                                <div className="lg:col-span-2 bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                            <div>
                                                <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                                    COST COMPARISON
                                                </span>
                                                <h3 className="text-base sm:text-lg font-bold text-[#112316] mt-0.5">Where the plan moves</h3>
                                            </div>
                                            <div className="flex items-center space-x-4 text-xs font-medium text-gray-600">
                                                <div className="flex items-center space-x-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-[#c9cec2]"></span>
                                                    <span>Base</span>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-xs bg-[#c25e2e]"></span>
                                                    <span>{current.name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bar Chart Comparison */}
                                        <div className="space-y-4 my-6">
                                            {current.barData.map((bar, i) => (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-xs text-gray-700 font-medium">
                                                        <span>{bar.category}</span>
                                                        <div className="space-x-3 text-[11px] text-gray-500">
                                                            <span>Base: {bar.baseLabel}</span>
                                                            <span className="font-bold text-[#c25e2e]">Now: {bar.scenarioLabel}</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {/* Base Bar */}
                                                        <div className="w-full bg-[#f1f3ed] rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-[#b3b9ab] h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${(bar.base / 15) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        {/* Scenario Bar */}
                                                        <div className="w-full bg-[#f1f3ed] rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-[#c25e2e] h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${(bar.scenario / 15) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Driver Insight Callout */}
                                    <div className="mt-4 bg-[#eff5e7] border border-[#d6e4c7] rounded-xl p-3 flex items-start space-x-3 text-xs text-[#20401b]">
                                        <div className="w-5 h-5 rounded-md bg-[#d2e7bf] flex items-center justify-center shrink-0">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                                        </div>
                                        <p className="leading-relaxed">
                                            <strong>Primary driver:</strong> {current.primaryDriver}
                                        </p>
                                    </div>
                                </div>

                                {/* Exposure: Risk Signals (1 Col) */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                                    EXPOSURE
                                                </span>
                                                <h3 className="text-base sm:text-lg font-bold text-[#112316] mt-0.5">Risk signals</h3>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef3c7] text-[#92400e]">
                                                {current.planRisk}
                                            </span>
                                        </div>

                                        {/* Circular Meter */}
                                        <div className="flex items-center space-x-4 my-5 bg-[#fafbf9] p-3 rounded-xl border border-gray-100">
                                            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                                                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                                    <path
                                                        className="text-gray-200"
                                                        strokeWidth="3.5"
                                                        stroke="currentColor"
                                                        fill="none"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    />
                                                    <path
                                                        className="text-[#c25e2e]"
                                                        strokeDasharray={`${current.riskGauge}, 100`}
                                                        strokeWidth="3.5"
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="none"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    />
                                                </svg>
                                                <div className="absolute flex flex-col items-center">
                                                    <span className="text-base font-extrabold text-[#112316]">{current.riskGauge}</span>
                                                    <span className="text-[9px] text-gray-400 -mt-1">/ 100</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-gray-900">Tolerance status</div>
                                                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                                                    {current.riskToleranceText}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Breakdown Bars */}
                                        <div className="space-y-3.5">
                                            <div>
                                                <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                                                    <span>Budget overrun</span>
                                                    <span className="text-amber-700 font-bold">{current.risks.budget.label}</span>
                                                </div>
                                                <div className="w-full bg-[#f1f3ed] rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`${current.risks.budget.color} h-1.5 rounded-full transition-all`}
                                                        style={{ width: current.risks.budget.width }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                                                    <span>Schedule slip</span>
                                                    <span className="text-emerald-700 font-bold">{current.risks.schedule.label}</span>
                                                </div>
                                                <div className="w-full bg-[#f1f3ed] rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`${current.risks.schedule.color} h-1.5 rounded-full transition-all`}
                                                        style={{ width: current.risks.schedule.width }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                                                    <span>Revenue shortfall</span>
                                                    <span className="text-amber-700 font-bold">{current.risks.revenue.label}</span>
                                                </div>
                                                <div className="w-full bg-[#f1f3ed] rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`${current.risks.revenue.color} h-1.5 rounded-full transition-all`}
                                                        style={{ width: current.risks.revenue.width }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Lower Mid: Demand Prediction & Survival Simulator */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Demand Prediction */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                                DEMAND PREDICTION
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                                            DEMO MODEL
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-[#112316] mb-4">Audience & revenue forecast</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-gray-100 rounded-xl p-3 bg-[#fafbf9]">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">FORECAST AUDIENCE</span>
                                            <span className="text-lg sm:text-xl font-extrabold text-[#112316] block mt-1">8.4M</span>
                                            <span className="text-[10px] text-gray-500">5.9M–12.8M range</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">FORECAST REVENUE</span>
                                            <span className="text-lg sm:text-xl font-extrabold text-[#112316] block mt-1">$68.4M</span>
                                            <span className="text-[10px] text-gray-500">$48.1M–$96.7M range</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">MODEL CONFIDENCE</span>
                                            <span className="text-lg sm:text-xl font-extrabold text-[#112316] block mt-1">Moderate</span>
                                            <span className="text-[10px] text-gray-500">Wide range from comps</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Survival Simulator: Monte Carlo Stress Test */}
                                <div className="bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                            <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                                SURVIVAL SIMULATOR
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                            10,000 RUNS
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-[#112316]">Monte Carlo stress test</h3>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Combine shocks to see the range of project outcomes and the chance of losing capital.
                                    </p>

                                    {/* Shock Toggles */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                        {[
                                            { key: 'budgetCuts', label: 'Budget cut', diff: '-8%' },
                                            { key: 'releaseDelay', label: 'Release delay', diff: '+6 weeks' },
                                            { key: 'leadUnavailable', label: 'Lead unavailable', diff: '3 weeks' },
                                            { key: 'locationLost', label: 'Hero location lost', diff: 'Replace' },
                                            { key: 'audienceDrop', label: 'Audience drop', diff: '-12%' }
                                        ].map((s) => (
                                            <button
                                                key={s.key}
                                                onClick={() => toggleShock(s.key)}
                                                className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                                                    shocks[s.key]
                                                        ? 'bg-[#edeaf8] border-[#9f85dc] text-indigo-950 font-bold shadow-2xs'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <div className="truncate pr-1">
                                                    <span className="block truncate text-[11px] sm:text-xs">{s.label}</span>
                                                    <span className="text-[10px] opacity-75 font-mono">{s.diff}</span>
                                                </div>
                                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${shocks[s.key] ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>
                                                    {shocks[s.key] ? <Check className="w-2.5 h-2.5" /> : '+'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Simulation Outputs */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                                        <div>
                                            <span className="text-gray-500 block text-[10px] font-semibold uppercase">SURVIVAL SCORE</span>
                                            <span className="text-lg sm:text-xl font-extrabold text-[#112316]">{survivalScore} / 100</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-500 block text-[10px] font-semibold uppercase">PROBABILITY OF LOSS</span>
                                            <span className="text-lg sm:text-xl font-extrabold text-rose-600">{lossProb}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mitigation Options */}
                            <div className="bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                            RANKED FOR PRODUCER REVIEW
                                        </span>
                                        <h3 className="text-base sm:text-lg font-bold text-[#112316] mt-0.5">Mitigation options</h3>
                                    </div>
                                    <button className="px-3.5 py-1.5 rounded-lg border border-[#d2d7cb] bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 self-start sm:self-auto">
                                        Compare selected
                                    </button>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {mitigations.map((opt) => (
                                        <div key={opt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 px-2 rounded-lg transition-colors">
                                            <div className="flex items-start space-x-3">
                                                <span className="text-xs font-mono font-semibold text-gray-400 mt-0.5">{opt.num}</span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-[#112316]">{opt.title}</h4>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-5 shrink-0 self-end sm:self-auto">
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block">SCORE LIFT</span>
                                                    <span className="text-xs font-extrabold text-emerald-700">{opt.lift}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block">EST. COST</span>
                                                    <span className="text-xs font-extrabold text-gray-800">{opt.cost}</span>
                                                </div>
                                                <button
                                                    onClick={() => toggleMitigation(opt.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${
                                                        addedMitigations[opt.id]
                                                            ? 'bg-emerald-700 text-white shadow-2xs'
                                                            : 'border border-[#d2d7cb] bg-white hover:bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {addedMitigations[opt.id] ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Added to plan</span>
                                                        </>
                                                    ) : (
                                                        <span>Add to plan</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assumptions Register Table */}
                            <div className="bg-white border border-[#e1e4da] rounded-2xl p-4 sm:p-6 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                                            MODEL INPUTS
                                        </span>
                                        <h3 className="text-base sm:text-lg font-bold text-[#112316] mt-0.5">Assumptions register</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Trace every input, owner, and source behind this comparison.
                                        </p>
                                    </div>

                                    {/* Table Filter Tabs */}
                                    <div className="flex flex-wrap items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50 text-xs font-medium self-start sm:self-auto">
                                        <button
                                            onClick={() => setAssumptionFilter('all')}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                                assumptionFilter === 'all' ? 'bg-white shadow-2xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            All assumptions
                                        </button>
                                        <button
                                            onClick={() => setAssumptionFilter('changed')}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                                assumptionFilter === 'changed' ? 'bg-white shadow-2xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            Changed only
                                        </button>
                                        <button
                                            onClick={() => setAssumptionFilter('review')}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                                assumptionFilter === 'review' ? 'bg-white shadow-2xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            Needs review
                                        </button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs min-w-[620px]">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                                                <th className="py-2.5 pr-4">AREA / ASSUMPTION</th>
                                                <th className="py-2.5 px-3">BASE PLAN</th>
                                                <th className="py-2.5 px-3">CREW COST +15%</th>
                                                <th className="py-2.5 px-3">SOURCE</th>
                                                <th className="py-2.5 px-3">OWNER</th>
                                                <th className="py-2.5 pl-3">STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredAssumptions.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="py-3 pr-4">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                                                            {row.area}
                                                        </span>
                                                        <span className="font-bold text-[#112316]">{row.title}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-gray-600">{row.base}</td>
                                                    <td className="py-3 px-3 font-bold">
                                                        {row.isChanged ? (
                                                            <span className="text-[#c25e2e] bg-[#fcedeb] px-1.5 py-0.5 rounded">
                                                                {row.scenario} <span className="text-[9px] uppercase ml-1">CHANGED</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">{row.scenario}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <a href="#" className="text-gray-600 underline decoration-dotted hover:text-gray-900">
                                                            {row.source}
                                                        </a>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className="w-5 h-5 rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 flex items-center justify-center">
                                                                {row.ownerInitials}
                                                            </span>
                                                            <span className="text-gray-700">{row.ownerName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 pl-3">
                                                        {row.statusType === 'locked' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                                                                Locked
                                                            </span>
                                                        )}
                                                        {row.statusType === 'changed' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-[#faecee] text-[#c25e2e] text-[10px] font-bold">
                                                                Changed
                                                            </span>
                                                        )}
                                                        {row.statusType === 'verified' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-[#e7f6d9] text-[#245217] text-[10px] font-bold">
                                                                Verified
                                                            </span>
                                                        )}
                                                        {row.statusType === 'review' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                                                                Review
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-2 border-t border-gray-100 text-xs text-gray-500 font-medium gap-2">
                                    <span>Showing {filteredAssumptions.length} of 8 assumptions</span>
                                    <a href="#" className="font-semibold text-gray-800 hover:text-black flex items-center space-x-1 self-start sm:self-auto">
                                        <span>Open full register</span>
                                        <span>→</span>
                                    </a>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
