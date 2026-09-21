import Link from "next/link";
import { Container } from "@/components/layout/Container";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function CheckEmailPage({ searchParams }: Props) {
  const { email } = await searchParams;
  const localMail = process.env.NODE_ENV !== "production";

  return (
    <Container className="flex min-h-[calc(100dvh-10rem)] items-center py-16">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="page-title">Confirmá tu email</h1>
        <p className="page-lede mx-auto">
          {email ? (
            <>
              Te enviamos un enlace a <strong className="text-ink">{email}</strong>.
            </>
          ) : (
            "Te enviamos un enlace para confirmar la cuenta."
          )}{" "}
          Hasta que lo abras no podés entrar con email y contraseña.
        </p>
        {localMail ? (
          <p className="mt-4 text-pretty text-sm text-ink-muted">
            En local el correo llega a{" "}
            <a
              href="http://127.0.0.1:54324"
              className="text-ink hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mailpit
            </a>
            .
          </p>
        ) : null}
        <p className="mt-8 text-sm text-ink-faint">
          <Link href="/auth/login" className="hover:text-ink">
            ← Volver a entrar
          </Link>
        </p>
      </div>
    </Container>
  );
}
