#!/usr/bin/env bash
# 移除「科技周报」定时任务
# 用法（Git Bash）：./scripts/uninstall-scheduled-tasks.sh

schtasks //delete //tn "科技周报-周一早" //f 2>/dev/null || true
echo "已删除: 科技周报-周一早"
schtasks //delete //tn "科技周报-周五下午" //f 2>/dev/null || true
echo "已删除: 科技周报-周五下午"
echo "完成。"
