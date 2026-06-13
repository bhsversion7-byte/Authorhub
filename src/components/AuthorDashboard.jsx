import React, { useMemo, useState } from "react";
import {
  CaseSensitive,
  Download,
  EyeOff,
  Feather,
  Library,
  Moon,
  PenLine,
  ShieldCheck,
  Trash2,
  Type,
  WalletCards,
} from "lucide-react";
import EditableField from "./EditableField.jsx";

export default function AuthorDashboard({
  author,
  novels,
  appearance,
  privacyBlur,
  onAuthorChange,
  onAppearanceChange,
  onPrivacyBlurChange,
  onExportData,
  onClearData,
  onResetDemo,
}) {
  const [donationTab, setDonationTab] = useState("wechat");
  const [confirmClear, setConfirmClear] = useState(false);
  const totalCurrent = novels.reduce((sum, novel) => sum + Number(novel.currentWords || 0), 0);
  const totalTarget = novels.reduce((sum, novel) => sum + Number(novel.targetWords || 0), 0);
  const totalProgress = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const safeAuthor = useMemo(() => ({ donation: {}, ...author }), [author]);

  function patchAuthor(patch) {
    onAuthorChange({ ...safeAuthor, ...patch });
  }

  function patchDonation(patch) {
    patchAuthor({ donation: { ...(safeAuthor.donation ?? {}), ...patch } });
  }

  return (
    <section id="author" className="section author-section">
      <div className="section-heading">
        <p className="eyebrow">Personal center</p>
        <h1>个人主页与隐私创作中枢</h1>
        <p>
          管理笔名、账号、写作节奏、导出数据和赞助二维码。小说正文、设定和人物资料默认只保存在当前站点数据中，
          部署到云端前请接入自己的 Supabase 项目。
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="panel profile-panel" data-tour="profile">
          <div className="profile-orbit">
            <span />
            <div>{String(safeAuthor.pseudonym || "A").slice(0, 1)}</div>
          </div>
          <div className="editable-grid">
            <EditableField label="笔名" value={safeAuthor.pseudonym} onChange={(value) => patchAuthor({ pseudonym: value })} />
            <EditableField label="年龄" value={safeAuthor.age} onChange={(value) => patchAuthor({ age: value })} />
            <EditableField
              label="更新频率"
              value={safeAuthor.updateFrequency}
              onChange={(value) => patchAuthor({ updateFrequency: value })}
              multiline
            />
            <EditableField label="首发平台" value={safeAuthor.platform} onChange={(value) => patchAuthor({ platform: value })} />
          </div>
        </div>

        <div className="panel progress-panel">
          <div className="panel-title">
            <PenLine size={18} />
            <h2>创作进度</h2>
          </div>
          <div className="meter-ring" style={{ "--progress": `${totalProgress}%` }}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>
                {totalCurrent.toLocaleString()} / {totalTarget.toLocaleString()} 字
              </span>
            </div>
          </div>
          <div className="mini-stats">
            <span>
              <Library size={16} />
              {novels.length} 本作品
            </span>
            <span>
              <Feather size={16} />
              {safeAuthor.studioNote}
            </span>
          </div>
        </div>
      </div>

      <div className="user-center-grid">
        <article className="panel account-panel">
          <div className="panel-title">
            <ShieldCheck size={18} />
            <h2>账号与数据主权</h2>
          </div>
          <div className="account-form">
            <label>
              用户名
              <input value={safeAuthor.username ?? ""} onChange={(event) => patchAuthor({ username: event.target.value })} />
            </label>
            <label>
              邮箱绑定
              <input type="email" value={safeAuthor.email ?? ""} onChange={(event) => patchAuthor({ email: event.target.value })} />
            </label>
            <label>
              修改密码
              <input type="password" placeholder="本地模板不保存明文密码" onChange={() => undefined} />
            </label>
          </div>
          <p className="compliance-note">
            当前公开模板使用 LocalStorage 演示。生产环境请接入 Supabase Auth，密码由服务端以安全哈希存储。
          </p>
          <div className="account-actions">
            <button type="button" className="ghost-button" onClick={onExportData}>
              <Download size={16} />
              导出数据
            </button>
            <button type="button" className="ghost-button" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} />
              清空数据
            </button>
            <button type="button" className="ghost-button" onClick={onResetDemo}>
              <Library size={16} />
              恢复示例
            </button>
          </div>
          {confirmClear && (
            <div className="inline-confirm">
              <strong>确定清空全部作品数据？</strong>
              <p>这会清空本地作品、人物、星图、时间线和设定集。</p>
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

        <article className="panel donation-panel">
          <div className="panel-title">
            <WalletCards size={18} />
            <h2>纯净赞助</h2>
          </div>
          <p>如果你喜欢这个工具，欢迎请作者喝杯咖啡，支持用爱发电。</p>
          <div className="donation-tabs" role="tablist" aria-label="赞助方式">
            <button type="button" className={donationTab === "wechat" ? "is-active" : ""} onClick={() => setDonationTab("wechat")}>
              微信赞助
            </button>
            <button type="button" className={donationTab === "alipay" ? "is-active" : ""} onClick={() => setDonationTab("alipay")}>
              支付宝赞助
            </button>
          </div>
          <div className="donation-qr">
            {safeAuthor.donation?.[donationTab] ? (
              <img src={safeAuthor.donation[donationTab]} alt={donationTab === "wechat" ? "微信赞助二维码" : "支付宝赞助二维码"} />
            ) : (
              <div>
                <WalletCards size={34} />
                <span>粘贴二维码图片 URL 后显示</span>
              </div>
            )}
          </div>
          <label className="qr-url-field">
            二维码图片 URL
            <input
              value={safeAuthor.donation?.[donationTab] ?? ""}
              onChange={(event) => patchDonation({ [donationTab]: event.target.value })}
              placeholder="https://..."
            />
          </label>
        </article>
      </div>

      <div className="panel appearance-panel">
        <div className="panel-title">
          <Type size={18} />
          <h2>全站阅读设置</h2>
        </div>
        <div className="appearance-controls">
          <label>
            字号
            <input
              type="range"
              min="15"
              max="24"
              value={appearance.fontSize ?? 17}
              onChange={(event) => onAppearanceChange({ fontSize: Number(event.target.value) })}
            />
            <strong>{appearance.fontSize ?? 17}px</strong>
          </label>
          <label>
            字体
            <select value={appearance.fontFamily ?? "sans"} onChange={(event) => onAppearanceChange({ fontFamily: event.target.value })}>
              <option value="sans">清爽无衬线</option>
              <option value="serif">阅读衬线</option>
              <option value="mono">设定文档等宽</option>
            </select>
          </label>
          <div className="privacy-control-row">
            <button type="button" className={appearance.darkMode ? "toggle-pill is-active" : "toggle-pill"} onClick={() => onAppearanceChange({ darkMode: !appearance.darkMode })}>
              <Moon size={16} />
              夜间模式
            </button>
            <button type="button" className={privacyBlur ? "toggle-pill is-active" : "toggle-pill"} onClick={() => onPrivacyBlurChange(!privacyBlur)}>
              <EyeOff size={16} />
              隐私模糊
            </button>
          </div>
          <div className="font-preview">
            <CaseSensitive size={20} />
            <p>这段预览会和小说页的大纲、设定集、人物背景、时间线详情保持同一字号与字体。</p>
          </div>
        </div>
      </div>

      <p className="global-disclaimer">
        请勿上传违反法律法规或侵犯他人版权的内容。本站作为结构化创作辅助工具，用户生成内容不代表本站立场。
      </p>
    </section>
  );
}
