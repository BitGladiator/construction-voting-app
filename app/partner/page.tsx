import Link from "next/link";
import { mockProjects } from "@/lib/reports/mock-data";

export default function PartnerDashboardPage() {
  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <h1 className="text-3xl font-bold">Partner Dashboard</h1>
      <p className="mt-2 text-slate-600">Assigned projects only.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {mockProjects.map((project) => (
          <div key={project.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Status: {project.status}</p>
            <p className="mt-3 text-sm text-slate-600">{project.description}</p>
            <Link href={`/partner/project/${project.id}`} className="mt-4 inline-block rounded-xl border px-3 py-2 no-underline">Open ballot</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
