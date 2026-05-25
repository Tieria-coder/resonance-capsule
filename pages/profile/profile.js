// pages/profile/profile.js - ES5 compatible
var app = getApp()
var db = require('../../utils/db')
var util = require('../../utils/util')

Page({
  data: {
    openid: '',

    stats: {
      streak: 0,
      max_streak: 0,
      total_records: 0,
    },

    badges: [],

    rankings: {
      streakPercent: 0,
      positivePercent: 0,
    },

    showEmojiEditor: false,
    customEmotions: {},
    editingEmotion: null,
    editPreview: '',
    emotionCategories: util.EMOTION_CATEGORIES,

    showWardrobe: false,
    themes: [
      { key: 'default', name: '\u7ECF\u5178\u9ED1\u767D', desc: '\u7B80\u7EA6\u8D28\u611F', bg: '#fafafc', accent: '#1a1a1a' },
      { key: 'warm', name: '\u6E29\u6696\u9633\u5149', desc: '\u67D4\u548C\u6696\u8272\u8C03', bg: '#fef9f0', accent: '#d4a574' },
      { key: 'ocean', name: '\u6DF1\u6D77\u5B81\u9759', desc: '\u6E05\u51C9\u84DD\u7EFF\u8272', bg: '#f0f7f4', accent: '#5a8a7a' },
      { key: 'sunset', name: '\u65E5\u843D\u4F59\u6653', desc: '\u6587\u67D4\u6A58\u7C89\u8272', bg: '#fdf5f0', accent: '#d4866b' },
    ],
    currentTheme: 'default',

    menuItems: [
      { key: 'emoji', label: '\u81EA\u5B9A\u4E49\u56FE\u6807', icon: '\uD83C\uDFA8' },
      { key: 'wardrobe', label: '\u9B54\u6CD5\u8863\u6A90', icon: '\uD83D\uDC57' },
      { key: 'export', label: '\u5BFC\u51FA\u6570\u636E', icon: '\uD83D\uDCE4' },
      { key: 'privacy', label: '\u9690\u79C1\u653F\u7B56', icon: '\uD83D\uDD12' },
      { key: 'clear', label: '\u6E05\u7A7A\u6570\u636E', icon: '\uD83D\uDDD1', danger: true },
    ],
  },

  onLoad: function () {
    this.loadUserData()
    this.loadTheme()
  },

  onShow: function () {
    this.loadUserData()
    var tab = this.selectComponent('.tabbar-wrapper')
    if (tab) tab.setActive(3)
  },

  loadUserData: function () {
    var that = this
    var p = app.globalData && app.globalData.openid
      ? Promise.resolve(app.globalData.openid)
      : app.getOpenid()

    p.then(function (openid) {
      if (!openid) return
      that.setData({ openid: openid })
      return db.getUser(openid)
    }).then(function (user) {
      if (!user) return
      var stats = user.stats || { streak: 0, max_streak: 0, total_records: 0 }
      var badgesResult = that.calculateBadges(stats)
      that.setData({
        stats: stats,
        badges: badgesResult.badges,
        customEmotions: user.custom_emotions || {},
        rankings: {
          streakPercent: Math.min(99, Math.round(Math.random() * 30 + 60)),
          positivePercent: Math.min(99, Math.round(Math.random() * 20 + 50)),
        },
      })
    }).catch(function (err) {
      console.error('\u52A0\u8F7D\u7528\u6237\u6570\u636E\u5931\u8D25:', err)
    })
  },

  calculateBadges: function (stats) {
    var streak = stats.streak
    var max_streak = stats.max_streak
    var badges = [
      { key: 'streak_3d', label: '3\u5929\u6253\u5361', icon: '\uD83E\uDD47', condition: streak >= 3 || max_streak >= 3 },
      { key: 'streak_7d', label: '7\u5929\u6253\u5361', icon: '\uD83E\uDD48', condition: streak >= 7 || max_streak >= 7 },
      { key: 'streak_21d', label: '21\u5929\u6253\u5361', icon: '\uD83E\uDD47', condition: streak >= 21 || max_streak >= 21 },
      { key: 'streak_30d', label: '30\u5929\u6253\u5361', icon: '\uD83C\uDFC6', condition: streak >= 30 || max_streak >= 30 },
    ].map(function (b) {
      var r = {}
      Object.keys(b).forEach(function (k) { r[k] = b[k] })
      r.unlocked = b.condition
      return r
    })
    return { badges: badges }
  },

  openEmojiEditor: function () {
    this.setData({ showEmojiEditor: true })
  },

  closeEmojiEditor: function () {
    this.setData({ showEmojiEditor: false, editingEmotion: null })
  },

  startEditEmotion: function (e) {
    var key = e.currentTarget.dataset.key
    var current = this.getEmotionDisplay(key)
    this.setData({
      editingEmotion: key,
      editPreview: current.value,
    })
  },

  setEmoji: function () {
    var that = this
    var editingEmotion = that.data.editingEmotion
    var editPreview = that.data.editPreview
    if (!editPreview || !editingEmotion) return
    that.updateCustomEmotion(editingEmotion, { type: 'emoji', value: editPreview })
    that.setData({ editingEmotion: null })
  },

  onPreviewInput: function (e) {
    this.setData({ editPreview: e.detail.value })
  },

  chooseImage: function () {
    var that = this
    var editingEmotion = that.data.editingEmotion
    if (!editingEmotion) return

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '\u4E0A\u4F20\u4E2D...' })
        var cloudPath = 'emotion-icons/' + that.data.openid + '/' + editingEmotion + '_' + Date.now() + '.jpg'
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: function (uploadRes) {
            that.updateCustomEmotion(editingEmotion, { type: 'image', value: uploadRes.fileID })
            that.setData({ editingEmotion: null })
            wx.hideLoading()
            wx.showToast({ title: '\u56FE\u6807\u5DF2\u66F4\u65B0 \u2713' })
          },
          fail: function () {
            wx.hideLoading()
            wx.showToast({ title: '\u4E0A\u4F20\u5931\u8D25', icon: 'none' })
          },
        })
      },
    })
  },

  resetEmotion: function (e) {
    var key = e.currentTarget.dataset.key
    this.updateCustomEmotion(key, null)
  },

  getEmotionDisplay: function (emotionKey) {
    var custom = this.data.customEmotions[emotionKey]
    if (custom) return custom
    var info = util.getEmotionInfo(emotionKey)
    return { type: 'emoji', value: info.icon || '\u2753' }
  },

  updateCustomEmotion: function (emotionKey, value) {
    var that = this
    var customEmotions = that.data.customEmotions
    var newCustom = {}
    Object.keys(customEmotions).forEach(function (k) { newCustom[k] = customEmotions[k] })

    if (value === null) {
      delete newCustom[emotionKey]
    } else {
      newCustom[emotionKey] = value
    }

    that.setData({ customEmotions: newCustom })

    var openid = that.data.openid
    db.getUser(openid).then(function (user) {
      if (!user) return
      return wx.cloud.database().collection('users').doc(user._id).update({
        data: {
          custom_emotions: newCustom,
          updated_at: new Date(),
        },
      })
    }).catch(function (err) {
      console.error('\u4FDD\u5B58\u81EA\u5B9A\u4E49\u56FE\u6807\u5931\u8D25:', err)
    })
  },

  openWardrobe: function () {
    this.setData({ showWardrobe: true })
  },

  closeWardrobe: function () {
    this.setData({ showWardrobe: false })
  },

  selectTheme: function (e) {
    var themeKey = e.currentTarget.dataset.key
    this.setData({ currentTheme: themeKey })
    this.applyTheme(themeKey)
    wx.showToast({ title: '\u4E3B\u9898\u5DF2\u5207\u6362 \u2713' })
  },

  applyTheme: function (themeKey) {
    var that = this
    var theme = null
    that.data.themes.forEach(function (t) {
      if (t.key === themeKey) theme = t
    })
    if (!theme) return
    wx.setStorageSync('theme', themeKey)
    that.setData({ currentTheme: themeKey })
    var pages = getCurrentPages()
    var currentPage = pages[pages.length - 1]
    if (currentPage) {
      currentPage.setData({
        themeBg: theme.bg,
        themeAccent: theme.accent,
      })
    }
  },

  loadTheme: function () {
    var themeKey = wx.getStorageSync('theme') || 'default'
    this.setData({ currentTheme: themeKey })
    this.applyTheme(themeKey)
  },

  onMenuTap: function (e) {
    var menu = e.currentTarget.dataset.menu
    if (menu === 'emoji') this.openEmojiEditor()
    else if (menu === 'wardrobe') this.openWardrobe()
    else if (menu === 'export') wx.showToast({ title: '\u5BFC\u51FA\u529F\u80FD\u5F00\u53D1\u4E2D', icon: 'none' })
    else if (menu === 'privacy') wx.showToast({ title: '\u9690\u79C1\u653F\u7B56\u5F00\u53D1\u4E2D', icon: 'none' })
    else if (menu === 'clear') this.clearData()
  },

  clearData: function () {
    var that = this
    wx.showModal({
      title: '\u786E\u8BA4\u6E05\u7A7A',
      content: '\u786E\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u6570\u636E\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\uFF01',
      success: function (modalRes) {
        if (modalRes.confirm) {
          db.clearUserData(that.data.openid).then(function () {
            that.loadUserData()
            wx.showToast({ title: '\u6570\u636E\u5DF2\u6E05\u7A7A' })
          }).catch(function (err) {
            console.error('\u6E05\u7A7A\u6570\u636E\u5931\u8D25:', err)
          })
        }
      },
    })
  },

  onShareAppMessage: function () {
    return {
      title: '\u60C5\u7EEA\u80F8\u56CA - \u8BB0\u5F55\u6BCF\u4E00\u79CD\u60C5\u7EEA',
      path: '/pages/index/index',
    }
  },
})