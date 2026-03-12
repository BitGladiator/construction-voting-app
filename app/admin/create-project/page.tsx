"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateProjectPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

 const handleCreate = async () => {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title,
      description,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    console.log("SUPABASE ERROR:", error);
    alert(error.message);
    return;
  }

  router.push(`/admin/projects/${data.id}`);
};

  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl font-bold">Create Project</h1>

      <div className="mt-6 space-y-4">
        <input
          className="w-full rounded-xl border px-4 py-2"
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded-xl border px-4 py-2"
          placeholder="Project description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={handleCreate}
          className="rounded-xl bg-slate-900 px-5 py-3 text-white"
        >
          Create Project
        </button>
      </div>
    </main>
  );
}