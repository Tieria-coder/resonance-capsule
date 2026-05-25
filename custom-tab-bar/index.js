// 自定义 TabBar 组件
Component({
  properties: {},

  data: {
    active: 0,
    list: [
      { icon: '/images/icons/tab-record@2x.png',      selIcon: '/images/icons/tab-record-selected@2x.png',   color: '#E8956A', text: '记录' },
      { icon: '/images/icons/tab-calendar@2x.png',    selIcon: '/images/icons/tab-calendar-selected@2x.png', color: '#7B8FBA', text: '日历' },
      { icon: '/images/icons/tab-report@2x.png',      selIcon: '/images/icons/tab-report-selected@2x.png',  color: '#7BBFA0', text: '报告' },
      { icon: '/images/icons/tab-profile@2x.png',     selIcon: '/images/icons/tab-profile-selected@2x.png', color: '#F06292', text: '我的' },
    ]
  },

  methods: {
    switchTab(e) {
      const index = Number(e.currentTarget.dataset.index)
      const tabPaths = ['pages/index/index', 'pages/calendar/calendar', 'pages/report/report', 'pages/profile/profile']
      this.setData({ active: index })
      wx.switchTab({ url: '/' + tabPaths[index] })
    },

    setActive(index) {
      const i = Number(index)
      if (this.data.active !== i) {
        this.setData({ active: i })
      }
    },

    _updateActive() {
      const pages = getCurrentPages()
      if (!pages.length) return
      const curPage = pages[pages.length - 1].route
      const tabMap = {
        'pages/index/index':        0,
        'pages/calendar/calendar':  1,
        'pages/report/report':      2,
        'pages/profile/profile':    3,
      }
      const idx = tabMap[curPage]
      if (idx !== undefined && this.data.active !== idx) {
        this.setData({ active: idx })
      }
    }
  },

  pageLifetimes: {
    show() {
      this._updateActive()
    }
  }
})