// pages/calendar/calendar.js
const app = getApp()
const util = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    calendarData: {}, // { '2025-05-21': record }
    monthStats: { days: 0 },
    
    // 弹窗
    showDayModal: false,
    selectedDateStr: '',
    selectedDayRecords: [],
  },

  onLoad() {
    this.loadCalendarData()
  },

  onShow() {
    if (this.data.calendarData) {
      this.loadCalendarData()
    }
  },

  // 加载日历数据
  async loadCalendarData() {
    try {
      const { year, month } = this.data
      const calendarData = await db.getCalendarData(this.data.userId || '', year, month)
      
      // 处理日历天数
      const days = util.getMonthDays(year, month).map(item => {
        const dateStr = util.formatDate(item.date, 'YYYY-MM-DD')
        const hasRecord = !!calendarData[dateStr]
        const emotion = hasRecord ? util.getEmotionByKey(calendarData[dateStr].emotion) : null
        const isToday = util.isSameDay(item.date, new Date())
        
        return {
          ...item,
          dateStr,
          day: item.date.getDate(),
          hasRecord,
          emotionIcon: emotion ? emotion.icon : '',
          emotionKey: emotion ? emotion.key : '',
          isToday,
        }
      }).filter(item => item.isCurrentMonth)
      
      // 统计有记录的天数
      const daysWithRecord = Object.keys(calendarData).length
      
      this.setData({
        calendarData,
        days,
        monthStats: { days: daysWithRecord },
      })
    } catch (err) {
      console.error('加载日历数据失败:', err)
      // 使用模拟数据
      this.setData({
        days: this.generateMockDays(),
      })
    }
  },

  // 生成模拟数据（测试用）
  generateMockDays() {
    const { year, month } = this.data
    const days = []
    for (let i = 1; i <= 30; i++) {
      const date = new Date(year, month - 1, i)
      days.push({
        date,
        dateStr: util.formatDate(date, 'YYYY-MM-DD'),
        day: i,
        hasRecord: Math.random() > 0.3,
        emotionIcon: ['😊', '😌', '😐', '😔', '😢'][Math.floor(Math.random() * 5)],
        isToday: i === new Date().getDate(),
      })
    }
    return days
  },

  // 上个月
  prevMonth() {
    let { year, month } = this.data
    if (month === 1) {
      month = 12
      year--
    } else {
      month--
    }
    this.setData({ year, month })
    this.loadCalendarData()
  },

  // 下个月
  nextMonth() {
    let { year, month } = this.data
    if (month === 12) {
      month = 1
      year++
    } else {
      month++
    }
    this.setData({ year, month })
    this.loadCalendarData()
  },

  // 点击日期
  async onDayTap(e) {
    const dateStr = e.currentTarget.dataset.date
    const record = this.data.calendarData[dateStr]
    
    if (!record) {
      wx.showToast({
        title: '这一天没有记录',
        icon: 'none',
      })
      return
    }
    
    // 加载当天的所有记录
    try {
      const records = await db.getRecordsByDate(this.data.userId || '', dateStr)
      const processedRecords = records.map(r => ({
        ...r,
        emotion_icon: util.getEmotionByKey(r.emotion).icon,
        emotion_label: util.getEmotionByKey(r.emotion).label,
        formatted_time: util.formatTime(r.record_time),
      }))
      
      this.setData({
        showDayModal: true,
        selectedDateStr: dateStr.replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$1年$2月$3日'),
        selectedDayRecords: processedRecords,
      })
    } catch (err) {
      // 使用模拟数据
      this.setData({
        showDayModal: true,
        selectedDateStr: dateStr.replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$1年$2月$3日'),
        selectedDayRecords: [{
          period_icon: '🌅',
          period_label: '上午',
          formatted_time: '10:30',
          emotion_icon: '😊',
          emotion_label: '兴奋',
          text: '今天心情不错！',
        }],
      })
    }
  },

  closeDayModal() {
    this.setData({ showDayModal: false })
  },

  stopPropagation() {},
})