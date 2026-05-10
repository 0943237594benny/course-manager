# 課程管理 App

消防／EMTP教官課程行程管理系統，連接 Notion 資料庫，支援手機 PWA 安裝。

## 功能
- 📅 查看／新增／編輯／刪除課程行程
- 📊 統計授課時數、各單位分佈
- 🔄 資料同步至 Notion 資料庫
- 📱 手機加入桌面，使用體驗如原生 App

## 顏色規則
| 標籤 | 顏色 | 身份 |
|------|------|------|
| 授課 | 🔴 紅色 | 教官 |
| 複訓 | 🔵 藍色 | 學員複訓 |
| 受訓 | 🟢 綠色 | 學員初訓 |
| 行政 | 🟡 黃色 | 會議/勤務 |

## 部署步驟

### 1. 上傳到 GitHub
- 前往 github.com，登入帳號
- 點擊右上角「+」→「New repository」
- 名稱填入：`course-manager`
- 選擇 Public，點擊「Create repository」
- 把這個資料夾所有檔案上傳

### 2. 部署到 Vercel
- 前往 vercel.com，用 GitHub 帳號登入
- 點擊「Add New Project」
- 選擇 `course-manager` 這個 repository
- 在「Environment Variables」新增：
  - Name: `NOTION_API_KEY`
  - Value: 你的 Notion API Key（secret_xxxxx）
- 點擊「Deploy」

### 3. 手機加入桌面（iOS）
- 用 Safari 開啟網址
- 點擊底部「分享」按鈕
- 選擇「加入主畫面」

### 4. 手機加入桌面（Android）
- 用 Chrome 開啟網址
- 點擊右上角選單
- 選擇「新增至主畫面」

## 檔案結構
```
course-manager/
├── index.html        # 主網頁
├── manifest.json     # PWA 設定
├── vercel.json       # Vercel 部署設定
├── README.md         # 說明文件
└── api/
    └── notion.js     # Notion API 代理
```
