import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Sign In — Survive" />

            {/* Card Header */}
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#112316]">
                    Sign in to the Studio
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    Access your scenario modeling and production budget analysis.
                </p>
            </div>

            {status && (
                <div className="mb-5 text-xs font-semibold text-[#244b20] bg-[#edf4e5] border border-[#d2e4c2] rounded-xl p-3">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                {/* Email Address */}
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
                            autoComplete="username"
                            isFocused={true}
                            placeholder="nama@studio.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                {/* Password */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <InputLabel htmlFor="password" value="Password" className="mb-0" />
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pl-10 pr-10 py-2.5"
                            autoComplete="current-password"
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

                {/* Remember Me */}
                <div className="pt-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="text-xs font-medium text-gray-600">
                            Remember me
                        </span>
                    </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 rounded-xl bg-[#14281c] hover:bg-[#1f3a28] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
                    >
                        <span>Sign in to the Studio</span>
                        <ArrowRight className="w-4 h-4 text-[#9de062]" />
                    </button>
                </div>

                {/* Bottom Register Prompt */}
                <div className="pt-4 border-t border-[#edf0ea] text-center">
                    <p className="text-xs text-gray-500">
                        Don’t have a producer account?{' '}
                        <Link
                            href={route('register')}
                            className="font-bold text-[#14281c] hover:underline"
                        >
                            Register here
                        </Link>
                    </p>
                </div>
            </form>
        </GuestLayout>
    );
}
