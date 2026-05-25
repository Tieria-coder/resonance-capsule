// app.js
App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d5gev82b5db8c2485',
        traceUser: true,
      })
    }
    this.checkLogin()
  },

  globalData: {
    userInfo: null,
    openid: '',
    tabBar: null,   // 自定义 TabBar 配置，由 app.json 同步而来
  },

  checkLogin: function () {
    var userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  setUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  getOpenid: function () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.globalData.openid) {
        resolve(self.globalData.openid)
        return
      }
      wx.cloud.callFunction({
        name: 'login',
      }).then(function (res) {
        self.globalData.openid = res.result.openid
        resolve(res.result.openid)
      }).catch(function (err) {
        reject(err)
      })
    })
  },
})