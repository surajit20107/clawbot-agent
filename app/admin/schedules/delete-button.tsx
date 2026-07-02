"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteScheduleButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this schedule?")) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to delete schedule");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-destructive text-sm font-medium transition hover:bg-destructive/10 disabled:opacity-50"
      disabled={pending}
      onClick={handleDelete}
      type="button"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
