import React, { useState, useRef } from 'react';

export default function FileUploadView({ onSwitchToDashboard }) {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState([
        {
            id: 1,
            name: 'Northstar_Principal_Budget_v18.2.xlsx',
            size: '14.8 MB',
            progress: 100,
            status: 'Ready',
            type: 'spreadsheet',
            target: 'Cost Comparison Model',
            updated: 'Just now'
        }
    ]);

    const [uploadedVault, setUploadedVault] = useState([
        {
            id: 'doc-1',
            name: 'Northstar_Master_Budget_Final.xlsx',
            size: '14.2 MB',
            type: 'XLSX',
            category: 'Budget Sheet',
            status: 'Active in model',
            statusType: 'active',
            uploadedBy: 'M. Chen',
            date: 'May 5, 2025',
            assumptionsCount: 4
        },
        {
            id: 'doc-2',
            name: 'Crew_Day_Rate_Agreements_2025.pdf',
            size: '3.4 MB',
            type: 'PDF',
            category: 'Union Rates',
            status: 'Verified',
            statusType: 'verified',
            uploadedBy: 'J. Alves',
            date: 'May 6, 2025',
            assumptionsCount: 2
        },
        {
            id: 'doc-3',
            name: 'Shoot_Days_Schedule_74days.csv',
            size: '820 KB',
            type: 'CSV',
            category: 'Schedule',
            status: 'Active in model',
            statusType: 'active',
            uploadedBy: 'M. Chen',
            date: 'May 7, 2025',
            assumptionsCount: 1
        },
        {
            id: 'doc-4',
            name: 'Domestic_Box_Office_Comparables.json',
            size: '640 KB',
            type: 'JSON',
            category: 'Box Office Comp',
            status: 'Review required',
            statusType: 'review',
            uploadedBy: 'L. Brooks',
            date: 'May 7, 2025',
            assumptionsCount: 1
        }
    ]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files) => {
        Array.from(files).forEach((file, index) => {
            const newUpload = {
                id: Date.now() + index,
                name: file.name,
                size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                progress: 0,
                status: 'Processing...',
                type: file.name.split('.').pop() || 'file',
                target: 'Auto-mapping assumptions...',
                updated: 'Just now'
            };

            setUploadingFiles((prev) => [newUpload, ...prev]);

            // Simulate progress
            let current = 0;
            const timer = setInterval(() => {
                current += 25;
                if (current >= 100) {
                    clearInterval(timer);
                    setUploadingFiles((prev) =>
                        prev.map((item) =>
                            item.id === newUpload.id
                                ? { ...item, progress: 100, status: 'Parsed & Ingested' }
                                : item
                        )
                    );
                    // Add to vault
                    setUploadedVault((prev) => [
                        {
                            id: `doc-${Date.now()}`,
                            name: file.name,
                            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                            type: file.name.split('.').pop().toUpperCase(),
                            category: 'Uploaded Asset',
                            status: 'Active in model',
                            statusType: 'active',
                            uploadedBy: 'Producer',
                            date: 'Just now',
                            assumptionsCount: 2
                        },
                        ...prev
                    ]);
                } else {
                    setUploadingFiles((prev) =>
                        prev.map((item) =>
                            item.id === newUpload.id ? { ...item, progress: current } : item
                        )
                    );
                }
            }, 300);
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <div className="text-xs text-gray-500 font-medium mb-1 space-x-1.5">
                    <span>Productions</span>
                    <span>/</span>
                    <span>Northstar</span>
                    <span>/</span>
                    <span className="text-gray-800 font-semibold">Data Ingestion</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#112316]">
                            File Upload & Data Ingestion
                        </h1>
                        <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                            Upload budget models, schedules, crew rate cards, or box-office forecasts to automatically update Scenario Lab assumptions.
                        </p>
                    </div>
                    <button
                        onClick={onSwitchToDashboard}
                        className="px-3.5 py-2 rounded-lg bg-[#14281c] hover:bg-[#1e3828] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all self-start sm:self-auto"
                    >
                        <span>← Back to Scenario Lab</span>
                    </button>
                </div>
            </div>

            {/* Quick Info Banner */}
            <div className="bg-[#e9eee2] border border-[#d6decd] rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#d5e4c6] text-[#213f1b] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-[#142918]">Automated Extraction Pipeline</h4>
                        <p className="text-[11px] text-[#3e5643]">
                            Uploaded spreadsheets and PDFs are scanned for shoot days, day rates, and cost variance items with human-in-the-loop review.
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#1c3818]">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Parser Engine v2.4 Active</span>
                </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragActive
                        ? 'border-[#7db345] bg-[#edf4e4] shadow-md scale-[1.005]'
                        : 'border-[#cbd3c2] bg-white hover:bg-[#fafbfa] shadow-2xs'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleChange}
                    accept=".xlsx,.xls,.csv,.pdf,.json"
                />

                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#edf4e4] text-[#2d5822] flex items-center justify-center shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#112316]">
                    Drag and drop your production files here
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Supported formats: <strong className="text-gray-700">.xlsx, .csv, .pdf, .json</strong> (Max file size: 50 MB)
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-gray-600">
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200">📊 Excel Budget (.xlsx)</span>
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200">📑 Rate Sheets (.pdf)</span>
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200">📅 Schedule (.csv)</span>
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200">📈 Forecast (.json)</span>
                </div>

                <div className="mt-6">
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-[#14281c] hover:bg-[#1e3828] text-white text-xs font-semibold shadow-xs">
                        Browse Files on Computer
                    </span>
                </div>
            </div>

            {/* Ingestion & Active Uploads Status */}
            {uploadingFiles.length > 0 && (
                <div className="bg-white border border-[#e1e4da] rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Recent Upload Queue ({uploadingFiles.length})
                        </h4>
                        <span className="text-[11px] text-gray-500">Auto-saved to Northstar vault</span>
                    </div>

                    <div className="space-y-2.5">
                        {uploadingFiles.map((f) => (
                            <div
                                key={f.id}
                                className="p-3 rounded-xl border border-gray-100 bg-[#fafbf9] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                                <div className="flex items-center space-x-3 truncate">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                                        📄
                                    </div>
                                    <div className="truncate">
                                        <div className="text-xs font-bold text-[#112316] truncate">{f.name}</div>
                                        <div className="text-[10px] text-gray-500">
                                            {f.size} • {f.target}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                                    <div className="w-28 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${f.progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-700">{f.status}</span>
                                    <button
                                        onClick={onSwitchToDashboard}
                                        className="text-xs font-semibold text-[#14281c] hover:underline"
                                    >
                                        Inspect Model ➔
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Vault Table */}
            <div className="bg-white border border-[#e1e4da] rounded-2xl p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <span className="text-[10px] tracking-wider font-bold text-gray-400 uppercase">
                            INGESTED ASSETS
                        </span>
                        <h3 className="text-lg font-bold text-[#112316] mt-0.5">Project Data Vault</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Files currently feeding the Northstar scenario models and assumptions register.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-medium">4 files active</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 pr-4">FILE NAME</th>
                                <th className="py-2.5 px-3">CATEGORY</th>
                                <th className="py-2.5 px-3">SIZE</th>
                                <th className="py-2.5 px-3">UPLOADED BY</th>
                                <th className="py-2.5 px-3">ASSUMPTIONS LINKED</th>
                                <th className="py-2.5 pl-3">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {uploadedVault.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center space-x-2.5">
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono font-bold text-gray-600">
                                                {doc.type}
                                            </span>
                                            <span className="font-bold text-[#112316]">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-gray-600">{doc.category}</td>
                                    <td className="py-3 px-3 text-gray-500">{doc.size}</td>
                                    <td className="py-3 px-3">
                                        <span className="text-gray-700 font-medium">{doc.uploadedBy}</span>
                                        <span className="text-[10px] text-gray-400 block">{doc.date}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="font-semibold text-gray-800">
                                            {doc.assumptionsCount} variables
                                        </span>
                                    </td>
                                    <td className="py-3 pl-3">
                                        {doc.statusType === 'active' && (
                                            <span className="px-2 py-0.5 rounded-full bg-[#e7f6d9] text-[#245217] text-[10px] font-bold">
                                                Active in model
                                            </span>
                                        )}
                                        {doc.statusType === 'verified' && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                                Verified
                                            </span>
                                        )}
                                        {doc.statusType === 'review' && (
                                            <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                                                Needs review
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-2 border-t border-gray-100 text-xs text-gray-500 gap-2 font-medium">
                    <span>All files encrypted at rest with AES-256 for studio compliance.</span>
                    <button
                        onClick={onSwitchToDashboard}
                        className="font-bold text-[#14281c] hover:underline flex items-center space-x-1 self-start sm:self-auto"
                    >
                        <span>Calibrate in Scenario Lab</span>
                        <span>→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
