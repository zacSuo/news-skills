# 一键注册「科技周报」定时任务：每周一 09:00、每周五 17:00 自动生成报告并发送邮件
# 只要电脑开机，到点会自动执行；若当时未开机，可在任务计划程序中为该任务勾选「错过计划后尽快运行」
# 用法：在项目根目录或 scripts 目录下，以管理员身份运行 PowerShell 执行：
#   .\scripts\install-scheduled-tasks.ps1
# 或：cd scripts; .\install-scheduled-tasks.ps1

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
  $candidates = @(
    "C:\Program Files\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:APPDATA\nvm\current\node.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $nodePath = $c; break }
  }
}
if (-not $nodePath) {
  Write-Host "未找到 node.exe，请先安装 Node.js 或将 node 加入 PATH。" -ForegroundColor Red
  exit 1
}

$scriptPath = Join-Path $projectRoot "scripts\weekly-report.js"
if (-not (Test-Path $scriptPath)) {
  Write-Host "未找到脚本: $scriptPath" -ForegroundColor Red
  exit 1
}

$taskRun = "`"$nodePath`" `"$scriptPath`" --send"
Write-Host "项目目录: $projectRoot"
Write-Host "Node:      $nodePath"
Write-Host "命令:     $taskRun"
Write-Host ""

try {
  schtasks /create /tn "科技周报-周一早" /tr $taskRun /sc weekly /d MON /st 09:00 /ru $env:USERNAME /f
  Write-Host "已创建任务: 科技周报-周一早 (每周一 09:00)" -ForegroundColor Green
} catch {
  Write-Host "创建周一任务失败: $_" -ForegroundColor Red
  exit 1
}

try {
  schtasks /create /tn "科技周报-周五下午" /tr $taskRun /sc weekly /d FRI /st 17:00 /ru $env:USERNAME /f
  Write-Host "已创建任务: 科技周报-周五下午 (每周五 17:00)" -ForegroundColor Green
} catch {
  Write-Host "创建周五任务失败: $_" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "定时任务已就绪。只要电脑在周一 09:00 或周五 17:00 处于开机状态，将自动生成报告并发送邮件。" -ForegroundColor Cyan
Write-Host "若希望「错过计划后尽快运行」：Win+R → taskschd.msc → 找到上述任务 → 属性 → 勾选「如果错过计划开始时间，则尽快运行任务」。" -ForegroundColor Gray
Write-Host "卸载任务：schtasks /delete /tn \"科技周报-周一早\" /f ; schtasks /delete /tn \"科技周报-周五下午\" /f" -ForegroundColor Gray
