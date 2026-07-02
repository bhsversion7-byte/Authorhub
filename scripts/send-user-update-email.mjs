import fs from "node:fs";
import path from "node:path";

const CONFIRM_VALUE = "SEND_AUTHORHUB_UPDATE";
const DEFAULT_SUBJECT = "AuthorHub 更新说明";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

loadEnvFile(".env");
loadEnvFile(".env.local");

const args = parseArgs(process.argv.slice(2));
const requestedSend = Boolean(args.send);
const dryRun = !requestedSend || Boolean(args["dry-run"]);
const sendMode = requestedSend && !dryRun;
const testRecipients = splitList(args["test-to"]);
const csvPath = args.emails ? path.resolve(String(args.emails)) : "";
const limit = parsePositiveInt(args.limit);
const dailyLimit = parsePositiveInt(args["daily-limit"]);
const offset = Math.max(0, Number.parseInt(args.offset ?? "0", 10) || 0);
const delayMs = Math.max(0, Number.parseInt(args.delay ?? "160", 10) || 0);
const useState = Boolean(args.resume || args.state || dailyLimit);
const statePath = args.state ? path.resolve(String(args.state)) : path.resolve("logs", "authorhub-email-state.json");
const htmlTemplate = readOptionalFile(args["html-template"] || process.env.AUTHORHUB_EMAIL_HTML_TEMPLATE);
const textTemplate = readOptionalFile(args["text-template"] || process.env.AUTHORHUB_EMAIL_TEXT_TEMPLATE);

const from = process.env.AUTHORHUB_EMAIL_FROM;
const feedbackEmail = process.env.AUTHORHUB_FEEDBACK_EMAIL || from || "";
const subject = args.subject || process.env.AUTHORHUB_EMAIL_SUBJECT || DEFAULT_SUBJECT;

const allRecipients = testRecipients.length
  ? testRecipients
  : csvPath
    ? readEmailsFromFile(csvPath)
    : await listSupabaseAuthEmails();

const state = useState ? readState(statePath) : createEmptyState();
const recipients = useState && !testRecipients.length ? allRecipients.filter((email) => !state.sent.includes(email)) : allRecipients;
const effectiveLimit = Number.isFinite(limit) ? limit : dailyLimit;
const selectedRecipients = recipients.slice(offset, Number.isFinite(effectiveLimit) ? offset + effectiveLimit : undefined);

if (!selectedRecipients.length) {
  console.log("No recipients found. Use --test-to, --emails, or Supabase admin env vars.");
  process.exit(1);
}

if (sendMode) {
  requireEnv("RESEND_API_KEY");
  requireEnv("AUTHORHUB_EMAIL_FROM");
}

if (sendMode && !testRecipients.length && args.all !== true) {
  console.error("Refusing bulk send without --all. Run a test first, then use --send --all.");
  process.exit(1);
}

if (sendMode && !testRecipients.length && process.env.AUTHORHUB_EMAIL_CONFIRM !== CONFIRM_VALUE) {
  console.error(`Refusing bulk send without AUTHORHUB_EMAIL_CONFIRM=${CONFIRM_VALUE}.`);
  process.exit(1);
}

console.log(`${dryRun ? "Dry run" : "Sending"} ${selectedRecipients.length} email(s).`);
console.log(`Subject: ${subject}`);
console.log(`From: ${from || "(missing until --send)"}`);
console.log(`First recipients: ${selectedRecipients.slice(0, 5).join(", ")}`);
if (useState && !testRecipients.length) {
  console.log(`Resume state: ${statePath}`);
  console.log(`Already sent according to state: ${state.sent.length}`);
}

if (dryRun) {
  console.log("Dry run only. Add --send plus the required confirmation env var to send.");
  process.exit(0);
}

const logDir = path.resolve("logs");
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, `authorhub-email-send-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);

let sent = 0;
let failed = 0;
for (const email of selectedRecipients) {
  const result = await sendEmail(email);
  fs.appendFileSync(logPath, `${JSON.stringify({ email, ...result, at: new Date().toISOString() })}\n`, "utf8");
  if (result.ok) {
    sent += 1;
    if (useState && !testRecipients.length) writeState(statePath, markSent(state, email));
  } else {
    failed += 1;
    if (useState && !testRecipients.length) writeState(statePath, markFailed(state, email, result));
  }
  if (delayMs) await sleep(delayMs);
}

console.log(`Finished. Sent: ${sent}. Failed: ${failed}. Log: ${logPath}`);
if (failed) process.exitCode = 1;

async function sendEmail(email) {
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html: htmlTemplate ? renderTemplate(htmlTemplate, { email, feedbackEmail }) : buildHtmlEmail({ feedbackEmail }),
        text: textTemplate ? renderTemplate(textTemplate, { email, feedbackEmail }) : buildTextEmail({ feedbackEmail }),
      }),
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body: safeJson(body) ?? body };
  } catch (error) {
    return { ok: false, status: 0, body: error.message };
  }
}

async function listSupabaseAuthEmails() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return [];

  const emails = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase admin users request failed: ${response.status} ${await response.text()}`);
    const payload = await response.json();
    const users = Array.isArray(payload.users) ? payload.users : [];
    users.forEach((user) => {
      if (isEmail(user.email)) emails.push(user.email.toLowerCase());
    });
    if (users.length < perPage) break;
    page += 1;
  }
  return unique(emails);
}

function buildHtmlEmail({ feedbackEmail: replyTo }) {
  const replyLine = replyTo
    ? `如果使用中遇到问题，或者有新的建议，也欢迎直接回复 <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>。如果不想再收到这类产品更新，也可以回复说明。`
    : "如果使用中遇到问题，或者有新的建议，也欢迎直接回复这封邮件。如果不想再收到这类产品更新，也可以回复说明。";
  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f7f1e7;color:#2f2924;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;">
    <main style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <section style="background:#fffaf0;border:1px solid #e7d8bd;border-radius:12px;padding:28px;">
        <p style="margin:0 0 8px;">亲爱的友友，</p>
        <p style="margin:0 0 22px;">你好。</p>
        <p>非常感谢这段时间的使用和陪伴❤！现根据评论区的建议和投票结果，AuthorHub 做了如下更新：</p>
        <ul>
          <li>新增「时间点卡片」拖拽排序，可以手动调整剧情时间线的顺序。</li>
          <li>新增人物关系星图的视觉强化：标签中带有「主角」的人物之间，关系线会显示为红色，更方便快速识别核心关系。</li>
          <li>新增分享链接功能：你可以邀请亲友一起编辑，也可以生成只读查看链接。</li>
          <li>只读查看支持选择公开范围，例如大纲、设定集、主题标签、星图、人物详情、时间线。未选择的内容对方看不到。</li>
          <li>新增分享链接撤回功能，发错或不想继续公开时，可以及时撤回。</li>
          <li>修复了一些已知问题，并增强了云端备份、保存稳定性和安全性。</li>
          <li>优化了手机端和网页端的一些细节体验。</li>
        </ul>
        <p>大家可以通过这里继续使用：<br><a href="https://www.authorhub.cn" style="color:#6d4d3d;">https://www.authorhub.cn</a></p>
        <p>${replyLine}真的很感谢大家愿意陪这个小工具慢慢变好。</p>
        <p style="margin-top:24px;">此致敬礼，<br>本狗老师</p>
      </section>
    </main>
  </body>
</html>`;
}

function buildTextEmail({ feedbackEmail: replyTo }) {
  const replyLine = replyTo
    ? `如果使用中遇到问题，或者有新的建议，也欢迎直接回复 ${replyTo}。如果不想再收到这类产品更新，也可以回复说明。`
    : "如果使用中遇到问题，或者有新的建议，也欢迎直接回复这封邮件。如果不想再收到这类产品更新，也可以回复说明。";
  return [
    "亲爱的友友，",
    "你好。",
    "",
    "非常感谢这段时间的使用和陪伴❤！现根据评论区的建议和投票结果，AuthorHub 做了如下更新：",
    "",
    "- 新增「时间点卡片」拖拽排序，可以手动调整剧情时间线的顺序。",
    "- 新增人物关系星图的视觉强化：标签中带有「主角」的人物之间，关系线会显示为红色，更方便快速识别核心关系。",
    "- 新增分享链接功能：你可以邀请亲友一起编辑，也可以生成只读查看链接。",
    "- 只读查看支持选择公开范围，例如大纲、设定集、主题标签、星图、人物详情、时间线。未选择的内容对方看不到。",
    "- 新增分享链接撤回功能，发错或不想继续公开时，可以及时撤回。",
    "- 修复了一些已知问题，并增强了云端备份、保存稳定性和安全性。",
    "- 优化了手机端和网页端的一些细节体验。",
    "",
    "大家可以通过这里继续使用：",
    "https://www.authorhub.cn",
    "",
    `${replyLine}真的很感谢大家愿意陪这个小工具慢慢变好。`,
    "",
    "此致敬礼，",
    "本狗老师",
  ].join("\n");
}

function readEmailsFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return unique((content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((email) => email.toLowerCase()));
}

function readOptionalFile(filePath) {
  if (!filePath) return "";
  const resolved = path.resolve(String(filePath));
  if (!fs.existsSync(resolved)) throw new Error(`Template file not found: ${resolved}`);
  return fs.readFileSync(resolved, "utf8");
}

function renderTemplate(template, values) {
  return template.replace(/\{\{\s*(email|feedbackEmail)\s*\}\}/g, (_, key) => values[key] ?? "");
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function createEmptyState() {
  return { sent: [], failed: [], updatedAt: null };
}

function readState(filePath) {
  if (!fs.existsSync(filePath)) return createEmptyState();
  try {
    const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      sent: unique((state.sent ?? []).filter(isEmail).map((email) => email.toLowerCase())),
      failed: Array.isArray(state.failed) ? state.failed : [],
      updatedAt: state.updatedAt ?? null,
    };
  } catch (error) {
    throw new Error(`Could not read email state file: ${filePath}. ${error.message}`);
  }
}

function writeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

function markSent(state, email) {
  if (!state.sent.includes(email)) state.sent.push(email);
  state.failed = state.failed.filter((item) => item.email !== email);
  return state;
}

function markFailed(state, email, result) {
  const failure = { email, status: result.status, body: result.body, at: new Date().toISOString() };
  state.failed = state.failed.filter((item) => item.email !== email).concat(failure);
  return state;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function loadEnvFile(fileName) {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

function splitList(value) {
  if (!value) return [];
  return unique(String(value).split(/[,\s]+/).map((item) => item.trim().toLowerCase()).filter(isEmail));
}

function unique(items) {
  return Array.from(new Set(items));
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
