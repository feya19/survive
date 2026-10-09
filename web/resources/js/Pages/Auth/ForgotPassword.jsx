import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password — Survive" />

            {/* Header */}
            <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-2.5 py-0.5 rounded-full border border-[#d2e4c2] inline-block mb-2">
                    Account recovery
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#112316]">
                    Forgot your password?
                </h1>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Enter your Studio email address and we’ll send you a link to reset your password.
                </p>
            </div>

            {status && (
                <div className="mb-5 text-xs font-semibold text-[#244b20] bg-[#edf4e5] border border-[#d2e4c2] rounded-xl p-3">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="email" value="Email Studio" />
                    <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full pl-10 pr-4 py-2.5"
                            isFocused={true}
                            placeholder="nama@studio.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 rounded-xl bg-[#14281c] hover:bg-[#1e3828] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
                    >
                        <span>Send reset link</span>
                        <ArrowRight className="w-4 h-4 text-[#9de062]" />
                    </button>
                </div>

                <div className="pt-4 border-t border-[#edf0ea] text-center">
                    <Link
                        href={route('login')}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-[#14281c] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to sign in</span>
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
