export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-xl bg-[#14281c] hover:bg-[#1e3828] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#14281c] focus:ring-offset-2 disabled:opacity-50 ${
                    disabled && 'opacity-50 cursor-not-allowed'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
