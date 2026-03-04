import { google } from 'googleapis';

// Singleton OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function buildOtpEmailHtml(name: string, code: string, purpose: string): string {
  const digits = code.split('');
  const digitBoxes = digits
    .map(
      d =>
        `<span style="display:inline-block;width:48px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:700;border:2px solid #004D3E;border-radius:8px;color:#004D3E;background:#f0f9f7;margin:0 4px;">${d}</span>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#004D3E;padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Digiweb Agents</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Your ${purpose} code is:</p>
            <div style="text-align:center;margin:0 0 24px;">
              ${digitBoxes}
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">If you didn&apos;t request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Digiweb Agents. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function encodeMessage(to: string, subject: string, html: string): string {
  const from = process.env.GMAIL_USER!;
  const message = [
    `From: Digiweb Agents <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendVerificationEmail(to: string, code: string, name: string): Promise<void> {
  const html = buildOtpEmailHtml(name, code, 'email verification');
  const raw = encodeMessage(to, 'Verify your email — Digiweb Agents', html);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

export async function sendPasswordResetEmail(to: string, code: string, name: string): Promise<void> {
  const html = buildOtpEmailHtml(name, code, 'password reset');
  const raw = encodeMessage(to, 'Reset your password — Digiweb Agents', html);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
