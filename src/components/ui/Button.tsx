import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyle = "w-full p-4 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    secondary: "bg-neutral-800 hover:bg-neutral-700 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
