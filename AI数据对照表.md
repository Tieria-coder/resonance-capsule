# AI 功能 × 可用数据对照表

> 说明：✅ = 已传入  ⚠️ = 未传入但可补充  ❌ = 未采集

---

## 一、AI 功能清单

| 功能 | action | 说明 |
|------|---------|------|
| 情绪分析 | `analyze` | 用户输入文字，AI判断情绪 |
| AI陪伴 | `companion` | 记录后AI给出温暖回应 |
| AI日记 | `diary` | 用户写自由文字，AI分析情绪并回应 |
| 情绪匹配检查 | `checkEmotionMatch` | 检查用户文字和选中情绪是否匹配 |
| 情绪诗语 | `poetry` | 每日生成一句诗意的话 |
| AI洞察报告 | `report` | 基于周期数据生成文字报告 |
| AI建议 | `advice` | **待新增**：基于报告给出行动建议 |
| 继续聊聊 | `companion` | 从报告/建议页进入聊天 |

---

## 二、数据字段清单

### 2.1 情绪记录（emotion_records）

| # | 字段 | 类型 | 说明 | 采集方式 |
|---|------|------|------|---------|
| 1 | emotion | string | 情绪key | 用户选择 |
| 2 | emotions[] | array | 情绪数组 | 用户选择 |
| 3 | text | string | 用户文字记录 | 用户输入 |
| 4 | period | string | 时间段（morning/afternoon/evening/night） | 自动识别 |
| 5 | record_time | datetime | 记录时间 | 自动记录 |
| 6 | poetry | string | AI生成的诗语 | AI写入 |
| 7 | ai_response | string | AI陪伴回复 | AI写入 |
| 8 | checkin_status | string | 打卡状态 | 用户操作 |
| 9 | word_count | int | **待新增**：文字字数 | 自动计算 |
| 10 | has_voice | bool | **待新增**：是否语音记录 | 自动记录 |
| 11 | voice_duration | int | **待新增**：语音时长（秒） | 自动记录 |
| 12 | emotion_score | float | **待新增**：情绪分值（-2~2） | 自动计算 |

### 2.2 用户画像（users）

| # | 字段 | 类型 | 说明 | 采集方式 |
|---|------|------|------|---------|
| 1 | stats.streak | int | 当前连续天数 | 自动计算 |
| 2 | stats.max_streak | int | 历史最长连续 | 自动计算 |
| 3 | stats.total_records | int | 总记录数 | 自动计算 |
| 4 | conversationHistory[] | array | AI对话历史（最近5条） | 自动记录 |
| 5 | chat_rounds{} | object | 每条记录的聊天轮次 | 自动记录 |
| 6 | created_at | datetime | 注册时间 | 自动记录 |
| 7 | updated_at | datetime | 最后更新时间 | 自动记录 |
| 8 | avg_score | float | **待新增**：平均情绪分 | 实时计算 |
| 9 | max_score | float | **待新增**：历史最高分 | 实时计算 |
| 10 | min_score | float | **待新增**：历史最低分 | 实时计算 |
| 11 | volatility | float | **待新增**：情绪波动指数 | 实时计算 |
| 12 | top_emotion | string | 最常见情绪大类 | 实时计算 |
| 13 | top_period | string | 最活跃时间段 | 实时计算 |
| 14 | most_anxious_period | string | 最易焦虑时段 | 实时计算 |
| 15 | most_happy_period | string | 最开心时段 | 实时计算 |
| 16 | worst_weekday | string | 最难熬的星期几 | 实时计算 |
| 17 | best_weekday | string | **待新增**：最愉快的星期几 | 实时计算 |
| 18 | trend | string | 情绪趋势（改善/稳定/下滑） | 实时计算 |
| 19 | recent7_avg | float | 近7天平均分 | 实时计算 |
| 20 | previous7_avg | float | 前7~14天平均分 | 实时计算 |
| 21 | consecutive_anxious_days | int | **待新增**：连续焦虑天数 | 实时计算 |
| 22 | avg_word_count | float | **待新增**：平均文字长度 | 实时计算 |
| 23 | last_emotion | string | **待新增**：上一条情绪 | 实时计算 |
| 24 | last_record_time | datetime | **待新增**：上次记录时间 | 实时计算 |
| 25 | weekly_emotion_pattern | object | **待新增**：每周各天情绪分布 | 实时计算 |
| 26 | hourly_pattern | object | **待新增**：每小时记录频率 | 实时计算 |
| 27 | frequent_words[] | array | **待新增**：高频情绪词 | 分析text字段 |
| 28 | last_poetry | string | **待新增**：最近一条诗语 | 实时读取 |
| 29 | last_ai_response | string | **待新增**：最近AI回复 | 实时读取 |
| 30 | personality_tags[] | array | **待新增**：性格标签（乐观/内敛等） | AI推断写入 |
| 31 | first_record_date | datetime | **待新增**：第一条记录时间 | 实时读取 |
| 32 | record_days_count | int | **待新增**：有记录的天数 | 实时计算 |
| 33 | emotion_distribution{} | object | **待新增**：各情绪占比 | 实时计算 |
| 34 | negative_record_ratio | float | **待新增**：负面情绪占比 | 实时计算 |

### 2.3 情绪计划（emotion_plans）

| # | 字段 | 类型 | 说明 |
|---|------|------|------|
| 1 | plan_name | string | 计划名称 |
| 2 | theme | string | 主题 |
| 3 | cycle_days | int | 周期天数 |
| 4 | daily_target | int | 每日目标 |
| 5 | completed_days | int | 已完成天数 |
| 6 | flowers | int | 获得花朵数 |
| 7 | reminders[] | array | 提醒时段 |
| 8 | status | string | 状态（active/left/completed） |
| 9 | start_date | datetime | 开始时间 |
| 10 | completion_rate | float | **待新增**：完成率 |

### 2.4 报告（emotion_reports）

| # | 字段 | 类型 | 说明 |
|---|------|------|------|
| 1 | content | string | 报告正文 |
| 2 | advice | string | **待新增**：AI建议 |
| 3 | is_read | bool | 是否已读 |
| 4 | range | string | 周期类型（日报/周报/月报） |
| 5 | range_start | datetime | 周期开始 |
| 6 | range_end | datetime | 周期结束 |
| 7 | emotion_stats | object | 情绪统计数据 |
| 8 | trend | string | 趋势描述 |
| 9 | created_at | datetime | 生成时间 |
| 10 | version | int | 版本号（用于判断是否重新生成） |

---

## 三、AI功能 × 数据字段 完整对照

### 图例
- ✅ = 已传入
- ⚠️ = 未传入（可补充）
- ❌ = 未采集

### 3.1 情绪分析（analyze）

用户输入一段文字，AI判断情绪

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | emotion_records.text | ⚠️ 未传 | 参考用户近期文字风格判断 |
| 2 | users.conversationHistory | ⚠️ 未传 | 参考AI曾如何回应过类似情绪 |
| 3 | users.personality_tags | ⚠️ 未传 | 判断用户表达习惯（内敛/直白） |
| 4 | users.avg_word_count | ⚠️ 未传 | 了解用户写作习惯 |
| 5 | users.frequent_words | ⚠️ 未传 | 分析高频词辅助判断 |
| 6 | users.created_at | ⚠️ 未传 | 新用户语气更谨慎 |

### 3.2 AI陪伴（companion）

记录后AI给出温暖回应，最完善的场景

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | emotion（当前情绪） | ✅ | 核心输入 |
| 2 | text（当前文字） | ✅ | 理解用户想说什么 |
| 3 | period（时间段） | ✅ | 调整语气（早上清爽/夜晚温柔） |
| 4 | recentEmotions（近期情绪） | ✅ | 连续焦虑时更关心 |
| 5 | users.stats.streak | ✅ | 呼应连续记录的努力 |
| 6 | users.avg_score | ✅ | 了解整体状态 |
| 7 | users.top_emotion | ✅ | 最常见情绪 |
| 8 | users.top_period | ✅ | 活跃时段 |
| 9 | users.trend | ✅ | 情绪趋势 |
| 10 | users.most_anxious_period | ✅ | 易焦虑时段 |
| 11 | users.most_happy_period | ✅ | 最开心时段 |
| 12 | users.worst_weekday | ✅ | 难熬的星期几 |
| 13 | users.conversationHistory | ✅ | 避免重复说过的话 |
| 14 | users.created_at | ⚠️ 未传 | 新用户更鼓励，老用户更自然 |
| 15 | users.max_streak | ⚠️ 未传 | 历史最佳，激励参考 |
| 16 | emotion_records.ai_response | ⚠️ 未传 | 避免重复上次的回应风格 |
| 17 | emotion_records.poetry | ⚠️ 未传 | 可以呼应诗语内容 |
| 18 | users.last_record_time | ⚠️ 未传 | 判断是否很久没记录 |
| 19 | users.last_emotion | ⚠️ 未传 | 判断是否同一种情绪反复 |
| 20 | users.consecutive_anxious_days | ⚠️ 未传 | 连续焦虑要更关切 |
| 21 | emotion_records.word_count | ⚠️ 未传 | 文字长说明倾诉欲强 |

### 3.3 AI日记（diary）

用户写自由文字，AI分析+回应

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | emotion_records.text | ⚠️ 未传 | 用户写的日记内容本身 |
| 2 | users.avg_score | ⚠️ 未传 | 了解用户整体状态 |
| 3 | users.trend | ⚠️ 未传 | 趋势好时更轻松，下滑时更关心 |
| 4 | users.personality_tags | ⚠️ 未传 | 调整回应风格 |
| 5 | users.avg_word_count | ⚠️ 未传 | 文字长说明有更多想说 |
| 6 | users.frequent_words | ⚠️ 未传 | 辅助判断情绪 |
| 7 | users.last_ai_response | ⚠️ 未传 | 不要重复同样的回应 |
| 8 | users.stats.streak | ⚠️ 未传 | 连续记录是动力 |
| 9 | emotion_records.ai_response | ⚠️ 未传 | 知道AI说过什么 |

### 3.4 情绪匹配检查（checkEmotionMatch）

检查用户文字和选中情绪是否一致

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | emotions[]（选中情绪） | ✅ | 核心对比项 |
| 2 | text（用户文字） | ✅ | 被检查的内容 |
| 3 | users.conversationHistory | ⚠️ 未传 | 了解用户表达习惯 |
| 4 | users.personality_tags | ⚠️ 未传 | 判断用户是否在用反讽等 |

### 3.5 情绪诗语（poetry）

每日生成一句诗意的话

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | date | ✅ | 结合日期（节气、节日） |
| 2 | users.record_count | ✅ | 了解记录量 |
| 3 | users.avg_score | ✅ | 情绪整体偏向 |
| 4 | users.trend | ✅ | 趋势好/差语气不同 |
| 5 | users.streak | ✅ | 连续记录是激励素材 |
| 6 | users.recent7_avg | ✅ | 近7天状态 |
| 7 | emotion_records.poetry（近期诗语） | ⚠️ 未传 | 避免重复风格 |
| 8 | emotion_records.last_record_time | ⚠️ 未传 | 判断是否每日生成 |
| 9 | emotion_records.ai_response | ⚠️ 未传 | 诗语可以和AI回应有呼应 |
| 10 | users.emotion_distribution | ⚠️ 未传 | 情绪分布决定诗语基调 |
| 11 | emotion_records（当日情绪） | ⚠️ 未传 | 最好能结合当天情绪 |

### 3.6 AI洞察报告（report）

基于周期数据生成文字报告

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | records[]（周期内所有记录） | ✅ | 核心数据 |
| 2 | rangeLabel（周期描述） | ✅ | "近7天"等标题 |
| 3 | users.stats.streak | ✅ | 呼应连续记录 |
| 4 | users.top_emotion | ✅ | 最常见情绪 |
| 5 | users.conversationHistory | ⚠️ 未传 | 了解AI曾说过什么 |
| 6 | users.created_at | ⚠️ 未传 | 老用户回顾更有份量 |
| 7 | users.max_streak | ⚠️ 未传 | 历史最佳激励 |
| 8 | emotion_records（全部历史） | ⚠️ 未传 | 可以对比历史数据 |
| 9 | users.best_weekday | ⚠️ 未传 | 提到愉快的那天 |
| 10 | users.emotion_distribution | ⚠️ 未传 | 情绪占比更丰富 |
| 11 | users.negative_record_ratio | ⚠️ 未传 | 负面情绪占比 |
| 12 | emotion_records.poetry（近期诗语） | ⚠️ 未传 | 报告可以提到诗语的变化 |
| 13 | emotion_plans（用户计划） | ⚠️ 未传 | 结合计划给建议 |
| 14 | users.personality_tags | ⚠️ 未传 | 决定语气正式/随意 |
| 15 | users.avg_word_count | ⚠️ 未传 | 决定报告篇幅长度 |
| 16 | users.record_days_count | ⚠️ 未传 | 有多少天真正记录了 |

### 3.7 AI建议（advice）— 待新增

基于报告生成行动建议，是report的延伸

| # | 数据字段 | 状态 | 用途 |
|---|---------|------|------|
| 1 | records[]（周期内所有记录） | ⚠️ 需传入 | 基础数据 |
| 2 | report（已生成的报告） | ⚠️ 需传入 | 基于洞察内容来提建议 |
| 3 | users（完整画像） | ⚠️ 需传入 | 所有画像字段 |
| 4 | emotion_plans（用户计划） | ⚠️ 需传入 | 结合现有计划提建议 |
| 5 | users.frequent_words | ⚠️ 需传入 | 建议用词符合用户习惯 |
| 6 | users.hourly_pattern | ⚠️ 需传入 | 找出最佳建议时段 |
| 7 | users.personality_tags | ⚠️ 需传入 | 建议风格（具体/抽象） |
| 8 | users.negative_record_ratio | ⚠️ 需传入 | 负面多时建议更温和 |
| 9 | users.consecutive_anxious_days | ⚠️ 需传入 | 连续焦虑要更关切 |
| 10 | users.last_record_time | ⚠️ 需传入 | 判断是否需要催促 |

---

## 四、数据优先级建议

### 🔴 高优先级（影响体验，立即补充）

| 补充项 | 影响场景 | 难度 |
|--------|---------|------|
| diary/poetry 传入 userPortrait | AI日记、诗语更有温度 | 低 |
| diary/analyze 传入 recentEmotions | 减少重复判断 | 低 |
| 新增 `avg_word_count` | 决定AI说多说少 | 低 |
| 新增 `last_poetry` / `last_ai_response` | AI避免重复自己 | 低 |
| 新增 `emotion_plans` 传入 report/advice | 建议结合计划 | 中 |

### 🟡 中优先级（提升个性化，慢慢补充）

| 补充项 | 影响场景 | 难度 |
|--------|---------|------|
| 新增 `consecutive_anxious_days` | 连续焦虑要更关切 | 低 |
| 新增 `worst_weekday` / `best_weekday` | 报告中提到星期规律 | 低 |
| 新增 `frequent_words` 提取 | 建议用词更贴近用户 | 中 |
| 新增 `personality_tags` | AI推断性格标签 | 中 |
| 新增 `emotion_distribution` | 报告数据更丰富 | 低 |
| 新增 `negative_record_ratio` | 建议语气更谨慎 | 低 |

### 🟢 低优先级（锦上添花）

| 补充项 | 影响场景 | 难度 |
|--------|---------|------|
| 新增 `hourly_pattern` | 找出最佳建议执行时段 | 中 |
| 新增 `has_voice` / `voice_duration` | 了解记录方式偏好 | 低 |
| 新增 `checkin_status` 传入AI | 了解用户打卡习惯 | 低 |
| 新增 `first_record_date` | 老用户更有故事感 | 低 |

---

## 五、字段来源汇总

```
┌─────────────────────────────────────────────────────────┐
│                    AI 云函数（ai/index.js）               │
├──────────┬──────────────────────────────────────────────┤
│ analyze   │ text（用户输入）                              │
├──────────┼──────────────────────────────────────────────┤
│ companion │ emotion + text + period + recentEmotions    │
│           │ + userPortrait（全画像）                      │
├──────────┼──────────────────────────────────────────────┤
│ diary     │ text（用户输入）                              │
├──────────┼──────────────────────────────────────────────┤
│ checkMatch│ emotions[] + text                            │
├──────────┼──────────────────────────────────────────────┤
│ poetry    │ userPortrait（部分）+ date                   │
├──────────┼──────────────────────────────────────────────┤
│ report    │ records[] + rangeLabel + userPortrait（全画像）│
├──────────┼──────────────────────────────────────────────┤
│ advice    │ ❌ 待新增：records + report + 全画像 + 计划  │
└──────────┴──────────────────────────────────────────────┘
```

---

## 六、快速修复清单

以下是**一行代码就能改善**的补充项，按文件修改：

### 修复1：diary 传入 userPortrait（10分钟）

**文件：** `pages/index/index.js` 中的 `smartDiary` 调用处

```javascript
// 当前
wx.cloud.callFunction({
  name: 'ai',
  data: { action: 'diary', text: text }
})

// 改为
wx.cloud.callFunction({
  name: 'ai',
  data: { 
    action: 'diary', 
    text: text,
    userPortrait: userPortrait  // 新增
  }
})
```

### 修复2：poetry 传入今日情绪（10分钟）

**文件：** `pages/index/index.js` 中 `generatePoetry` 调用处

```javascript
// 改为
wx.cloud.callFunction({
  name: 'ai',
  data: {
    action: 'poetry',
    userPortrait: portrait,
    date: today,
    todayEmotion: todayRecords[0] ? todayRecords[0].emotion : null  // 新增
  }
})
```

### 修复3：analyze 传入历史记录（10分钟）

**文件：** `pages/index/index.js` 中 `analyzeEmotion` 调用处

```javascript
// 改为
wx.cloud.callFunction({
  name: 'ai',
  data: {
    action: 'analyze',
    text: text,
    recentEmotions: recentEmotions  // 新增
  }
})
```

### 修复4：新增 advice action（2小时）

需要：
1. 云函数新增 `generateAdvice` 函数
2. 读取 emotion_plans 数据
3. 构建综合 prompt
4. report 页面新增按钮调用
5. 结果存入 emotion_reports 的 advice 字段
