// pages/calendar/calendar.js - ES5 compatible
var app = getApp()
var util = require('../../utils/util')
var db = require('../../utils/db')

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    calendarData: {},
    monthStats: { days: 0 },

    showDayModal: false,
    selectedDateStr: '',
    selectedDayRecords: [],

    // 本月情绪统计
    emotionStats: [],
    emotionStatsTotal: 0,

    // 连续记录天数
    streakDays: 0,

    // 月度温暖语
    monthlyMessage: '',

    openid: '',
    userId: '',
  },

  onLoad: function () {
    this.initUser()
  },

  onShow: function () {
    var that = this
    if (that.data.userId) {
      that.loadCalendarData()
    }
    var tab = that.selectComponent('.tabbar-wrapper')
    if (tab) tab.setActive(1)
  },

  initUser: function () {
    var that = this
    app.getOpenid().then(function (openid) {
      that.setData({ openid: openid })
      return db.getUser(openid)
    }).then(function (user) {
      if (!user) {
        return db.upsertUser({ openid: that.data.openid }).then(function () {
          return db.getUser(that.data.openid)
        })
      }
      return user
    }).then(function (user) {
      that.setData({ userId: user._id })
      that.loadCalendarData()
    }).catch(function (err) {
      console.error('初始化用户失败:', err)
      that.setData({ days: that.generateMockDays() })
    })
  },

  loadCalendarData: function () {
    var that = this
    var userId = that.data.userId
    var year = that.data.year
    var month = that.data.month
    if (!userId) return

    var startDate = new Date(year, month - 1, 1)
    var endDate = new Date(year, month, 0, 23, 59, 59, 999)

    db.getRecords(userId, {
      startDate: startDate,
      endDate: endDate,
      limit: 500,
    }).then(function (records) {
      var calendarData = {}
      records.forEach(function (record) {
        var dateStr = util.formatDate(new Date(record.record_time), 'YYYY-MM-DD')
        if (!calendarData[dateStr]) {
          calendarData[dateStr] = []
        }
        calendarData[dateStr].push(record)
      })

      var allDays = that.getMonthDays(year, month)
      var mapped = allDays.map(function (item) {
        var dateStr = util.formatDate(item.date, 'YYYY-MM-DD')
        var dayRecords = calendarData[dateStr] || []
        var hasRecord = dayRecords.length > 0
        var topEmotionIcon = ''
        var topEmotionKey = 'neutral'

        if (dayRecords.length > 0) {
          var catCount = {}
          dayRecords.forEach(function (r) {
            var info = util.getEmotionByKey(r.emotion)
            var catKey = info.categoryKey || 'neutral'
            catCount[catKey] = (catCount[catKey] || 0) + 1
          })
          var sortedCats = Object.entries(catCount).sort(function (a, b) { return b[1] - a[1] })
          var topCat = sortedCats[0]
          if (topCat) {
            var cat = util.EMOTION_CATEGORIES.find(function (c) { return c.key === topCat[0] })
            topEmotionIcon = cat ? cat.icon : '\uD83D\uDDF8'
            topEmotionKey = topCat[0]
          }
        }

        var isToday = util.isSameDay(item.date, new Date())

        return {
          date: item.date,
          dateStr: dateStr,
          day: item.date.getDate(),
          hasRecord: hasRecord,
          emotionIcon: topEmotionIcon,
          emotionKey: topEmotionKey,
          recordCount: dayRecords.length,
          isToday: isToday,
          isCurrentMonth: item.isCurrentMonth,
        }
      }).filter(function (item) { return item.isCurrentMonth })

      // 计算本月情绪分布
      var emotionStats = that.calcEmotionStats(records)
      var emotionStatsTotal = records.length

      // 计算连续记录天数
      var streakDays = that.calcStreakDays(records)

      // 生成月度温暖语
      var monthlyMessage = that.generateMonthlyMessage(records, emotionStats)

      var daysWithRecord = Object.keys(calendarData).length
      that.setData({
        calendarData: calendarData,
        days: mapped,
        monthStats: { days: daysWithRecord },
        emotionStats: emotionStats,
        emotionStatsTotal: emotionStatsTotal,
        streakDays: streakDays,
        monthlyMessage: monthlyMessage,
      })
    }).catch(function (err) {
      console.error('加载日历数据失败:', err)
      that.setData({ days: that.generateMockDays() })
    })
  },

  getMonthDays: function (year, month) {
    var firstDay = new Date(year, month - 1, 1).getDay()
    var daysInMonth = new Date(year, month, 0).getDate()
    var days = []
    var prevMonthDays = new Date(year, month - 1, 0).getDate()
    var i
    for (i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 2, prevMonthDays - i),
        isCurrentMonth: false,
      })
    }
    for (i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month - 1, i),
        isCurrentMonth: true,
      })
    }
    var remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (i = 1; i <= remaining; i++) {
        days.push({
          date: new Date(year, month, i),
          isCurrentMonth: false,
        })
      }
    }
    return days
  },

  generateMockDays: function () {
    var year = this.data.year
    var month = this.data.month
    var daysInMonth = new Date(year, month, 0).getDate()
    var days = []
    var icons = ['\uD83D\uDE0A', '\uD83D\uDE0C', '\uD83D\uDDF8', '\uD83D\uDE14', '\uD83D\uDE22', '\uD83D\uDE20', '\uD83D\uDE2B', '\uD83D\uDCAD']
    var i
    for (i = 1; i <= daysInMonth; i++) {
      var date = new Date(year, month - 1, i)
      var hasRecord = Math.random() > 0.3
      days.push({
        date: date,
        dateStr: util.formatDate(date, 'YYYY-MM-DD'),
        day: i,
        hasRecord: hasRecord,
        emotionIcon: hasRecord ? icons[Math.floor(Math.random() * icons.length)] : '',
        isToday: i === new Date().getDate(),
        isCurrentMonth: true,
      })
    }
    return days
  },

  prevMonth: function () {
    var year = this.data.year
    var month = this.data.month
    if (month === 1) {
      month = 12
      year--
    } else {
      month--
    }
    this.setData({ year: year, month: month })
    this.loadCalendarData()
  },

  nextMonth: function () {
    var year = this.data.year
    var month = this.data.month
    if (month === 12) {
      month = 1
      year++
    } else {
      month++
    }
    this.setData({ year: year, month: month })
    this.loadCalendarData()
  },

  onDayTap: function (e) {
    var that = this
    var dateStr = e.currentTarget.dataset.date
    var records = that.data.calendarData[dateStr]

    if (!records || records.length === 0) {
      wx.showToast({
        title: '这一天没有记录',
        icon: 'none',
      })
      return
    }

    var processedRecords = records.map(function (r) {
      var info = util.getEmotionByKey(r.emotion)
      var period = util.getPeriodByTime(new Date(r.record_time))
      return {
        _id: r._id,
        emotion: r.emotion,
        emotion_icon: info.icon,
        emotion_label: info.categoryIcon + ' ' + info.categoryLabel + ' ' + info.icon + info.label,
        period_icon: period.icon,
        period_label: period.label,
        formatted_time: util.formatTime(r.record_time),
        record_time: r.record_time,
      }
    })

    var displayDate = dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/, function (m, y, mo, d) {
      return y + '年' + mo + '月' + d + '日'
    })

    that.setData({
      showDayModal: true,
      selectedDateStr: displayDate,
      selectedDayRecords: processedRecords,
    })
  },

  closeDayModal: function () {
    this.setData({ showDayModal: false })
  },

  stopPropagation: function () {},

  // ═══ 计算本月情绪分布 ═══
  calcEmotionStats: function (records) {
    var catCount = {}
    records.forEach(function (r) {
      var info = util.getEmotionByKey(r.emotion)
      var catKey = info.categoryKey || 'neutral'
      var catLabel = info.categoryLabel || '平淡'
      var catIcon = info.categoryIcon || '🗸'
      if (!catCount[catKey]) {
        catCount[catKey] = { key: catKey, label: catLabel, icon: catIcon, count: 0 }
      }
      catCount[catKey].count++
    })
    var stats = Object.keys(catCount).map(function (k) { return catCount[k] }).sort(function (a, b) { return b.count - a.count })
    return stats
  },

  // ═══ 计算连续记录天数 ═══
  calcStreakDays: function (records) {
    if (!records || records.length === 0) return 0
    var dates = {}
    records.forEach(function (r) {
      var d = util.formatDate(new Date(r.record_time), 'YYYY-MM-DD')
      dates[d] = true
    })
    var sortedDates = Object.keys(dates).sort()
    var today = util.formatDate(new Date(), 'YYYY-MM-DD')
    var streak = 0
    var checkDate = new Date()
    while (true) {
      var ds = util.formatDate(checkDate, 'YYYY-MM-DD')
      if (dates[ds]) {
        streak++
        checkDate = new Date(checkDate.getTime() - 86400000)
      } else {
        break
      }
    }
    return streak
  },

  // ═══ 生成月度温暖语 ═══
  generateMonthlyMessage: function (records, emotionStats) {
    if (!records || records.length === 0) {
      return '这个月还没开始记录呢，今天写一条吧 ✨'
    }
    var total = records.length
    var topCat = emotionStats && emotionStats[0]
    var templates = {
      happy: ['这个月你笑了很久，真好 😊', '你的开心感染了每一天，继续吧 ✨', '快乐的日子总是过得特别快，好好珍惜 ☀️'],
      calm: ['平静也是一种力量 🌙', '这个月你很稳，我看到了 🧠', '安静地陪着自己，也是种温柔 🌙'],
      anxious: ['焦虑的时候，记得你已经很努力了 🧬', '慢慢来，你不需要每件事都做好 🧬', '这个月辛苦了，抱抱 🧬'],
      sad: ['难过的时候，我都在 🙂', '眼泪流完了，会好起来的 🌈', '你已经很勇敢了，真的 💜'],
      angry: ['生气是正常的，别憋着 💢', '这个月有点火药味，要不要缓缓？🧨', '你的情绪有力量，用在值得的地方 💪'],
      tired: ['累了就歇歇，不用一直撑着 🙃', '这个月辛苦了，好好睡一觉吧 💤', '休息不是偷懒，是给身体充电 🙃'],
      lost: ['迷茫的时候，慢慢走就好 📁', '看不清路也没关系，先坐下歇会儿 🌌', '你不是一个人，我在这儿 🙃'],
      warm: ['这个月你被温暖包围着呢 💜', '有人爱你，你也要好好爱自己 ❤️', '温暖的记忆，要好好收藏 🌟'],
    }
    var key = topCat ? topCat.key : 'calm'
    var pool = templates[key] || templates['calm']
    return pool[Math.floor(Math.random() * pool.length)]
  },
})