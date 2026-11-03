'use client';
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from 'react';

type Hasil = { ok?: string; error?: string; t: number } | null;
type Aksi = (prev: Hasil, fd: FormData) => Promise<Hasil>;

const Sibuk = createContext(false);

/**
 * Form untuk Server Action: menampilkan pesan gagal/sukses tepat di bawah isian.
 * Setelah hidrasi, dikirim manual lewat onSubmit agar isian tidak dikosongkan React saat validasi gagal;
 * atribut action tetap ada supaya form berfungsi sebelum JavaScript termuat.
 * `reset` mengosongkan form hanya bila berhasil.
 */
export function Form({
  action, children, className, reset = false, confirm,
}: { action: Aksi; children: ReactNode; className?: string; reset?: boolean; confirm?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={e => {
        e.preventDefault();
        if (pending || (confirm && !window.confirm(confirm))) return;
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <Sibuk.Provider value={pending}>{children}</Sibuk.Provider>
      {state?.error && <p className="banner bad small" role="alert">{state.error}</p>}
      {state?.ok && <p className="banner ok small" role="status">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = 'btn btn-primary', name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const pending = useContext(Sibuk);
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value} aria-busy={pending}>
      {children}
    </button>
  );
}
