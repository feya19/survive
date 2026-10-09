import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Lock, ShieldCheck } from 'lucide-react';

export default function ConfirmPassword() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password — Survive" />

            <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-2.5 py-0.5 rounded-full border border-[#d2e4c2] inline-block mb-2">
                    Security verification
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#112316]">
                    Confirm access
                </h1>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    This is a sensitive area. Enter your password before continuing.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="password" value="Password" />
                    <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pl-10 pr-10 py-2.5"
                            isFocused={true}
                            placeholder="••••••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 rounded-xl bg-[#14281c] hover:bg-[#1e3828] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
                    >
                        <ShieldCheck className="w-4 h-4 text-[#9de062]" />
                        <span>Confirm password</span>
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
