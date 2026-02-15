'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { ArrowRight, PencilLine, Trash2, X } from 'lucide-react';

type Project = {
  project_id: string;
  name: string;
  description?: string | null;
    workspace_id: string;
};

export default function WorkspaceModal({
  open,
  workspaceName,
  workspaceActive,
  projects,
  projectName,
  projectDesc,
  setProjectName,
  setProjectDesc,
  onClose,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  loading,
  projectNameRef, // ✅ new
}: {
  open: boolean;
  workspaceName: string;
  workspaceActive: number;
  projects: Project[];

  projectName: string;
  projectDesc: string;
  setProjectName: (v: string) => void;
  setProjectDesc: (v: string) => void;

  onClose: () => void;
  onCreateProject: () => void;
  onEditProject: (p: Project) => void;
  onDeleteProject: (p: Project) => void;

  loading: boolean;

  // ✅ new (optional)
  projectNameRef?: RefObject<HTMLInputElement | null>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-soft">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold text-gia-navy">{workspaceName}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Statut :{' '}
              <span className={`font-semibold ${workspaceActive === 1 ? 'text-emerald-700' : 'text-slate-500'}`}>
                {workspaceActive === 1 ? 'Actif' : 'Désactivé'}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-gia-navy hover:bg-gia-bg2"
            aria-label="Fermer"
            title="Fermer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Create Project */}
        <div className="px-6 py-5 border-b bg-gia-bg2">
          <div className="font-semibold text-gia-navy mb-3">Créer un projet</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <input
              ref={projectNameRef} // ✅ focus target
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Nom du projet"
              className="sm:col-span-4 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-orange"
            />

            <input
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className="sm:col-span-6 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-gia-orange"
            />

            <button
              onClick={onCreateProject}
              disabled={loading || !projectName.trim()}
              className="sm:col-span-2 rounded-xl bg-gia-navy px-4 py-3 text-sm font-semibold text-white hover:bg-gia-navy2 disabled:opacity-60"
              type="button"
            >
              Créer
            </button>
          </div>
        </div>

        {/* Projects table */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gia-navy">Projets</div>
            <div className="rounded-full bg-gia-orange/10 px-3 py-1 text-xs font-semibold text-gia-navy">
              {projects.length}
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 w-[320px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={3}>
                      Aucun projet pour l’instant.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.project_id} className="border-t">
                      <td className="px-4 py-3 font-semibold text-gia-text">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/projects/${p.project_id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-gia-orange px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Kanban <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>

                          <button
                            onClick={() => onEditProject(p)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gia-navy hover:bg-gia-bg2"
                            type="button"
                          >
                            <PencilLine className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </button>

                          <button
                            onClick={() => onDeleteProject(p)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 h-1 w-full rounded-full bg-gia-orange/90" />
        </div>
      </div>
    </div>
  );
}
