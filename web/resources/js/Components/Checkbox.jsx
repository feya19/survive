export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-md border-[#d8dcd0] text-[#14281c] shadow-2xs focus:ring-[#14281c] focus:ring-offset-0 focus:ring-1 ' +
                className
            }
        />
    );
}
