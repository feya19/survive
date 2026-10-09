export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={'text-xs text-rose-600 font-medium ' + className}
        >
            {message}
        </p>
    ) : null;
}
