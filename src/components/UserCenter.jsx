import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileJson, FileText, KeyRound, LogOut, Mail, Moon, ShieldCheck, Sun, Trash2, UserX, WalletCards } from "lucide-react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient.js";
import { useEscapeToClose } from "../lib/useEscapeToClose.js";
import AnnouncementCenter from "./AnnouncementCenter.jsx";

const DONATION_QR = {
  wechat: "/donation-wechat.png",
  alipay: "/donation-alipay.jpg",
};

export default function UserCenter({
  authUser,
  author,
  onAuthorChange,
  onExportJson,
  onExportMarkdown,
  onClearData,
  onLogout,
  onUnregister,
  appearance,
  onAppearanceChange,
}) {
  const [donationTab, setDonationTab] = useState("wechat");
  const [qrUnlocked, setQrUnlocked] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmUnregister, setConfirmUnregister] = useState(false);

  const safeAuthor = useMemo(() => ({ donation: {}, ...author }), [author]);
  const username = authUser?.user_metadata?.username || safeAuthor.username || authUser?.email?.split("@")[0] || "writer";
  const email = authUser?.email || safeAuthor.email || "未绑定邮箱";

  return (
    <section className="section user-center-section">
      <div className="section-heading user-center-heading">
        <p className="eyebrow">User center</p>
        <h1>用户中心</h1>
        <p>管理账号、数据备份、清空数据和打赏入口。创作内容优先保存在当前账号；云端同步失败时会自动回落到本地缓存。</p>
      </div>

      <div className="user-center-page-grid">
        <article className="panel user-account-panel">
          <div className="panel-title spacious-title">
            <ShieldCheck size={16} />
            <div>
              <h2>账号与备份</h2>
              <span>{authUser ? "已登录" : "本地演示账号"}</span>
            </div>
          </div>

          <div className="user-info-grid">
            <label>
              用户名
              <input value={username} onChange={(event) => onAuthorChange({ ...safeAuthor, username: event.target.value })} />
            </label>
            <label>
              邮箱
              <input value={email} onChange={(event) => onAuthorChange({ ...safeAuthor, email: event.target.value })} />
            </label>
          </div>

          <div className="user-action-board">
            <button
              type="button"
              className={`theme-mode-switch ${appearance?.darkMode ? "is-dark" : ""}`}
              onClick={() => onAppearanceChange?.({ darkMode: !appearance?.darkMode })}
              aria-pressed={Boolean(appearance?.darkMode)}
            >
              <span>{appearance?.darkMode ? <Moon size={15} /> : <Sun size={15} />}</span>
              {appearance?.darkMode ? "Night mode" : "Day mode"}
            </button>
            <button type="button" onClick={() => setPasswordOpen(true)}>
              <KeyRound size={15} />
              修改密码
            </button>
            <button type="button" onClick={onExportJson}>
              <FileJson size={15} />
              导出 JSON
            </button>
            <button type="button" onClick={onExportMarkdown}>
              <FileText size={15} />
              导出 Markdown
            </button>
            <button type="button" className="user-clear-data-button" onClick={() => setConfirmClear(true)}>
              <Trash2 size={15} />
              清空数据
            </button>
            <button type="button" className="user-logout-button" onClick={onLogout}>
              <LogOut size={15} />
              安全登出
            </button>
            <button type="button" className="btn-unregister" onClick={() => setConfirmUnregister(true)}>
              <UserX size={15} />
              注销账号
            </button>
          </div>

          <a className="feedback-link is-wide user-feedback" href="mailto:bhsversion@163.com?subject=AuthorHub_Feedback">
            <Mail size={14} />
            小宇宙互助 / 倾听建议：欢迎向 bhsversion@163.com 分享产品建议或宏大人物设定。
          </a>

          {confirmClear && (
            <div className="inline-confirm compact-confirm">
              <strong>确定清空全部作品数据？</strong>
              <p>这会清空当前账号下的作品、人物、星图、时间线和设定集，本地缓存也会同步清空。</p>
              <div>
                <button type="button" className="ghost-button" onClick={() => setConfirmClear(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    await onClearData();
                    setConfirmClear(false);
                  }}
                >
                  确定清空
                </button>
              </div>
            </div>
          )}
        </article>

        <article className="panel donation-panel user-donation-panel">
          <div className="panel-title">
            <WalletCards size={16} />
            <h2>纯净打赏</h2>
          </div>
          <p>如果你喜欢这个工具，欢迎请作者喝杯咖啡，支持用爱发电（^^）。</p>
          <div className="donation-tabs" role="tablist" aria-label="赞助方式">
            <button
              type="button"
              className={donationTab === "wechat" ? "is-active" : ""}
              onClick={() => {
                setDonationTab("wechat");
                setQrUnlocked(false);
              }}
            >
              微信
            </button>
            <button
              type="button"
              className={donationTab === "alipay" ? "is-active" : ""}
              onClick={() => {
                setDonationTab("alipay");
                setQrUnlocked(false);
              }}
            >
              支付宝
            </button>
          </div>
          <button
            type="button"
            className={`donation-qr donation-privacy-frame ${qrUnlocked ? "is-unlocked" : ""}`}
            onClick={() => setQrUnlocked((current) => !current)}
            aria-label={qrUnlocked ? "重新模糊打赏二维码" : "解锁查看打赏二维码"}
          >
            <img src={DONATION_QR[donationTab]} alt={donationTab === "wechat" ? "微信打赏二维码" : "支付宝打赏二维码"} />
            {!qrUnlocked && <span className="donation-unlock-copy">☕ 点击图片，解锁赞助通道</span>}
          </button>
        </article>
        <AnnouncementCenter />
      </div>

      {passwordOpen &&
        createPortal(
          <PasswordModal onClose={() => setPasswordOpen(false)} />,
          document.body,
        )}
      {confirmUnregister &&
        createPortal(
          <UnregisterModal
            onClose={() => setConfirmUnregister(false)}
            onConfirm={async () => {
              await onUnregister?.();
              setConfirmUnregister(false);
            }}
          />,
          document.body,
        )}
    </section>
  );
}

function PasswordModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEscapeToClose(onClose);

  async function savePassword(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }
    setBusy(true);
    try {
      if (hasSupabaseConfig && supabase) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("密码已更新。");
        window.setTimeout(onClose, 900);
      } else {
        setMessage("当前为本地演示模式，配置 Supabase 后即可修改真实密码。");
      }
    } catch (error) {
      setMessage(error.message || "密码更新失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="confirm-modal password-modal" onSubmit={savePassword} onMouseDown={(event) => event.stopPropagation()}>
        <p className="eyebrow">Security</p>
        <h2>修改密码</h2>
        <label>
          新密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "保存中..." : "保存密码"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UnregisterModal({ onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEscapeToClose(onClose);

  async function confirm() {
    setBusy(true);
    setMessage("");
    try {
      await onConfirm();
    } catch (error) {
      setMessage(error.message || "注销失败，请稍后再试。");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop user-unregister-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="confirm-modal user-unregister-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-unregister-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Account</p>
        <h2 id="user-unregister-title">确认注销账号？</h2>
        <p>注销后会删除当前账号、作品数据、分享链接和协作权限，并退出登录。这个操作请谨慎确认。</p>
        {message && <p className="auth-message">{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-unregister" onClick={confirm} disabled={busy}>
            {busy ? "注销中..." : "确认注销"}
          </button>
        </div>
      </section>
    </div>
  );
}
