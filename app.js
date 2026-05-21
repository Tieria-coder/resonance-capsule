// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d5gev82b5db8c2485', // 云环境ID
        traceUser: true,
      })
    }
    
    // 检查登录状态
    this.checkLogin()
  },

  globalData: {
    userInfo: null,
    openid: '',
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  // 保存用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 获取用户唯一ID
  getOpenid() {
    return new Promise((resolve, reject) => {
      if (this.globalData.openid) {
        resolve(this.globalData.openid)
        return
      }
      
      wx.cloud.callFunction({
        name: 'login',
      }).then(res => {
        this.globalData.openid = res.result.openid
        resolve(res.result.openid)
      }).catch(err => {
        reject(err)
      })
    })
  },
})