"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientApiDelete, clientApiPost } from "@/lib/api-client";

type FollowButtonProps = {
  profileId: string;
  agendaSlug: string;
  initialFollowing: boolean;
  loggedIn: boolean;
};

export function FollowButton({
  profileId,
  agendaSlug,
  initialFollowing,
  loggedIn,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!loggedIn) {
      router.push(`/auth/login?next=/a/${agendaSlug}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (following) {
          await clientApiDelete(`/community/follow/${profileId}`);
          setFollowing(false);
        } else {
          await clientApiPost(`/community/follow/${profileId}`, {});
          setFollowing(true);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={following ? "btn-secondary" : "btn-accent"}
        aria-pressed={following}
      >
        {following ? "Siguiendo" : "Seguir"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}