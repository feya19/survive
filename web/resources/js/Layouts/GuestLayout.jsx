import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#f3f4ef] text-[#112316] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-[#c2e78c] selection:text-[#102414] relative overflow-hidden">
            {/* Subtle ambient light glow at top */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-[#9de062]/15 blur-3xl rounded-full pointer-events-none" />

            {/* Brand Header */}
            <div className="mb-8 text-center relative z-10">
                <Link href="/" className="inline-flex items-center space-x-3 group">
                    <div className="w-11 h-11 rounded-2xl bg-[#9de062] flex items-center justify-center text-[#102414] font-black text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        S
                    </div>
                    <div className="text-left">
                        <span className="font-black text-lg tracking-wider uppercase text-[#112316] block leading-none">
                            SURVIVE
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#2d5822] block mt-1">
                            Studio Workspace
                        </span>
                    </div>
                </Link>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-md bg-white rounded-3xl border border-[#e2e7dc] p-7 sm:p-9 shadow-xl shadow-emerald-950/5 relative z-10">
                {children}
            </div>
        </div>
    );
}
