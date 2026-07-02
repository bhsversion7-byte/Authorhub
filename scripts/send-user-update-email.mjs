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
const limit = Number.parseInt(args.limit ?? "", 10);
const offset = Math.max(0, Number.parseInt(args.offset ?? "0", 10) || 0);
const delayMs = Math.max(0, Number.parseInt(args.delay ?? "160", 10) || 0);

const from = process.env.AUTHORHUB_EMAIL_FROM;
const feedbackEmail = process.env.AUTHORHUB_FEEDBACK_EMAIL || from || "";
const subject = process.env.AUTHORHUB_EMAIL_SUBJECT || DEFAULT_SUBJECT;

const recipients = testRecipients.length
  ? testRecipients
  : csvPath
    ? readEmailsFromFile(csvPath)
    : await listSupabaseAuthEmails();

const selectedRecipients = recipients.slice(offset, Number.isFinite(limit) ? offset + limit : undefined);

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
  if (result.ok) sent += 1;
  else failed += 1;
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
        html: buildHtmlEmail({ feedbackEmail }),
        text: buildTextEmail({ feedbackEmail }),
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
    ? `如需反馈或不想再收到这类产品更新，可以直接回复 <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>。`
    : "如需反馈或不想再收到这类产品更新，可以直接回复这封邮件。";
  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f7f1e7;color:#2f2924;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;">
    <main style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <section style="background:#fffaf0;border:1px solid #e7d8bd;border-radius:12px;padding:28px;">
        <h1 style="margin:0 0 14px;font-size:22px;">AuthorHub 更新说明</h1>
        <p>你好，AuthorHub 最近完成了一轮精修，主要围绕写作工作台、分享协作和移动端使用体验。</p>
        <ul>
          <li>只读分享可以选择公开哪些内容，对方只能浏览，不能改动你的工作区。</li>
          <li>人物星图、时间线、音乐播放器和移动端导航做了稳定性优化。</li>
          <li>协作与分享的权限边界更清楚，私密人物字段不会出现在只读公开链接里。</li>
        </ul>
        <p>你收到这封邮件，是因为你曾注册或使用 AuthorHub。${replyLine}</p>
        <p style="margin-top:24px;color:#7a6c5e;font-size:13px;">AuthorHub 团队</p>
      </section>
    </main>
  </body>
</html>`;
}

function buildTextEmail({ feedbackEmail: replyTo }) {
  return [
    "AuthorHub 更新说明",
    "",
    "你好，AuthorHub 最近完成了一轮精修，主要围绕写作工作台、分享协作和移动端使用体验。",
    "",
    "- 只读分享可以选择公开哪些内容，对方只能浏览，不能改动你的工作区。",
    "- 人物星图、时间线、音乐播放器和移动端导航做了稳定性优化。",
    "- 协作与分享的权限边界更清楚，私密人物字段不会出现在只读公开链接里。",
    "",
    `你收到这封邮件，是因为你曾注册或使用 AuthorHub。${replyTo ? `如需反馈或不想再收到这类产品更新，可以直接回复 ${replyTo}。` : "如需反馈或不想再收到这类产品更新，可以直接回复这封邮件。"}`,
    "",
    "AuthorHub 团队",
  ].join("\n");
}

function readEmailsFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return unique((content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((email) => email.toLowerCase()));
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
