import nextEnv from '@next/env';
import nodemailer from 'nodemailer';
import { mailConfiguration, notificationRecipient } from '../lib/mail.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config = mailConfiguration();
if (!config.configured) {
  console.error('Mail is not configured. Run the mail setup launcher first.');
  process.exitCode = 1;
} else {
  const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port === 587, auth: { user: config.user, pass: config.password }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, tls: { minVersion: 'TLSv1.2' } });
  try {
    await transport.verify();
    console.log('SMTP connection and authentication verified.');
    if (process.argv.includes('--send-test')) {
      const result = await transport.sendMail({ from: { name: '데미안포토', address: config.user }, to: notificationRecipient, subject: '[데미안포토] 촬영문의 알림 설정 확인', text: '이메일 알림 발송 설정을 확인하기 위한 테스트 메일입니다.\n실제 고객 문의가 아니며, 이후 새 촬영문의가 등록되면 이 주소로 알림이 발송됩니다.', disableFileAccess: true, disableUrlAccess: true });
      if (!result.accepted?.includes(notificationRecipient)) throw new Error('Test recipient was not accepted');
      console.log(`Test notification accepted by the mail server for ${notificationRecipient}. Check Inbox and Spam.`);
    }
  } catch(error) {
    console.error(`SMTP verification failed (${/^[A-Z_]{2,30}$/.test(error.code || '') ? error.code : 'MAIL_ERROR'}). Check the account, app password, and network.`);
    process.exitCode = 1;
  } finally { transport.close(); }
}
