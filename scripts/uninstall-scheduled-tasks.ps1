# 移除「科技周报」定时任务
# 用法：PowerShell 中执行  .\scripts\uninstall-scheduled-tasks.ps1

$null = schtasks /delete /tn "科技周报-周一早" /f 2>&1
Write-Host "已删除: 科技周报-周一早" -ForegroundColor Green
$null = schtasks /delete /tn "科技周报-周五下午" /f 2>&1
Write-Host "已删除: 科技周报-周五下午" -ForegroundColor Green
Write-Host "完成。" -ForegroundColor Cyan
