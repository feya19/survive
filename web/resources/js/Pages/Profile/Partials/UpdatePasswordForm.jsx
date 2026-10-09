import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { Check } from 'lucide-react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }
                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section className={`bg-white rounded-2xl border border-[#e5e9df] p-6 sm:p-8 shadow-2xs ${className}`}>
            <form onSubmit={updatePassword}>
                {/* Header */}
                <div className="flex items-start justify-between pb-5 border-b border-[#edf0ea]">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            SECURITY
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-[#112316] mt-0.5">
                            Change password
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Choose a strong password you do not use elsewhere.
                        </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-[#ebf3e2] text-[#2c551f] text-[10px] font-bold tracking-wider uppercase border border-[#d6e7c7] shrink-0">
                        SECURE
                    </span>
                </div>

                {/* 3 Columns Input Row */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <InputLabel htmlFor="current_password" value="Current password" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            type="password"
                            className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] placeholder:text-gray-400 focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                            autoComplete="current-password"
                            placeholder="Enter current password"
                        />
                        <InputError message={errors.current_password} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="New password" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type="password"
                            className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] placeholder:text-gray-400 focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                        />
                        <InputError message={errors.password} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm new password" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                        <TextInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            type="password"
                            className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] placeholder:text-gray-400 focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                            autoComplete="new-password"
                            placeholder="Repeat new password"
                        />
                        <InputError message={errors.password_confirmation} className="mt-1" />
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-8 pt-5 border-t border-[#edf0ea] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-gray-400">
                        Last changed 4 months ago
                    </span>

                    <div className="flex items-center space-x-3">
                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out duration-300"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out duration-300"
                            leaveTo="opacity-0"
                        >
                            <span className="text-xs text-[#244b20] font-medium flex items-center space-x-1 bg-[#edf4e5] px-2.5 py-1 rounded-lg border border-[#d2e4c2]">
                                <Check className="w-3.5 h-3.5 text-[#244b20]" />
                                <span>Password updated</span>
                            </span>
                        </Transition>

                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl bg-[#14281c] hover:bg-[#1e3828] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                        >
                            Update password
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
