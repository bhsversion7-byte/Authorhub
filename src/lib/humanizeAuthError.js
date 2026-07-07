// Supabase/GoTrue and raw fetch errors are always English (and occasionally
// not even a real message - e.g. a 504 gateway timeout can surface as an
// empty/malformed object whose "message" renders as literal "{}"). Never
// show `error.message` to the user directly - map known shapes to a clear
// Chinese sentence and always fall back to a generic one instead of raw
// technical text, found 2026-07-08 after users reported "failed to fetch"
// and blank/unhelpful password-reset responses.
export function humanizeAuthError(error, fallback) {
  const raw = typeof error?.message === "string" ? error.message : "";
  if (error?.name === "TypeError" || /failed to fetch|networkerror|load failed/i.test(raw)) {
    return "网络连接异常，请检查网络后重试。";
  }
  if (/already registered|already exists|user already registered/i.test(raw)) {
    return "此邮箱已注册，请直接登录。";
  }
  if (/invalid login credentials/i.test(raw)) {
    return "邮箱或密码不正确，请重新输入。";
  }
  if (/email not confirmed/i.test(raw)) {
    return "邮箱尚未验证，请查看注册邮箱中的验证邮件。";
  }
  if (/rate limit|too many requests|429/i.test(raw)) {
    return "操作过于频繁，请稍后再试。";
  }
  if (/timeout|timed out|deadline exceeded|504/i.test(raw)) {
    return "云端服务响应超时，请稍后重试。";
  }
  if (/password/i.test(raw) && /(weak|short|least|characters)/i.test(raw)) {
    return "密码强度不够，请更换更复杂的密码。";
  }
  // Raised by our own RPCs (e.g. delete_author_hub_account) when auth.uid()
  // is null - normally a stale/expired session rather than a real denial, so
  // point the user at the actual fix (refresh) instead of a dead-end message.
  if (/authentication required/i.test(raw)) {
    return "登录状态已过期，请刷新页面重新登录后再试。";
  }
  return fallback;
}
