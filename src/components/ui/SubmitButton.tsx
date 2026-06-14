"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function SubmitButton({ children, variant = "primary", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" variant={variant} isLoading={pending} {...props}>
      {children}
    </Button>
  );
}
