import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { hasSupabaseConfig, makeLocalUser, setLocalAuthUser, supabase } from "../lib/supabaseClient.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthGate({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordValid = password.length >= 6;
  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  useEffect(() => {
    if (mode === "register") loadCaptcha();
  }, [mode]);

  async function loadCaptcha() {
    setCaptchaAnswer("");
    try {
      const response = await fetch(`/api/captcha?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("captcha api unavailable");
      setCaptcha(await response.json());
    } catch {
      setCaptcha(makeLocalCaptcha());
    }
  }

  async function verifyCaptcha() {
    if (!captchaAnswer.trim()) {
      setMessage("请输入图片验证码。");
      return false;
    }
    if (captcha?.token?.startsWith("local:")) {
      return captchaAnswer.trim() === captcha.token.slice(6);
    }
    try {
      const response = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captcha?.token, answer: captchaAnswer.trim() }),
      });
      if (!response.ok) throw new Error("验证码错误");
      return true;
    } catch {
      setMessage("验证码不正确，请重新输入。");
      loadCaptcha();
      return false;
    }
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!emailValid) return setMessage("请输入有效邮箱。令");
    if (!passwordValid) return setMessage("密码至少需要 6 位。令");
    if (mode === "register" && !accepted) return setMessage("请先阅读并接受服务条款与隐私政策。令");
    if (mode === "register" && !(await verifyCaptcha())) return;

    setBusy(true);
    try {
      if (hasSupabaseConfig && supabase) {
        const result =
          mode === "login"
            ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
            : await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username: email.trim().split("@")[0] } },
              });

        if (result.error) throw result.error;
        if (!remember) window.sessionStorage.setItem("author-hub-session-only", "true");
        onAuthed(result.data.user ?? result.data.session?.user, { isNew: mode === "register" });
      } else {
        const user = makeLocalUser(email);
        setLocalAuthUser(user);
        onAuthed(user, { isNew: mode === "register" });
      }
    } catch (error) {
      const raw = error.message || "";
      const duplicate = /already|registered|exists/i.test(raw);
      setMessage(duplicate ? "该邮箱已被注册，请直接登录。" : raw || "认证失败，请稍后再试。");
      if (mode === "register") loadCaptcha();
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setCaptchaAnswer("");
  }

  return (
    <div className="auth-wall" aria-live="polite">
      <form className={`auth-card ${mode === "register" ? "is-register" : "is-login"}`} onSubmit={submit}>
        <div className="auth-mark">
          <ShieldCheck size={20} />
        </div>
        <p className="eyebrow">{mode === "login" ? "Login" : "Register"}</p>
        <h1>{mode === "login" ? "登录" : "注册"}</h1>
        <p className="auth-copy">
          {mode === "login"
            ? "登录后再进入你的小说宇宙。勾选 30 天免登录后，系统会保留安全会话。"
            : "创建一个隐私优先的创作账号，所有作品数据默认只属于你。"}
        </p>

        <label className={`auth-field ${email && !emailValid ? "is-invalid" : ""}`}>
          <Mail size={16} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱账号" autoComplete="email" />
        </label>

        <label className="auth-field">
          <LockKeyhole size={16} />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "login" ? "输入密码" : "密码，至少 6 位"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </label>

        {mode === "register" && (
          <>
            <div className="password-meter" data-score={passwordScore}>
              <span />
              <span />
              <span />
              <small>{passwordValid ? "密码强度可用" : "至少 6 位"}</small>
            </div>
            <div className="captcha-row">
              <input
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="输入右侧数字"
                inputMode="numeric"
                maxLength={4}
              />
              <button type="button" className="captcha-image-button" onClick={loadCaptcha} aria-label="刷新验证码">
                {captcha?.image ? <img src={captcha.image} alt="数字验证码" /> : <span>刷新</span>}
              </button>
            </div>
          </>
        )}

        <div className="auth-row">
          {mode === "login" ? (
            <label className="auth-check">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              30 天内免登录
            </label>
          ) : (
            <label className="auth-check">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              同意服务条款和隐私政策
            </label>
          )}
          {mode === "login" && <button type="button" className="auth-link">忘记密码</button>}
        </div>

        {message && <p className="auth-message">{message}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "处理中..." : mode === "login" ? "登录" : "立即注册"}
        </button>

        <button type="button" className="auth-switch" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "注册新账号" : "返回登录"}
        </button>

        {!hasSupabaseConfig && (
          <p className="auth-dev-note">当前未配置 Supabase 环境变量，已启用本地演示门禁，方便预览 UI。</p>
        )}
      </form>
    </div>
  );
}

function makeLocalCaptcha() {
  const answer = String(Math.floor(1000 + Math.random() * 9000));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="42" viewBox="0 0 132 42">
    <rect width="132" height="42" rx="10" fill="#EAE5DC"/>
    <path d="M8 30 C34 8, 72 44, 124 12" stroke="rgba(92,74,52,.28)" fill="none"/>
    <text x="18" y="30" fill="#2C2418" font-family="Georgia,serif" font-size="24" font-weight="700" letter-spacing="5">${answer}</text>
  </svg>`;
  return {
    image: `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`,
    token: `local:${answer}`,
  };
}
