// pages/plan/plan.js - 情绪计划（加入计划 + 定时提醒）
var app = getApp();
var db = require('../../utils/db');
var util = require('../../utils/util');

Page({
  data: {
    availablePlans: [],
    myPlans: [],
    showReminderPicker: false,
    currentPlanId: null,
    currentPlanName: '',
    reminderOptions: [
      { key: 'morning', label: '早上 8:00', time: '08:00' },
      { key: 'noon', label: '中午 12:00', time: '12:00' },
      { key: 'afternoon', label: '下午 18:00', time: '18:00' },
      { key: 'evening', label: '晚上 21:00', time: '21:00' },
    ],
    selectedReminders: ['evening'],
    openid: '',
    userId: '',
  },

  onLoad: function () {
    this.initUser();
  },

  onShow: function () {
    var that = this;
    if (that.data.userId) {
      that.loadMyPlans();
      that.loadAvailablePlans();
    }
  },

  initUser: function () {
    var that = this;
    app.getOpenid().then(function (openid) {
      that.setData({ openid: openid });
      return db.getUser(openid);
    }).then(function (user) {
      if (!user) {
        return db.upsertUser({ openid: that.data.openid }).then(function () {
          return db.getUser(that.data.openid);
        });
      }
      return user;
    }).then(function (user) {
      that.setData({ userId: user._id });
      that.loadMyPlans();
      that.loadAvailablePlans();
    }).catch(function (err) {
      console.error('初始化用户失败:', err);
    });
  },

  loadAvailablePlans: function () {
    var that = this;
    db.getActivePlanTemplates().then(function (templates) {
      var joinedIds = {};
      that.data.myPlans.forEach(function (p) {
        if (p.template_id) {
          joinedIds[p.template_id] = true;
        }
      });
      var available = templates.filter(function (t) {
        return !joinedIds[t._id];
      });
      that.setData({ availablePlans: available });
    }).catch(function (err) {
      console.error('加载计划模板失败:', err);
    });
  },

  loadMyPlans: function () {
    var that = this;
    db.getUserPlans(that.data.openid).then(function (plans) {
      var processed = plans.map(function (plan) {
        var p = {};
        var k;
        for (k in plan) {
          if (plan.hasOwnProperty(k)) {
            p[k] = plan[k];
          }
        }
        var start = new Date(plan.start_date);
        var now = new Date();
        var elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        p.elapsed_days = Math.min(elapsed, plan.cycle_days || 7);
        p.remaining_days = Math.max(0, (plan.cycle_days || 7) - p.elapsed_days);
        p.progress_percent = Math.min(100, Math.round((p.completed_days / (plan.cycle_days || 7)) * 100));
        var labels = [];
        (plan.reminders || []).forEach(function (r) {
          that.data.reminderOptions.forEach(function (opt) {
            if (opt.key === r) {
              labels.push(opt.label);
            }
          });
        });
        p.reminder_labels = labels.length > 0 ? labels.join('、') : '未设置';
        return p;
      });
      that.setData({ myPlans: processed });
    }).catch(function (err) {
      console.error('加载我的计划失败:', err);
    });
  },

  showReminderModal: function (e) {
    var templateId = e.currentTarget.dataset.id;
    var planName = e.currentTarget.dataset.name;
    this.setData({
      showReminderPicker: true,
      currentPlanId: templateId,
      currentPlanName: planName,
      selectedReminders: ['evening'],
    });
  },

  closeReminderPicker: function () {
    this.setData({ showReminderPicker: false });
  },

  toggleReminder: function (e) {
    var key = e.currentTarget.dataset.key;
    var selected = this.data.selectedReminders.slice();
    var idx = selected.indexOf(key);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(key);
    }
    this.setData({ selectedReminders: selected });
  },

  confirmJoinPlan: function () {
    var that = this;
    var reminders = that.data.selectedReminders;
    if (reminders.length === 0) {
      wx.showToast({ title: '请至少选择一个提醒时间', icon: 'none' });
      return;
    }
    db.joinPlan({
      openid: that.data.openid,
      user_id: that.data.userId,
      template_id: that.data.currentPlanId,
      plan_name: that.data.currentPlanName,
      cycle_days: 7,
      daily_target: 1,
      reminders: reminders,
    }).then(function () {
      that.setData({ showReminderPicker: false });
      that.loadMyPlans();
      that.loadAvailablePlans();
      wx.showToast({ title: '已加入计划 🌱', icon: 'success' });
    }).catch(function (err) {
      console.error('加入计划失败:', err);
      wx.showToast({ title: '加入失败', icon: 'none' });
    });
  },

  leavePlan: function (e) {
    var that = this;
    var planId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认退出',
      content: '退出后打卡进度将保留，但不再收到提醒',
      success: function (res) {
        if (res.confirm) {
          db.leavePlan(planId).then(function () {
            that.loadMyPlans();
            that.loadAvailablePlans();
            wx.showToast({ title: '已退出', icon: 'success' });
          });
        }
      },
    });
  },

  goRecord: function () {
    wx.switchTab({ url: '/pages/index/index' });
  },

  stopPropagation: function () {},

  onShareAppMessage: function () {
    return {
      title: '来一起记录情绪吧 - 情绪胶囊',
      path: '/pages/plan/plan',
    };
  },
});