import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound } from "lucide-react";
import { humanizeAuthError } from "../lib/humanizeAuthError.js";
import {
  clearPasswordRecoveryUrl,
  hasPasswordRecoveryMarker,
  isPasswordRecoveryEvent,
} from "../lib/passwordRecovery.js";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient.js";
import { useEscapeToClose } from "../lib/useEscapeToClose.js";

export default function PasswordRecoveryBoundary({ children }) {
  const [recoveryOpen, setRecoveryOpen] = useState(
    () => Boolean(hasSupabaseConfig && hasPasswordRecoveryMarker(window.location)),
  );
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return undefined;

    let mounted = true;
    const hasMarker = hasPasswordRecoveryMarker(window.location);

    if (hasMarker) {
      setRecoveryOpen(true);
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted || !data.session) return;
        setRecoveryReady(true);
        clearPasswordRecoveryUrl(window.history, window.location);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isPasswordRecoveryEvent(event)) return;
      setRecoveryOpen(true);
      setRecoveryReady(Boolean(session));
      clearPasswordRecoveryUrl(window.history, window.location);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function cancelRecovery() {
    await supabase?.auth.signOut({ scope: "local" }).catch(() => {});
    clearPasswordRecoveryUrl(window.history, window.location);
    window.location.replace("/");
  }

  return (
    <>
      {children}
      {recoveryOpen &&
        createPortal(
          <PasswordRecoveryModal
            ready={recoveryReady}
            onCancel={cancelRecovery}
            onCompleted={() => window.location.replace("/")}
          />,
          document.body,
        )}
    </>
  );
}

function PasswordRecoveryModal({ ready, onCancel, onCompleted }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEscapeToClose(onCancel);

  async function savePassword(event) {
    event.preventDefault();
    setMessage("");

    if (!ready) {
      setMessage("正在验证重置链接，请稍后再试。");
      return;
    }
    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }
    if (password !== confirmation) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("密码已更新，请使用新密码重新登录。");
      await supabase.auth.signOut({ scope: "global" }).catch(() => {});
      window.setTimeout(onCompleted, 900);
    } catch (error) {
      setMessage(humanizeAuthError(error, "密码更新失败，请重新申请重置邮件。"));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <form className="confirm-modal password-modal" onSubmit={savePassword} onMouseDown={(event) => event.stopPropagation()}>
        <div className="auth-mark" aria-hidden="true">
          <KeyRound size={20} />
        </div>
        <p className="eyebrow">Password recovery</p>
        <h2>重设密码</h2>
        <p>{ready ? "请输入新的登录密码。" : "正在验证邮件中的重置链接……"}</p>
        <label>
          新密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            autoComplete="new-password"
            disabled={!ready || busy}
          />
        </label>
        <label>
          再次输入
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="再次输入新密码"
            autoComplete="new-password"
            disabled={!ready || busy}
          />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={busy}>
            返回登录
          </button>
          <button type="submit" className="primary-button" disabled={!ready || busy}>
            {busy ? "保存中..." : "保存新密码"}
          </button>
        </div>
      </form>
    </div>
  );
}
