"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";

type SegmentOption = {
  id: string;
  label: string;
  sort_order: number;
};

type ProjectSegment = {
  id: string;
  title: string;
  sort_order: number;
  segment_options?: SegmentOption[];
};

export default function ProjectEditorPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [segments, setSegments] = useState<ProjectSegment[]>([]);
  const [newSegmentTitle, setNewSegmentTitle] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);

  const loadProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error(error);
      return;
    }
    setProject(data);
  };

  const loadSegments = async () => {
    const { data, error } = await supabase
      .from("project_segments")
      .select(
        `
        *,
        segment_options (*)
      `
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setSegments(data || []);
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadSegments();
  }, [projectId]);

  const handleAddSegment = async () => {
    if (!newSegmentTitle.trim()) return;

    const maxOrder =
      segments.length > 0
        ? Math.max(...segments.map((s) => s.sort_order)) + 1
        : 1;

    const { data: segment, error } = await supabase
      .from("project_segments")
      .insert({
        project_id: projectId,
        title: newSegmentTitle.trim(),
        sort_order: maxOrder,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setNewSegmentTitle("");
    setAddingSegment(false);
    loadSegments();
  };

  const handleAddOption = async (segmentId: string) => {
    const segment = segments.find((s) => s.id === segmentId);
    const options = segment?.segment_options || [];
    if (options.length >= 3) {
      alert("Each segment can have at most 3 options.");
      return;
    }

    const sortOrder = options.length + 1;

    const { error } = await supabase.from("segment_options").insert({
      segment_id: segmentId,
      label: `Option ${sortOrder}`,
      sort_order: sortOrder,
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadSegments();
  };

  const handleUpdateOption = async (
    optionId: string,
    label: string
  ) => {
    const { error } = await supabase
      .from("segment_options")
      .update({ label })
      .eq("id", optionId);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadSegments();
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Delete this segment and all its options?")) return;

    const { error } = await supabase
      .from("project_segments")
      .delete()
      .eq("id", segmentId);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadSegments();
  };

  const handleUpdateStatus = async (status: string) => {
    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadProject();
  };

  if (!project) {
    return (
      <main className="p-10">
        <p>Loading project...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="text-slate-600 underline hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold">{project.title}</h1>
      <p className="mt-2 text-slate-600">{project.description}</p>

      {/* Configure voting */}
      <div className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Configure Voting</h2>
        <p className="mt-1 text-sm text-slate-500">
          Change project status to control when partners can vote.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleUpdateStatus("draft")}
            className={`rounded-xl px-4 py-2 ${
              project.status === "draft"
                ? "bg-slate-900 text-white"
                : "border bg-white"
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => handleUpdateStatus("open")}
            className={`rounded-xl px-4 py-2 ${
              project.status === "open"
                ? "bg-slate-900 text-white"
                : "border bg-white"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => handleUpdateStatus("closed")}
            className={`rounded-xl px-4 py-2 ${
              project.status === "closed"
                ? "bg-slate-900 text-white"
                : "border bg-white"
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Segments */}
      <div className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Segments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add segments and options for partners to vote on. Each segment should
          have 3 options.
        </p>

        <div className="mt-4 space-y-4">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="rounded-xl border bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{segment.title}</h3>
                <button
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(segment.segment_options || [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        className="flex-1 rounded-lg border bg-white px-3 py-1.5 text-sm"
                        defaultValue={opt.label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== opt.label) {
                            handleUpdateOption(opt.id, v);
                          }
                        }}
                      />
                    </div>
                  ))}
                {(segment.segment_options || []).length < 3 && (
                  <button
                    onClick={() => handleAddOption(segment.id)}
                    className="text-sm text-slate-600 underline hover:text-slate-900"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {addingSegment ? (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Segment title"
              className="flex-1 rounded-xl border px-4 py-2"
              value={newSegmentTitle}
              onChange={(e) => setNewSegmentTitle(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" ? handleAddSegment() : null
              }
            />
            <button
              onClick={handleAddSegment}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingSegment(false);
                setNewSegmentTitle("");
              }}
              className="rounded-xl border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSegment(true)}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Add Segment
          </button>
        )}
      </div>
    </main>
  );
}
