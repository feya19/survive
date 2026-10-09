import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { MailCheck, LogOut, Send } from 'lucide-react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verifikasi Email — Survive" />

            <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-[#edf4e5] border border-[#d2e4c2] rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-800">
                    <MailCheck className="w-6 h-6" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#112316]">
                    Verifikasi Email Anda
                </h1>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Terima kasih telah mendaftar! Sebelum memulai, silakan verifikasi alamat email Anda melalui tautan yang baru saja kami kirimkan.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-5 text-xs font-semibold text-[#244b20] bg-[#edf4e5] border border-[#d2e4c2] rounded-xl p-3 text-center">
                    Tautan verifikasi baru telah dikirim ke alamat email yang Anda berikan saat pendaftaran.
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 rounded-xl bg-[#14281c] hover:bg-[#1e3828] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                    <Send className="w-4 h-4 text-[#9de062]" />
                    <span>Kirim Ulang Email Verifikasi</span>
                </button>

                <div className="pt-3 border-t border-[#edf0ea] flex justify-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar Akun</span>
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
