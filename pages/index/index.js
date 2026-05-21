// pages/index/index.js
const app = getApp()
const util = require('../../utils/util')
const db = require('../../utils/db')

// 原生录音管理器
const recorderManager = wx.getRecorderManager()

Page({
  data: {
    userId: '',
    openid: '',
    
    // 情绪选择
    emotions: util.EMOTIONS,
    selectedEmotion: null,
    tempEmotion: null,
    tempText: '',
    
    // 弹窗
    showModal: false,
    
    // AI 陪伴回应
    aiResponse: '',
    showAiResponse: false,
    aiLoading: false,
    
    // AI 日记模式
    diaryMode: false,
    diaryText: '',
    
    // 语音录入
    isRecording: false,
    recordingText: '',
    hasVoicePermission: true,
    
    // 今日记录
    todayRecords: [],
    todayCount: 0,
    
    // 用户统计
    userStats: {
      streak: 0,
      max_streak: 0,
      total_records: 0,
    },
    streakProgress: 0,
    
    // Toast
    showToast: false,
    toastText: '',
  },

  onLoad() {
    this.initUser()
    this.initVoiceRecorder()
    this.loadCustomEmotions()
  },

  // 加载用户自定义情绪图标
  async loadCustomEmotions() {
    try {
      const openid = this.data.openid || app.globalData.openid
      if (!openid) return
      const user = await db.getUser(openid)
      if (user && user.custom_emotions) {
        const emotions = util.EMOTIONS.map(em => {
          const custom = user.custom_emotions[em.key]
          if (custom) {
            return { ...em, icon: custom.value, iconType: custom.type }
          }
          return { ...em, iconType: 'emoji' }
        })
        this.setData({ emotions })
      }
    } catch (e) {}
  },

  // 初始化录音器
  initVoiceRecorder() {
    const that = this
    
    recorderManager.onStop((res) => {
      that.setData({ isRecording: false, recordingText: '' })
      if (!res.tempFilePath) return
      
      // 上传录音文件到云存储，再调云函数识别
      that.setData({ recordingText: '正在识别...' })
      const cloudPath = `voice/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.mp3`
      
      wx.cloud.uploadFile({
        cloudPath,
        filePath: res.tempFilePath,
        success(uploadRes) {
          // 调用云函数语音转文字
          wx.cloud.callFunction({
            name: 'ai',
            data: { action: 'stt', fileID: uploadRes.fileID },
            success(fnRes) {
              const text = fnRes.result?.text || ''
              if (text) {
                that.setData({
                  diaryText: that.data.diaryText ? that.data.diaryText + text : text
                })
              } else {
                that.showToast('没听清，再试一次？')
              }
              // 删除临时文件
              wx.cloud.deleteFile({ fileList: [uploadRes.fileID] }).catch(() => {})
            },
            fail() {
              that.showToast('语音识别失败，请重试')
            }
          })
        },
        fail() {
          that.showToast('录音上传失败')
        }
      })
    })
    
    recorderManager.onError((err) => {
      console.error('录音错误:', err)
      that.setData({ isRecording: false, recordingText: '' })
      if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
        that.showToast('请先授权麦克风权限')
      }
    })
  },

  onShow() {
    if (this.data.openid) {
      this.loadTodayRecords()
      this.loadUserStats()
    }
  },

  // 初始化用户
  async initUser() {
    try {
      const openid = await app.getOpenid()
      this.setData({ openid })
      
      let user = await db.getUser(openid)
      if (!user) {
        await db.upsertUser({ openid })
        user = await db.getUser(openid)
      }
      
      this.setData({ userId: user._id })
      this.loadTodayRecords()
      this.loadUserStats()
    } catch (err) {
      console.error('初始化用户失败:', err)
      this.showToast('请确保已配置云开发环境')
    }
  },

  // 加载今日记录
  async loadTodayRecords() {
    try {
      const records = await db.getTodayRecords(this.data.userId)
      const processedRecords = records.map(record => {
        const emotion = util.getEmotionByKey(record.emotion)
        const period = util.getPeriodByTime(new Date(record.record_time))
        return {
          ...record,
          emotion_icon: emotion.icon,
          emotion_label: emotion.label,
          emotion_color: emotion.color,
          period_label: period.label,
          period_icon: period.icon,
          formatted_time: util.formatTime(record.record_time),
          ai_response: record.ai_response || '',
        }
      })
      
      this.setData({
        todayRecords: processedRecords,
        todayCount: records.length,
      })
    } catch (err) {
      console.error('加载今日记录失败:', err)
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const user = await db.getUser(this.data.openid)
      if (user && user.stats) {
        const streakProgress = Math.min((user.stats.streak / 30) * 100, 100)
        this.setData({ userStats: user.stats, streakProgress })
      }
    } catch (err) {
      console.error('加载用户统计失败:', err)
    }
  },

  // 显示情绪选择器
  showEmotionPicker() {
    this.setData({
      showModal: true,
      diaryMode: false,
      tempEmotion: this.data.selectedEmotion || util.EMOTIONS[2],
      tempText: '',
    })
  },

  // 切换到 AI 日记模式
  switchToDiary() {
    this.setData({ diaryMode: true, tempText: '' })
  },

  // ===== 语音录入 =====
  startVoiceInput() {
    const that = this
    
    wx.authorize({ scope: 'scope.record' }).then(() => {
      that.setData({ isRecording: true, recordingText: '正在聆听...' })
      recorderManager.start({
        format: 'mp3',
        duration: 30000,
      })
    }).catch(() => {
      wx.showModal({
        title: '需要录音权限',
        content: '语音输入需要麦克风权限，是否去设置？',
        confirmText: '去设置',
        success(modalRes) {
          if (modalRes.confirm) wx.openSetting()
        }
      })
    })
  },

  stopVoiceInput() {
    recorderManager.stop()
  },

  cancelVoiceInput() {
    recorderManager.stop()
    this.setData({ isRecording: false, recordingText: '' })
  },

  // 切换回手动选择模式
  switchToManual() {
    this.setData({ diaryMode: false })
  },

  // 日记输入
  onDiaryInput(e) {
    this.setData({ diaryText: e.detail.value })
  },

  // 隐藏弹窗
  hideEmotionPicker() {
    this.setData({ showModal: false })
  },

  stopPropagation() {},

  // 选择情绪
  selectEmotion(e) {
    const emotion = e.currentTarget.dataset.emotion
    this.setData({ tempEmotion: emotion })
  },

  // 文字输入
  onTextInput(e) {
    this.setData({ tempText: e.detail.value })
  },

  // 确认保存 - 手动模式
  async confirmRecord() {
    const { tempEmotion, tempText, userId, openid } = this.data
    
    if (!tempEmotion) {
      this.showToast('请先选择一种情绪')
      return
    }
    
    this.setData({ aiLoading: true })
    
    try {
      const recordTime = new Date()
      const period = util.getPeriodByTime(recordTime)
      
      // 获取最近记录用于陪伴上下文
      const recentRecords = await db.getRecords(userId, { limit: 5 })
      
      // 调用 AI 陪伴回应
      let aiResponse = ''
      try {
        const res = await wx.cloud.callFunction({
          name: 'ai',
          data: {
            action: 'companion',
            emotion: tempEmotion.key,
            text: tempText.trim(),
            recentEmotions: recentRecords.map(r => ({ emotion: r.emotion, text: r.text })),
          }
        })
        aiResponse = res.result?.response || ''
      } catch (e) {
        console.warn('AI陪伴失败:', e)
      }
      
      await db.addRecord({
        user_id: userId,
        openid,
        emotion: tempEmotion.key,
        emotion_score: tempEmotion.score,
        text: tempText.trim(),
        ai_response: aiResponse,
        period: period.key,
        period_label: period.label,
        period_icon: period.icon,
        record_time: recordTime,
        source: 'miniapp',
      })
      
      this.setData({
        showModal: false,
        aiLoading: false,
        selectedEmotion: tempEmotion,
      })
      
      // 显示 AI 回应
      if (aiResponse) {
        this.setData({ aiResponse, showAiResponse: true })
        setTimeout(() => this.setData({ showAiResponse: false }), 5000)
      } else {
        this.showToast('记录成功！')
      }
      
      await this.loadTodayRecords()
      await this.loadUserStats()
    } catch (err) {
      console.error('保存记录失败:', err)
      this.setData({ aiLoading: false })
      this.showToast('保存失败，请重试')
    }
  },

  // AI 智能日记模式 - 提交
  async confirmDiary() {
    const { diaryText, userId, openid } = this.data
    
    if (!diaryText.trim()) {
      this.showToast('写点什么吧 ✍️')
      return
    }
    
    this.setData({ aiLoading: true })
    
    try {
      const recordTime = new Date()
      const period = util.getPeriodByTime(recordTime)
      
      // 调用 AI 分析日记
      let aiResult = { emotion: 'calm', score: 0, response: '' }
      try {
        const res = await wx.cloud.callFunction({
          name: 'ai',
          data: {
            action: 'diary',
            text: diaryText.trim(),
          }
        })
        aiResult = res.result || aiResult
      } catch (e) {
        console.warn('AI日记分析失败:', e)
      }
      
      await db.addRecord({
        user_id: userId,
        openid,
        emotion: aiResult.emotion,
        emotion_score: aiResult.score,
        text: diaryText.trim(),
        ai_response: aiResult.response || '',
        period: period.key,
        period_label: period.label,
        period_icon: period.icon,
        record_time: recordTime,
        source: 'diary',
      })
      
      const emotionInfo = util.getEmotionByKey(aiResult.emotion)
      
      this.setData({
        showModal: false,
        aiLoading: false,
        selectedEmotion: emotionInfo,
      })
      
      // 显示 AI 回应
      if (aiResult.response) {
        this.setData({ aiResponse: `${emotionInfo.icon} 感觉你${emotionInfo.label}\n\n${aiResult.response}`, showAiResponse: true })
        setTimeout(() => this.setData({ showAiResponse: false }), 6000)
      }
      
      await this.loadTodayRecords()
      await this.loadUserStats()
    } catch (err) {
      console.error('保存日记失败:', err)
      this.setData({ aiLoading: false })
      this.showToast('保存失败，请重试')
    }
  },

  // 关闭 AI 回应
  closeAiResponse() {
    this.setData({ showAiResponse: false })
  },

  showToast(text) {
    this.setData({ showToast: true, toastText: text })
    setTimeout(() => this.setData({ showToast: false }), 2000)
  },
})
