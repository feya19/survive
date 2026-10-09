import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Check, ShieldCheck } from 'lucide-react';

export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }) {
    const user = usePage().props.auth.user;

    // Split existing name into First & Last name to match Figma layout
    const nameParts = (user?.name || '').trim().split(' ');
    const initialFirst = nameParts[0] || '';
    const initialLast = nameParts.slice(1).join(' ') || '';

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        firstName: initialFirst,
        lastName: initialLast,
        name: user?.name || '',
        email: user?.email || '',
    });

    const handleFirstNameChange = (val) => {
        const fullName = `${val} ${data.lastName}`.trim();
        setData(d => ({
            ...d,
            firstName: val,
            name: fullName,
        }));
    };

    const handleLastNameChange = (val) => {
        const fullName = `${data.firstName} ${val}`.trim();
        setData(d => ({
            ...d,
            lastName: val,
            name: fullName,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    return (
        <section className={`bg-white rounded-2xl border border-[#e5e9df] p-6 sm:p-8 shadow-2xs ${className}`}>
            <form onSubmit={submit}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#edf0ea]">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            PERSONAL DETAILS
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-[#112316] mt-0.5">
                            Profile information
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Information used across your productions and approvals.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out duration-300"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out duration-300"
                            leaveTo="opacity-0"
                        >
                            <span className="text-xs text-[#244b20] font-medium flex items-center space-x-1 bg-[#edf4e5] px-2.5 py-1 rounded-lg border border-[#d2e4c2]">
                                <Check className="w-3.5 h-3.5 text-[#244b20]" />
                                <span>Saved</span>
                            </span>
                        </Transition>

                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl border border-[#d2d7cb] bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-all disabled:opacity-60"
                        >
                            Edit profile
                        </button>
                    </div>
                </div>

                {/* Form Fields matching `users` table: name & email */}
                <div className="mt-6 space-y-5">
                    {/* First name & Last name (maps to `name` in users table) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="first_name" value="First name" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                            <TextInput
                                id="first_name"
                                className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                                value={data.firstName}
                                onChange={(e) => handleFirstNameChange(e.target.value)}
                                placeholder="Maya"
                                required
                            />
                            <InputError className="mt-1" message={errors.name} />
                        </div>

                        <div>
                            <InputLabel htmlFor="last_name" value="Last name" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                            <TextInput
                                id="last_name"
                                className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                                value={data.lastName}
                                onChange={(e) => handleLastNameChange(e.target.value)}
                                placeholder="Chen"
                            />
                        </div>
                    </div>

                    {/* Email address (maps to `email` in users table) */}
                    <div>
                        <InputLabel htmlFor="email" value="Email address" className="text-xs font-semibold text-gray-700 mb-1.5 block" />
                        <TextInput
                            id="email"
                            type="email"
                            className="block w-full px-4 py-2.5 rounded-xl border border-[#d8dcd0] bg-white hover:border-[#14281c]/40 focus:bg-white text-sm text-[#112316] focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all shadow-2xs"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                            placeholder="maya.chen@northstar.film"
                        />
                        <InputError className="mt-1.5" message={errors.email} />
                    </div>

                    {/* Email Verification Banner */}
                    {mustVerifyEmail && user.email_verified_at === null && (
                        <div className="rounded-xl bg-[#fdfbf6] border border-[#f1e6cf] px-4 py-3 flex items-start space-x-3">
                            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-amber-900 font-medium">
                                    Your account email has not been verified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="font-bold underline text-amber-800 hover:text-amber-950"
                                    >
                                        Resend the verification link.
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                        A new verification link has been sent to your email address.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </section>
    );
}
