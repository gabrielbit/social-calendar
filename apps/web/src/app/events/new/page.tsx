import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Nuevo evento · Agenda Comunidad",
};

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function NewEventPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/events/new");

  const { date } = await searchParams;
  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_handle, whatsapp_phone, contact_email, allow_contact")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        title="Nuevo evento"
        description="Publicá en tu agenda. Podés importar desde ICS o un flyer en Ajustes → Importar."
      />
      <EventCreateForm
        defaultDate={date}
        defaultContact={{
          allowContact: profile?.allow_contact ?? true,
          instagram: profile?.instagram_handle ?? "",
          whatsapp: profile?.whatsapp_phone ?? "",
          email: profile?.contact_email ?? "",
        }}
      />
    </Container>
  );
}
