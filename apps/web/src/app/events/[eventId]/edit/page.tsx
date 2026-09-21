import { redirect, notFound } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getEventForEdit } from "@/lib/queries";

export const metadata = {
  title: "Editar evento · Agenda Comunidad",
};

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function EditEventPage({ params }: Props) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/events/${eventId}/edit`);

  const initial = await getEventForEdit(eventId, user.id);
  if (!initial) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader title="Editar evento" description="Pegá una imagen con ⌘V para sumarla." />
      <EventCreateForm initial={initial} />
    </Container>
  );
}
