import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnLink } from "@/components/layout/ReturnLink";
import { safeReturnPath } from "@/lib/return-to";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Nuevo evento · Agenda Comunidad",
};

type Props = {
  searchParams: Promise<{ date?: string; from?: string }>;
};

export default async function NewEventPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/events/new");

  const { date, from } = await searchParams;
  const returnTo = safeReturnPath(from);
  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_handle, whatsapp_phone, contact_email, allow_contact")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Container className="py-10 sm:py-14">
      <ReturnLink explicit={returnTo} />
      <PageHeader
        title="Nuevo evento"
        description="Publicá en tu agenda. Pegá una imagen con ⌘V o elegila desde el disco."
      />
      <EventCreateForm
        returnTo={returnTo}
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
