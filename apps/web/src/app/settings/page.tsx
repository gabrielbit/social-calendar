import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, slug, bio, birthday_month, birthday_day, birthday_visibility, public_location, instagram_handle, whatsapp_phone, contact_email, allow_contact",
    )
    .eq("id", user.id)
    .single();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("home_zone, notify_email, notify_birthdays")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: calendarConn } = await supabase
    .from("calendar_connections")
    .select("status")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-lg">
        <PageHeader title="Ajustes" description="Perfil, cumpleaños y preferencias." />

        <SettingsForm
          profile={profile ?? undefined}
          prefs={prefs ?? undefined}
          googleConnected={calendarConn?.status === "active"}
        />

        <section className="mt-8">
          <Link href="/settings/import" className="btn-secondary">
            Importar eventos (ICS / flyer)
          </Link>
        </section>
      </div>
    </Container>
  );
}
