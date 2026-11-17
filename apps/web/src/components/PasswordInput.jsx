import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef(function PasswordInput(
  { id, autoComplete, className = "", onFocus, onBlur, onKeyDown, onKeyUp, leftIcon = null, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          className={`input pr-11${leftIcon ? " pl-10" : ""}${className ? ` ${className}` : ""}`}
          autoComplete={autoComplete}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onKeyDown={(e) => { setCapsLock(e.getModifierState("CapsLock")); onKeyDown?.(e); }}
          onKeyUp={(e) => { setCapsLock(e.getModifierState("CapsLock")); onKeyUp?.(e); }}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-soft"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {focused && capsLock && (
        <p className="mt-1 text-sm text-soft" role="status">Caps Lock ligado</p>
      )}
    </>
  );
});

export default PasswordInput;
