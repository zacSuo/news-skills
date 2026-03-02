---
name: tech-weekly-report
description: Scans authoritative media for embodied AI, AI, LLM, smart hardware and related tech from the past week and generates a linked HTML report. Excludes politics, sports and other non-tech topics. Use when the user asks for 具身智能, AI 周报, 大模型, 智能硬件, or 一周科技要闻 with links.
---

# 具身智能与 AI 科技周报

生成一份**过去一周**内、**具身智能、AI、大模型、智能硬件等科技领域**的热点事件报告，输出为**带链接的 HTML 网页**。**仅关注上述科技方向，不包含政治、体育等人文领域**。报告需基于国内外权威媒体与社交平台的信息。

## 工作流程

1. **确定时间范围**：过去 7 天（从当前日期往前推）。
2. **收集热点**：通过 Web 搜索、已知权威源（见 [sources.md](sources.md)）获取本周科技要闻与热点。
3. **筛选与归类**：每条保留标题、摘要、来源、可用的原文链接；按主题或时间分组。
4. **生成报告**：使用 [report-template.html](report-template.html) 的结构输出完整 HTML 文件，确保每条新闻都有可点击链接（无链接时标注「链接待补充」）。

## 信息收集要点

- **国际媒体**：TechCrunch、The Verge、Reuters Technology、Wired、Ars Technica、MIT Technology Review 等。
- **国内媒体**：财新科技、36氪、虎嗅、机器之心、雷锋网、新浪科技、网易科技等。
- **社交/社区**：Hacker News、Twitter/X 科技话题、知乎热榜（科技类）、微博科技热搜等。
- **仅收录方向**：具身智能、AI/大模型、智能硬件、机器人、芯片与算力、自动驾驶、机器学习、计算机视觉等；**排除**政治、体育、娱乐等人文领域。

使用 **Web 搜索** 查询如「过去一周 具身智能 AI」「embodied AI news」「LLM robotics this week」等，并优先采用权威来源的标题与链接；遇到明显政治、体育类条目不纳入报告。

## 输出要求

- 文件名：`tech-weekly-report-YYYY-MM-DD.html`（日期为报告生成日）。
- 每条热点包含：**标题**（可点击链接）、**一句话摘要**、**来源**、**日期**（若可知）。
- 页面需包含：报告标题、时间范围说明、目录（可选）、分节列表、页脚（生成时间与说明）。
- HTML 需为完整可独立打开的页面（含 `<!DOCTYPE html>`、`<meta charset="utf-8">`、基础样式）。

## 无链接时的处理

若某条仅能获取标题与摘要而无法获得可验证链接，仍可列入报告，链接处写「链接待补充」或指向来源首页，并在页脚注明「部分条目链接需后续补全」。

## 参考文件

- 权威来源与搜索建议：[sources.md](sources.md)
- HTML 报告结构模板：[report-template.html](report-template.html)
