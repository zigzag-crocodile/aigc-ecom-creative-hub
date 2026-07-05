import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getRecord } from "@/lib/projects.functions";
import { CreativePackageView } from "@/components/creative/CreativePackageView";
import { Pill } from "@/components/creative/ui";

export const Route = createFileRoute("/records/$recordId")({
  head: () => ({ meta: [{ title: "创意记录详情 · AIGC Ecom Creative Hub" }] }),
  component: RecordDetailPage,
});

function RecordDetailPage() {
  const nav = useNavigate();
  const { recordId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const get = useServerFn(getRecord);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    get({ data: { id: recordId } })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [authLoading, user, recordId]);

  if (authLoading || loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        to={data.project_id ? "/projects/$projectId" : "/projects"}
        params={data.project_id ? { projectId: data.project_id } : undefined}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> 返回
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-semibold">{data.name}</h1>
        <p className="text-xs text-muted-foreground">{new Date(data.created_at).toLocaleString()}</p>
      </div>
      {data.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.map((t: string, i: number) => <Pill key={i} tone="accent">{t}</Pill>)}
        </div>
      )}
      <div className="mt-5">
        <CreativePackageView pkg={data.package} onOptimize={() => {}} optimizing={false} />
      </div>
    </div>
  );
}
