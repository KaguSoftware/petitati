import { cloneElement, isValidElement, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface Props {
  /** Input id and the key looked up in `fieldErrors`. */
  name: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** `fieldErrors` from the action state; message keys resolve under admin.common, raw text otherwise. */
  errors?: Record<string, string>;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + description + error, wired to the `fieldErrors` convention. */
export function FormField({ name, label, description, errors, required, className, children }: Props) {
  const t = useTranslations("admin.common");
  const raw = errors?.[name];
  const message = raw ? (t.has(raw) ? t(raw) : raw) : undefined;
  // Tie the error (or the description) to the control so screen readers read it with the field.
  const helpId = message ? `${name}-error` : description ? `${name}-description` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": message ? true : undefined,
        "aria-describedby": helpId,
      })
    : children;
  return (
    <Field className={cn(className)} data-invalid={message ? "" : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </FieldLabel>
      {control}
      {description && !message && <FieldDescription id={`${name}-description`}>{description}</FieldDescription>}
      {message && <FieldError id={`${name}-error`}>{message}</FieldError>}
    </Field>
  );
}
