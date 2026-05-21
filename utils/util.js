/**
 * 情绪相关配置和数据
 */

// 7种情绪定义
const EMOTIONS = [
  { key: 'excited', label: '兴奋', icon: '😊', score: 2, color: '#4CAF50' },
  { key: 'happy', label: '愉快', icon: '😌', score: 1, color: '#8BC34A' },
  { key: 'calm', label: '平静', icon: '😐', score: 0, color: '#FFC107' },
  { key: 'sad', label: '低落', icon: '😔', score: -1, color: '#FF9800' },
  { key: 'angry', label: '烦躁', icon: '😠', score: -1, color: '#FF9800' },
  { key: 'crying', label: '伤心', icon: '😢', score: -2, color: '#F44336' },
  { key: 'tired', label: '疲惫', icon: '😴', score: -2, color: '#9E9E9E' },
]

// 时段定义
const PERIODS = [
  { key: 'morning_early', label: '清晨', start: '06:00', end: '09:00', icon: '🌅' },
  { key: 'morning', label: '上午', start: '09:00', end: '12:00', icon: '☀️' },
  { key: 'noon', label: '午间', start: '12:00', end: '14:00', icon: '🌤️' },
  { key: 'afternoon', label: '下午', start: '14:00', end: '18:00', icon: '🌇' },
  { key: 'evening', label: '傍晚', start: '18:00', end: '21:00', icon: '🌆' },
  { key: 'night', label: '夜晚', start: '21:00', end: '06:00', icon: '🌙' },
]

/**
 * 根据时间获取时段
 */
function getPeriodByTime(time) {
  const hour = time.getHours()
  const minute = time.getMinutes()
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  
  for (const period of PERIODS) {
    if (period.key === 'night') {
      if (hour >= 21 || hour < 6) return period
    } else {
      if (timeStr >= period.start && timeStr < period.end) return period
    }
  }
  
  // 默认返回当前时段
  return PERIODS[getCurrentPeriodIndex()]
}

/**
 * 获取当前时段索引
 */
function getCurrentPeriodIndex() {
  const hour = new Date().getHours()
  if (hour >= 21 || hour < 6) return 5  // night
  if (hour >= 18) return 4          // evening
  if (hour >= 14) return 3         // afternoon
  if (hour >= 12) return 2         // noon
  if (hour >= 9) return 1          // morning
  return 0                          // morning_early
}

/**
 * 根据情绪key获取情绪信息
 */
function getEmotionByKey(key) {
  return EMOTIONS.find(e => e.key === key) || EMOTIONS[3] // 默认返回低落
}

/**
 * 根据情绪分值获取情绪信息
 */
function getEmotionByScore(score) {
  const emotion = EMOTIONS.find(e => e.score === score)
  return emotion || EMOTIONS[2] // 默认返回平静
}

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  const second = d.getSeconds().toString().padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `${hour}:${minute}`
}

/**
 * 获取日期的开始时间（00:00:00）
 */
function getDayStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取日期的结束时间（23:59:59）
 */
function getDayEnd(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * 判断两个日期是否是同一天
 */
function isSameDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

/**
 * 获取周一的日期
 */
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取周日日期
 */
function getSunday(date) {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

/**
 * 获取日历月份数据
 */
function getMonthDays(year, month) {
  const days = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startWeekday = firstDay.getDay()
  
  // 上月剩余天数
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i)
    days.push({ date: d, isCurrentMonth: false })
  }
  
  // 当月天数
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month - 1, i)
    days.push({ date: d, isCurrentMonth: true })
  }
  
  // 下月补齐天数
  const remain = 42 - days.length
  for (let i = 1; i <= remain; i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, isCurrentMonth: false })
  }
  
  return days
}

/**
 * 计算连续打卡天数
 */
function calculateStreak(records) {
  if (!records || records.length === 0) return 0
  
  // 按日期分组，获取每天的最后一条记录
  const today = new Date()
  let streak = 0
  let checkDate = new Date(today)
  
  // 按日期排序记录
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.record_time) - new Date(a.record_time)
  )
  
  // 获取有记录的最新日期
  const latestRecord = sortedRecords[0]
  if (!latestRecord) return 0
  
  const latestDate = new Date(latestRecord.record_time)
  const latestDayStr = formatDate(latestDate, 'YYYY-MM-DD')
  const todayStr = formatDate(today, 'YYYY-MM-DD')
  
  // 如果最新记录不是今天或昨天，连续断开
  const dayDiff = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24))
  if (dayDiff > 1) return 0
  
  // 从最新记录开始往前计数
  const recordDates = new Set(sortedRecords.map(r => formatDate(new Date(r.record_time), 'YYYY-MM-DD')))
  
  while (true) {
    const checkStr = formatDate(checkDate, 'YYYY-MM-DD')
    if (recordDates.has(checkStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return streak
}

module.exports = {
  EMOTIONS,
  PERIODS,
  getPeriodByTime,
  getCurrentPeriodIndex,
  getEmotionByKey,
  getEmotionByScore,
  formatDate,
  formatTime,
  getDayStart,
  getDayEnd,
  isSameDay,
  getMonday,
  getSunday,
  getMonthDays,
  calculateStreak,
}