// scripts/patch_index_header.js
// 给 index.js 添加 headerDate / greeting 数据和 _updateHeaderDate 方法

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'pages', 'index', 'index.js');
let c = fs.readFileSync(file, 'utf8');

// 1. data 里 toastText 后插入 headerDate / greeting
const old1 = '    toastText: \'\'\r\n  },';
const new1 = '    toastText: \'\',\r\n\r\n    // ══ 头部日期 ══\r\n    headerDate: \'\',\r\n    greeting: \'\'\r\n  },';
if (!c.includes(old1)) { console.error('PATCH FAIL: old1 not found'); process.exit(1); }
c = c.replace(old1, new1);

// 2. onLoad 里 _initVoiceRecorder() 后插入调用
const old2 = '    this._initVoiceRecorder()\r\n    // 初始化所有情绪大类';
const new2 = '    this._initVoiceRecorder()\r\n    this._updateHeaderDate()\r\n    // 初始化所有情绪大类';
if (!c.includes(old2)) { console.error('PATCH FAIL: old2 not found'); process.exit(1); }
c = c.replace(old2, new2);

// 3. onShow 开头插入调用
const old3 = '  onShow: function () {\r\n    var that = this\r\n    that.loadPoetry()';
const new3 = '  onShow: function () {\r\n    var that = this\r\n    that._updateHeaderDate()\r\n    that.loadPoetry()';
if (!c.includes(old3)) { console.error('PATCH FAIL: old3 not found'); process.exit(1); }
c = c.replace(old3, new3);

// 4. 在 _initUser 方法前插入 _updateHeaderDate 方法
const old4 = '  // ══ 初始化用户 ══\r\n  _initUser: function () {';
const new4 =
  '  // ══ 更新头部日期和问候 ══\r\n' +
  '  _updateHeaderDate: function () {\r\n' +
  '    var now = new Date()\r\n' +
  '    var weekDays = [\'周日\', \'周一\', \'周二\', \'周三\', \'周四\', \'周五\', \'周六\']\r\n' +
  '    var month = now.getMonth() + 1\r\n' +
  '    var day = now.getDate()\r\n' +
  '    var wday = weekDays[now.getDay()]\r\n' +
  '    var headerDate = month + \'月\' + day + \'日 · \' + wday\r\n' +
  '    var hour = now.getHours()\r\n' +
  '    var greeting = \'\'\r\n' +
  '    if (hour < 6) greeting = \'夜深了\'\r\n' +
  '    else if (hour < 9) greeting = \'早安\'\r\n' +
  '    else if (hour < 12) greeting = \'上午好\'\r\n' +
  '    else if (hour < 14) greeting = \'午安\'\r\n' +
  '    else if (hour < 18) greeting = \'下午好\'\r\n' +
  '    else if (hour < 22) greeting = \'晚上好\'\r\n' +
  '    else greeting = \'夜深了\'\r\n' +
  '    this.setData({ headerDate: headerDate, greeting: greeting })\r\n' +
  '  },\r\n\r\n' +
  '  // ══ 初始化用户 ══\r\n' +
  '  _initUser: function () {';
if (!c.includes(old4)) { console.error('PATCH FAIL: old4 not found'); process.exit(1); }
c = c.replace(old4, new4);

fs.writeFileSync(file, c, 'utf8');
console.log('PATCH OK');
