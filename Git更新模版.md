# Git 更新模版

本地改完代码后，对 Cursor 说「**帮我更新**」，助手会根据未提交的修改写好 commit 并给出可复制的一键上传命令。

---

## 通用命令块（复制用）

在项目根目录执行：

```bash
cd "/Users/irtg/Documents/交通银行/金融市场部/外汇期权计算器"

git status
git diff --stat

git add -A
git commit -m "此处替换为本次更新说明"
git push origin main
```

只提交部分文件时，把 `git add -A` 改成例如：`git add src/ models/`。

---

## Commit 说明约定

- **简短一句**：说清「做了什么」或「修了什么」。
- **可选前缀**：`fix:` 修复、`feat:` 新功能、`docs:` 文档、`chore:` 杂项。
- **示例**：
  - `fix: 修复期权定价中 normalCdf 负值导致 Delta 异常`
  - `feat: 增加组合期权定价入口`
  - `docs: 更新 models README`

---

## 触发语

下次只需说：

- 「帮我更新」
- 「写更新并上传」
- 「提交并推送到 GitHub」

助手会按本模版和当前未提交修改，写好 commit 并给出可复制命令。
