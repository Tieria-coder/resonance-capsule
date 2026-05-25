# 数据库配置说明 - 情绪报告集合

## 新建集合：emotion_reports

在云开发控制台中创建新集合 `emotion_reports`，权限设置为「仅创建者可读写」。

## 数据结构

{
  "_id": "自动生成",
  "user_id": "用户openid",
  "report_type": "daily|weekly|monthly",  // 报告类型
  "report_date": "2026-05-21",           // 报告日期
  "report_data": {                          // 报告数据
    "summary": "今日情绪总结",
    "most_common": {
      "emotion": "happy",
      "icon": "😊",
      "label": "开心",
      "count": 5,
      "percent": 50
    },
    "ai_comment": "今天整体情绪不错，继续保持！",
    "details": { ... }  // 详细数据（日报/周报/月报不同）
  },
  "is_read": false,                       // 是否已读
  "created_at": "2026-05-21 21:00:00"  // 生成时间
}

## 索引建议

- `user_id` + `report_type` + `report_date`（复合索引，用于查询用户报告）
- `user_id` + `is_read`（复合索引，用于查询未读报告）
- `created_at`（单字段索引，用于定时任务查询）

## 数据示例

### 日报示例
{
  "user_id": "oxxxx",
  "report_type": "daily",
  "report_date": "2026-05-21",
  "report_data": {
    "summary": "今天记录了6次情绪，整体偏积极",
    "most_common": {
      "emotion": "happy",
      "icon": "😊",
      "label": "开心",
      "count": 3,
      "percent": 50
    },
    "ai_comment": "今天整体情绪不错，继续保持！建议晚上早点休息哦～",
    "details": {
      "total_records": 6,
      "positive_count": 4,
      "negative_count": 2,
      "emotion_scores": [2, 1, -1, 2, 1, 0],
      "period_distribution": {
        "morning": 2,
        "afternoon": 3,
        "evening": 1
      }
    }
  },
  "is_read": false,
  "created_at": "2026-05-21 21:00:00"
}

### 周报示例
{
  "user_id": "oxxxx",
  "report_type": "weekly",
  "report_date": "2026-05-19",
  "report_data": {
    "summary": "本周记录了32次情绪，稳定性良好",
    "most_common": {
      "emotion": "calm",
      "icon": "😌",
      "label": "平静",
      "count": 10,
      "percent": 31
    },
    "stability_score": 85,
    "stability_level": "优秀",
    "week_compare": 5,
    "ai_comment": "本周情绪比较稳定，继续保持规律作息...",
    "details": {
      "total_records": 32,
      "emotion_stats": [...],
      "daily_trends": [...],
      "vs_last_week": "+5%"
    }
  },
  "is_read": false,
  "created_at": "2026-05-19 09:00:00"
}

### 月报示例
{
  "user_id": "oxxxx",
  "report_type": "monthly",
  "report_date": "2026-05-01",
  "report_data": {
    "summary": "本月记录了120次情绪，积极情绪占优",
    "most_common": {
      "emotion": "happy",
      "icon": "😊",
      "label": "开心",
      "count": 45,
      "percent": 38
    },
    "stability_score": 78,
    "ai_comment": "5月情绪整体向好，建议6月尝试更多正念练习...",
    "details": {
      "total_records": 120,
      "positive_rate": 65,
      "monthly_trend": [...],
      "growth_suggestions": [...]
    }
  },
  "is_read": false,
  "created_at": "2026-06-01 09:00:00"
}
