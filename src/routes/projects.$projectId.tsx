import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { deleteRecord, getProject } from "@/lib/projects.functions";
import { Pill } from "@/components/creative/ui";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({ meta: [{ title: "项目详情 · AIGC Ecom Creative Hub" }] }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const nav = useNavigate();
  const { projectId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const get = useServerFn(getProject);
  const remove = useServerFn(deleteRecord);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setError(null);
    setLoading(true);
    get({ data: { id: projectId } })
      .then(setData)
      .catch((e) => {
        const message = e?.message || "项目详情加载失败";
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, projectId]);

  const onDeleteRecord = async (id: string) => {
    if (!confirm("确认删除该条记录？")) return;
    try {
      await remove({ data: { id } });
      setData((d: any) => ({ ...d, records: d.records.filter((r: any) => r.id !== id) }));
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

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> 返回项目列表
        </Link>
        <div className="mt-6 rounded-[28px] border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-xl font-semibold">项目暂时打不开</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "没有拿到项目数据。请返回项目列表后重试。"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回项目列表
      </Link>
      <h1 className="mt-1 font-display text-xl font-semibold">{data.project.name}</h1>
      {data.project.description && (
        <p className="text-xs text-muted-foreground">{data.project.description}</p>
      )}

      <div className="mt-5">
        {data.records.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm">还没有创意记录。</p>
            <Link
              to="/"
              className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              去工作台生成
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.records.map((r: any) => (
              <div key={r.id} className="glass group relative rounded-xl p-4 hover:border-primary/50">
                <button
                  onClick={() => onDeleteRecord(r.id)}
                  className="absolute right-2 top-2 hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Link to="/records/$recordId" params={{ recordId: r.id }} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 font-medium">{r.name}</p>
                    <Pill tone="ok">{r.overallScore}</Pill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.summary && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{r.summary}</p>}
                  {r.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {r.tags.map((t: string, i: number) => <Pill key={i} tone="accent">{t}</Pill>)}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-primary">查看详情 →</p>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
