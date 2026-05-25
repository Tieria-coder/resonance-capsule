// 云函数 - 自动生成情绪报告（定时触发器）
const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command

cloud.init({
  env: 'cloud1-d5gev82b5db8c2485'
})

// 情绪配置
const EMOTIONS = {
  excited: { icon: '\ud83d\ude06', label: '兴奋', score: 2 },
  happy: { icon: '\ud83d\ude0a', label: '开心', score: 1 },
  calm: { icon: '\ud83d\ude0c', label: '平静', score: 0 },
  down: { icon: '\ud83d\ude1e', label: '低落', score: -1 },
  irritable: { icon: '\ud83d\ude24', label: '烦躁', score: -1 },
  sad: { icon: '\ud83d\ude22', label: '伤心', score: -2 },
  tired: { icon: '\ud83d\ude2b', label: '疲惫', score: -1 }
}

// 获取时间段
function getPeriodByHour(hour) {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 20) return 'dusk'
  return 'night'
}

// 格式化日期
function formatDate(date, fmt) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (fmt === 'YYYY-MM-DD') return year + '-' + month + '-' + day
  if (fmt === 'MM/DD') return month + '/' + day
  return year + '-' + month + '-' + day
}

// 生成日报
async function generateDailyReport(userId, date) {
  try {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    
    const records = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: _.gte(start).and(_.lte(end))
      })
      .get()
    
    if (records.data.length === 0) {
      return null
    }
    
    const emotionCounts = {}
    records.data.forEach(r => {
      emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1
    })
    
    const total = records.data.length
    const emotionStats = []
    
    Object.entries(emotionCounts).forEach(([key, count]) => {
      emotionStats.push({
        key: key,
        icon: EMOTIONS[key] ? EMOTIONS[key].icon : '',
        label: EMOTIONS[key] ? EMOTIONS[key].label : '',
        count: count,
        percent: Math.round((count / total) * 100)
      })
    })
    
    emotionStats.sort((a, b) => b.count - a.count)
    
    const mostCommon = emotionStats[0]
    
    let scoreSum = 0
    records.data.forEach(r => {
      scoreSum += (r.emotion_score || 0)
    })
    const avgScore = scoreSum / total
    
    let aiComment = ''
    if (avgScore >= 1) {
      aiComment = '今天整体情绪不错，继续保持！'
    } else if (avgScore >= 0) {
      aiComment = '今天情绪比较平稳，可以适当放松一下～'
    } else {
      aiComment = '今天情绪有些低落，记得照顾好自己哦。'
    }
    
    const reportData = {
      summary: '今天记录了' + total + '次情绪，' + mostCommon.icon + mostCommon.label + '最常见',
      most_common: mostCommon,
      avg_score: Math.round(avgScore * 10) / 10,
      ai_comment: aiComment,
      details: {
        total_records: total,
        positive_count: records.data.filter(r => (r.emotion_score || 0) >= 1).length,
        negative_count: records.data.filter(r => (r.emotion_score || 0) < 0).length,
        emotion_scores: records.data.map(r => r.emotion_score || 0),
        period_distribution: {
          dawn: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'dawn').length,
          morning: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'morning').length,
          noon: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'noon').length,
          afternoon: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'afternoon').length,
          dusk: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'dusk').length,
          night: records.data.filter(r => getPeriodByHour(new Date(r.record_time).getHours()) === 'night').length
        }
      }
    }
    
    await db.collection('emotion_reports').add({
      data: {
        user_id: userId,
        report_type: 'daily',
        report_date: formatDate(date, 'YYYY-MM-DD'),
        report_data: reportData,
        is_read: false,
        created_at: new Date()
      }
    })
    
    console.log('生成日报成功：用户 ' + userId)
    return reportData
  } catch (err) {
    console.error('生成日报失败：', err)
    return null
  }
}

// 生成周报
async function generateWeeklyReport(userId, weekStartDate) {
  try {
    const start = new Date(weekStartDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(weekStartDate)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    
    const records = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: _.gte(start).and(_.lte(end))
      })
      .get()
    
    if (records.data.length === 0) {
      return null
    }
    
    const emotionCounts = {}
    const dailyData = {}
    
    records.data.forEach(r => {
      emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1
      const dateStr = formatDate(r.record_time, 'MM/DD')
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          date: dateStr,
          score: r.emotion_score || 0
        }
      }
    })
    
    const total = records.data.length
    const emotionStats = []
    
    Object.entries(emotionCounts).forEach(([key, count]) => {
      emotionStats.push({
        key: key,
        icon: EMOTIONS[key] ? EMOTIONS[key].icon : '',
        label: EMOTIONS[key] ? EMOTIONS[key].label : '',
        count: count,
        percent: Math.round((count / total) * 100)
      })
    })
    
    emotionStats.sort((a, b) => b.count - a.count)
    
    const mostCommon = emotionStats[0]
    
    let scoreSum = 0
    records.data.forEach(r => {
      scoreSum += (r.emotion_score || 0)
    })
    const scores = records.data.map(r => r.emotion_score || 0)
    const avgScore = scoreSum / total
    
    let variance = 0
    scores.forEach(s => {
      variance += Math.pow(s - avgScore, 2)
    })
    variance = variance / total
    
    const stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance) * 30))
    const stabilityLevel = stabilityScore >= 80 ? '优秀' : stabilityScore >= 60 ? '良好' : '一般'
    
    const prevStart = new Date(weekStartDate)
    prevStart.setDate(prevStart.getDate() - 7)
    const prevRecords = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: _.gte(prevStart).and(_.lt(weekStartDate))
      })
      .get()
    
    const prevPositive = prevRecords.data.filter(r => (r.emotion_score || 0) >= 1).length
    const currPositive = records.data.filter(r => (r.emotion_score || 0) >= 1).length
    const prevRate = prevRecords.data.length > 0 ? (prevPositive / prevRecords.data.length * 100) : 0
    const currRate = records.data.length > 0 ? (currPositive / records.data.length * 100) : 0
    const weekCompare = Math.round(currRate - prevRate)
    
    let aiComment = ''
    if (stabilityScore >= 80) {
      aiComment = '本周情绪非常稳定，继续保持！'
    } else if (stabilityScore >= 60) {
      aiComment = '本周情绪比较稳定，可以尝试更多放松活动。'
    } else {
      aiComment = '本周情绪波动较大，建议关注情绪变化的原因。'
    }
    
    const reportData = {
      summary: '本周记录了' + total + '次情绪，' + mostCommon.icon + mostCommon.label + '最常见',
      most_common: mostCommon,
      stability_score: stabilityScore,
      stability_level: stabilityLevel,
      week_compare: weekCompare,
      ai_comment: aiComment,
      details: {
        total_records: total,
        emotion_stats: emotionStats,
        daily_trends: Object.values(dailyData),
        vs_last_week: (weekCompare >= 0 ? '+' : '') + weekCompare + '%'
      }
    }
    
    await db.collection('emotion_reports').add({
      data: {
        user_id: userId,
        report_type: 'weekly',
        report_date: formatDate(weekStartDate, 'YYYY-MM-DD'),
        report_data: reportData,
        is_read: false,
        created_at: new Date()
      }
    })
    
    console.log('生成周报成功：用户 ' + userId)
    return reportData
  } catch (err) {
    console.error('生成周报失败：', err)
    return null
  }
}

// 生成月报
async function generateMonthlyReport(userId, year, month) {
  try {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    end.setHours(23, 59, 59, 999)
    
    const records = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: _.gte(start).and(_.lte(end))
      })
      .get()
    
    if (records.data.length === 0) {
      return null
    }
    
    const emotionCounts = {}
    
    records.data.forEach(r => {
      emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1
    })
    
    const total = records.data.length
    const emotionStats = []
    
    Object.entries(emotionCounts).forEach(([key, count]) => {
      emotionStats.push({
        key: key,
        icon: EMOTIONS[key] ? EMOTIONS[key].icon : '',
        label: EMOTIONS[key] ? EMOTIONS[key].label : '',
        count: count,
        percent: Math.round((count / total) * 100)
      })
    })
    
    emotionStats.sort((a, b) => b.count - a.count)
    
    const mostCommon = emotionStats[0]
    
    const positiveCount = records.data.filter(r => (r.emotion_score || 0) >= 1).length
    const positiveRate = Math.round((positiveCount / total) * 100)
    
    let aiComment = ''
    if (positiveRate >= 70) {
      aiComment = month + '月整体情绪积极，非常棒！'
    } else if (positiveRate >= 50) {
      aiComment = month + '月情绪偏积极，可以继续提升。'
    } else {
      aiComment = month + '月情绪偏消极，建议关注情绪健康。'
    }
    
    const reportData = {
      summary: month + '月记录了' + total + '次情绪，' + mostCommon.icon + mostCommon.label + '最常见',
      most_common: mostCommon,
      positive_rate: positiveRate,
      ai_comment: aiComment,
      details: {
        total_records: total,
        emotion_stats: emotionStats,
        monthly_trend: [],
        growth_suggestions: []
      }
    }
    
    await db.collection('emotion_reports').add({
      data: {
        user_id: userId,
        report_type: 'monthly',
        report_date: year + '-' + String(month).padStart(2, '0') + '-01',
        report_data: reportData,
        is_read: false,
        created_at: new Date()
      }
    })
    
    console.log('生成月报成功：用户 ' + userId)
    return reportData
  } catch (err) {
    console.error('生成月报失败：', err)
    return null
  }
}

// 调用推送云函数
async function callPushReport(userId, reportType) {
  try {
    await cloud.callFunction({
      name: 'push-report',
      data: {
        userId: userId,
        reportType: reportType
      }
    })
    console.log('推送调用成功：' + userId + '，类型：' + reportType)
  } catch (err) {
    console.error('推送调用失败：' + userId, err)
  }
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    const users = await db.collection('users').get()
    
    const now = new Date()
    
    const eventType = event.type || 'daily'
    
    let successCount = 0
    let skipCount = 0
    
    for (const user of users.data) {
      try {
        let result = null
        
        if (eventType === 'daily') {
          // 日报：统计当天的数据（晚上11点推送今天的记录）
          result = await generateDailyReport(user.openid, now)
        } else if (eventType === 'weekly') {
          // 周报：统计本周数据（周一到周日，周日晚11点推送）
          const weekStart = new Date(now)
          const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 周一为0，周日为6
          weekStart.setDate(now.getDate() - dayOfWeek)
          result = await generateWeeklyReport(user.openid, weekStart)
        } else if (eventType === 'monthly') {
          // 月报：统计当月数据（当月最后一天晚11点推送）
          result = await generateMonthlyReport(user.openid, now.getFullYear(), now.getMonth() + 1)
        }
        
        if (result) {
          successCount++
          // 生成成功后调用推送
          await callPushReport(user.openid, eventType)
        } else {
          skipCount++
        }
      } catch (err) {
        console.error('生成用户 ' + user.openid + ' 的报告失败：', err)
      }
    }
    
    return {
      success: true,
      message: '报告生成完成：成功' + successCount + '个，跳过' + skipCount + '个',
      successCount: successCount,
      skipCount: skipCount
    }
  } catch (err) {
    console.error('云函数执行失败：', err)
    return {
      success: false,
      error: err.message
    }
  }
}
