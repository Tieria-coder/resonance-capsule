# 情绪胶囊 - 微信小程序

> 情绪记录与分析工具

## 项目结构

```
emotion-capsule/
├── app.js                 # 小程序入口
├── app.json               # 小程序配置
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置
├── sitemap.json           # sitemap配置
├── pages/                 # 页面目录
│   ├── index/            # 首页（记录）
│   ├── calendar/         # 日历页
│   ├── report/           # 报告页
│   └── profile/          # 个人主页
├── utils/                 # 工具函数
│   ├── util.js           # 通用工具
│   └── db.js             # 数据库操作
├── styles/                # 样式目录
├── images/                # 图片目录
└── cloudfunctions/       # 云函数
    └── login/            # 登录云函数
```

## 功能模块

### MVP 版本
- ✅ 7种情绪快速记录
- ✅ 日历视图查看历史
- ✅ 连续打卡统计
- ✅ 周报数据展示
- ✅ 个人主页与成就
- ⏳ 情绪计划与提醒
- ⏳ AI问答功能

## 快速开始

### 1. 开通云开发

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 开通云开发（免费版即可）
4. 获取云环境ID

### 2. 配置项目

1. 打开 `project.config.json`
2. 修改 `appid` 为你的小程序AppID
3. 打开 `app.js`
4. 修改 `env` 为你的云环境ID

```javascript
// app.js
wx.cloud.init({
  env: 'your-env-id', // 替换为你的云环境ID
  traceUser: true,
})
```

### 3. 创建数据库集合

在微信开发者工具中：
1. 打开云开发控制台
2. 创建以下集合：
   - `users` - 用户信息
   - `emotion_records` - 情绪记录

### 4. 上传云函数

1. 在微信开发者工具中右键 `cloudfunctions/login`
2. 选择「上传并部署：云端安装依赖」

### 5. 运行项目

1. 用微信开发者工具打开项目
2. 点击编译运行

## 数据模型

### users 集合
```json
{
  "_id": "xxx",
  "openid": "用户openid",
  "created_at": "创建时间",
  "updated_at": "更新时间",
  "stats": {
    "streak": 5,
    "max_streak": 7,
    "total_records": 32
  }
}
```

### emotion_records 集合
```json
{
  "_id": "xxx",
  "user_id": "用户ID",
  "openid": "用户openid",
  "emotion": "happy",
  "emotion_score": 1,
  "text": "记录文字",
  "period": "afternoon",
  "period_label": "下午",
  "record_time": "记录时间",
  "source": "miniapp",
  "created_at": "创建时间"
}
```

## 技术栈

- **前端**：微信小程序原生开发
- **后端**：微信云开发
- **数据库**：MongoDB（云数据库）
- **图表**：Canvas 自定义绘制

## 注意事项

1. **AppID**：需要已认证的小程序AppID
2. **云环境**：确保云环境已正确配置
3. **权限**：云数据库需要设置正确的安全规则

## 安全规则建议

```json
{
  "read": "doc.openid == auth.openid",
  "write": "doc.openid == auth.openid"
}
```

## 后续开发

- [ ] 情绪计划模块
- [ ] 订阅消息推送
- [ ] AI问答功能
- [ ] 成就系统完善
- [ ] 周报分享图片
- [ ] 数据导出功能

## License

MIT