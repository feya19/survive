import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Trash2, AlertTriangle, Lock, X } from 'lucide-react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => setConfirmingUserDeletion(true);

    const deleteUser = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`bg-white rounded-2xl border border-[#e5e9df] p-6 sm:p-8 shadow-2xs ${className}`}>
            {/* Header */}
            <div className="pb-5 border-b border-[#edf0ea]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                    DANGER ZONE
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#112316] mt-0.5">
                    Delete account
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                    Permanently delete your account and all associated production data.
                </p>
            </div>

            <div className="mt-6 space-y-5">
                <div className="rounded-xl bg-[#fff8f7] border border-[#fdd8d8] px-4 py-3.5 flex items-start space-x-3 text-xs text-gray-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-rose-900">Warning: This action is permanent and cannot be undone</p>
                        <p className="text-gray-600 text-[11px] leading-relaxed">
                            Once your account is deleted, all scenario history, model assumptions, and workspace access in SURVIVE Studio will be wiped forever.
                        </p>
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={confirmUserDeletion}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-2xs transition-all flex items-center space-x-2"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete account</span>
                    </button>
                </div>
            </div>

            <Modal show={confirmingUserDeletion} onClose={closeModal} maxWidth="md">
                <form onSubmit={deleteUser} className="p-6 sm:p-7">
                    <div className="flex items-center space-x-3.5 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#112316]">Confirm account deletion</h2>
                            <p className="text-xs text-gray-500 mt-0.5">This action requires password verification.</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-5 leading-relaxed bg-[#fafbfa] p-3 rounded-xl border border-[#e2e6dc]">
                        Once your account is deleted, all scenario data and production history will be permanently lost. Enter your account password to confirm that you want to delete this account.
                    </p>

                    <div>
                        <InputLabel htmlFor="password" value="Password confirmation" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-rose-300 focus:bg-white text-[#112316] text-sm placeholder:text-gray-400 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 transition-all shadow-2xs"
                                isFocused
                                placeholder="Enter your account password"
                            />
                        </div>
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-[#edf0ea]">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2.5 rounded-xl border border-[#d2d7cb] bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all flex items-center space-x-1.5 shadow-2xs"
                        >
                            <X className="w-3.5 h-3.5 text-gray-500" />
                            <span>Batal</span>
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-60"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Yes, delete my account</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
