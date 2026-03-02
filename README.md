# 科技热点周报系统

自动抓取过去一周国内外科技媒体 RSS，**仅保留具身智能、AI、大模型、智能硬件等科技领域**（排除政治、体育等人文领域），合并去重后选取 10 条最具影响力/代表性的新闻，生成带链接的 HTML 报告并支持邮件发送；可配置为**每周一上午**和**周五下午**自动执行，换电脑后按本文档即可快速部署。

---

## 一、系统架构

### 1.1 功能概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        科技热点周报系统                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ① 抓取 RSS（TechCrunch、The Verge、Ars Technica、Wired、MIT TR）         │
│  ② 过滤过去 7 天 → 按链接/标题去重 → 主题过滤（具身智能/AI/大模型/智能硬件，排除政治体育）→ 取 Top 10 │
│  ③ 可选：百度翻译 API 将标题/摘要译为中文（失败则保留原文，不中断任务）     │
│  ④ 生成 HTML 报告 → 按月份存入 reports/YYYY-MM/                          │
│  ⑤ 可选：通过 SMTP 发送邮件（正文 + HTML 附件）                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
news-skills/
├── README.md                 # 本说明（架构 + 使用 + 部署）
├── package.json              # 依赖与 npm 脚本
├── .env.example              # 配置示例（复制为 .env 后填写）
├── .env                      # 实际配置（勿提交，含邮箱/翻译密钥）
├── .gitignore
│
├── scripts/
│   ├── weekly-report.js      # 核心：抓 RSS → 去重 → Top10 → 翻译 → 生成报告 → 发邮件
│   ├── test-email.js         # 测试 SMTP 发信
│   ├── test-translate.js     # 测试百度翻译 API
│   ├── install-scheduled-tasks.sh   # 一键注册周一早/周五下午定时任务（Git Bash）
│   ├── install-scheduled-tasks.ps1  # 同上（PowerShell）
│   ├── uninstall-scheduled-tasks.sh # 移除定时任务
│   ├── run-weekly-report-and-send.bat # 供任务计划程序调用的批处理
│   ├── SCHEDULE.md           # 定时任务详细说明
│   └── BAIDU-TRANSLATE-SETUP.md  # 百度翻译 52003 排查
│
├── reports/                  # 报告按月份存储（自动创建）
│   └── YYYY-MM/
│       └── tech-weekly-report-YYYY-MM-DD.html
│
└── .cursor/skills/tech-weekly-report/   # Cursor 技能：手动生成「一周科技热点」报告
    ├── SKILL.md
    ├── sources.md
    └── report-template.html
```

### 1.3 数据流

| 步骤 | 输入 | 输出 |
|------|------|------|
| 抓取 | 5 个 RSS 源 | 过去 7 天条目列表 |
| 去重 | 上述列表 | 按链接、标题去重后的列表 |
| 选取 | 去重列表 | Top 10（信源权重 + 时间 + 内容长度） |
| 翻译 | Top 10 原文 | 中文标题/摘要（可选，失败则保留原文） |
| 生成 | 最终条目 | `reports/YYYY-MM/tech-weekly-report-YYYY-MM-DD.html` |
| 发信 | HTML 报告 | 邮件（收件人见 .env） |

### 1.4 定时任务

- **科技周报-周一早**：每周一 09:00 执行「生成报告 + 发邮件」
- **科技周报-周五下午**：每周五 17:00 执行「生成报告 + 发邮件」
- 执行条件：电脑在该时间点处于开机状态；可在任务计划程序中勾选「错过计划后尽快运行」

---

## 二、环境要求

- **Node.js**：18+（建议 LTS），并加入 PATH
- **npm**：随 Node 安装
- **操作系统**：Windows（定时任务依赖任务计划程序；脚本本身可在其他系统运行，但需自行配置 cron 等）

---

## 三、快速部署（换电脑后）

### 3.1 克隆与安装

```bash
# 克隆或拷贝项目到新电脑
cd /d/code/news-skills   # 或你的项目路径

# 安装依赖
npm install
```

### 3.2 配置 .env

```bash
# 复制示例并编辑（勿提交 .env）
cp .env.example .env
# 或用 Windows：copy .env.example .env
```

在 `.env` 中至少配置：

| 变量 | 说明 | 必填 |
|------|------|------|
| REPORT_EMAIL_TO | 收件人邮箱，多人用逗号/分号分隔，如 `a@x.com, b@x.com` | 发邮件时必填 |
| SMTP_HOST | 发信服务器（如 smtp.qiye.163.com） | 发邮件时必填 |
| SMTP_PORT | 端口（465 或 587） | 发邮件时必填 |
| SMTP_USER | 发件邮箱 | 发邮件时必填 |
| SMTP_PASS | 发件密码或授权码 | 发邮件时必填 |
| SMTP_FROM | 发件人显示名（可选） | 可选 |
| BAIDU_TRANSLATE_APPID | 百度通用翻译 应用 ID | 翻译时必填 |
| BAIDU_TRANSLATE_KEY | 百度通用翻译 密钥 | 翻译时必填 |

企业邮箱若 52003/ENOTFOUND，见 [scripts/SCHEDULE.md](scripts/SCHEDULE.md) 和 [scripts/BAIDU-TRANSLATE-SETUP.md](scripts/BAIDU-TRANSLATE-SETUP.md)。

### 3.3 验证

```bash
# 测试发信
npm run report:test-email

# 测试翻译（若配置了百度）
npm run report:test-translate

# 手动跑一次「生成 + 发邮件」
npm run report:send
```

确认能收到邮件且报告在 `reports/当前年-月/` 下生成后，再注册定时任务。

### 3.4 注册定时任务（周一早 + 周五下午）

**Git Bash：**

```bash
./scripts/install-scheduled-tasks.sh
```

**PowerShell：**

```powershell
.\scripts\install-scheduled-tasks.ps1
```

验证：打开「任务计划程序」（`Win+R` → `taskschd.msc`），找到「科技周报-周一早」→ 右键「运行」，检查是否生成报告并收到邮件。

---

## 四、使用说明

### 4.1 常用命令

| 命令 | 说明 |
|------|------|
| `npm run report` | 仅生成报告（不发邮件），保存到 `reports/YYYY-MM/` |
| `npm run report:send` | 生成报告并发送邮件 |
| `npm run report:test-email` | 测试 SMTP 配置，发一封测试邮件 |
| `npm run report:test-translate` | 测试百度翻译 API，打印完整响应 |
| `npm run skill` | 运行 skill-creator（与周报脚本独立） |

### 4.2 报告存储

- 路径：`reports/YYYY-MM/tech-weekly-report-YYYY-MM-DD.html`
- 按月份分目录，便于归档与查找。

### 4.3 翻译与发信行为

- **翻译失败**：不中断任务，使用原文生成报告并照常发邮件。
- **未配置翻译**：报告为英文；配置 `BAIDU_TRANSLATE_APPID` + `BAIDU_TRANSLATE_KEY` 后自动译为中文。

### 4.4 Cursor 技能（可选）

项目内包含 Cursor 技能 `.cursor/skills/tech-weekly-report/`，可在对话中通过「生成过去一周科技热点报告」等描述，由 Agent 按技能生成带链接的网页报告（可与本脚本生成的报告并存使用）。

---

## 五、相关文档

- [scripts/SCHEDULE.md](scripts/SCHEDULE.md) — 定时任务详细配置、手动创建任务、使用 .bat
- [scripts/BAIDU-TRANSLATE-SETUP.md](scripts/BAIDU-TRANSLATE-SETUP.md) — 百度翻译 52003 未授权排查与开通步骤
- [.env.example](.env.example) — 配置项说明与示例

---

## 六、换电脑部署检查清单

- [ ] 安装 Node.js 18+ 并加入 PATH
- [ ] 进入项目目录执行 `npm install`
- [ ] 复制 `.env.example` 为 `.env`，填写邮箱与（可选）百度翻译
- [ ] 执行 `npm run report:test-email` 确认能收信
- [ ] 若使用翻译：执行 `npm run report:test-translate` 确认通过
- [ ] 执行 `npm run report:send` 确认报告生成且邮件正常
- [ ] 执行 `./scripts/install-scheduled-tasks.sh`（或 .ps1）注册周一早、周五下午定时任务
- [ ] 在任务计划程序中对该任务点「运行」做一次验证

完成以上步骤即可在新电脑上复现「周一上午 + 周五下午自动生成并发送科技周报」的完整流程。
