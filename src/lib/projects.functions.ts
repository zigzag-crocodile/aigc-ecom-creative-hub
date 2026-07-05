import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CreativePackage, ProductInput } from "@/types/creative";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: records } = await supabase
      .from("creative_records")
      .select("id, name, tags, created_at, project_id, package")
      .order("created_at", { ascending: false });
    const countMap = new Map<string, number>();
    const recentMap = new Map<string, any[]>();
    (records ?? []).forEach((r: any) => {
      if (r.project_id) countMap.set(r.project_id, (countMap.get(r.project_id) ?? 0) + 1);
      if (!r.project_id) return;
      const list = recentMap.get(r.project_id) ?? [];
      if (list.length < 3) {
        list.push({
          id: r.id,
          name: r.name,
          tags: r.tags ?? [],
          created_at: r.created_at,
          summary: r.package?.creativePackageSummary ?? "",
          overallScore: r.package?.creativeScore?.overallScore ?? 0,
        });
        recentMap.set(r.project_id, list);
      }
    });

    return (projects ?? []).map((p) => ({
      ...p,
      recordCount: countMap.get(p.id) ?? 0,
      recentRecords: recentMap.get(p.id) ?? [],
    }));
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; description?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .insert({ user_id: userId, name: data.name.slice(0, 100), description: data.description?.slice(0, 500) })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: records } = await supabase
      .from("creative_records")
      .select("id, name, tags, created_at, package")
      .eq("project_id", data.id)
      .order("created_at", { ascending: false });
    return {
      project,
      records: (records ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        tags: r.tags ?? [],
        created_at: r.created_at,
        summary: r.package?.creativePackageSummary ?? "",
        overallScore: r.package?.creativeScore?.overallScore ?? 0,
      })),
    };
  });

export const getRecord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("creative_records")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as {
      id: string;
      name: string;
      tags: string[];
      project_id: string | null;
      input: ProductInput;
      package: CreativePackage;
      created_at: string;
    };
  });

export const saveRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      projectId: string | null;
      newProjectName?: string;
      name: string;
      tags: string[];
      input: ProductInput;
      pkg: CreativePackage;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let projectId = data.projectId;
    if (!projectId && data.newProjectName) {
      const { data: proj, error } = await supabase
        .from("projects")
        .insert({ user_id: userId, name: data.newProjectName.slice(0, 100) })
        .select()
        .single();
      if (error) throw new Error(error.message);
      projectId = proj.id;
    }
    // strip image base64 from input to keep row small
    const safeInput = { ...data.input, images: data.input.images.map((i) => ({ ...i, base64: "" })) };
    const { data: row, error } = await supabase
      .from("creative_records")
      .insert({
        user_id: userId,
        project_id: projectId,
        name: data.name.slice(0, 200),
        tags: data.tags.slice(0, 20).map((t) => t.slice(0, 40)),
        input: safeInput,
        package: data.pkg,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (projectId) {
      await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    }
    return row;
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("creative_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Auto-save: 自动写入「默认项目」，没有则创建
export const autoSaveRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { name: string; tags: string[]; input: ProductInput; pkg: CreativePackage }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // 查询是否已存在默认项目
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "默认项目")
      .limit(1)
      .maybeSingle();

    let projectId: string;
    if (existing?.id) {
      projectId = existing.id;
    } else {
      const { data: proj, error } = await supabase
        .from("projects")
        .insert({ user_id: userId, name: "默认项目", description: "自动同步的历史记录" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      projectId = proj.id;
    }

    const safeInput = { ...data.input, images: data.input.images.map((i) => ({ ...i, base64: "" })) };
    const { data: row, error } = await supabase
      .from("creative_records")
      .insert({
        user_id: userId,
        project_id: projectId,
        name: data.name.slice(0, 200),
        tags: data.tags.slice(0, 20).map((t) => t.slice(0, 40)),
        input: safeInput,
        package: data.pkg,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    return { ...row, projectId };
  });
