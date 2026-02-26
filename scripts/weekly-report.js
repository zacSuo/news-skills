#!/usr/bin/env node
/**
 * 每周科技热点报告：从 RSS 抓取过去一周科技新闻，生成 HTML 报告，可选发送邮件。
 * 用法：npm run report       仅生成报告
 *       npm run report:send  生成报告并发送邮件（需配置 .env）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const Parser = require('rss-parser');

const ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
/** 报告根目录；按月份存到 reports/YYYY-MM/ 下 */
const REPORTS_ROOT = path.join(ROOT, 'reports');

const RSS_FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_AGO = 7;
const TOP_N = 10;

/** 信源影响力权重（用于排序选出最有代表性/影响力的条目） */
const SOURCE_WEIGHT = {
  'TechCrunch': 5,
  'The Verge': 5,
  'Ars Technica': 4,
  'Wired': 4,
  'MIT Technology Review': 5,
};

function dateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS_AGO * MS_PER_DAY);
  return { start, end };
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function parseItemDate(item) {
  const pub = item.pubDate || item.isoDate;
  if (!pub) return null;
  const d = new Date(pub);
  return isNaN(d.getTime()) ? null : d;
}

async function fetchAllFeeds(parser) {
  const items = [];
  for (const feed of RSS_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const feedItems = (result.items || []).map((item) => ({
        title: item.title || '(无标题)',
        link: item.link || '',
        pubDate: parseItemDate(item),
        snippet: (item.contentSnippet || item.content || '').slice(0, 200).replace(/<[^>]+>/g, ''),
        source: feed.name,
      }));
      items.push(...feedItems);
    } catch (err) {
      console.error(`[RSS 失败] ${feed.name}: ${err.message}`);
    }
  }
  return items;
}

function filterLastWeek(items, start) {
  return items.filter((item) => item.pubDate && item.pubDate >= start);
}

function sortByDate(items) {
  return [...items].sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));
}

/** 按链接去重，保留同链接中第一条（已按时间排序则保留最新） */
function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((item) => {
    const url = (item.link || '').trim().toLowerCase();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

/** 按标题简单去重：归一化后完全相同的只保留一条 */
function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const t = (item.title || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

/**
 * 从合并去重后的列表中选出 TOP_N 条最有影响力/代表性的新闻。
 * 评分：信源权重 + 时间越新越高 + 标题/摘要长度（略增）。
 */
function selectTopInfluential(items, n = TOP_N) {
  if (items.length <= n) return items;
  const now = Date.now();
  const scored = items.map((item, index) => {
    const sourceScore = SOURCE_WEIGHT[item.source] ?? 3;
    const ageMs = item.pubDate ? now - item.pubDate.getTime() : 0;
    const recencyScore = Math.max(0, 2 - (ageMs / (MS_PER_DAY * 2))); // 2 天内加分
    const lengthBonus = Math.min(1, ((item.title || '').length + (item.snippet || '').length) / 200);
    const score = sourceScore + recencyScore + lengthBonus * 0.5;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, n).map((x) => x.item);
  return top;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** 百度翻译 API：英→中，需配置 .env 中 BAIDU_TRANSLATE_APPID、BAIDU_TRANSLATE_KEY（密钥为「应用」的密钥，非仅 API Key） */
function baiduTranslate(text) {
  return new Promise((resolve, reject) => {
    const appid = (process.env.BAIDU_TRANSLATE_APPID || '').trim();
    const key = (process.env.BAIDU_TRANSLATE_KEY || '').trim();
    if (!appid || !key) {
      resolve(text);
      return;
    }
    const q = String(text).trim().slice(0, 2000);
    if (!q) {
      resolve(text);
      return;
    }
    const salt = Math.floor(Math.random() * 100000);
    // 签名：appid + q(UTF-8) + salt + 密钥，MD5 小写十六进制；q 签名时用原文，不 URL 编码
    const signStr = appid + q + salt + key;
    const sign = crypto.createHash('md5').update(Buffer.from(signStr, 'utf8')).digest('hex').toLowerCase();
    const body = new URLSearchParams({
      q,
      from: 'en',
      to: 'zh',
      appid,
      salt: String(salt),
      sign,
    }).toString();

    const hostname = (process.env.BAIDU_TRANSLATE_HOST || 'fanyi-api.baidu.com').trim();
    const req = https.request(
      {
        hostname: hostname || 'fanyi-api.baidu.com',
        path: '/api/trans/vip/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j.trans_result && j.trans_result[0]) {
              resolve(j.trans_result[0].dst);
            } else if (j.error_code) {
              if (!baiduTranslate._loggedError) {
                baiduTranslate._loggedError = true;
                console.error('[百度翻译]', j.error_code, j.error_msg || '');
              }
              resolve(q);
            } else {
              resolve(q);
            }
          } catch (e) {
            resolve(q);
          }
        });
      }
    );
    req.on('error', (err) => {
      if (!baiduTranslate._loggedError) {
        baiduTranslate._loggedError = true;
        console.error('[百度翻译] 请求失败:', err.message);
      }
      resolve(q);
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(q);
    });
    req.write(body);
    req.end();
  });
}

async function translateToChinese(text) {
  if (!text || !text.trim()) return text;
  const trimmed = String(text).trim().slice(0, 500);
  try {
    const out = await baiduTranslate(trimmed);
    return out || trimmed;
  } catch (err) {
    return trimmed;
  }
}

async function translateItems(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const [titleZh, snippetZh] = await Promise.all([
      translateToChinese(item.title),
      translateToChinese(item.snippet || ''),
    ]);
    out.push({
      ...item,
      title: titleZh,
      snippet: snippetZh,
    });
    await delay(220);
  }
  return out;
}

function buildHtml(items, startDate, endDate, reportDate) {
  const dateStr = (d) => (d ? formatDate(d) : '');
  const rows = items.map(
    (item) =>
      `    <li><a href="${item.link || '#'}">${escapeHtml(item.title)}</a> — ${escapeHtml(item.snippet || '')}<span class="source">${escapeHtml(item.source)} · ${dateStr(item.pubDate)}</span></li>`
  );
  const listHtml = rows.join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>科技领域一周热点报告 ${formatDate(reportDate)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 1.5rem; line-height: 1.6; color: #333; }
    h1 { font-size: 1.75rem; border-bottom: 2px solid #2563eb; padding-bottom: 0.5rem; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
    ul { padding-left: 1.25rem; }
    li { margin-bottom: 0.75rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .source { font-size: 0.85rem; color: #64748b; }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem; color: #64748b; }
  </style>
</head>
<body>
  <h1>科技领域一周热点报告</h1>
  <p class="meta">时间范围：${formatDate(startDate)} 至 ${formatDate(endDate)} · 生成时间：${formatDate(reportDate)} · 从过去一周新闻中合并去重后选取 ${items.length} 条最具影响力/代表性</p>
  <ul>
${listHtml}
  </ul>
  <footer>本报告由 weekly-report 定时任务生成，数据来自 RSS：TechCrunch、The Verge、Ars Technica、Wired、MIT Technology Review；合并去重后仅展示 ${items.length} 条最具影响力或代表性的科技新闻。</footer>
</body>
</html>`;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function run() {
  const sendEmail = process.argv.includes('--send');
  const { start, end } = dateRange();
  const reportDate = new Date();
  const parser = new Parser({ timeout: 15000 });

  console.log('正在抓取 RSS...');
  const allItems = await fetchAllFeeds(parser);
  const filtered = filterLastWeek(allItems, start);
  const sorted = sortByDate(filtered);
  const merged = dedupeByTitle(dedupeByLink(sorted));
  const topItems = selectTopInfluential(merged, TOP_N);
  console.log(`过去 7 天共 ${sorted.length} 条，合并去重后 ${merged.length} 条，选取 ${TOP_N} 条最具影响力/代表性。`);

  const appid = (process.env.BAIDU_TRANSLATE_APPID || '').trim();
  const key = (process.env.BAIDU_TRANSLATE_KEY || '').trim();
  if (baiduTranslate._loggedError) delete baiduTranslate._loggedError;
  let itemsForReport = topItems;
  if (appid && key) {
    console.log('正在使用百度翻译为中文...');
    try {
      itemsForReport = await translateItems(topItems);
    } catch (err) {
      console.warn('[翻译失败] 继续使用原文生成报告:', err.message);
      itemsForReport = topItems;
    }
  } else {
    console.log('未配置百度翻译，保留原文。');
  }
  const html = buildHtml(itemsForReport, start, end, reportDate);
  const yearMonth = formatDate(reportDate).slice(0, 7);
  const outDir = path.join(REPORTS_ROOT, yearMonth);
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `tech-weekly-report-${formatDate(reportDate)}.html`;
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`已保存: ${filepath}`);

  if (sendEmail) {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
    const to = process.env.REPORT_EMAIL_TO;
    const host = process.env.SMTP_HOST;
    const portNum = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!to || !host || !user || !pass) {
      console.error('发送邮件需要配置 .env：REPORT_EMAIL_TO, SMTP_HOST, SMTP_USER, SMTP_PASS');
      process.exit(1);
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: portNum === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
    });

    await transporter.sendMail({
      from: from,
      to: to,
      subject: `科技领域一周热点报告 ${formatDate(reportDate)}`,
      html: html,
      attachments: [{ filename, content: html }],
    });
    console.log(`已发送邮件至: ${to}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
