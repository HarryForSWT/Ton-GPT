import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading = false, className = '', children, ...props }: ButtonProps) {
  const baseStyle = "w-full p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    secondary: "bg-neutral-800 hover:bg-neutral-700 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={20} />}
      {children}
    </button>
  );
}
