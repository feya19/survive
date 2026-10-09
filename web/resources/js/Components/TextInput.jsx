import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-xl border border-[#d8dcd0] bg-[#fafbfa] text-[#112316] placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-[#14281c] focus:ring-1 focus:ring-[#14281c] transition-all ' +
                className
            }
            ref={localRef}
        />
    );
});
