// pages/report/report.js
const app = getApp()
const util = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    // 时间范围
    rangeStart: '',
    rangeEnd: '',
    rangeLabel: '近3天',
    rangeDays: 3,
    
    // 数据
    hasData: false,
    emotionStats: [],
    dailyTrends: [],
    mostCommon: {},
    stabilityScore: 0,
    recordDays: 0,
    
    // AI 报告
    aiReport: '',
    aiReportLoading: false,
    canUseAI: false,
  },

  onLoad() {
    this.initRange()
  },

  onShow() {
    this.loadReportData()
  },

  // 初始化时间范围
  initRange() {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 2) // 近3天
    
    this.setData({
      rangeStart: util.formatDate(start, 'MM月DD日'),
      rangeEnd: util.formatDate(end, 'MM月DD日'),
    })
  },

  // 加载报告数据
  async loadReportData() {
    try {
      const userId = app.globalData.userInfo?._id || ''
      if (!userId) return
      
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - (this.data.rangeDays - 1))
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      
      const records = await db.getRecords(userId, { startDate: start, endDate: end, limit: 100 })
      
      if (records.length === 0) {
        this.setData({ hasData: false })
        return
      }
      
      // 统计
      const emotionCounts = {}
      const dailyData = {}
      
      records.forEach(record => {
        emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1
        const dateStr = util.formatDate(record.record_time, 'MM/DD')
        const dayName = util.formatDate(record.record_time, 'DD') + '日'
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: dateStr,
            day: dayName,
            emotion: record.emotion,
            score: record.emotion_score || 0,
          }
        }
      })
      
      const total = records.length
      const emotionStats = Object.entries(emotionCounts)
        .map(([key, count]) => ({
          key,
          ...util.getEmotionByKey(key),
          count,
          percent: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count)
      
      const mostCommon = emotionStats[0] || {}
      
      const dailyTrends = Object.values(dailyData).map(item => ({
        ...item,
        icon: util.getEmotionByScore(item.score)?.icon || '',
      }))
      
      const scores = records.map(r => r.emotion_score || 0)
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
      const stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance) * 30))
      
      const recordDays = Object.keys(dailyData).length
      
      this.setData({
        hasData: true,
        emotionStats,
        dailyTrends,
        mostCommon,
        stabilityScore,
        recordDays,
        canUseAI: recordDays >= 2, // 2天即可生成
      })
      
      // 自动生成 AI 报告
      if (recordDays >= 2 && !this.data.aiReport) {
        this.generateAIReport(records)
      }
    } catch (err) {
      console.error('加载报告失败:', err)
    }
  },

  // 生成 AI 报告
  async generateAIReport(records) {
    this.setData({ aiReportLoading: true })
    
    try {
      const recordsForAI = records.map(r => ({
        emotion: r.emotion,
        emotion_score: r.emotion_score,
        text: r.text || '',
        record_time: r.record_time,
      }))
      
      const res = await wx.cloud.callFunction({
        name: 'ai',
        data: {
          action: 'report',
          records: recordsForAI,
        }
      })
      
      this.setData({
        aiReport: res.result?.report || '',
        aiReportLoading: false,
      })
    } catch (err) {
      console.error('AI报告生成失败:', err)
      this.setData({ aiReportLoading: false })
    }
  },

  // 重新生成报告
  async regenerateReport() {
    this.setData({ aiReport: '' })
    this.loadReportData()
  },
})
