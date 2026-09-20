import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Nuevo evento · Agenda Comunidad",
};

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/events/new");

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        title="Nuevo evento"
        description="Publicá en tu agenda. Podés importar desde ICS o un flyer en Ajustes → Importar."
      />
      <EventCreateForm />
    </Container>
  );
}
