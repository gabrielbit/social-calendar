import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
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
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Nuevo evento</h1>
        <p className="mt-1 text-ink-muted">
          Publicá en tu agenda. Podés importar desde ICS o un flyer en Ajustes → Importar.
        </p>
      </header>
      <EventCreateForm />
    </div>
  );
}
