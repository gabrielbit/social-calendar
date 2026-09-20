import Link from "next/link";
import { Container } from "@/components/layout/Container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center text-center">
      <h1 className="page-title">No encontrado</h1>
      <p className="page-lede mx-auto">Esa página no existe o el evento ya no está disponible.</p>
      <Link href="/explorar" className="btn-primary mt-8">
        Explorar eventos
      </Link>
    </Container>
  );
}
