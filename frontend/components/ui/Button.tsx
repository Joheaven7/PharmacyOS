import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow hover:shadow-brand-500/25 border-brand-500/30',
      secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700',
      outline: 'bg-transparent hover:bg-slate-800/80 text-slate-200 border-slate-700',
      ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-slate-100 border-transparent',
      danger: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/30',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg',
      md: 'px-4 py-2 text-sm font-medium rounded-xl',
      lg: 'px-5 py-2.5 text-base font-semibold rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 border transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
