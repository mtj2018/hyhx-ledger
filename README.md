# HYHX Ledger

纯静态 GitHub Pages 项目台账。页面已按业务入口拆分，数据仍使用原有 GitHub 私有数据仓与保存协议。

## 页面入口

| 页面 | 地址 |
| --- | --- |
| 项目总览 | `index.html` |
| 概算执行 | `investment.html` |
| 固定投资 | `fixed-assets.html` |
| 形象进度 | `progress.html` |
| 地市州汇总 | `regions.html` |
| 数据填报入口 | `report.html` |
| 填报情况 | `report/status.html` |
| 土石方日报 | `report/daily.html` |
| 产值周报 | `report/weekly.html` |
| 工程旬报 | `report/ten-day.html` |
| 工程月报 | `report/monthly.html` |
| 地市州月报 | `report/regions.html` |
| 晴雨表 | `report/weather.html` |

`report.html` 和旧首页的 `#investment`、`#progress` 等地址会跳转到新入口。

## 公共代码

- `shared/js/index-app.js`：首页共用的状态、计算和 GitHub 数据读写逻辑。
- `shared/js/report-app.js`：填报页共用的数据、月报、地市州和日报逻辑。
- `shared/js/ui.js`：公共导航、无障碍标签和滚动区域增强。
- `shared/css/ui.css`：公共视觉样式与响应式规则。
- `shared/js/gate.js`：首页查看门。

周报和旬报仍分别使用 `assets/wk.js`、`assets/xb.js`，地市州汇总使用 `assets/dz.js`。

## 本地预览

在仓库根目录执行：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:8765/`。

在 `127.0.0.1` / `localhost` 下运行时，首页和填报主程序会关闭云端写入；周报和旬报的保存也会被拦截，避免本地调试污染线上数据。

运行页面结构和资源引用检查：

```powershell
npm run check
```

## 部署

无需构建，直接把仓库根目录发布到 GitHub Pages。修改静态资源后同步更新页面 URL 中的 `?v=` 和 `ver.json` 的构建号。
