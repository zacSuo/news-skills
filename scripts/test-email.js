#!/usr/bin/env node
/**
 * 测试企业邮箱 / 网页邮箱 SMTP 是否可正常发信。
 * 用法：npm run report:test-email
 * 需在项目根目录配置 .env（REPORT_EMAIL_TO, SMTP_*）
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function parseRecipients(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes('@'));
}

const toList = parseRecipients(process.env.REPORT_EMAIL_TO);
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user;

if (!toList.length || !host || !user || !pass) {
  console.error('请先配置 .env：REPORT_EMAIL_TO（可填多个收件人，逗号分隔）, SMTP_HOST, SMTP_USER, SMTP_PASS');
  process.exit(1);
}

const nodemailer = require('nodemailer');

const isSecure = port === 465;
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: isSecure,
  auth: { user, pass },
  tls: {
    rejectUnauthorized: true,
  },
});

async function main() {
  console.log('正在使用当前 .env 配置测试发信...');
  console.log(`  SMTP: ${host}:${port} (secure: ${isSecure})`);
  console.log(`  发件: ${from}`);
  console.log(`  收件: ${toList.join(', ')}`);
  try {
    await transporter.verify();
    console.log('  SMTP 连接验证成功。');
  } catch (err) {
    console.error('  SMTP 连接验证失败:', err.message);
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('enotfound') || msg.includes('getaddrinfo')) {
      console.log('');
      console.log('  【ENOTFOUND：SMTP 主机无法解析】说明当前 SMTP_HOST 在 DNS 中不存在。');
      console.log('  企业邮箱若使用第三方托管，应填托管商的 SMTP 地址，例如：');
      console.log('  · 腾讯企业邮箱：SMTP_HOST=smtp.exmail.qq.com  SMTP_PORT=465');
      console.log('  · 网易企业邮箱：SMTP_HOST=smtp.qiye.163.com   SMTP_PORT=465');
      console.log('  · 阿里企业邮箱：SMTP_HOST=smtp.qiye.aliyun.com SMTP_PORT=465');
      console.log('  · Microsoft 365：SMTP_HOST=smtp.office365.com  SMTP_PORT=587');
      console.log('  请向公司 IT 确认，或登录网页邮箱 → 设置/帮助 → 查 SMTP 服务器地址。');
      console.log('');
    } else if (msg.includes('535') || msg.includes('authentication failed') || msg.includes('invalid login')) {
      console.log('');
      console.log('  【535 认证失败】常见原因：');
      if (host && host.includes('163.com')) {
        console.log('  1. 163 邮箱：SMTP 必须用「授权码」登录，不能用网页登录密码。');
        console.log('     设置路径：网易邮箱 → 设置 → POP3/SMTP/IMAP → 开启 SMTP → 新增授权密码，将授权码填入 .env 的 SMTP_PASS。');
        console.log('  2. 163 发信时 SMTP_USER 必须是 xxx@163.com，不能是其他域名邮箱。');
        console.log('  3. 建议端口改为 465（.env 中 SMTP_PORT=465）。');
      } else {
        console.log('  1. 发件人邮箱与 SMTP 服务器必须匹配：SMTP_HOST 需为当前邮箱实际使用的 SMTP 服务器。');
        console.log('  2. 企业邮箱 SMTP 通常需使用「授权码」而非登录密码，请在网页邮箱设置中开启 SMTP 并生成授权码。');
      }
      console.log('');
    } else if (port === 587 && err.message && err.message.includes('certificate')) {
      console.log('  提示：若为企业自签名证书，可联系管理员确认证书或尝试 SMTP_PORT=465。');
    }
    process.exit(1);
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: toList,
      subject: '【测试】科技周报发信正常',
      text: '这是一封测试邮件。若你收到此邮件，说明当前 SMTP 配置可以正常发送科技周报。',
      html: '<p>这是一封<strong>测试邮件</strong>。</p><p>若你收到此邮件，说明当前 SMTP 配置可以正常发送科技周报。</p>',
    });
    console.log('邮件已发送成功。MessageId:', info.messageId);
  } catch (err) {
    console.error('发送失败:', err.message);
    if (err.response) console.error('响应:', err.response);
    process.exit(1);
  }
}

main();
