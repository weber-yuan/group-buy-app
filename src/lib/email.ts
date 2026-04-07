import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

export async function sendResetEmail(to: string, resetLink: string, displayName: string) {
  const isDevMode = !process.env.EMAIL_USER;

  if (isDevMode) {
    // In dev mode, just log the link
    console.log('\n========== 密碼重設連結（開發模式） ==========');
    console.log(`收件人: ${to}`);
    console.log(`連結: ${resetLink}`);
    console.log('==============================================\n');
    return { dev: true, link: resetLink };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: '【團購平台】密碼重設請求',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">團購平台 密碼重設</h2>
        <p>您好，${displayName}！</p>
        <p>我們收到了您的密碼重設請求。請點擊下方按鈕重設密碼（連結 1 小時後失效）：</p>
        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          重設密碼
        </a>
        <p style="color:#888;font-size:13px">若非本人操作，請忽略此信件。</p>
        <p style="color:#888;font-size:13px">連結：${resetLink}</p>
      </div>
    `,
  });
  return { dev: false };
}
