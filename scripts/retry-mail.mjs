import nextEnv from '@next/env';
import { database } from '../lib/db.mjs';
import { mailConfiguration, sendInquiryNotification } from '../lib/mail.mjs';
nextEnv.loadEnvConfig(process.cwd());
if (!mailConfiguration().configured) {
  console.error('Mail is not configured. No notifications were sent.');
  process.exitCode = 1;
} else {
  const pending = database().prepare("SELECT inquiry_id FROM inquiry_notifications WHERE status IN ('pending','failed','unconfigured') OR (status='sending' AND last_attempt_at < ?) ORDER BY inquiry_id LIMIT 50").all(Date.now() - 120000);
  let sent = 0; let failed = 0;
  for (const row of pending) {
    const result = await sendInquiryNotification(row.inquiry_id);
    if (result.status === 'sent') sent++; else failed++;
  }
  console.log(`Notifications accepted: ${sent}; not sent: ${failed}. Up to 50 pending notifications are processed per run.`);
  if (failed) process.exitCode = 1;
}
