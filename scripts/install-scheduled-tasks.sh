#!/usr/bin/env bash
# 一键注册「科技周报」定时任务：每周一 09:00、每周五 17:00 自动执行
# 用法（Git Bash / MINGW64）：在项目根目录或 scripts 目录下执行
#   ./scripts/install-scheduled-tasks.sh
# 或：cd scripts && ./install-scheduled-tasks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Git Bash 路径转 Windows 路径（如 /d/code/news-skills -> D:\code\news-skills）
to_win_path() {
  local u
  u="$1"
  if command -v cygpath &>/dev/null; then
    cygpath -w "$u"
  else
    # /d/... -> D:\...
    if [[ "$u" =~ ^/([a-zA-Z])/(.*) ]]; then
      local drive="${BASH_REMATCH[1]}"
      drive=$(echo "$drive" | tr 'a-z' 'A-Z')
      echo "${drive}:\\${BASH_REMATCH[2]//\//\\}"
    else
      echo "$u"
    fi
  fi
}

PROJECT_WIN="$(to_win_path "$PROJECT_ROOT")"
SCRIPT_WIN="$(to_win_path "$PROJECT_ROOT/scripts/weekly-report.js")"

# 查找 node.exe（Git Bash 下 which node 或常见路径）
NODE_PATH=""
if command -v node &>/dev/null; then
  NODE_PATH="$(command -v node)"
  # 若 which 返回 /c/Program Files/nodejs/node，转为 Windows 路径
  if [[ "$NODE_PATH" == /?* ]]; then
    NODE_PATH="$(to_win_path "$NODE_PATH")"
  fi
fi
if [[ -z "$NODE_PATH" ]]; then
  for cand in "C:/Program Files/nodejs/node.exe" "C:/Program Files (x86)/nodejs/node.exe"; do
    if [[ -f "$cand" ]]; then
      NODE_PATH="$cand"
      break
    fi
  done
fi
if [[ -z "$NODE_PATH" ]]; then
  echo "未找到 node.exe，请先安装 Node.js 或将 node 加入 PATH。"
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/scripts/weekly-report.js" ]]; then
  echo "未找到脚本: $PROJECT_ROOT/scripts/weekly-report.js"
  exit 1
fi

# schtasks 需要引号包裹含空格的路径
TASK_RUN="\"$NODE_PATH\" \"$SCRIPT_WIN\" --send"
echo "项目目录: $PROJECT_WIN"
echo "Node:      $NODE_PATH"
echo "命令:      $TASK_RUN"
echo ""

schtasks //create //tn "科技周报-周一早" //tr "$TASK_RUN" //sc weekly //d MON //st 09:00 //ru "$USERNAME" //f
echo "已创建任务: 科技周报-周一早 (每周一 09:00)"

schtasks //create //tn "科技周报-周五下午" //tr "$TASK_RUN" //sc weekly //d FRI //st 17:00 //ru "$USERNAME" //f
echo "已创建任务: 科技周报-周五下午 (每周五 17:00)"

echo ""
echo "定时任务已就绪。只要电脑在周一 09:00 或周五 17:00 处于开机状态，将自动生成报告并发送邮件。"
echo "卸载: ./scripts/uninstall-scheduled-tasks.sh"
