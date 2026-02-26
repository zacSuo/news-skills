# 定时发送「科技领域一周热点报告」

脚本会在**每周一早上**和**周五下午**自动生成过去一周的科技热点报告并发送邮件。需配合 **Windows 任务计划程序** 使用。

## 1. 安装依赖

在项目根目录执行：

```bash
npm install
```

## 2. 配置邮件（.env）

项目根目录下已有 `.env` 时可直接使用；否则复制示例：`copy .env.example .env`，再编辑。

- **REPORT_EMAIL_TO**：收件人邮箱（多个用逗号分隔）
- **SMTP_HOST / SMTP_PORT**：企业邮箱常用 `smtp.你的域名`，端口 587（STARTTLS）或 465（SSL）；以企业邮箱后台说明为准
- **SMTP_USER / SMTP_PASS**：发件邮箱和登录密码
- **SMTP_FROM**（可选）：发件人显示名，如 `科技周报 <xxx@toro-tech.com>`

若 587 无法发信，可将 `.env` 中 `SMTP_PORT=587` 改为 `SMTP_PORT=465` 后重新运行 `npm run report:test-email` 测试。

## 3. 测试

- 仅生成报告（不发邮件）：
  ```bash
  npm run report
  ```
- 生成报告并发送邮件：
  ```bash
  npm run report:send
  ```

确认能收到邮件后再配置定时任务。

## 4. 设置 Windows 定时任务（周一早 + 周五下午）

### 方式一：一键注册（推荐）

**在 Git Bash / MINGW64 下**（你当前环境）执行：

```bash
cd /d/code/news-skills
./scripts/install-scheduled-tasks.sh
```

**或在 PowerShell 下**执行：

```powershell
cd D:\code\news-skills
.\scripts\install-scheduled-tasks.ps1
```

脚本会自动检测项目路径和 Node 路径，创建两个计划任务：

- **科技周报-周一早**：每周一 09:00 自动生成报告并发送邮件  
- **科技周报-周五下午**：每周五 17:00 自动生成报告并发送邮件  

只要电脑在对应时间处于开机状态，任务会自动执行。若当时未开机，可打开 **任务计划程序**（`Win+R` → `taskschd.msc`）→ 找到上述任务 → 右键「属性」→ 勾选「如果错过计划开始时间，则尽快运行任务」。

卸载定时任务：

```powershell
.\scripts\uninstall-scheduled-tasks.ps1
```

### 方式二：图形界面

1. 打开 **任务计划程序**（`Win + R` → 输入 `taskschd.msc` → 回车）。
2. 右侧点击 **「创建基本任务」**。
3. **名称**：`科技周报-周一早`；**描述**：可选；下一步。
4. **触发器**：选择 **「每周」**；下一步。
5. **每周**：勾选 **星期一**；开始时间设为 **09:00**（或你想要的周一早上时间）；下一步。
6. **操作**：选择 **「启动程序」**；下一步。
7. **程序或脚本**：填 `node`（或 node 的完整路径，如 `C:\Program Files\nodejs\node.exe`）。
8. **添加参数**：填  
   `D:\code\news-skills\scripts\weekly-report.js --send`  
   （请把路径改成你本机的项目路径。）
9. **起始于**：填 `D:\code\news-skills`（项目根目录，同样改成你的路径）。
10. 下一步 → 完成。
11. 再创建一条任务 **「科技周报-周五下午」**：  
    触发器选 **每周**、勾选 **星期五**、时间设为 **17:00**（或你想要的周五下午时间）；  
    其余步骤同上（同一脚本、同一「起始于」路径）。

### 方式三：命令行（以管理员运行 CMD）

请把下面两处 `D:\code\news-skills` 改成你的项目实际路径，`C:\Program Files\nodejs\node.exe` 如已加入 PATH 可改为 `node`。

**周一 09:00：**

```bat
schtasks /create /tn "科技周报-周一早" /tr "\"C:\Program Files\nodejs\node.exe\" D:\code\news-skills\scripts\weekly-report.js --send" /sc weekly /d MON /st 09:00 /ru "%USERNAME%" /rp "" /f
```

**周五 17:00：**

```bat
schtasks /create /tn "科技周报-周五下午" /tr "\"C:\Program Files\nodejs\node.exe\" D:\code\news-skills\scripts\weekly-report.js --send" /sc weekly /d FRI /st 17:00 /ru "%USERNAME%" /rp "" /f
```

注意：用 `run-weekly-report-and-send.bat` 时，bat 会先切换到项目根目录再执行 `node scripts\weekly-report.js --send`，不依赖 npm 是否在 PATH 中。任务计划程序中请将 **起始于** 设为项目根目录 `D:\code\news-skills`。

### 使用 .bat 作为定时任务程序

1. 在任务计划程序中，**程序或脚本** 填：  
   `D:\code\news-skills\scripts\run-weekly-report-and-send.bat`
2. **起始于** 填：`D:\code\news-skills`
3. 这样无需在任务里写 node 路径，由 bat 在项目目录下执行 `npm run report:send`。

## 5. 报告来源说明

- 报告由 `scripts/weekly-report.js` 从以下 RSS 抓取过去 7 天条目并生成 HTML：
  - TechCrunch、The Verge、Ars Technica、Wired、MIT Technology Review
- 生成的文件名：`tech-weekly-report-YYYY-MM-DD.html`，保存在 `reports/YYYY-MM/` 目录下。
- 邮件正文为报告 HTML，并附带同内容 HTML 附件，便于存档。
