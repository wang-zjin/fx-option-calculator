# 用 GitHub 部署 — 传上去就能用

代码推到 GitHub 后，再**开启 GitHub Pages**，别人就能通过网址访问你的外汇期权计算器。

---

## 一、先确认：传上 GitHub 不等于“能用”

- **只把代码 push 到 GitHub**：代码在仓库里，别人可以看源码，但**没有可访问的网站**。
- **开启 GitHub Pages 并部署**：GitHub 会帮你把打包好的网页发布出去，得到一个 **`https://你的用户名.github.io/仓库名/`** 的地址，点开就能用。

所以：**传上去 + 开启 Pages = 就能用**。

---

## 二、三步做完就能用

### 第 1 步：把项目推到 GitHub

1. 在 GitHub 上**新建一个仓库**（Repository），名字随意，如 `fx-option-calculator`（不要勾选 “Add a README” 若你本地已有完整项目）。
2. 在本机**项目根目录**打开终端，执行（把 `你的用户名` 和 `仓库名` 换成你的）：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

若项目已经是 git 仓库、已经连过 GitHub，只需：

```bash
git add .
git commit -m "update"
git push
```

### 第 2 步：开启 GitHub Pages（用 GitHub Actions）

1. 打开你的 **GitHub 仓库** → 点 **Settings（设置）**。
2. 左侧找到 **Pages**。
3. 在 **Build and deployment** 里：
   - **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）。
4. 保存后不用再点别的，等第 3 步自动跑完即可。

### 第 3 步：自动部署（已配好）

项目里已经加好了 **GitHub Actions 工作流**（`.github/workflows/deploy-pages.yml`）：

- 每次你 **push 到 main**，会自动执行：安装依赖 → `npm run build` → 部署到 GitHub Pages。
- 你只需要正常 **push 代码**，几分钟后网站就会更新。

第一次 push 后，等约 1～2 分钟，然后：

1. 再进仓库 **Settings → Pages**。
2. 页面上方会出现绿色提示：**Your site is live at `https://你的用户名.github.io/仓库名/`**。
3. 用浏览器打开这个地址，就能使用外汇期权计算器。

---

## 三、小结

| 你做的事 | 结果 |
|----------|------|
| 只 push 代码 | 代码在 GitHub，没有可访问的网站 |
| push 代码 + 在 Settings 里把 Pages 源选成 **GitHub Actions** | 自动构建并部署，得到 `https://用户名.github.io/仓库名/`，**传上去就能用** |

**记住**：  
1. 代码 push 到 GitHub。  
2. 仓库 **Settings → Pages → Source 选 GitHub Actions**。  
3. 等自动部署完成，访问提示里的网址即可。

---

## 四、若仓库名或用户名改了

网站地址永远是：**`https://<你的 GitHub 用户名>.github.io/<仓库名>/`**  
例如：`https://zhangsan.github.io/fx-option-calculator/`  
项目里的 Vite 已按“部署在子路径”配置好，无需再改。
