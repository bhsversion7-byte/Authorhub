import React, { useMemo, useState } from "react";
import { Download, FileJson, FileText, KeyRound, LogOut, Mail, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient.js";

export default function UserCenter({ authUser, author, onAuthorChange, onExportJson, onExportMarkdown, onClearData, onLogout }) {
  const [donationTab, setDonationTab] = useState("wechat");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const safeAuthor = useMemo(() => ({ donation: {}, ...author }), [author]);
  const username = authUser?.user_metadata?.username || safeAuthor.username || authUser?.email?.split("@")[0] || "writer";
  const email = authUser?.email || safeAuthor.email || "未绑定邮箱";

  function patchDonation(patch) {
    onAuthorChange({ ...safeAuthor, donation: { ...(safeAuthor.donation ?? {}), ...patch } });
  }

  return (
    <section className="section user-center-section">
      <div className="section-heading user-center-heading">
        <p className="eyebrow">User center</p>
        <h1>用户中心</h1>
        <p>管理账号、安全、数据导出与打赏信息。创作内容默认隐私优先，云端同步失败时会自动回落到本地缓存。</p>
      </div>

      <div className="user-center-page-grid">
        <article className="panel user-account-panel">
          <div className="panel-title spacious-title">
            <ShieldCheck size={16} />
            <div>
              <h2>账号与数据主权</h2>
              <span>{authUser ? "已登录" : "本地演示账号"}</span>
            </div>
          </div>

          <div className="user-info-grid">
            <label>
              用户名
              <input value={username} onChange={(event) => onAuthorChange({ ...safeAuthor, username: event.target.value })} />
            </label>
            <label>
              用户绑定邮箱
              <input value={email} onChange={(event) => onAuthorChange({ ...safeAuthor, email: event.target.value })} />
            </label>
          </div>

          <div className="user-action-board">
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
            <button type="button" onClick={() => setConfirmClear(true)}>
              <Trash2 size={15} />
              清空云端数据
            </button>
            <button type="button" onClick={onLogout}>
              <LogOut size={15} />
              安全登出
            </button>
          </div>

          <a className="feedback-link is-wide user-feedback" href="mailto:bhsversion@163.com?subject=AuthorHub_Feedback">
            <Mail size={14} />
            小宇宙互助 / 倾听建议：欢迎向 bhsversion@163.com 分享产品建议或宏大人物设定。
          </a>

          {confirmClear && (
            <div className="inline-confirm compact-confirm">
              <strong>确定清空全部小说信息？</strong>
              <p>这会清空当前账号下的作品、人物、星图、时间线和设定集。若云端暂不可用，本地缓存也会同步清空。</p>
              <div>
                <button type="button" className="ghost-button" onClick={() => setConfirmClear(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    onClearData();
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
            <button type="button" className={donationTab === "wechat" ? "is-active" : ""} onClick={() => setDonationTab("wechat")}>
              微信
            </button>
            <button type="button" className={donationTab === "alipay" ? "is-active" : ""} onClick={() => setDonationTab("alipay")}>
              支付宝
            </button>
          </div>
          <div className="donation-qr">
            {safeAuthor.donation?.[donationTab] ? (
              <img src={safeAuthor.donation[donationTab]} alt={donationTab === "wechat" ? "微信赞助二维码" : "支付宝赞助二维码"} />
            ) : (
              <div>
                <WalletCards size={28} />
                <span>粘贴二维码图片 URL 后显示</span>
              </div>
            )}
          </div>
          <label className="qr-url-field">
            二维码图片 URL
            <input value={safeAuthor.donation?.[donationTab] ?? ""} onChange={(event) => patchDonation({ [donationTab]: event.target.value })} placeholder="https://..." />
          </label>
        </article>
      </div>

      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
    </section>
  );
}

function PasswordModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
