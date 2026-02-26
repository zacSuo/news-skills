#!/usr/bin/env node
/**
 * 测试百度翻译 API 是否可用，并打印完整响应便于排查。
 * 用法：npm run report:test-translate  或  node scripts/test-translate.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const appid = (process.env.BAIDU_TRANSLATE_APPID || '').trim();
const key = (process.env.BAIDU_TRANSLATE_KEY || '').trim();
const hostFromEnv = (process.env.BAIDU_TRANSLATE_HOST || '').trim();

if (!appid || !key) {
  console.error('请在 .env 中配置 BAIDU_TRANSLATE_APPID 和 BAIDU_TRANSLATE_KEY');
  process.exit(1);
}

const https = require('https');
const crypto = require('crypto');

const q = 'Hello world';
const salt = Math.floor(Math.random() * 100000);
const signStr = appid + q + salt + key;
const sign = crypto.createHash('md5').update(Buffer.from(signStr, 'utf8')).digest('hex').toLowerCase();
const body = new URLSearchParams({ q, from: 'en', to: 'zh', appid, salt: String(salt), sign }).toString();

function doRequest(hostname, cb) {
  const req = https.request(
    {
      hostname,
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
      res.on('end', () => cb(null, data));
    }
  );
  req.on('error', (err) => cb(err, null));
  req.setTimeout(10000, () => {
    req.destroy();
    cb(new Error('请求超时'), null);
  });
  req.write(body);
  req.end();
}

function show52003Help() {
  console.log('');
  console.log('【52003 未授权】请逐项确认：');
  console.log('  1. 已为该应用「开通通用翻译」：登录 https://fanyi-api.baidu.com/ → 管理控制台');
  console.log('     → 产品服务 / 翻译服务 → 找到「通用翻译」→ 点击「立即开通」或「开通」');
  console.log('     （仅个人中心有 APPID/密钥不够，必须对「通用翻译」产品点开通）');
  console.log('  2. APPID 与密钥来自「同一应用」且该应用已开通通用翻译');
  console.log('  3. 可尝试旧版接口：在 .env 增加一行  BAIDU_TRANSLATE_HOST=api.fanyi.baidu.com');
  console.log('     然后重新运行  npm run report:test-translate');
  console.log('');
}

function run(hostname) {
  console.log('请求百度翻译 API...');
  console.log('主机:', hostname);
  console.log('APPID:', appid);
  console.log('KEY:  ', key.length + ' 字符');
  console.log('');

  doRequest(hostname, (err, data) => {
    if (err) {
      console.error('请求失败:', err.message);
      if (!hostFromEnv && hostname === 'fanyi-api.baidu.com') {
        console.log('');
        console.log('可尝试旧版域名：在 .env 增加  BAIDU_TRANSLATE_HOST=api.fanyi.baidu.com');
      }
      process.exit(1);
    }
    try {
      const j = JSON.parse(data);
      console.log('响应:', JSON.stringify(j, null, 2));
      if (j.trans_result && j.trans_result[0]) {
        console.log('');
        console.log('翻译成功:', q, '->', j.trans_result[0].dst);
        return;
      }
      if (j.error_code === '52003' || (j.error_msg && j.error_msg.includes('UNAUTHORIZED'))) {
        show52003Help();
        if (!hostFromEnv && hostname === 'fanyi-api.baidu.com') {
          console.log('正在尝试旧版接口域名 api.fanyi.baidu.com ...');
          console.log('');
          run('api.fanyi.baidu.com');
          return;
        }
      } else if (j.error_code) {
        console.log('');
        console.log('错误码说明: https://fanyi-api.baidu.com/doc/21');
        console.log('常见: 52001=超时 52002=系统错误 52003=未授权 54001=签名错误 54003=访问频率限制');
      }
      process.exit(1);
    } catch (e) {
      console.error('解析响应失败:', e.message);
      console.error('原始:', data);
      process.exit(1);
    }
  });
}

run(hostFromEnv || 'fanyi-api.baidu.com');
