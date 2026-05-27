# Boss-Plus Public

通用 AI 招呼语生成 + 智能投递助手，Tampermonkey 油猴脚本，运行在 [BOSS 直聘](https://www.zhipin.com/) 网站。

## 功能

- **AI 招呼语生成** — 对接 OpenAI 兼容 API（DeepSeek、OpenAI、Ollama 等），根据岗位 JD 自动生成个性化招呼语
- **个人经验管理** — 在设置面板中导入个人经历（JSON 格式），AI 基于真实经验生成招呼
- **智能过滤** — 关键词白名单/黑名单、薪资筛选、公司屏蔽、AI 语义匹配（需搭配 [zhitu-ai](https://github.com/ANICIFIA/zhitu-ai) 服务）
- **自动投递** — 遍历岗位列表，自动点击沟通、粘贴招呼、发送

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [boss-plus-public.user.js](https://github.com/ANICIFIA/boss-plus-public/releases/latest/download/boss-plus-public.user.js) 安装脚本
3. 或从 [GreasyFork]() 安装（待上架）

## 配置

安装后打开 BOSS 直聘页面，点击右下角浮窗进入设置面板：

### 必填项
1. **API Key** — 填入大模型 API Key（支持 DeepSeek、OpenAI 等 OpenAI 兼容接口）
2. **个人核心优势总结** — 一句话描述核心竞争力，如"3年电商产品经验，主导XX项目流水千万"
3. **个人经验数据** — 粘贴 JSON 格式的个人经历数组，每项含：经验分类、公司、岗位、时间、项目介绍、权重

### 经验数据格式

```json
[
  {
    "经验分类": "工作经验",
    "主体名称": "公司名",
    "担任角色/岗位": "产品经理",
    "起止时间": "2024.01-至今",
    "项目介绍": "描述项目成果和量化数据...",
    "匹配权重": "10"
  }
]
```

## 开发

```bash
# 本地开发（需要 node server.js 在原始项目中运行）
# 构建发布版本
node build.js
```

## 许可

MIT License
