import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "@/components/settings/SettingsForm";
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
      "display_name, slug, bio, birthday_month, birthday_day, birthday_visibility, public_location",
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
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-ink">Ajustes</h1>
      <p className="mt-1 text-ink-muted">Perfil, cumpleaños y preferencias.</p>

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
  );
}
