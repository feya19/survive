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

    // Data simulasi interaktif yang mencerminkan model pembelajaran mesin dan fitur riil aplikasi
    const demoTabs = {
        movie: {
            id: 'movie',
            tabTitle: 'Prediksi Film (LightGBM)',
            domainBadge: 'Domain: Produksi Film & Bioskop',
            headline: 'Pemodelan Pendapatan Film Berbasis Pembelajaran Mesin',
            inputSummary: 'Anggaran: $25,0 Juta • Genre: Fiksi Ilmiah & Aksi • Durasi: 120 Menit • Pemasaran: $8,0 Juta',
            kpis: [
                {
                    label: 'Prediksi Pendapatan Bioskop',
                    value: '$68,4 Juta',
                    subtext: 'Estimasi pendapatan kotor',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Proyeksi ROI Studio',
                    value: '2,74×',
                    subtext: 'Rasio pendapatan terhadap anggaran',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Versi Model Aktif',
                    value: 'v1.4.0 (LGBM)',
                    subtext: 'Dilatih dari 45.000+ data film',
                    color: 'text-gray-800',
                },
                {
                    label: 'Status Validasi Data',
                    value: '100% Terverifikasi',
                    subtext: 'Dataset telah terstandardisasi',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Perbandingan Historis Pendapatan Berdasarkan Genre Film',
            bars: [
                { label: 'Fiksi Ilmiah & Aksi (Kombinasi Pilihan)', value: '$68,4 Juta', percent: 85, highlight: true },
                { label: 'Aksi Murni', value: '$52,1 Juta', percent: 65, highlight: false },
                { label: 'Fiksi Ilmiah Tunggal', value: '$46,8 Juta', percent: 58, highlight: false },
                { label: 'Drama & Cerita Seru Rata-Rata', value: '$29,3 Juta', percent: 36, highlight: false },
            ],
            provenance: 'Model: movie_lgbm_models.joblib • Validasi: Teruji pada data historis bioskop',
            ctaText: 'Coba Prediksi Film di Studio',
        },
        advertising: {
            id: 'advertising',
            tabTitle: 'Ruang Kerja Periklanan',
            domainBadge: 'Domain: Kampanye & Belanja Iklan',
            headline: 'Optimalisasi Belanja Media & Proyeksi Pendapatan Multikanal',
            inputSummary: 'Total Belanja Iklan: $5,0 Juta • Saluran: Video Daring & Pencarian • Industri: Hiburan',
            kpis: [
                {
                    label: 'Estimasi Pendapatan Iklan',
                    value: '$14,2 Juta',
                    subtext: 'Proyeksi hasil kampanye',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Target Imbal Hasil (ROAS)',
                    value: '2,84×',
                    subtext: 'Pengembalian biaya belanja iklan',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Model Periklanan',
                    value: 'Regresi LGBM',
                    subtext: 'Model bauran fitur saluran',
                    color: 'text-gray-800',
                },
                {
                    label: 'Saluran Kinerja Tertinggi',
                    value: 'Video (Porsi 62%)',
                    subtext: 'Saluran dengan kontribusi terbesar',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Estimasi Pendapatan Berdasarkan Saluran Pemasaran',
            bars: [
                { label: 'Video Daring (Penstriman & YouTube)', value: '$8,8 Juta', percent: 88, highlight: true },
                { label: 'Media Sosial & Mitra Konten', value: '$3,4 Juta', percent: 52, highlight: false },
                { label: 'Iklan Mesin Pencari & Kinerja', value: '$2,0 Juta', percent: 34, highlight: false },
            ],
            provenance: 'Model: lightgbm_advertising_revenue.joblib • Dataset: global_ads_performance_dataset.csv',
            ctaText: 'Buka Ruang Kerja Periklanan',
        },
        workbench: {
            id: 'workbench',
            tabTitle: 'Pengelolaan Data & Asisten AI',
            domainBadge: 'Alat Penyerapan Data & Asisten AI',
            headline: 'Alur Otomatisasi Dataset & Pembuatan Dasbor Cepat',
            inputSummary: 'Format Berkas: CSV & XLSX • Pemetaan Skema Otomatis • Pembuatan Komponen Cerdas',
            kpis: [
                {
                    label: 'Format Berkas Didukung',
                    value: 'CSV & XLSX',
                    subtext: 'Pemeriksaan dan validasi kolom',
                    color: 'text-[#112316]',
                },
                {
                    label: 'Pemetaan Kolom',
                    value: 'Saran Otomatis',
                    subtext: 'Deteksi otomatis anggaran dan genre',
                    color: 'text-[#1b4e23]',
                },
                {
                    label: 'Asisten AI Studio',
                    value: 'Bahasa Alami',
                    subtext: 'Eksekusi kueri analitik langsung',
                    color: 'text-gray-800',
                },
                {
                    label: 'Pembuatan Dasbor',
                    value: 'Otomatis',
                    subtext: 'Komponen KPI, diagram batang, dan tabel',
                    color: 'text-emerald-800',
                },
            ],
            barsTitle: 'Tahapan Pemrosesan Data pada Meja Kerja (Workbench)',
            bars: [
                { label: '1. Pengunggahan Berkas (CSV & XLSX)', value: '100% Selesai', percent: 100, highlight: false },
                { label: '2. Pemindaian Profil & Pemetaan Kolom', value: '100% Tervalidasi', percent: 100, highlight: false },
                { label: '3. Standardisasi Data untuk Model Analitik', value: 'Siap Dianalisis', percent: 100, highlight: true },
            ],
            provenance: 'Alur Kerja: Pengunggahan → Validasi → Standardisasi Data → Pelatihan & Penerapan Model',
            ctaText: 'Jelajahi Pengelolaan Berkas',
        },
    };

    const currentTab = demoTabs[activeDemoTab];

    return (
        <div className="min-h-screen bg-[#f3f4ef] text-[#112316] font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414] relative overflow-x-hidden">
            <Head title="SURVIVE — Ruang Kerja Keputusan Studio Film & Media" />

            {/* Pendaran cahaya latar belakang selaras dengan halaman Masuk */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-[#9de062]/20 blur-3xl rounded-full pointer-events-none -z-0" />
            <div className="absolute top-[800px] -right-40 w-[600px] h-[400px] bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none -z-0" />
            <div className="absolute top-[1800px] -left-40 w-[600px] h-[400px] bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none -z-0" />

            {/* ─────────────────────────────────────────────────────────
                BILAH NAVIGASI
            ────────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-[#f3f4ef]/85 backdrop-blur-md border-b border-[#e2e7dc]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo dan Identitas Jenama */}
                        <Link href="/" className="inline-flex items-center space-x-3 group">
                            <div className="w-11 h-11 rounded-2xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                S
                            </div>
                            <div className="text-left">
                                <span className="font-black text-lg tracking-wider uppercase text-[#112316] block leading-none">
                                    SURVIVE
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[#2d5822] block mt-1">
                                    Ruang Kerja Studio
                                </span>
                            </div>
                        </Link>

                        {/* Tautan Navigasi Desktop */}
                        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-gray-700">
                            <a href="#fitur" className="hover:text-[#14281c] transition-colors">
                                Fitur Utama
                            </a>
                            <a href="#demo" className="hover:text-[#14281c] transition-colors">
                                Simulasi Model
                            </a>
                            <a href="#alur-kerja" className="hover:text-[#14281c] transition-colors">
                                Alur Kerja
                            </a>
                            <a href="#keunggulan" className="hover:text-[#14281c] transition-colors">
                                Keunggulan
                            </a>
                            <a href="#faq" className="hover:text-[#14281c] transition-colors">
                                Tanya Jawab
                            </a>
                        </nav>

                        {/* Tombol Akses Autentikasi */}
                        <div className="hidden sm:flex items-center space-x-3">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-4 py-2.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs"
                                >
                                    <span>Buka Studio</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#9de062]" />
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-[#14281c] hover:bg-black/5 transition-colors"
                                        >
                                            Masuk
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="px-4 py-2.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs group"
                                        >
                                            <span>Mulai Gratis</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-[#9de062] group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Tombol Menu Seluler */}
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-xl text-gray-700 hover:text-black hover:bg-black/5"
                                aria-label="Buka menu navigasi"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Menu Tarik-Turun Seluler */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-[#e2e7dc] px-4 pt-3 pb-6 space-y-3">
                        <a
                            href="#fitur"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Fitur Utama
                        </a>
                        <a
                            href="#demo"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Simulasi Model
                        </a>
                        <a
                            href="#alur-kerja"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Alur Kerja
                        </a>
                        <a
                            href="#keunggulan"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Keunggulan
                        </a>
                        <a
                            href="#faq"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#f3f4ef]"
                        >
                            Tanya Jawab
                        </a>

                        <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="w-full py-2.5 rounded-xl bg-[#14281c] text-white text-center font-semibold text-xs flex items-center justify-center space-x-2"
                                >
                                    <span>Buka Studio</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#9de062]" />
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="w-full py-2.5 text-center text-xs font-bold text-[#14281c] border border-[#e2e7dc] rounded-xl hover:bg-gray-50"
                                        >
                                            Masuk ke Studio
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="w-full py-2.5 rounded-xl bg-[#14281c] text-white text-center font-semibold text-xs flex items-center justify-center space-x-2"
                                        >
                                            <span>Daftar Akun Baru</span>
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
                BAGIAN UTAMA (HERO SECTION)
            ────────────────────────────────────────────────────────── */}
            <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Lencana Portal Produser */}
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#edf4e5] border border-[#d2e4c2] text-emerald-900 text-[11px] font-bold uppercase tracking-wider mb-6">
                            <span className="w-2 h-2 rounded-full bg-[#9de062]" />
                            <span>Portal Produser & Kecerdasan Keputusan Film</span>
                        </div>

                        {/* Judul Utama */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#112316] leading-[1.12]">
                            Keputusan Produksi Film yang Terukur,{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#14281c] underline decoration-[#9de062] decoration-4 underline-offset-8">
                                    Bukan Sekadar Firasat.
                                </span>
                            </span>
                        </h1>

                        {/* Penjelasan Ringkas */}
                        <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                            SURVIVE memadukan model pembelajaran mesin (LightGBM), analisis data historis,
                            dan asisten AI interaktif untuk memproyeksikan potensi pendapatan film serta efektivitas belanja iklan secara objektif.
                        </p>

                        {/* Tombol Ajakan Bertindak (CTA) */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-sm shadow-lg shadow-emerald-950/15 flex items-center justify-center space-x-2.5 transition-all group"
                                >
                                    <span>Lanjut ke Dasbor Studio</span>
                                    <ArrowRight className="w-4 h-4 text-[#9de062] group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('register')}
                                        className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-sm shadow-lg shadow-emerald-950/15 flex items-center justify-center space-x-2.5 transition-all group"
                                    >
                                        <span>Buka Akun Studio Gratis</span>
                                        <ArrowRight className="w-4 h-4 text-[#9de062] group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        href={route('login')}
                                        className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-[#112316] font-bold text-sm border border-[#e2e7dc] shadow-sm flex items-center justify-center space-x-2 transition-all"
                                    >
                                        <span>Masuk ke Studio</span>
                                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Poin Validasi Kredibilitas */}
                        <div className="mt-10 pt-8 border-t border-[#e2e7dc]/80 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-gray-600 font-medium">
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Model Pembelajaran Mesin Teruji (LightGBM)</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Dua Domain: Film & Periklanan</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#2d5822]" />
                                <span>Rekam Jejak Data & Model Transparan</span>
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────
                        PRATINJAU INTERAKTIF (LIVE DEMO SHOWCASE)
                    ────────────────────────────────────────────────────────── */}
                    <div id="demo" className="mt-16 max-w-5xl mx-auto">
                        <div className="bg-white rounded-3xl border border-[#e2e7dc] shadow-2xl shadow-emerald-950/10 overflow-hidden relative">
                            {/* Bilah Atas Pratinjau */}
                            <div className="bg-[#14281c] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#244b20]">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                    <span className="text-xs font-mono text-emerald-200/70 ml-2 tracking-wider">
                                        SURVIVE RUANG KERJA STUDIO // PRATINJAU SISTEM
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs font-semibold">
                                    <span className="text-gray-300">Status Sistem:</span>
                                    <span className="bg-[#244b20] text-[#9de062] px-2.5 py-0.5 rounded-lg border border-[#3b7335]">
                                        Model & Jalur Analisis Siap
                                    </span>
                                </div>
                            </div>

                            {/* Tombol Tab Pilihan Simulasi */}
                            <div className="bg-[#f9faf7] border-b border-[#e2e7dc] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-[#2d5822]" />
                                    Pilih Simulasi:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(demoTabs).map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveDemoTab(tab.id)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                                                activeDemoTab === tab.id
                                                    ? 'bg-[#14281c] text-[#9de062] shadow-sm'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#e2e7dc]'
                                            }`}
                                        >
                                            <span>{tab.tabTitle}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Konten Simulasi Aktif */}
                            <div className="p-6 sm:p-8">
                                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-2.5 py-0.5 rounded-full border border-[#d2e4c2] inline-block mb-1.5">
                                            {currentTab.domainBadge}
                                        </span>
                                        <h3 className="text-lg font-bold text-[#112316]">
                                            {currentTab.headline}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                                            {currentTab.inputSummary}
                                        </p>
                                    </div>
                                </div>

                                {/* Kisi Indikator Kinerja Utama (KPI) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {currentTab.kpis.map((kpi, index) => (
                                        <div key={index} className="bg-[#f9faf7] rounded-2xl p-4 border border-[#e2e7dc]">
                                            <div className="text-xs text-gray-500 font-medium">
                                                {kpi.label}
                                            </div>
                                            <div className={`mt-2 text-2xl font-black ${kpi.color}`}>
                                                {kpi.value}
                                            </div>
                                            <div className="mt-1 text-[11px] text-gray-500">
                                                {kpi.subtext}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Visualisasi Diagram Komparatif */}
                                <div className="mt-6 pt-6 border-t border-[#edf0ea]">
                                    <div className="text-xs font-bold text-[#112316] uppercase tracking-wider mb-4">
                                        {currentTab.barsTitle}
                                    </div>
                                    <div className="space-y-3">
                                        {currentTab.bars.map((item, idx) => (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-gray-700">
                                                    <span>{item.label}</span>
                                                    <span className={`font-mono ${item.highlight ? 'text-[#14281c] font-bold' : 'text-gray-500'}`}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-[#edf0ea] h-2.5 rounded-full overflow-hidden flex">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            item.highlight ? 'bg-[#14281c]' : 'bg-[#9de062]'
                                                        }`}
                                                        style={{ width: `${item.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Kartu Rekam Jejak Data (Provenance) */}
                                <div className="mt-6 bg-[#edf4e5] border border-[#d2e4c2] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 font-medium">
                                    <div className="flex items-center space-x-2">
                                        <ShieldCheck className="w-4 h-4 text-[#2d5822] shrink-0" />
                                        <span><strong>Rekam Jejak Data:</strong> {currentTab.provenance}</span>
                                    </div>
                                    <Link
                                        href={route(auth?.user ? 'dashboard' : 'register')}
                                        className="font-bold text-[#14281c] hover:underline flex items-center space-x-1"
                                    >
                                        <span>{currentTab.ctaText}</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Catatan Kaki Pratinjau */}
                            <div className="bg-[#f3f4ef] px-6 py-4 border-t border-[#e2e7dc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                                <span>
                                    *Model dilatih menggunakan pustaka LightGBM dengan dataset riil film dan periklanan.
                                </span>
                                <Link
                                    href={route('login')}
                                    className="font-bold text-[#14281c] hover:underline flex items-center space-x-1 shrink-0"
                                >
                                    <span>Masuk untuk menguji dataset Anda</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                FITUR UTAMA
            ────────────────────────────────────────────────────────── */}
            <section id="fitur" className="py-20 bg-white border-y border-[#e2e7dc]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Judul Bagian */}
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                            Fitur Unggulan
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#112316]">
                            Arsitektur Analitik untuk Keputusan Produksi yang Tepat
                        </h2>
                        <p className="text-sm sm:text-base text-gray-500 mt-3">
                            Setiap fitur terhubung langsung dengan mesin pembelajaran mesin dan basis data internal SURVIVE.
                        </p>
                    </div>

                    {/* Kisi-Kisi Fitur */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Fitur 1: Prediksi Pendapatan Film */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <Film className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Prediksi Pendapatan Film (LightGBM)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Masukkan anggaran produksi, pilih genre yang didukung model, durasi film, dan anggaran pemasaran
                                untuk memproyeksikan potensi pendapatan kotor bioskop secara objektif.
                            </p>
                        </div>

                        {/* Fitur 2: Ruang Kerja Periklanan */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <Tv className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Ruang Kerja Periklanan & Belanja Media
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Evaluasi performa kampanye iklan di berbagai platform, jenis kampanye, dan sektor industri.
                                Simulasikan alokasi anggaran belanja iklan untuk mengukur potensi pengembalian modal (ROAS).
                            </p>
                        </div>

                        {/* Fitur 3: Dasbor Visual & Templat */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <BarChart3 className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Dasbor Visual & Templat Siap Pakai
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Susun dasbor menggunakan templat bawaan (Ringkasan Eksekutif, Pembanding Genre, Bauran Saluran)
                                dengan komponen KPI, diagram batang, diagram garis, grafik sebar, dan tabel terverifikasi.
                            </p>
                        </div>

                        {/* Fitur 4: Pengelolaan Dataset (CSV/XLSX) */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <FileSpreadsheet className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Pengunggahan Dataset (CSV & XLSX)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Unggah berkas data produksi film atau kampanye periklanan Anda. Sistem menyediakan pemindaian profil otomatis,
                                saran pemetaan kolom, dan standardisasi data sebelum dianalisis.
                            </p>
                        </div>

                        {/* Fitur 5: Asisten AI Studio */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <Bot className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Asisten AI Percakapan (Bahasa Alami)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Ajukan pertanyaan bisnis dalam bahasa alami kepada asisten AI yang terintegrasi langsung dengan alat analitik.
                                Asisten mampu menjalankan kueri data dan merancang draf dasbor baru seketika.
                            </p>
                        </div>

                        {/* Fitur 6: Rekam Jejak Data Terverifikasi */}
                        <div className="bg-[#f9faf7] rounded-3xl p-7 border border-[#e2e7dc] hover:border-[#9de062] transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-[#edf4e5] border border-[#d2e4c2] flex items-center justify-center text-[#14281c] mb-5 group-hover:bg-[#9de062] transition-colors">
                                <ShieldCheck className="w-6 h-6 text-[#244b20] group-hover:text-[#102414]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Verifikasi Rekam Jejak Data (Provenance)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Setiap hasil estimasi menyertakan metadata versi model yang aktif, tanda pengenal versi dataset,
                                serta jumlah baris data sumber guna menjamin transparansi analisis bagi pemangku kepentingan.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                ALUR KERJA
            ────────────────────────────────────────────────────────── */}
            <section id="alur-kerja" className="py-20 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                            Alur Kerja Sistem
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#112316]">
                            Dari Data Mentah Menuju Keputusan yang Terverifikasi
                        </h2>
                        <p className="text-sm sm:text-base text-gray-500 mt-3">
                            Tiga langkah terstruktur di dalam Ruang Kerja Studio.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Langkah 1 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                01
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Tentukan Parameter atau Unggah Berkas
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Masukkan parameter proyek film (anggaran, genre, durasi) atau unggah berkas CSV/XLSX ke meja kerja data untuk dianalisis.
                            </p>
                        </div>

                        {/* Langkah 2 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                02
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Jalankan Prediksi Model & Asisten AI
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Mesin LightGBM mengevaluasi fitur masukan terhadap data historis, menghasilkan proyeksi pendapatan dan perbandingan komparatif.
                            </p>
                        </div>

                        {/* Langkah 3 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#e2e7dc] shadow-sm relative">
                            <div className="w-10 h-10 rounded-xl bg-[#14281c] text-[#9de062] font-black text-sm flex items-center justify-center mb-6">
                                03
                            </div>
                            <h3 className="text-lg font-bold text-[#112316] mb-2">
                                Simpan Dasbor & Rekaman Analisis
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                Simpan hasil analisis ke dalam pustaka dasbor pribadi lengkap dengan catatan versi model dan dataset yang valid.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                KEUNGGULAN & FONDASI ANALITIK
            ────────────────────────────────────────────────────────── */}
            <section id="keunggulan" className="py-20 bg-[#14281c] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#9de062]/10 blur-3xl rounded-full pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-5 space-y-5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9de062] bg-[#1f3a28] px-3 py-1 rounded-full border border-[#3b7335] inline-block">
                                Fondasi Analitik
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                                Pengambilan Keputusan Berdasarkan Data Historis yang Faktual.
                            </h2>
                            <p className="text-sm text-emerald-100/70 leading-relaxed">
                                Alih-alih bersandar pada intuisi semata, SURVIVE menghadirkan landasan kuantitatif melalui model prediktif
                                yang divalidasi dengan ribuan data riil produksi film dan performa periklanan.
                            </p>
                            <div className="pt-2">
                                <Link
                                    href={route('register')}
                                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#9de062] hover:bg-[#8fd452] text-[#102414] font-bold text-xs transition-colors shadow-sm"
                                >
                                    <span>Mulai Sekarang</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    LightGBM
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Algoritma Peningkat Gradien
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Model terlatih yang efisien dalam memetakan korelasi non-linear antara anggaran, genre, durasi, dan pendapatan.
                                </p>
                            </div>

                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    45.000+
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Data Film Historis
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Tolok ukur industri yang komprehensif untuk membandingkan proyeksi finansial karya Anda.
                                </p>
                            </div>

                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    2 Domain
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Film & Periklanan
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Fleksibilitas beralih antara pemodelan film layar lebar dan simulasi kampanye periklanan digital.
                                </p>
                            </div>

                            <div className="bg-[#1a3424] rounded-2xl p-6 border border-[#2b543b]">
                                <div className="text-3xl font-black text-[#9de062] mb-1">
                                    100%
                                </div>
                                <div className="text-sm font-bold text-white mb-2">
                                    Rekam Jejak Terverifikasi
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    Setiap visualisasi mencantumkan versi model dan riwayat dataset secara transparan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                TANYA JAWAB (FAQ)
            ────────────────────────────────────────────────────────── */}
            <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-3 py-1 rounded-full border border-[#d2e4c2] inline-block mb-3">
                        Pertanyaan Umum
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#112316]">
                        Pertanyaan yang Sering Diajukan
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 border border-[#e2e7dc]">
                        <h3 className="text-sm font-bold text-[#112316] mb-2">
                            Bagaimana SURVIVE memprediksi pendapatan film dan iklan?
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            SURVIVE memanfaatkan model pembelajaran mesin LightGBM yang telah dilatih menggunakan data historis performa film
                            dan kampanye periklanan. Model menganalisis kombinasi fitur masukan—seperti anggaran produksi, genre,
                            durasi penayangan, atau alokasi belanja iklan—untuk menghitung proyeksi pendapatan secara kuantitatif.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-[#e2e7dc]">
                        <h3 className="text-sm font-bold text-[#112316] mb-2">
                            Format berkas apa saja yang didukung oleh Meja Kerja (Workbench)?
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            Sistem mendukung berkas berformat CSV dan XLSX. Fitur pemindaian profil otomatis akan memeriksa integritas data,
                            menyarankan pemetaan nama kolom secara cerdas, dan menstandardisasi berkas agar siap digunakan untuk analisis model.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-[#e2e7dc]">
                        <h3 className="text-sm font-bold text-[#112316] mb-2">
                            Bagaimana cara kerja Asisten AI di dalam dasbor?
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            Asisten AI terhubung langsung dengan fungsi analitik sistem. Anda dapat mengajukan instruksi dalam bahasa alami,
                            lalu asisten akan mengeksekusi kueri terverifikasi pada model atau dataset yang aktif, sekaligus merangkai komponen visual dasbor baru secara otomatis.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                AJAKAN BERTINDAK TERAKHIR (CTA BANNER)
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
                                Siap Mengoptimalkan Keputusan Produksi Studio Anda?
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-3 mb-8">
                                Masuk ke Ruang Kerja Studio sekarang atau daftarkan akun baru Anda dalam hitungan detik.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                {auth?.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <span>Masuk ke Dasbor Studio</span>
                                        <ArrowRight className="w-4 h-4 text-[#9de062]" />
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <span>Daftar Akun Studio</span>
                                            <ArrowRight className="w-4 h-4 text-[#9de062]" />
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#edf4e5] hover:bg-[#e2edd4] text-[#14281c] font-bold text-xs sm:text-sm border border-[#d2e4c2] transition-colors"
                                        >
                                            <span>Masuk ke Studio</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────
                BAGIAN KAKI (FOOTER)
            ────────────────────────────────────────────────────────── */}
            <footer className="border-t border-[#e2e7dc] bg-[#f3f4ef] py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-sm">
                                S
                            </div>
                            <span className="font-bold text-sm tracking-wider uppercase text-[#112316]">
                                SURVIVE
                            </span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-500">
                                Dukungan Keputusan Produser
                            </span>
                        </div>

                        <div className="text-xs text-gray-500 text-center sm:text-right">
                            <span>SURVIVE Kecerdasan Keputusan © 2026 • Hak Cipta Dilindungi</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <Link href={route('login')} className="hover:text-[#14281c] transition-colors font-medium">
                                Masuk
                            </Link>
                            <span className="mx-2 text-gray-300">•</span>
                            <Link href={route('register')} className="hover:text-[#14281c] transition-colors font-medium">
                                Daftar
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
