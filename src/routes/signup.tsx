import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "注册 · AIGC Ecom Creative Hub" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const getSignupErrorMessage = (message: string) => {
    if (message.toLowerCase().includes("already registered")) {
      return "这个邮箱已经注册过，请直接登录；如果还没验证邮箱，可以在登录页重新发送验证邮件。";
    }
    return message;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(getSignupErrorMessage(error.message));
      return;
    }
    if (data.session) {
      toast.success("注册成功，已自动登录");
      nav({ to: "/" });
      return;
    }
    const msg = "注册成功，请先到邮箱点击验证链接。验证完成后再登录；未收到请检查垃圾邮件。";
    setNotice(msg);
    toast.success(msg, { duration: 8000 });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass w-full max-w-sm rounded-xl p-6">
        <h1 className="font-display text-xl font-semibold">注册</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          使用邮箱创建账号。若项目开启邮箱确认，注册后需要先验证邮箱。
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            注册
          </button>
        </form>
        {notice && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            {notice}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          已有账号？<Link to="/login" className="text-primary hover:underline">登录</Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">← 返回工作台</Link>
        </p>
      </div>
    </div>
  );
}
