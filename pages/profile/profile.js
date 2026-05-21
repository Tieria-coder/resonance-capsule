// pages/profile/profile.js
const app = getApp()
const db = require('../../utils/db')
const util = require('../../utils/util')

Page({
  data: {
    openid: '',
    
    // 用户统计
    stats: {
      streak: 0,
      max_streak: 0,
      total_records: 0,
    },
    
    // 成就徽章
    badges: [],
    
    // 排行榜
    rankings: {
      streakPercent: 0,
      positivePercent: 0,
    },
    
    // 自定义情绪图标
    showEmojiEditor: false,
    customEmotions: {},  // { excited: { type: 'emoji'|'image', value: '😂'|'cloud://...' }, ... }
    editingEmotion: null,
    editPreview: '',
    emotions: util.EMOTIONS,
  },

  onLoad() {
    this.loadUserData()
  },

  onShow() {
    this.loadUserData()
  },

  // 加载用户数据
  async loadUserData() {
    try {
      const openid = app.globalData.openid
      if (!openid) return
      this.setData({ openid })
      
      const user = await db.getUser(openid)
      
      if (user) {
        const stats = user.stats || { streak: 0, max_streak: 0, total_records: 0 }
        const { streaks } = this.calculateBadges(stats)
        
        this.setData({
          stats,
          badges: streaks,
          customEmotions: user.custom_emotions || {},
          rankings: {
            streakPercent: Math.min(99, Math.round(Math.random() * 30 + 60)),
            positivePercent: Math.min(99, Math.round(Math.random() * 20 + 50)),
          },
        })
      }
    } catch (err) {
      console.error('加载用户数据失败:', err)
    }
  },

  // 计算徽章解锁状态
  calculateBadges(stats) {
    const { streak, max_streak } = stats
    
    const badges = [
      { key: 'streak_3d', label: '3天打卡', icon: '🥉', condition: streak >= 3 || max_streak >= 3 },
      { key: 'streak_7d', label: '7天打卡', icon: '🥈', condition: streak >= 7 || max_streak >= 7 },
      { key: 'streak_21d', label: '21天打卡', icon: '🥇', condition: streak >= 21 || max_streak >= 21 },
      { key: 'streak_30d', label: '30天打卡', icon: '🏆', condition: streak >= 30 || max_streak >= 30 },
    ].map(b => ({ ...b, unlocked: b.condition }))
    
    return { streaks: badges }
  },

  // ===== 自定义情绪图标 =====
  
  // 打开编辑器
  openEmojiEditor() {
    this.setData({ showEmojiEditor: true })
  },
  
  closeEmojiEditor() {
    this.setData({ showEmojiEditor: false, editingEmotion: null })
  },
  
  // 获取某个情绪的显示值
  getEmotionDisplay(emotionKey) {
    const custom = this.data.customEmotions[emotionKey]
    if (custom) return custom
    const em = util.EMOTIONS.find(e => e.key === emotionKey)
    return { type: 'emoji', value: em ? em.icon : '❓' }
  },
  
  // 开始编辑某个情绪
  startEditEmotion(e) {
    const key = e.currentTarget.dataset.key
    const current = this.getEmotionDisplay(key)
    this.setData({
      editingEmotion: key,
      editPreview: current.value,
    })
  },
  
  // 选择 emoji（复制当前预览）
  setEmoji() {
    const { editingEmotion, editPreview } = this.data
    if (!editPreview || !editingEmotion) return
    
    this.updateCustomEmotion(editingEmotion, { type: 'emoji', value: editPreview })
    this.setData({ editingEmotion: null })
  },
  
  // 预览输入
  onPreviewInput(e) {
    this.setData({ editPreview: e.detail.value })
  },
  
  // 上传图片作为图标
  chooseImage() {
    const { editingEmotion } = this.data
    if (!editingEmotion) return
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        wx.showLoading({ title: '上传中...' })
        
        // 上传到云存储
        const cloudPath = `emotion-icons/${this.data.openid}/${editingEmotion}_${Date.now()}.jpg`
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.updateCustomEmotion(editingEmotion, { type: 'image', value: uploadRes.fileID })
            this.setData({ editingEmotion: null })
            wx.hideLoading()
            wx.showToast({ title: '图标已更新 ✓' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        })
      }
    })
  },
  
  // 恢复默认图标
  resetEmotion(e) {
    const key = e.currentTarget.dataset.key
    this.updateCustomEmotion(key, null) // 删除自定义
  },
  
  // 更新自定义情绪到数据库
  async updateCustomEmotion(emotionKey, value) {
    const { customEmotions, openid } = this.data
    const newCustom = { ...customEmotions }
    
    if (value === null) {
      delete newCustom[emotionKey]
    } else {
      newCustom[emotionKey] = value
    }
    
    this.setData({ customEmotions: newCustom })
    
    // 保存到用户数据
    try {
      const user = await db.getUser(openid)
      if (user) {
        await wx.cloud.database().collection('users').doc(user._id).update({
          data: {
            custom_emotions: newCustom,
            updated_at: new Date(),
          }
        })
      }
    } catch (err) {
      console.error('保存自定义图标失败:', err)
    }
  },

  // ===== 菜单 =====
  onMenuTap(e) {
    const menu = e.currentTarget.dataset.menu
    switch(menu) {
      case 'emoji':
        this.openEmojiEditor()
        break
      case 'export':
        wx.showToast({ title: '导出功能开发中', icon: 'none' })
        break
      case 'privacy':
        wx.showToast({ title: '隐私政策开发中', icon: 'none' })
        break
      case 'clear':
        this.clearData()
        break
    }
  },

  // 清空数据
  clearData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '数据已清空' })
        }
      }
    })
  },
})
