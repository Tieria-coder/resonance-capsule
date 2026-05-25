// pages/report/report.js
const app = getApp()
const util = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    // 时间范围
    rangeStart: '',
    rangeEnd: '',
    rangeLabel: '今日',
    rangeDays: 1,

    // 自定义时间范围
    isCustomRange: false,
    showCustomPicker: false,
    customStartDate: '',
    customEndDate: '',

    // 数据
    hasData: false,
    emotionStats: [],
    subStats: [],
    dailyTrends: [],
    timePeriods: [],
    heatmapData: [],
    mostCommon: {},
    stabilityScore: 0,
    recordDays: 0,
    chartType: 'ring',
    userId: '',

    // AI 报告
    aiReport: '',
    aiReportLoading: false,
    canUseAI: false,
    records: [],
    keywords: [],
    loadingTextIndex: 0,
    loadingTexts: [
      'AI 正在分析你的情绪数据...',
      '正在捕捉情绪的微妙变化...',
      '数据正在汇聚成洞察...',
      '情绪图景正在浮现...',
      '马上就好，让心灵说话...'
    ],
  },

  onLoad() {
    this.initRange()
    this._initUser()
  },

  _initUser: function () {
    var that = this
    app.getOpenid().then(function (openid) {
      return db.getUser(openid)
    }).then(function (user) {
      if (!user) return
      that.setData({ userId: user._id }, function () {
        that.loadReportData()
      })
    }).catch(function (err) {
      console.error('获取用户信息失败:', err)
    })
  },

  onShow() {
    if (this.data.userId) this.loadReportData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
    }
  },

  onUnload() {
    if (this._loadingTimer) clearInterval(this._loadingTimer)
  },

  // 初始化时间范围
  initRange() {
    this._applyRange(this.data.rangeDays)
  },

  _applyRange(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    var labels = { 1: '今日', 7: '近7天', 30: '近30天' }
    this.setData({
      rangeDays: days,
      rangeLabel: labels[days] || ('近' + days + '天'),
      rangeStart: util.formatDate(start, 'MM月DD日'),
      rangeEnd: util.formatDate(end, 'MM月DD日'),
    })
  },

  // 自定义范围时，用自定义的起止日期而非相对计算
  _getActualDateRange: function () {
    if (this.data.isCustomRange && this.data.customStartDate && this.data.customEndDate) {
      return {
        start: new Date(this.data.customStartDate + 'T00:00:00'),
        end: new Date(this.data.customEndDate + 'T23:59:59.999'),
      }
    }
    var end = new Date()
    var start = new Date()
    start.setDate(start.getDate() - (this.data.rangeDays - 1))
    return { start: start, end: end }
  },

  switchRange(e) {
    var days = Number(e.currentTarget.dataset.days)
    if (days === this.data.rangeDays) return
    this.setData({ isCustomRange: false })
    this._applyRange(days)
    this.setData({ aiReport: '', aiReportLoading: false })
    if (this.data.userId) this.loadReportData()
  },

  // ─── 自定义时间范围 ───
  showCustomDatePicker: function () {
    var now = new Date()
    var start = new Date()
    start.setDate(start.getDate() - 6) // 默认近7天
    this.setData({
      showCustomPicker: true,
      customStartDate: util.formatDate(start, 'YYYY-MM-DD'),
      customEndDate: util.formatDate(now, 'YYYY-MM-DD'),
    })
  },

  hideCustomDatePicker: function () {
    this.setData({ showCustomPicker: false })
  },

  onCustomStartChange: function (e) {
    this.setData({ customStartDate: e.detail.value })
  },

  onCustomEndChange: function (e) {
    this.setData({ customEndDate: e.detail.value })
  },

  confirmCustomRange: function () {
    var startDate = this.data.customStartDate
    var endDate = this.data.customEndDate
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择完整时间范围', icon: 'none' })
      return
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
      return
    }

    // 计算天数差
    var start = new Date(startDate)
    var end = new Date(endDate)
    var diffMs = end.getTime() - start.getTime()
    var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1

    if (diffDays > 365) {
      wx.showToast({ title: '最多选择365天', icon: 'none' })
      return
    }

    this.setData({
      showCustomPicker: false,
      isCustomRange: true,
      rangeDays: diffDays,
      rangeLabel: '自定义',
      rangeStart: util.formatDate(start, 'MM月DD日'),
      rangeEnd: util.formatDate(end, 'MM月DD日'),
      aiReport: '',
      aiReportLoading: false,
    })

    if (this.data.userId) this.loadReportData()
  },

  // 加载报告数据
  async loadReportData() {
    try {
      var that = this
      var userId = that.data.userId
      if (!userId) return

      var dateRange = that._getActualDateRange()
      var start = dateRange.start
      var end = dateRange.end
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      var records = await db.getRecords(userId, { startDate: start, endDate: end, limit: 100 })

      if (records.length === 0) {
        that.setData({ hasData: false })
        return
      }

      // 情绪主分类统计
      var emotionCounts = {}
      // 子情绪（细分情绪）统计
      var subEmotionCounts = {}
      var dailyData = {}

      records.forEach(function (record) {
        var info = util.getEmotionByKey(record.emotion)
        var catKey = info.categoryKey || 'neutral'
        emotionCounts[catKey] = (emotionCounts[catKey] || 0) + 1
        subEmotionCounts[record.emotion] = (subEmotionCounts[record.emotion] || 0) + 1

        var dateStr = util.formatDate(record.record_time, 'MM/DD')
        var dayName = util.formatDate(record.record_time, 'DD') + '日'
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: dateStr,
            day: dayName,
            emotions: {},
            count: 0,
          }
        }
        dailyData[dateStr].emotions[catKey] = (dailyData[dateStr].emotions[catKey] || 0) + 1
        dailyData[dateStr].count++
      })

      var total = records.length
      var BASE_COLORS = ['#4CAF50', '#FF5722', '#2196F3', '#FFC107', '#9C27B0', '#00BCD4', '#E91E63', '#607D8B']

      var emotionStats = Object.entries(emotionCounts).map(function (entry) {
        var key = entry[0]
        var count = entry[1]
        var cat = util.EMOTION_CATEGORIES.find(function (c) { return c.key === key }) || {}
        return {
          key: key,
          label: cat.label || key,
          icon: cat.icon || '\uD83D\uDDF8',
          count: count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      }).sort(function (a, b) { return b.count - a.count }).map(function (item, idx) {
        item.color = BASE_COLORS[idx % BASE_COLORS.length]
        return item
      })

      var subStats = Object.entries(subEmotionCounts).map(function (entry) {
        var key = entry[0]
        var count = entry[1]
        var emotionInfo = util.getEmotionByKey(key)
        return {
          key: key,
          label: emotionInfo.label || key,
          icon: emotionInfo.icon || '\uD83D\uDDF8',
          desc: emotionInfo.desc || '',
          count: count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      }).sort(function (a, b) { return b.count - a.count }).map(function (item, idx) {
        item.color = BASE_COLORS[idx % BASE_COLORS.length]
        return item
      })

      var mostCommon = emotionStats[0] || {}

      var dailyTrends = Object.values(dailyData).map(function (item) {
        var sortedEmotions = Object.entries(item.emotions).sort(function (a, b) { return b[1] - a[1] })
        var topEmotionKey = sortedEmotions[0] ? sortedEmotions[0][0] : 'neutral'
        var cat = util.EMOTION_CATEGORIES.find(function (c) { return c.key === topEmotionKey }) || {}
        var result = {}
        Object.keys(item).forEach(function (k) { result[k] = item[k] })
        result.topEmotionKey = topEmotionKey
        result.topEmotionIcon = cat.icon || '\uD83D\uDDF8'
        result.topEmotionLabel = cat.label || '\u5E73\u6DE1'
        return result
      })

      var heatmapData = []
      var i, d, dateStr, dayRecords, hourCounts
      for (i = 0; i < that.data.rangeDays; i++) {
        d = new Date(start)
        d.setDate(d.getDate() + i)
        dateStr = util.formatDate(d, 'MM/DD')
        dayRecords = records.filter(function (r) {
          return util.formatDate(new Date(r.record_time), 'YYYY-MM-DD') === util.formatDate(d, 'YYYY-MM-DD')
        })
        hourCounts = new Array(24).fill(0)
        dayRecords.forEach(function (r) {
          var hour = new Date(r.record_time).getHours()
          hourCounts[hour]++
        })
        heatmapData.push({
          date: util.formatDate(d, 'MM/DD'),
          day: util.formatDate(d, 'DD') + '\u65E5',
          hourCounts: hourCounts,
          total: dayRecords.length,
        })
      }

      var scores = records.map(function (r) {
        var info = util.getEmotionByKey(r.emotion)
        var desc = info.desc || ''
        if (desc.indexOf('\u559C\u6085') > -1 || desc.indexOf('\u8F7B\u677E') > -1 || desc.indexOf('\u5E73\u548C') > -1) return 1
        if (desc.indexOf('\u524A\u523B') > -1 || desc.indexOf('\u5B64\u72EC') > -1 || desc.indexOf('\u59D4\u5C41') > -1) return -1
        return 0
      })

      var avgScore = scores.reduce(function (a, b) { return a + b }, 0) / scores.length
      var variance = scores.reduce(function (sum, s) { return sum + Math.pow(s - avgScore, 2) }, 0) / scores.length
      var stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance) * 30))
      var recordDays = Object.keys(dailyData).length

      // ─── 时段分布（日报时使用）───
      var timePeriods = []
      if (that.data.rangeDays === 1) {
        var periodDefs = [
          { name: '早晨', timeRange: '6:00-9:00', minHour: 6, maxHour: 8 },
          { name: '上午', timeRange: '9:00-12:00', minHour: 9, maxHour: 11 },
          { name: '中午', timeRange: '12:00-14:00', minHour: 12, maxHour: 13 },
          { name: '下午', timeRange: '14:00-18:00', minHour: 14, maxHour: 17 },
          { name: '晚上', timeRange: '18:00-21:00', minHour: 18, maxHour: 20 },
          { name: '深夜', timeRange: '21:00-6:00', minHour: 21, maxHour: 5 },
        ]
        timePeriods = periodDefs.map(function (def) {
          var periodRecords = records.filter(function (r) {
            var h = new Date(r.record_time).getHours()
            if (def.minHour <= def.maxHour) {
              return h >= def.minHour && h <= def.maxHour
            } else {
              // 深夜跨天：22:00-24:00 或 0:00-6:00
              return h >= def.minHour || h <= def.maxHour
            }
          })
          var emotions = periodRecords.map(function (r) {
            var info = util.getEmotionByKey(r.emotion)
            return { icon: info.icon || '\uD83D\uDDF8', key: r.emotion }
          })
          // 去重保留顺序
          var seen = {}
          var uniqueEmotions = []
          emotions.forEach(function (e) {
            if (!seen[e.key]) { seen[e.key] = true; uniqueEmotions.push(e) }
          })
          return {
            name: def.name,
            timeRange: def.timeRange,
            emotions: uniqueEmotions,
            count: periodRecords.length,
          }
        })
      }

      that.setData({
        hasData: true,
        emotionStats: emotionStats,
        subStats: subStats,
        dailyTrends: dailyTrends,
        timePeriods: timePeriods,
        heatmapData: heatmapData,
        mostCommon: mostCommon,
        stabilityScore: stabilityScore,
        recordDays: recordDays,
        canUseAI: recordDays >= 2,
      }, function () {
        that.setData({ records: records })
        if (recordDays >= 2) {
          that.loadSavedReport(records)
        }
      })
    } catch (err) {
      console.error('\u52A0\u8F7D\u62A5\u544A\u5931\u8D25:', err)
    }
  },

  // 生成 AI 报告
  generateAIReport: function (records) {
    var that = this
    that.setData({ aiReportLoading: true, loadingTextIndex: 0 })

    // 动态文案轮播
    that._loadingTimer = setInterval(function () {
      var next = (that.data.loadingTextIndex + 1) % that.data.loadingTexts.length
      that.setData({ loadingTextIndex: next })
    }, 2000)

    var recordsForAI = records.map(function (r) {
      var info = util.getEmotionByKey(r.emotion)
      return {
        emotion: r.emotion,
        emotion_label: info.categoryIcon + ' ' + info.categoryLabel + '\u00B7' + info.icon + info.label,
        text: r.text || '',
        record_time: r.record_time,
      }
    })

    wx.cloud.callFunction({
      name: 'ai',
      data: {
        action: 'report',
        records: recordsForAI,
        rangeLabel: that.data.rangeLabel,
      }
    }).then(function (res) {
      clearInterval(that._loadingTimer)
      var report = (res.result && res.result.report) || ''
      var keywords = that.extractKeywords(report)
      that.setData({
        aiReport: report,
        aiReportLoading: false,
        keywords: keywords,
      })
      // 存到数据库
      var userId = that.data.userId
      if (userId && report) {
        db.saveReport(userId, report, that.data.rangeLabel).catch(function (e) {
          console.error('\u4FDD\u5B58\u62A5\u544A\u5931\u8D25:', e)
        })
      }
    }).catch(function (err) {
      clearInterval(that._loadingTimer)
      console.error('AI\u62A5\u544A\u751F\u6210\u5931\u8D25:', err)
      that.setData({ aiReportLoading: false })
    })
  },

  // ─── 从数据库加载已有报告 ───
  loadSavedReport: function (records) {
    var that = this
    var userId = that.data.userId
    if (!userId) return
    that.setData({ aiReportLoading: true })
    db.getLatestReport(userId, that.data.rangeLabel).then(function (reportDoc) {
      if (reportDoc && reportDoc.report_content) {
        // 数据库有报告，直接显示
        var keywords = that.extractKeywords(reportDoc.report_content)
        that.setData({
          aiReport: reportDoc.report_content,
          aiReportLoading: false,
          keywords: keywords,
        })
      } else {
        // 没有历史报告，生成新报告
        that.generateAIReport(records)
      }
    }).catch(function (err) {
      console.error('\u8BFB\u53D6\u5386\u53F2\u62A5\u544A\u5931\u8D25:', err)
      that.generateAIReport(records)
    })
  },

  // ─── 重新生成报告 ───
  regenerateReport: function () {
    var that = this
    that.setData({ aiReport: '', aiReportLoading: true })
    var userId = that.data.userId
    if (userId) {
      db.getLatestReport(userId, that.data.rangeLabel).then(function (doc) {
        if (doc && doc._id) {
          db.init().collection('emotion_reports').doc(doc._id).remove().catch(function () {})
        }
      }).catch(function () {})
    }
    that.loadReportData()
  },

  // 从报告文本中提取关键词
  extractKeywords: function (text) {
    if (!text || text.length < 10) return []
    // 情绪相关关键词
    var emotionWords = [
      '焦虑', '平静', '快乐', '悲伤', '愤怒', '恐惧', '惊喜', '困惑', '满足',
      '压力', '放松', '焦虑', '开心', '难过', '生气', '害怕', '期待', '迷茫', '充实',
      '疲惫', '精力充沛', '孤独', '温暖', '安全感', '不安', '自信', '紧张', '轻松',
      '情绪', '心情', '感受', '思考', '成长', '变化', '趋势', '波动', '稳定'
    ]
    var found = []
    emotionWords.forEach(function (word) {
      if (text.includes(word) && !found.includes(word)) {
        found.push(word)
      }
    })
    // 最多返回 8 个
    return found.slice(0, 8)
  },

  // ─── 基于报告寻求建议 ───
  onAISuggestion: function () {
    var aiReport = this.data.aiReport
    var records = this.data.records
    if (!aiReport) return
    wx.setStorageSync('report_chat_mode', 'suggestion')
    wx.setStorageSync('report_chat_context', {
      aiReport: aiReport,
      records: records || [],
    })
    wx.navigateTo({ url: '/pages/index/index?chat=1' })
  },

  // ─── 基于报告继续聊天 ───
  onAIChat: function () {
    var aiReport = this.data.aiReport
    var records = this.data.records
    if (!aiReport) return
    wx.setStorageSync('report_chat_mode', 'chat')
    wx.setStorageSync('report_chat_context', {
      aiReport: aiReport,
      records: records || [],
    })
    wx.navigateTo({ url: '/pages/index/index?chat=1' })
  },
})
