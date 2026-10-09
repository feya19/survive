import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User } from 'lucide-react';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Daftar Akun — Survive" />

            {/* Card Header */}
            <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-[#edf4e5] px-2.5 py-0.5 rounded-full border border-[#d2e4c2] inline-block mb-2">
                    Registrasi Baru
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#112316]">
                    Buat Akun Studio
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    Daftar untuk mulai memodelkan dan mengevaluasi skenario produksi.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                {/* Full Name */}
                <div>
                    <InputLabel htmlFor="name" value="Nama Lengkap" />
                    <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="block w-full pl-10 pr-4 py-2.5"
                            autoComplete="name"
                            isFocused={true}
                            placeholder="Contoh: Maya Chen"
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

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
                            placeholder="nama@studio.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                {/* Password */}
                <div>
                    <InputLabel htmlFor="password" value="Kata Sandi" />
                    <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pl-10 pr-10 py-2.5"
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

                {/* Confirm Password */}
                <div>
                    <InputLabel htmlFor="password_confirmation" value="Konfirmasi Kata Sandi" />
                    <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <TextInput
                            id="password_confirmation"
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full pl-10 pr-10 py-2.5"
                            autoComplete="new-password"
                            placeholder="Ulangi kata sandi"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 rounded-xl bg-[#14281c] hover:bg-[#1e3828] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
                    >
                        <span>Daftar Produser Baru</span>
                        <ArrowRight className="w-4 h-4 text-[#9de062]" />
                    </button>
                </div>

                {/* Bottom Login Prompt */}
                <div className="pt-4 border-t border-[#edf0ea] text-center">
                    <p className="text-xs text-gray-500">
                        Sudah memiliki akun studio?{' '}
                        <Link
                            href={route('login')}
                            className="font-bold text-[#14281c] hover:underline"
                        >
                            Masuk di sini
                        </Link>
                    </p>
                </div>
            </form>
        </GuestLayout>
    );
}
