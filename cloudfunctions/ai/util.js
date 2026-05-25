/**
 * 情绪相关配置和数据 - ES5 兼容版
 */

var EMOTION_CATEGORIES = [
  {
    key: 'happy',
    label: '开心',
    icon: '😊',
    subEmotions: [
      { key: 'happy_excited', label: '兴奋', icon: '🤩', desc: '心跳加速的喜悦' },
      { key: 'happy_joyful', label: '愉悦', icon: '😄', desc: '轻松愉快的心情' },
      { key: 'happy_grateful', label: '感恩', icon: '🙏', desc: '心怀感激' },
      { key: 'happy_relieved', label: '释然', icon: '😌', desc: '放下后的轻松' },
    ],
  },
  {
    key: 'calm',
    label: '平静',
    icon: '😌',
    subEmotions: [
      { key: 'calm_peaceful', label: '安宁', icon: '🍃', desc: '内心平和宁静' },
      { key: 'calm_focused', label: '专注', icon: '🎯', desc: '心无旁骛' },
      { key: 'calm_composed', label: '从容', icon: '☕', desc: '淡定自若' },
      { key: 'calm_content', label: '满足', icon: '😊', desc: '小确幸的感觉' },
    ],
  },
  {
    key: 'anxious',
    label: '焦虑',
    icon: '😟',
    subEmotions: [
      { key: 'anxious_worried', label: '担忧', icon: '😰', desc: '对未知的顾虑' },
      { key: 'anxious_restless', label: '焦躁', icon: '😫', desc: '坐立不安' },
      { key: 'anxious_pressured', label: '压力大', icon: '⛰️', desc: '喘不过气的重担' },
      { key: 'anxious_hesitant', label: '犹豫', icon: '🤔', desc: '难以抉择' },
    ],
  },
  {
    key: 'sad',
    label: '难过',
    icon: '😢',
    subEmotions: [
      { key: 'sad_down', label: '低落', icon: '😔', desc: '提不起劲' },
      { key: 'sad_hurt', label: '受伤', icon: '🤕', desc: '被刺痛的感觉' },
      { key: 'sad_lonely', label: '孤独', icon: '😢', desc: '一个人好冷清' },
      { key: 'sad_regretful', label: '遗憾', icon: '😞', desc: '如果当初...' },
    ],
  },
  {
    key: 'angry',
    label: '愤怒',
    icon: '😠',
    subEmotions: [
      { key: 'angry_frustrated', label: '挫败', icon: '😤', desc: '努力被辜负' },
      { key: 'angry_annoyed', label: '恼火', icon: '😠', desc: '小事也恼心' },
      { key: 'angry_resentful', label: '怨恨', icon: '😑', desc: '凭什么是我' },
      { key: 'angry_injustice', label: '愤怒', icon: '🔥', desc: '气到发抖' },
    ],
  },
  {
    key: 'tired',
    label: '疲惫',
    icon: '😫',
    subEmotions: [
      { key: 'tired_physical', label: '身体累', icon: '🤌', desc: '需要好好休息' },
      { key: 'tired_mental', label: '心累', icon: '🫠', desc: '脑子转不动' },
      { key: 'tired_bored', label: '无聊', icon: '🫱', desc: '做什么都没劲' },
      { key: 'tired_exhausted', label: '精疲力竭', icon: '⚡', desc: '快没电了' },
    ],
  },
  {
    key: 'confused',
    label: '迷茫',
    icon: '😕',
    subEmotions: [
      { key: 'confused_lost', label: '迷失', icon: '🌀', desc: '不知道路在哪' },
      { key: 'confused_conflicted', label: '矛盾', icon: '⚖️', desc: '两难的选择' },
      { key: 'confused_doubtful', label: '怀疑', icon: '❓', desc: '这样做对吗' },
      { key: 'confused_blurred', label: '模糊', icon: '🏙️', desc: '说不清的感受' },
    ],
  },
  {
    key: 'warm',
    label: '温暖',
    icon: '🥰',
    subEmotions: [
      { key: 'warm_grateful', label: '感恩', icon: '🙏', desc: '被照亮，想说谢谢' },
      { key: 'warm_loved', label: '被爱', icon: '💝', desc: '感觉到被在乎、被珍惜' },
      { key: 'warm_peaceful', label: '安心', icon: '🛡️', desc: '有人撑腰，很踏实' },
      { key: 'warm_healed', label: '治愈', icon: '🌈', desc: '伤口在慢慢愈合' },
    ],
  },
]

// 主情绪列表（用于报告页图表等）
var EMOTIONS = EMOTION_CATEGORIES.map(function (cat) {
  return {
    key: cat.key,
    label: cat.label,
    icon: cat.icon,
    score: 0,
    color: '#999999',
  }
})

// 时段定义（4个时段）
var PERIODS = [
  { key: 'morning', label: '上午', icon: '☀️' },
  { key: 'afternoon', label: '下午', icon: '🌤️' },
  { key: 'evening', label: '傍晚', icon: '🌆' },
  { key: 'night', label: '深夜', icon: '🌙' },
]

function getPeriodByTime(time) {
  var hour = time.getHours()
  if (hour >= 6 && hour < 12) return PERIODS[0]
  if (hour >= 12 && hour < 18) return PERIODS[1]
  if (hour >= 18 && hour < 21) return PERIODS[2]
  return PERIODS[3]
}

function getEmotionByKey(key) {
  var cats = EMOTION_CATEGORIES
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i]
    var subs = cat.subEmotions
    for (var j = 0; j < subs.length; j++) {
      if (subs[j].key === key) {
        return {
          key: subs[j].key,
          label: subs[j].label,
          icon: subs[j].icon,
          desc: subs[j].desc,
          categoryKey: cat.key,
          categoryLabel: cat.label,
          categoryIcon: cat.icon,
        }
      }
    }
  }
  return { key: key, label: key, icon: '🥰', desc: '', categoryKey: 'warm', categoryLabel: '温暖', categoryIcon: '🥰' }
}

function getScore(key) {
  var scoreMap = {
    happy: 4,
    calm: 3,
    warm: 3,
    confused: 2,
    tired: 2,
    anxious: 1,
    sad: 1,
    angry: 0
  }
  if (!key) return 2
  var cat = key.split('_')[0]
  return scoreMap[cat] !== undefined ? scoreMap[cat] : 2
}

function getEmotionLabel(key) {
  var info = getEmotionByKey(key)
  return info.categoryIcon + ' ' + info.categoryLabel + '·' + info.icon + info.label
}

function formatDate(date, format) {
  var d = date instanceof Date ? date : new Date(date)
  var year = d.getFullYear()
  var month = (d.getMonth() + 1).toString()
  var day = d.getDate().toString()
  var hour = d.getHours().toString()
  var minute = d.getMinutes().toString()

  while (month.length < 2) month = '0' + month
  while (day.length < 2) day = '0' + day
  while (hour.length < 2) hour = '0' + hour
  while (minute.length < 2) minute = '0' + minute

  var result = format || 'YYYY-MM-DD'
  result = result.replace('YYYY', year)
  result = result.replace('MM', month)
  result = result.replace('DD', day)
  result = result.replace('HH', hour)
  result = result.replace('mm', minute)
  return result
}

function formatTime(date) {
  var d = date instanceof Date ? date : new Date(date)
  var hour = d.getHours().toString()
  var minute = d.getMinutes().toString()
  while (hour.length < 2) hour = '0' + hour
  while (minute.length < 2) minute = '0' + minute
  return hour + ':' + minute
}

function getDayStart(date) {
  var d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDayEnd(date) {
  var d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getDaysAgo(n) {
  var d = new Date()
  d.setDate(d.getDate() - n)
  return getDayStart(d)
}

function isSameDay(date1, date2) {
  var d1 = date1 instanceof Date ? date1 : new Date(date1)
  var d2 = date2 instanceof Date ? date2 : new Date(date2)
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

function isToday(date) {
  return isSameDay(date, new Date())
}

function isYesterday(date) {
  var yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

function calcStreak(records) {
  if (!records || records.length === 0) return 0

  var days = {}
  records.forEach(function (r) {
    var d = new Date(r.record_time)
    var key = formatDate(d, 'YYYY-MM-DD')
    days[key] = true
  })

  var streak = 0
  var today = new Date()
  for (var i = 0; i < 365; i++) {
    var d = new Date(today)
    d.setDate(d.getDate() - i)
    var key = formatDate(d, 'YYYY-MM-DD')
    if (days[key]) {
      streak++
    } else {
      break
    }
  }
  return streak
}

module.exports = {
  EMOTION_CATEGORIES: EMOTION_CATEGORIES,
  EMOTIONS: EMOTIONS,
  PERIODS: PERIODS,
  getPeriodByTime: getPeriodByTime,
  getEmotionByKey: getEmotionByKey,
  getScore: getScore,
  getEmotionLabel: getEmotionLabel,
  formatDate: formatDate,
  formatTime: formatTime,
  getDayStart: getDayStart,
  getDayEnd: getDayEnd,
  getDaysAgo: getDaysAgo,
  isSameDay: isSameDay,
  isToday: isToday,
  isYesterday: isYesterday,
  calcStreak: calcStreak,
}
