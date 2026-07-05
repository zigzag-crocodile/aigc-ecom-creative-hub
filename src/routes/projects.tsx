import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FolderPlus, Loader2, Trash2, Folder, FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createProject, deleteProject, listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "我的项目 · AIGC Ecom Creative Hub" }] }),
  component: ProjectsPage,
});

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  recordCount: number;
  recentRecords?: {
    id: string;
    name: string;
    tags: string[];
    created_at: string;
    summary: string;
    overallScore: number;
  }[];
};

function ProjectsPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const list = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    list()
      .then((rows) => setProjects(rows as ProjectRow[]))
      .catch((e) => toast.error(`加载失败：${e.message}`))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const row: any = await create({ data: { name: newName.trim() } });
      setProjects((s) => [{ ...row, recordCount: 0 }, ...s]);
      setNewName("");
      toast.success("项目已创建");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("确认删除该项目？关联记录会保留但脱离项目。")) return;
    try {
      await remove({ data: { id } });
      setProjects((s) => s.filter((p) => p.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> 返回工作台
          </Link>
          <h1 className="mt-1 font-display text-xl font-semibold">我的项目</h1>
          <p className="text-xs text-muted-foreground">按项目组织过往生成的创意记录</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="glass mb-5 flex gap-2 rounded-xl p-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新建项目名称（例如：夏季防晒投放）"
          className="flex-1 rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          新建
        </button>
      </form>

      {projects.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm">还没有项目，先新建一个开始吧。</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => nav({ to: "/projects/$projectId", params: { projectId: p.id } })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") nav({ to: "/projects/$projectId", params: { projectId: p.id } });
              }}
              className="glass group relative cursor-pointer rounded-[28px] p-4 transition hover:border-primary/50 hover:bg-white"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="absolute right-2 top-2 hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive group-hover:block"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {p.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                  <FileText className="h-3 w-3" /> {p.recordCount} 条记录
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav({ to: "/projects/$projectId", params: { projectId: p.id } });
                  }}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  打开项目
                </button>
              </div>
              {p.recentRecords && p.recentRecords.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">最近记录</p>
                  {p.recentRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nav({ to: "/records/$recordId", params: { recordId: record.id } });
                      }}
                      className="block w-full rounded-2xl bg-[#f6f0ea] p-3 text-left transition hover:bg-[#fffaf6]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{record.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(record.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] text-primary">
                          {Math.round(record.overallScore)}
                        </span>
                      </div>
                      {record.summary && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{record.summary}</p>
                      )}
                      {record.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {record.tags.slice(0, 3).map((tag, i) => (
                            <span key={`${record.id}-${tag}-${i}`} className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-[#f6f0ea] p-3 text-xs text-muted-foreground">
                  这个项目还没有可查看的创意记录。
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
