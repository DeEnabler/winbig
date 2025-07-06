import * as React from "react";
import { Label } from "@/components/ui/label";  // Assuming you have a Label component

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, id, error, children, className, ...props }, ref) => {
    return (
      <div className={className} {...props} ref={ref}>
        <Label htmlFor={id}>{label}</Label>
        {children}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export { FormField };