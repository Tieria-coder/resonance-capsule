// pages/index/index.js - ES5 compatible
var app = getApp()
var util = require('../../utils/util')
var db = require('../../utils/db')

// 原生录音管理器
var recorderManager = wx.getRecorderManager()

Page({
  data: {
    userId: '',
    openid: '',

    // ═══ 情绪选择（两步） ═══
    showModal: false,
    diaryMode: false,
    expandedCategoryKey: '',
    expandedCategory: null,
    allCategories: [], // 所有8个情绪大类（用于初始4+4布局）
    topCategories: [], // 选中时，上面一行（3个，缩小）
    bottomCategories: [], // 选中时，下面一行（4个，缩小）
    selectedKeys: {},
    tempSubEmotions: [],
    selectedLabels: '已选 0 个',
    tempText: '',

    // ═══ AI 陪伴 ═══
    aiResponse: '',
    showAiResponse: false,
    aiLoading: false,

    // ═══ AI 日记 ═══
    diaryText: '',
    isRecording: false,
    recordingText: '',

    // ═══ 继续聊聊 ═══
    showChat: false,
    chatMessages: [],
    chatLoading: false,
    chatInput: '',
    chatRoundCount: 0,
    currentRecordId: '',
    // 来自报告页的上下文（AI洞察报告内容）
    reportContext: null,


    // ═══ 今日记录 ═══
    todayRecords: [],
    todayCount: 0,
    selectedEmotion: null,

    // ═══ 用户统计 ═══
    userStats: {
      streak: 0,
      max_streak: 0,
      total_records: 0
    },
    streakProgress: 0,

    // ═══ 情绪诗语 ═══
    poetry: '',
    poetryDate: '',
    poetryLoading: false,

    // ═══ Toast ═══
    showToast: false,
    toastText: ''
  },

  onLoad: function (opts) {
    // 检查是否从报告页跳转过来（带报告上下文进入聊天）
    if (opts && opts.chat === '1') {
      var mode = wx.getStorageSync('report_chat_mode') || ''
      var context = wx.getStorageSync('report_chat_context') || null
      if (context) {
        this.setData({ reportContext: context })
        // 建议模式：自动填入提示语
        if (mode === 'suggestion') {
          this.setData({ chatInput: '基于刚才的情绪洞察，给我一些建议好吗？' })
        }
        // 打开聊天弹窗
        setTimeout(function () {
          this.setData({ showChat: true })
        }.bind(this), 100)
      }
      // 清理 storage
      wx.removeStorageSync('report_chat_mode')
      wx.removeStorageSync('report_chat_context')
    }

    this._initUser()
    this._initVoiceRecorder()
    // 初始化所有情绪大类（用于初始4+4布局）
    var all = util.EMOTION_CATEGORIES
    this.setData({
      allCategories: all,
      topCategories: all.slice(0, 4),
      bottomCategories: all.slice(4, 8)
    })
  },

  onShow: function () {
    var that = this
    that.loadPoetry()
    if (that.data.openid) {
      that._loadTodayRecords()
      that._loadUserStats()
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
    }
  },

  // ─── 页面销毁时清理定时器 ───
  onUnload: function () {
    if (this._hideAiTimer) {
      clearTimeout(this._hideAiTimer)
      this._hideAiTimer = null
    }
  },

  // ─── 初始化用户 ───
  _initUser: function () {
    var that = this
    app.getOpenid().then(function (openid) {
      that.setData({ openid: openid })
      db.getUser(openid).then(function (user) {
        if (!user) {
          return db.upsertUser({ openid: openid }).then(function () {
            return db.getUser(openid)
          })
        }
        return user
      }).then(function (user) {
        that.setData({ userId: user._id })
        that._loadTodayRecords()
        that._loadUserStats()
      }).catch(function (err) {
        console.error('初始化用户失败:', err)
        that._showToast('请确保已配置云开发环境')
      })
    })
  },

  // ─── 加载今日记录 ───
  _loadTodayRecords: function () {
    var that = this
    db.getTodayRecords(that.data.userId).then(function (records) {
      console.log('[今天记录] 加载到', records.length, '条记录', records)
      var processed = records.map(function (record) {
        // 处理多个情绪（新格式）或单个情绪（旧格式）
        var emotions = record.emotions || [record.emotion]
        var emotionObjs = emotions.map(function(key) {
          return util.getEmotionByKey(key)
        })
        
        // 生成 "图标+标签" 一一对应的格式
        // 例如："🤩 兴奋 😄 愉快"
        var emotionDisplay = emotionObjs.map(function(e) {
          return e.icon + ' ' + e.label
        }).join(' ')
        
        var period = util.getPeriodByTime(new Date(record.record_time))
        var obj = {}
        // 手动复制 record 的所有属性
        for (var key in record) {
          if (record.hasOwnProperty(key)) {
            obj[key] = record[key]
          }
        }
        obj.emotion_display = emotionDisplay  // "🤩 兴奋 😄 愉快"
        obj.period_label = period.label
        obj.period_icon = period.icon
        obj.formatted_time = util.formatTime(record.record_time)
        return obj
      })
      that.setData({
        todayRecords: processed,
        todayCount: records.length,
        // 不再设置 selectedEmotion，避免覆盖用户选择
        selectedEmotion: null
      })
    }).catch(function (err) {
      console.error('加载今日记录失败:', err)
    })
  },

  // ─── 加载用户统计 ───
  _loadUserStats: function () {
    var that = this
    db.getUser(that.data.openid).then(function (user) {
      if (user && user.stats) {
        var streakProgress = Math.min((user.stats.streak / 30) * 100, 100)
        that.setData({ userStats: user.stats, streakProgress: streakProgress })
      }
    }).catch(function (err) {
      console.error('加载用户统计失败:', err)
    })
  },

  // ─── 构建简易用户画像 ───
  _buildUserPortrait: function (userId) {
    var that = this
    return db.getRecords(userId, { limit: 60 }).then(function (records) {
      if (!records || records.length === 0) return null

      var now = new Date()
      var sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      var fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      var recent7Scores = []
      var previous7Scores = []

      records.forEach(function (r) {
        var recordTime = new Date(r.record_time)
        var score = util.getScore(r.emotion || (r.emotions && r.emotions[0]))

        if (recordTime >= sevenDaysAgo) {
          recent7Scores.push(score)
        } else if (recordTime >= fourteenDaysAgo) {
          previous7Scores.push(score)
        }
      })

      var recent7Avg = recent7Scores.length > 0 ? recent7Scores.reduce(function (a, b) { return a + b }, 0) / recent7Scores.length : 0
      var previous7Avg = previous7Scores.length > 0 ? previous7Scores.reduce(function (a, b) { return a + b }, 0) / previous7Scores.length : 0

      var trend = '稳定'
      if (recent7Avg - previous7Avg > 0.3) trend = '改善中'
      if (recent7Avg - previous7Avg < -0.3) trend = '下滑'

      var periodEmotionCounts = {}
      var weekdayEmotionCounts = {}

      records.forEach(function (r) {
        var recordTime = new Date(r.record_time)
        var period = r.period || 'unknown'
        var weekday = recordTime.getDay()
        var info = util.getEmotionByKey(r.emotion || (r.emotions && r.emotions[0]))
        var category = info ? info.categoryKey || 'neutral' : 'neutral'

        if (!periodEmotionCounts[period]) periodEmotionCounts[period] = {}
        periodEmotionCounts[period][category] = (periodEmotionCounts[period][category] || 0) + 1

        if (!weekdayEmotionCounts[weekday]) weekdayEmotionCounts[weekday] = {}
        weekdayEmotionCounts[weekday][category] = (weekdayEmotionCounts[weekday][category] || 0) + 1
      })

      var mostAnxiousPeriod = 'unknown'
      var mostHappyPeriod = 'unknown'
      var maxAnxious = 0
      var maxHappy = 0

      Object.keys(periodEmotionCounts).forEach(function (period) {
        var counts = periodEmotionCounts[period]
        if ((counts.anxious || 0) > maxAnxious) {
          maxAnxious = counts.anxious
          mostAnxiousPeriod = period
        }
        if ((counts.happy || 0) > maxHappy) {
          maxHappy = counts.happy
          mostHappyPeriod = period
        }
      })

      var worstWeekday = -1
      var maxWeekdayAnxious = 0
      var weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

      Object.keys(weekdayEmotionCounts).forEach(function (weekday) {
        var counts = weekdayEmotionCounts[weekday]
        if ((counts.anxious || 0) > maxWeekdayAnxious) {
          maxWeekdayAnxious = counts.anxious
          worstWeekday = parseInt(weekday)
        }
      })

      // ── 最佳星期几（开心/平静记录最多的那一天） ──
      var bestWeekday = -1
      var maxWeekdayHappy = 0
      Object.keys(weekdayEmotionCounts).forEach(function (weekday) {
        var counts = weekdayEmotionCounts[weekday]
        var happyCount = (counts.happy || 0) + (counts.calm || 0)
        if (happyCount > maxWeekdayHappy) {
          maxWeekdayHappy = happyCount
          bestWeekday = parseInt(weekday)
        }
      })

      // ── 情绪分布（百分比） ──
      var totalRecords = records.length
      var emotionDistribution = {}
      Object.keys(emotionCounts).forEach(function (key) {
        emotionDistribution[key] = Math.round((emotionCounts[key] / totalRecords) * 100)
      })

      var emotionCounts = {}
      var periodCounts = {}
      var totalScore = 0
      var maxScore = -999
      var minScore = 999
      var negativeCount = 0
      var recordDaysMap = {}
      var anxiousCategories = ['anxious', 'sad', 'angry']
      var lastDateStr = ''
      var consecutiveAnxiousDays = 0

      // ── 连续焦虑天数：按天计算，从最近一条往前数 ──
      records.forEach(function (r) {
        var info = util.getEmotionByKey(r.emotion || (r.emotions && r.emotions[0]))
        var category = info ? info.categoryKey || 'neutral' : 'neutral'
        emotionCounts[category] = (emotionCounts[category] || 0) + 1

        var period = r.period || 'unknown'
        periodCounts[period] = (periodCounts[period] || 0) + 1

        var score = util.getScore(r.emotion || (r.emotions && r.emotions[0]))
        totalScore += score
        if (score > maxScore) maxScore = score
        if (score < minScore) minScore = score
        if (score < 0) negativeCount++

        var dateStr = util.formatDate(new Date(r.record_time), 'YYYY-MM-DD')
        recordDaysMap[dateStr] = true
      })

      // 计算连续焦虑天数（按天，去重）
      var anxietyDaysSet = {}
      records.forEach(function (r) {
        var info = util.getEmotionByKey(r.emotion || (r.emotions && r.emotions[0]))
        var category = info ? info.categoryKey || 'neutral' : 'neutral'
        var dateStr = util.formatDate(new Date(r.record_time), 'YYYY-MM-DD')
        if (anxiousCategories.indexOf(category) > -1) {
          anxietyDaysSet[dateStr] = true
        }
      })
      var anxietyDays = Object.keys(anxietyDaysSet).sort().reverse()
      for (var i = 0; i < anxietyDays.length; i++) {
        if (i === 0) {
          consecutiveAnxiousDays = 1
        } else {
          var prev = new Date(anxietyDays[i - 1])
          var curr = new Date(anxietyDays[i])
          var diff = (prev - curr) / (1000 * 60 * 60 * 24)
          if (diff <= 1.5) {
            consecutiveAnxiousDays++
          } else {
            break
          }
        }
      }

      var avgScore = totalScore / records.length

      var topEmotionEntry = null
      Object.keys(emotionCounts).forEach(function (key) {
        if (!topEmotionEntry || emotionCounts[key] > emotionCounts[topEmotionEntry]) {
          topEmotionEntry = key
        }
      })
      var topPeriodEntry = null
      Object.keys(periodCounts).forEach(function (key) {
        if (!topPeriodEntry || periodCounts[key] > periodCounts[topPeriodEntry]) {
          topPeriodEntry = key
        }
      })

      return db.getUser(userId).then(function (user) {
        var conversationHistory = []
        if (user && user.conversationHistory && Array.isArray(user.conversationHistory)) {
          conversationHistory = user.conversationHistory.slice(-5)
        }

        return {
          recordCount: records.length,
          avgScore: avgScore.toFixed(1),
          maxScore: maxScore,
          minScore: minScore === 999 ? 0 : minScore,
          topEmotion: topEmotionEntry || 'neutral',
          topPeriod: topPeriodEntry || 'unknown',
          streak: that.data.userStats.streak || 0,
          maxStreak: (user && user.stats && user.stats.max_streak) || 0,
          trend: trend,
          recent7Avg: recent7Avg.toFixed(1),
          previous7Avg: previous7Avg.toFixed(1),
          mostAnxiousPeriod: mostAnxiousPeriod,
          mostHappyPeriod: mostHappyPeriod,
          worstWeekday: worstWeekday >= 0 ? weekdayNames[worstWeekday] : '未知',
          bestWeekday: bestWeekday >= 0 ? weekdayNames[bestWeekday] : '未知',
          consecutiveAnxiousDays: consecutiveAnxiousDays,
          emotionDistribution: emotionDistribution,
          negativeRecordRatio: totalRecords > 0 ? Math.round((negativeCount / totalRecords) * 100) : 0,
          recordDaysCount: Object.keys(recordDaysMap).length,
          conversationHistory: conversationHistory,
          createdAt: user ? user.created_at : null
        }
      })
    }).catch(function (e) {
      console.error('构建用户画像失败:', e)
      return null
    })
  },

  // ─── 保存对话历史 ───
  // ─── 保存对话历史（用户消息+AI回复配对存入） ───
  _saveConversationHistory: function (userId, userMsg, aiResponse) {
    if (!userId) return
    db.getUser(userId).then(function (user) {
      var history = (user && Array.isArray(user.conversationHistory)) ? user.conversationHistory : []
      history.push({
        timestamp: new Date(),
        user: userMsg || '',
        response: aiResponse || ''
      })
      // 最多保留最近 10 对
      if (history.length > 10) history.splice(0, history.length - 10)
      return db.updateUser(userId, { conversationHistory: history })
    }).catch(function (e) {
      console.error('保存对话历史失败:', e)
    })
  },

  goToPlan: function () {
    wx.navigateTo({ url: '/pages/plan/plan' })
  },

  goToReports: function () {
    wx.navigateTo({ url: '/pages/report/report' })
  },

  // ─── 显示情绪选择器（手动模式） ───
  showEmotionPicker: function () {
    var that = this
    that.setData({
      showModal: true,
      diaryMode: false,
      expandedCategoryKey: '',
      expandedCategory: null,
      selectedKeys: {},
      tempSubEmotions: [],
      tempText: '',
      selectedLabels: '已选 0 个'
    })
    this._computeLayout()
  },

  // ─── 显示情绪选择器（AI 日记模式） ───
  showDiaryPicker: function () {
    this.setData({
      showModal: true,
      diaryMode: true,
      tempText: '',
      diaryText: ''
    })
  },

  hideEmotionPicker: function () {
    this.setData({ showModal: false })
  },

  stopPropagation: function () {},

  // ─── 计算三区布局 ───
  _computeLayout: function () {
    var cats = util.EMOTION_CATEGORIES
    this.setData({
      topCategories: cats.slice(0, 3),
      bottomCategories: cats.slice(3),
      selectedLabels: '已选 0 个'
    })
  },

  toggleCategory: function (e) {
    var key = e.currentTarget.dataset.key
    if (this.data.expandedCategoryKey === key) {
      // 关闭，重置为4+4布局
      var all = this.data.allCategories
      this.setData({
        expandedCategoryKey: '',
        expandedCategory: null,
        topCategories: all.slice(0, 4),
        bottomCategories: all.slice(4, 8)
      })
    } else {
      var cats = util.EMOTION_CATEGORIES
      for (var i = 0; i < cats.length; i++) {
        if (cats[i].key === key) {
          this.setData({ expandedCategoryKey: key, expandedCategory: cats[i] })
          this.updateCategoryLayout(key)
          break
        }
      }
    }
  },

  // ═══ 动态计算三行布局 ═══
  updateCategoryLayout: function (expandedKey) {
    var cats = util.EMOTION_CATEGORIES
    var top = []
    var bottom = []
    
    // 把除了 expandedKey 之外的 7 个分成 top(3个) 和 bottom(4个)
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].key !== expandedKey) {
        if (top.length < 3) {
          top.push(cats[i])
        } else {
          bottom.push(cats[i])
        }
      }
    }
    
    this.setData({
      topCategories: top,
      bottomCategories: bottom
    })
  },

  closeCategory: function () {
    this.setData({ expandedCategoryKey: '', expandedCategory: null })
  },

  // ─── 选择子情绪 ───
  selectSubEmotion: function (e) {
    var key = e.currentTarget.dataset.key  // 现在只传 key，不传对象
    var selectedKeys = this.data.selectedKeys
    var tempSubEmotions = this.data.tempSubEmotions

    // 根据 key 查找完整的子情绪对象
    var sub = null
    var cats = util.EMOTION_CATEGORIES
    for (var i = 0; i < cats.length; i++) {
      for (var j = 0; j < cats[i].subEmotions.length; j++) {
        if (cats[i].subEmotions[j].key === key) {
          sub = cats[i].subEmotions[j]
          break
        }
      }
      if (sub) break
    }

    if (!sub) {
      console.error('[选择情绪] 未找到情绪 key:', key)
      return
    }

    if (selectedKeys[key]) {
      // 已选中，取消选择
      var newKeys = {}
      for (var k in selectedKeys) {
        if (selectedKeys.hasOwnProperty(k) && k !== key) {
          newKeys[k] = true
        }
      }
      var newArr = []
      for (var j = 0; j < tempSubEmotions.length; j++) {
        if (tempSubEmotions[j].key !== key) {
          newArr.push(tempSubEmotions[j])
        }
      }
      this.setData({
        selectedKeys: newKeys,
        tempSubEmotions: newArr,
        selectedLabels: '已选 ' + newArr.length + ' 个'
      })
    } else {
      // 未选中，检查上限
      if (tempSubEmotions.length >= 3) {
        this._showToast('最多选3个哦')
        return
      }
      var newArr2 = tempSubEmotions.slice()
      newArr2.push(sub)
      var newKeys2 = {}
      for (var k2 in selectedKeys) {
        if (selectedKeys.hasOwnProperty(k2)) {
          newKeys2[k2] = true
        }
      }
      newKeys2[key] = true
      console.log('[选择情绪] 选中:', sub.label, '当前已选:', newArr2.length, '个')
      this.setData({
        selectedKeys: newKeys2,
        tempSubEmotions: newArr2,
        selectedLabels: '已选 ' + newArr2.length + ' 个'
      })
    }
  },

  removeSubEmotion: function (e) {
    var key = e.currentTarget.dataset.key
    var selectedKeys = this.data.selectedKeys
    var tempSubEmotions = this.data.tempSubEmotions

    var newKeys = {}
    for (var k in selectedKeys) {
      if (selectedKeys.hasOwnProperty(k) && k !== key) {
        newKeys[k] = true
      }
    }
    var newArr = []
    for (var j = 0; j < tempSubEmotions.length; j++) {
      if (tempSubEmotions[j].key !== key) {
        newArr.push(tempSubEmotions[j])
      }
    }
    this.setData({
      selectedKeys: newKeys,
      tempSubEmotions: newArr,
      selectedLabels: '已选 ' + newArr.length + ' 个'
    })
  },

  switchToManual: function () {
    this.setData({ diaryMode: false })
  },

  switchToDiary: function () {
    this.setData({ diaryMode: true })
  },

  // ─── 语音录入 ───
  _initVoiceRecorder: function () {
    var that = this

    recorderManager.onStop(function (res) {
      that.setData({ isRecording: false, recordingText: '' })
      if (!res.tempFilePath) return

      that.setData({ recordingText: '正在识别...' })
      var timestamp = Date.now()
      var random = Math.random().toString(36).substr(2, 6)
      var cloudPath = 'voice/' + timestamp + '_' + random + '.mp3'

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: res.tempFilePath,
        success: function (uploadRes) {
          wx.cloud.callFunction({
            name: 'ai',
            data: { action: 'stt', fileID: uploadRes.fileID },
            success: function (fnRes) {
              var text = (fnRes.result && fnRes.result.text) || ''
              if (text) {
                var currentText = that.data.diaryText
                that.setData({
                  diaryText: currentText ? currentText + text : text
                })
              } else {
                that._showToast('没听清，再试一次？')
              }
              wx.cloud.deleteFile({
                fileList: [uploadRes.fileID]
              }).catch(function () {})
            },
            fail: function () {
              that._showToast('语音识别失败，请重试')
            }
          })
        },
        fail: function () {
          that._showToast('录音上传失败')
        }
      })
    })

    recorderManager.onError(function (err) {
      console.error('录音错误:', err)
      that.setData({ isRecording: false, recordingText: '' })
      if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
        that._showToast('请先授权麦克风权限')
      }
    })
  },

  startVoiceInput: function () {
    var that = this

    wx.authorize({
      scope: 'scope.record',
      success: function () {
        that.setData({ isRecording: true, recordingText: '正在聆听...' })
        recorderManager.start({ format: 'mp3', duration: 30000 })
      },
      fail: function () {
        wx.showModal({
          title: '需要录音权限',
          content: '语音输入需要麦克风权限，是否去设置？',
          confirmText: '去设置',
          success: function (modalRes) {
            if (modalRes.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  stopVoiceInput: function () {
    recorderManager.stop()
  },

  cancelVoiceInput: function () {
    recorderManager.stop()
    this.setData({ isRecording: false, recordingText: '' })
  },

  // ─── 文字输入 ───
  onTextInput: function (e) {
    this.setData({ tempText: e.detail.value })
  },

  onDiaryInput: function (e) {
    this.setData({ diaryText: e.detail.value })
  },

  // ─── 保存记录的通用逻辑 ───
  _proceedSave: function (aiResponse, recordTime, period, emotionKeys, tempText, userId, openid) {
    var that = this
    return db.addRecord({
      user_id: userId,
      openid: openid,
      emotions: emotionKeys,
      emotion: emotionKeys[0],
      emotion_score: 0,
      text: tempText.trim(),
      ai_response: aiResponse,
      period: period.key,
      period_label: period.label,
      period_icon: period.icon,
      record_time: recordTime,
      source: 'miniapp'
    }).then(function (recordId) {
      console.log('[保存成功] 记录ID:', recordId, '情绪数:', emotionKeys.length)

      if (aiResponse) {
        that._saveConversationHistory(userId, diaryText.trim(), aiResult.response || aiResponse)
      }

      that.setData({
        showModal: false,
        aiLoading: false,
        tempSubEmotions: [],
        tempText: '',
        selectedKeys: {},
        selectedLabels: '已选 0 个'
      })

      if (aiResponse) {
        that.setData({ aiResponse: aiResponse, showAiResponse: true })
        that._hideAiTimer = setTimeout(function () {
          that.setData({ showAiResponse: false })
        }, 5000)
      } else {
        that._showToast('记录成功！')
      }

      return Promise.all([
        that._loadTodayRecords(),
        that._loadUserStats()
      ])
    })
  },

  // ─── 确认记录（手动模式）───
  confirmRecord: function () {
    var that = this
    var tempSubEmotions = that.data.tempSubEmotions
    var tempText = that.data.tempText
    var userId = that.data.userId
    var openid = that.data.openid

    if (tempSubEmotions.length === 0) {
      that._showToast('请先选择至少一种情绪')
      return
    }

    that.setData({ aiLoading: true })

    var recordTime = new Date()
    var period = util.getPeriodByTime(recordTime)

    var emotionKeys = tempSubEmotions.map(function (sub) { return sub.key })

    db.getRecords(userId, { limit: 5 }).then(function (recentRecords) {
      var recentEmotions = recentRecords.map(function (r) {
        return { emotion: r.emotion, text: r.text }
      })

      return that._buildUserPortrait(userId).then(function (userPortrait) {
        return wx.cloud.callFunction({
          name: 'ai',
          data: {
            action: 'companion',
            emotions: emotionKeys,
            text: tempText.trim(),
            recentEmotions: recentEmotions,
            period: period.key,
            userPortrait: userPortrait
          }
        }).then(function (aiRes) {
          return { recentEmotions: recentEmotions, userPortrait: userPortrait, aiRes: aiRes }
        }).catch(function (e) {
          console.warn('AI陪伴失败:', e)
          return { recentEmotions: recentEmotions, userPortrait: userPortrait, aiRes: { result: { response: '' } } }
        })
      })
    }).then(function (ctx) {
      var aiResponse = (ctx.aiRes.result && ctx.aiRes.result.response) || ''

      if (!tempText.trim()) {
        return that._proceedSave(aiResponse, recordTime, period, emotionKeys, tempText, userId, openid)
      }

      wx.showLoading({ title: 'AI检查中...' })
      return wx.cloud.callFunction({
        name: 'ai',
        data: {
          action: 'checkEmotionMatch',
          emotions: emotionKeys,
          text: tempText.trim()
        }
      }).then(function (checkResult) {
        wx.hideLoading()
        if (checkResult.result && checkResult.result.match === false) {
          wx.showModal({
            title: '情绪不匹配提醒',
            content: checkResult.result.message || '你选择的情绪和文字内容不太匹配哦~',
            showCancel: false,
            confirmText: '知道了',
            confirmColor: '#576b95',
            success: function () {
              that.setData({ aiLoading: false })
            }
          })
          return null
        }
        return that._proceedSave(aiResponse, recordTime, period, emotionKeys, tempText, userId, openid)
      }).catch(function (checkErr) {
        wx.hideLoading()
        console.error('AI检查失败:', checkErr)
        return new Promise(function (resolve) {
          wx.showModal({
            title: 'AI 检查失败',
            content: '情绪匹配检查失败（可能超时或网络问题）。\n\n建议：取消后重新选择情绪或修改文字。',
            confirmText: '仍要保存',
            confirmColor: '#e64340',
            cancelText: '取消',
            cancelColor: '#576b95',
            success: function (modalRes) {
              if (modalRes.confirm) {
                resolve(that._proceedSave(aiResponse, recordTime, period, emotionKeys, tempText, userId, openid))
              } else {
                that.setData({ aiLoading: false })
                resolve(null)
              }
            },
            fail: function () {
              that.setData({ aiLoading: false })
              resolve(null)
            }
          })
        })
      })
    }).catch(function (err) {
      console.error('保存记录失败:', err)
      that.setData({ aiLoading: false })
      that._showToast('保存失败，请重试')
    })
  },

  // ─── AI 智能日记模式 - 提交 ───
  confirmDiary: function () {
    var that = this
    var diaryText = that.data.diaryText
    var userId = that.data.userId
    var openid = that.data.openid

    if (!diaryText.trim()) {
      that._showToast('写点什么吧 ✍️')
      return
    }

    that.setData({ aiLoading: true })

    var recordTime = new Date()
    var period = util.getPeriodByTime(recordTime)

    // 调用 AI 分析日记（传入用户画像）
    that._buildUserPortrait(userId).then(function (userPortrait) {
    wx.cloud.callFunction({
      name: 'ai',
      data: {
        action: 'diary',
        text: diaryText.trim(),
        userPortrait: userPortrait
      }
    }).then(function (res) {
      var aiResult = { emotion: 'calm', response: '' }
      if (res.result) {
        aiResult = res.result
      }

      return db.addRecord({
        user_id: userId,
        openid: openid,
        emotion: aiResult.emotion,
        emotion_score: 0,
        text: diaryText.trim(),
        ai_response: aiResult.response || '',
        period: period.key,
        period_label: period.label,
        period_icon: period.icon,
        record_time: recordTime,
        source: 'diary'
      }).then(function () {
        return aiResult
      })
    }).then(function (aiResult) {
      var emotionInfo = util.getEmotionByKey(aiResult.emotion)

      that.setData({
        showModal: false,
        aiLoading: false,
        selectedEmotion: emotionInfo
      })

      // 显示 AI 回应
      if (aiResult.response) {
        that.setData({
          aiResponse: emotionInfo.icon + ' 感觉你' + emotionInfo.label + '\n\n' + aiResult.response,
          showAiResponse: true
        })
        setTimeout(function () {
          that.setData({ showAiResponse: false })
        }, 6000)
      }

      return Promise.all([
        that._loadTodayRecords(),
        that._loadUserStats()
      ])
    }).catch(function (err) {
      console.error('保存日记失败:', err)
      that.setData({ aiLoading: false })
      that._showToast('保存失败，请重试')
    })
    }) // end _buildUserPortrait
  },

  // ─── 关闭 AI 回应 ───
  closeAiResponse: function () {
    this.setData({ showAiResponse: false })
  },

  // ═══ 继续聊聊功能 ═══
  openChat: function (e) {
    var recordId = e.currentTarget.dataset.id
    var records = this.data.todayRecords
    var record = null

    for (var i = 0; i < records.length; i++) {
      if (records[i]._id === recordId) {
        record = records[i]
        break
      }
    }
    if (!record) return

    var messages = []
    if (record.ai_response) {
      messages.push({ role: 'ai', content: record.ai_response, time: '刚刚' })
    }
    if (record.chat_log && record.chat_log.length > 0) {
      for (var j = 0; j < record.chat_log.length; j++) {
        messages.push(record.chat_log[j])
      }
    }

    this.setData({
      showChat: true,
      chatMessages: messages,
      chatInput: '',
      chatLoading: false,
      currentRecordId: recordId
    })

    // 加载聊天轮次
    var that = this
    db.getUser(that.data.openid).then(function (user) {
      if (user && user.chat_rounds) {
        that.setData({ chatRoundCount: user.chat_rounds[recordId] || 0 })
      }
    }).catch(function () {})
  },

  closeChat: function () {
    this.setData({ showChat: false })
  },

  stopChatPropagation: function () {},

  onChatInput: function (e) {
    this.setData({ chatInput: e.detail.value })
  },

  sendChat: function () {
    var chatInput = this.data.chatInput
    var chatMessages = this.data.chatMessages
    var currentRecordId = this.data.currentRecordId
    var userId = this.data.userId

    if (!chatInput.trim() || this.data.chatLoading) return

    var userMsg = {
      role: 'user',
      content: chatInput.trim(),
      time: '刚刚'
    }

    var newMessages = chatMessages.slice()
    newMessages.push(userMsg)

    this.setData({
      chatMessages: newMessages,
      chatInput: '',
      chatLoading: true
    })

    var that = this
    wx.cloud.callFunction({
      name: 'ai',
      data: Object.assign({
        action: 'chat',
        record_id: currentRecordId,
        message: chatInput.trim(),
        chat_log: that.data.chatMessages,
      }, that.data.reportContext ? {
        aiReport: that.data.reportContext.aiReport,
        records: that.data.reportContext.records,
        source: 'report'
      } : {})
    }).then(function (res) {
      var aiMsg = {
        role: 'ai',
        content: (res.result && res.result.response) || '抱歉，我没听清...',
        time: '刚刚'
      }

      var updatedMessages = that.data.chatMessages.slice()
      updatedMessages.push(aiMsg)

      that.setData({
        chatMessages: updatedMessages,
        chatLoading: false
      })

      // 更新聊天轮次
      var newRound = that.data.chatRoundCount + 1
      that.setData({ chatRoundCount: newRound })
      return db.updateUserChatRounds(that.data.openid, currentRecordId, newRound).then(function () {
        // 实时保存对话历史（用户消息 + AI 回复配对）
        that._saveConversationHistory(userId, chatInput.trim(), aiMsg.content)
      })
    }).catch(function (err) {
      console.error('聊天失败:', err)
      that.setData({ chatLoading: false })
      that._showToast('发送失败，请重试')
    })
  },

  // ─── 删除记录 ───
  deleteRecord: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: function (res) {
        if (res.confirm) {
          db.deleteRecord(id).then(function () {
            that._showToast('已删除')
            return Promise.all([
              that._loadTodayRecords(),
              that._loadUserStats()
            ])
          }).catch(function (err) {
            console.error('删除失败:', err)
            that._showToast('删除失败')
          })
        }
      }
    })
  },

  // ─── Toast ───
  _showToast: function (text) {
    this.setData({ showToast: true, toastText: text })
    var that = this
    setTimeout(function () {
      that.setData({ showToast: false })
    }, 2000)
  },

  // ═══ 情绪诗语 ═══
  loadPoetry: function (forceRefresh) {
    var that = this
    var today = util.formatDate(new Date(), 'YYYY-MM-DD')

    // 检查缓存
    if (!forceRefresh) {
      var cached = {}
      try { cached = wx.getStorageSync('poetry_cache') || {} } catch(e) {}
      if (cached.date === today && cached.text) {
        that.setData({
          poetry: cached.text,
          poetryDate: cached.dateLabel,
          poetryLoading: false
        })
        return
      }
    }

    // 先立刻显示备用诗语，保证用户一定能看到
    var fallback = that._fallbackPoetry()
    var dateLabel = today.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1.$2.$3')
    that.setData({ poetry: fallback, poetryDate: dateLabel, poetryLoading: false })

    // 后台异步调用 AI，成功后替换
    var callAI = function () {
      var todayRecords = that.data.todayRecords || []
      var todayEmotion = todayRecords.length > 0 ? (todayRecords[0].emotion || null) : null
      return that._buildUserPortrait(that.data.userId).then(function (portrait) {
        return wx.cloud.callFunction({
          name: 'ai',
          data: {
            action: 'poetry',
            userPortrait: portrait,
            date: today,
            todayEmotion: todayEmotion
          }
        })
      })
    }

    callAI().then(function (res) {
      var text = (res.result && res.result.poetry)
      if (text && text.length > 5) {
        that._cacheAndSetPoetry(text, dateLabel, today)
      }
    }).catch(function (err) {
      console.error('诗语AI生成失败(已显示备用):', err)
      // 已在上面设置了备用诗语，这里不需要再处理
    })
  },

  _cacheAndSetPoetry: function (text, dateLabel, today) {
    var that = this
    try {
      wx.setStorageSync('poetry_cache', {
        date: today,
        dateLabel: dateLabel,
        text: text
      })
    } catch(e) {}
    that.setData({
      poetry: text,
      poetryDate: dateLabel,
      poetryLoading: false
    })
  },

  refreshPoetry: function () {
    this.loadPoetry(true)
  },

  _fallbackPoetry: function () {
    var poems = [
      '情绪像今天的阳光，不急不慢，刚刚好。',
      '心里有点小波动也没关系，云飘过去就散了。',
      '今天的你，比昨天更接近想成为的自己。',
      '情绪来了就让它坐一会儿，不必急着赶它走。'
    ]
    return poems[Math.floor(Math.random() * poems.length)]
  },

})
