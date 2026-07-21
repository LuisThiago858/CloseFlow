import { useEffect, useRef } from 'react';

interface FormErrorProps {
  message: string | null;
}

export function FormError({ message }: FormErrorProps) {
  const alertReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message !== null) {
      alertReference.current?.focus();
    }
  }, [message]);

  return message === null ? null : (
    <div className="form-alert" role="alert" tabIndex={-1} ref={alertReference}>
      {message}
    </div>
  );
}
