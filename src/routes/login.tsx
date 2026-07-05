import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "登录 · AIGC Ecom Creative Hub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const getLoginErrorMessage = (message: string) => {
    if (message.toLowerCase().includes("invalid login credentials")) {
      return "邮箱或密码不正确。如果你刚注册，请先打开验证邮件完成确认；确认前 Supabase 会拒绝登录。";
    }
    return message;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(getLoginErrorMessage(error.message));
      return;
    }
    toast.success("登录成功");
    nav({ to: "/" });
  };

  const resendConfirmation = async () => {
    if (!email.trim()) {
      toast.error("请先填写注册邮箱");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("验证邮件已重新发送，请检查收件箱和垃圾邮件");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass w-full max-w-sm rounded-xl p-6">
        <h1 className="font-display text-xl font-semibold">登录</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          使用邮箱登录以查看历史项目。刚注册的账号需要先完成邮箱验证。
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
            placeholder="密码"
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
            登录
          </button>
        </form>
        <button
          type="button"
          onClick={resendConfirmation}
          disabled={resending}
          className="mt-3 w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        >
          {resending ? "正在发送验证邮件..." : "重新发送验证邮件"}
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          还没账号？<Link to="/signup" className="text-primary hover:underline">立即注册</Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">← 返回工作台</Link>
        </p>
      </div>
    </div>
  );
}
