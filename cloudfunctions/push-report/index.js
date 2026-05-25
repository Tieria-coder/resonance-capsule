// 云函数 - 推送订阅消息
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({
  env: 'cloud1-d5gev82b5db8c2485'
})

// 模板ID配置（需要替换为实际的模板ID）
const TEMPLATE_IDS = {
  daily: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  weekly: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  monthly: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
}

// 发送订阅消息
async function sendSubscribeMessage(userId, reportType, reportData) {
  try {
    const templateId = TEMPLATE_IDS[reportType]
    if (!templateId) {
      return { success: false, message: '未找到模板ID' }
    }
    
    let messageData = {}
    
    if (reportType === 'daily') {
      messageData = {
        thing1: { value: reportData.summary || '今日情绪报告' },
        time2: { value: reportData.report_date || '' },
        thing3: { value: reportData.ai_comment || '记得查看今日情绪报告哦' }
      }
    } else if (reportType === 'weekly') {
      messageData = {
        thing1: { value: reportData.summary || '本周情绪报告' },
        time2: { value: reportData.report_date || '' },
        thing3: { value: '本周稳定性：' + (reportData.stability_level || '良好') }
      }
    } else if (reportType === 'monthly') {
      messageData = {
        thing1: { value: reportData.summary || '本月情绪报告' },
        time2: { value: reportData.report_date || '' },
        thing3: { value: '本月积极情绪占比：' + (reportData.positive_rate || 0) + '%' }
      }
    }
    
    const result = await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId: templateId,
      page: 'pages/report/report?type=' + reportType,
      data: messageData
    })
    
    return { success: true, message: '推送成功', result: result }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { userId, reportType } = event
  
  try {
    // userId is openid
    const userRes = await db.collection('users').where({ openid: userId }).get()
    const user = userRes.data[0]
    
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    
    const subscription = user.subscription || {}
    
    if (!subscription[reportType]) {
      return { success: false, message: '用户未订阅该类型报告' }
    }
    
    const report = await db.collection('emotion_reports')
      .where({
        user_id: userId,
        report_type: reportType
      })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
    
    if (report.data.length === 0) {
      return { success: false, message: '未找到报告数据' }
    }
    
    const reportData = report.data[0]
    const pushResult = await sendSubscribeMessage(userId, reportType, reportData.report_data)
    
    return pushResult
  } catch (err) {
    return { success: false, message: err.message }
  }
}
