// 云函数：AI 情绪助手
// 使用 DeepSeek API 实现情绪分析、陪伴对话、报告生成、智能日记
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init()

const util = require('./util.js')

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = 'sk-46a79397a3884504a8972509e04a541c'

// 情绪定义来自 util.js（通过 require 引入）
// ═══ 辅助函数 ═══
// 直接复用 util.js 里的函数
function getEmotionInfo(emotionKey) {
  return util.getEmotionByKey(emotionKey);
}

function getEmotionLabel(emotionKey) {
  return util.getEmotionLabel(emotionKey);
}



// ═══ 调用 DeepSeek API ═══
async function callDeepSeek(messages, maxTokens = 500) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    })

    const url = new URL(DEEPSEEK_API_URL)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content.trim())
          } else {
            reject(new Error('AI返回格式异常: ' + data.substring(0, 200)))
          }
        } catch (e) {
          reject(new Error('AI响应解析失败'))
        }
      })
    })

    req.on('error', (err) => {
      console.error('DeepSeek API error:', err)
      reject(new Error('AI服务暂时不可用，请稍后再试'))
    })

    req.setTimeout(25000, () => {
      req.destroy()
      reject(new Error('AI请求超时'))
    })

    req.write(body)
    req.end()
  })
}

// ═══ action: analyze - 情绪分析（双重判断）═══
async function analyzeEmotion(text) {
  // 构建情绪列表文本
  const categoriesText = util.EMOTION_CATEGORIES.map(cat => {
    const subs = cat.subEmotions.map(s => `${s.icon} ${s.label}(${s.key})`).join('、')
    return `${cat.icon} ${cat.label}(${cat.key}): ${subs}`
  }).join('\n')

  const systemPrompt = `你是一个情绪分析助手。分析用户输入的文字，先判断情绪大类，再判断具体子情绪。

情绪分类体系：
${categoriesText}

请严格按以下JSON格式回复，不要输出其他内容：
{"category":"大类key","emotion":"子情绪key","confidence":0.9,"reason":"一句话解释为什么判断为这个情绪"}`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ], 200)

  try {
    // 提取 JSON（可能被 markdown 包裹）
    const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    // 验证情绪key有效
    const info = getEmotionInfo(parsed.emotion)
    if (!info || info.key === 'neutral_routine') {
      // 如果验证失败，尝试用category找第一个子情绪
      const cat = util.EMOTION_CATEGORIES.find(c => c.key === parsed.category)
      if (cat) {
        parsed.emotion = cat.subEmotions[0].key
      } else {
        parsed.emotion = 'neutral_routine'
      }
    }

    const finalInfo = getEmotionInfo(parsed.emotion)

    return {
      emotion: parsed.emotion,
      category: finalInfo.categoryKey,
      score: getScore(parsed.emotion),
      confidence: parsed.confidence || 0.8,
      reason: parsed.reason || '',
    }
  } catch (e) {
    return {
      emotion: 'neutral_routine',
      category: 'neutral',
      score: 0,
      confidence: 0.5,
      reason: '未能准确识别，默认为平淡',
    }
  }
}

// 根据子情绪计算分值
function getScore(emotionKey) {
  const desc = getEmotionInfo(emotionKey).desc
  if (desc.includes('喜悦') || desc.includes('轻松') || desc.includes('明亮') || desc.includes('满')) return 2
  if (desc.includes('温') || desc.includes('光') || desc.includes('不好不坏')) return 1
  if (desc.includes('乱') || desc.includes('纠') || desc.includes('自卑') || desc.includes('压力')) return -1
  if (desc.includes('孤独') || desc.includes('失望') || desc.includes('悲') || desc.includes('委屈')) return -2
  if (desc.includes('怒') || desc.includes('恼') || desc.includes('嫉') || desc.includes('怨')) return -2
  if (desc.includes('疲') || desc.includes('困') || desc.includes('病') || desc.includes('透')) return -1
  if (desc.includes('迷') || desc.includes('怀') || desc.includes('卡') || desc.includes('空')) return -1
  return 0
}

// ═══ action: companion - AI 陪伴回应 ═══
async function companionResponse(emotion, text, recentEmotions, period, userPortrait, aiReport, reportRecords) {
  const emotionLabel = getEmotionLabel(emotion)
  
  // ═══ 时间段中文 ═══
  const periodMap = {
    'morning': '早上',
    'noon': '午后',
    'afternoon': '下午',
    'evening': '傍晚',
    'night': '夜晚'
  }
  const periodText = periodMap[period] || ''
  
  // ═══ 用户画像描述 ═══
  let portraitText = ''
  if (userPortrait) {
    const score = parseFloat(userPortrait.avgScore)
    const scoreLabel = score > 1 ? '偏积极' : score > 0 ? '总体良好' : score > -1 ? '略有起伏' : '需要关注'
    const emotionMap = {
      'happy': '开心',
      'calm': '平静',
      'anxious': '焦虑',
      'sad': '难过',
      'angry': '愤怒',
      'tired': '疲惫',
      'confused': '迷茫',
      'neutral': '平淡'
    }
    const topEmotionLabel = emotionMap[userPortrait.topEmotion] || '平淡'
    const periodMap2 = {
      'morning': '早上',
      'noon': '午后',
      'afternoon': '下午',
      'evening': '傍晚',
      'night': '夜晚'
    }
    const topPeriodLabel = periodMap2[userPortrait.topPeriod] || ''
    
    // ═══ 新增：情绪趋势 ═══
    let trendText = ''
    if (userPortrait.trend) {
      const trendMap = {
        '改善中': '最近情绪在变好，真为你开心 😊',
        '稳定': '情绪比较稳定',
        '下滑': '最近情绪有些下滑，要多关注自己哦'
      }
      trendText = trendMap[userPortrait.trend] || ''
    }
    
    // ═══ 新增：时间模式 ═══
    let timePatternText = ''
    const mostAnxiousPeriodLabel = periodMap2[userPortrait.mostAnxiousPeriod] || ''
    const mostHappyPeriodLabel = periodMap2[userPortrait.mostHappyPeriod] || ''
    if (mostAnxiousPeriodLabel) {
      timePatternText += `你通常${mostAnxiousPeriodLabel}容易焦虑 `
    }
    if (mostHappyPeriodLabel) {
      timePatternText += `最喜欢在${mostHappyPeriodLabel}记录开心的事`
    }
    if (userPortrait.worstWeekday && userPortrait.worstWeekday !== '未知') {
      timePatternText += ` ${userPortrait.worstWeekday}对你来说可能比较难熬`
    }
    
    // ═══ 新增：对话历史 ═══
    let historyText = ''
    if (userPortrait.conversationHistory && userPortrait.conversationHistory.length > 0) {
      const recentHistory = userPortrait.conversationHistory.slice(-3)  // 最近3次
      historyText = `\n\n最近几次我对你说：\n${recentHistory.map((h, i) => `  ${i+1}. ${h.response.substring(0, 50)}...`).join('\n')}`
    }
    
    portraitText = `\n\n用户画像：\n- 已记录${userPortrait.recordCount}条情绪，平均情绪${userPortrait.avgScore}（${scoreLabel}）\n- 最常见情绪：${topEmotionLabel}，最活跃时间段：${topPeriodLabel}\n- 连续记录${userPortrait.streak}天\n- ${trendText}${timePatternText ? `\n- ${timePatternText}` : ''}${historyText}`
  }
  
  const recentInfo = recentEmotions && recentEmotions.length > 0
    ? `\n\n用户最近的情绪记录：${recentEmotions.map(e => {
        return getEmotionLabel(e.emotion)
      }).join('、')}`
    : ''

  // ═══ 报告上下文（从报告页跳转聊天时传入）═══
  let reportContextText = ''
  if (aiReport && source === 'report') {
    const recentTexts = (reportRecords || []).slice(0, 5).map(r => r.text).filter(Boolean)
    const textsStr = recentTexts.length > 0 ? `\n\n用户最近的记录文字：\n${recentTexts.join('\n')}` : ''
    reportContextText = `\n\n=== 用户情绪洞察报告 ===\n${aiReport}${textsStr}\n=== 报告结束 ===\n\n请结合上面的情绪洞察报告，以温暖、支持的口吻回应用户。`
  }

  const systemPrompt = `你是"情绪胶囊"里的AI小伙伴，一个温暖、善解人意、不啰嗦的倾听者。
用户刚刚记录了一条情绪：${emotionLabel}${text ? `，并留言："${text}"` : ''}${periodText ? `\n\n当前时间段：${periodText}` : ''}${recentInfo}${portraitText}${reportContextText}\n\n请根据用户的情绪状态，给出一段简短的回应（50-80字）：\n- 如果情绪积极，给予肯定和鼓励\n- 如果情绪低落，给予温暖的安慰，不要说教\n- 结合时间段调整语气（早上清爽，夜晚温柔）\n- 如果用户画像可用，可以适当呼应（比如"你最近容易焦虑，这次也一样吗？"）\n- 语气自然亲切，像朋友一样，不用"亲"、"宝"等称呼\n- 可以适当用1-2个emoji\n\n直接输出回应内容，不要加引号或其他标记。`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
  ], 150)

  return { response: result }
}

// ═══ action: report - AI 报告生成 ═══
async function generateReport(records, rangeLabel, userPortrait) {
  const days = records.length

  // 整理数据摘要
  const emotionCounts = {}
  const periodCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const dailySummary = {}
  const texts = []

  records.forEach(r => {
    emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1
    const dateStr = r.record_time ? new Date(r.record_time).toLocaleDateString('zh-CN') : '未知日期'
    if (!dailySummary[dateStr]) dailySummary[dateStr] = []
    const label = getEmotionLabel(r.emotion)
    dailySummary[dateStr].push(label)
    if (r.text) texts.push(r.text)
    // 统计时间段
    if (r.period) {
      periodCounts[r.period] = (periodCounts[r.period] || 0) + 1
    }
  })

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(function(e) { return getEmotionLabel(e[0]) + '(' + e[1] + '次)' })
    .join('、')

  const scores = records.map(function(r) { return getScore(r.emotion) })
  const avgScore = (scores.reduce(function(a, b) { return a + b }, 0) / scores.length).toFixed(1)

  // 最常记录时间段
  var topPeriodEntry = Object.entries(periodCounts).sort(function(a, b) { return b[1] - a[1] })[0]
  var periodLabelMap = { morning: '早上', afternoon: '下午', evening: '傍晚', night: '夜晚' }
  var topPeriodLabel = periodLabelMap[topPeriodEntry && topPeriodEntry[0]] || ''

  // 情绪趋势
  var trendDesc = ''
  if (records.length >= 4) {
    var mid = Math.floor(records.length / 2)
    var firstHalf = records.slice(0, mid)
    var secondHalf = records.slice(mid)
    var firstAvg = firstHalf.map(function(r) { return getScore(r.emotion) }).reduce(function(a, b) { return a + b }, 0) / firstHalf.length
    var secondAvg = secondHalf.map(function(r) { return getScore(r.emotion) }).reduce(function(a, b) { return a + b }, 0) / secondHalf.length
    if (secondAvg - firstAvg > 0.5) trendDesc = '最近情绪在变好'
    else if (firstAvg - secondAvg > 0.5) trendDesc = '最近情绪有些下滑'
    else trendDesc = '情绪比较稳定'
  }

  var portraitDesc = ''
  if (userPortrait) {
    var emoMap = { happy: '开心', calm: '平静', anxious: '焦虑', sad: '难过', angry: '愤怒', tired: '疲惫', confused: '迷茫', neutral: '平淡' }
    portraitDesc = 'ta最常见的情绪是' + (emoMap[userPortrait.topEmotion] || '平淡') + '，已经连续记录了' + (userPortrait.streak || 0) + '天。'
  }

  var systemPrompt = '你是一个温柔、细腻的朋友，正在给另一个朋友写一段私信。\n\n'
  systemPrompt += '背景：这位朋友一直在用"情绪胶囊"记录自己的情绪，现在你想基于ta最近' + (rangeLabel || '近期') + '的记录，写一段真心话送给ta。\n\n'
  systemPrompt += '你了解到的关于ta的信息：\n'
  systemPrompt += '- 这段时间一共记录了' + records.length + '条情绪\n'
  systemPrompt += '- 最常出现的情绪是：' + topEmotions + '\n'
  systemPrompt += '- 平均情绪分数' + avgScore + '（2分是最好，-2分是最低落）\n'
  systemPrompt += '- ta最喜欢在' + (topPeriodLabel || '各个时段') + '记录情绪\n'
  if (trendDesc) systemPrompt += '- 这段时间情绪趋势：' + trendDesc + '\n'
  systemPrompt += '- ' + portraitDesc + '\n'
  systemPrompt += '- 每日记录：' + Object.entries(dailySummary).map(function(e) { return e[0] + ': ' + e[1].join('、') }).join('；') + '\n'
  if (texts.length > 0) systemPrompt += '- ta写下过这些话：' + texts.join('；').substring(0, 200) + '\n'
  systemPrompt += '\n现在，请写一段200-300字的话，像给好朋友写的私信：\n'
  systemPrompt += '- 不要有"【情绪概览】"这种标题，自然地写，像在跟ta说话\n'
  systemPrompt += '- 可以提到你注意到的细节（比如某个情绪反复出现，或者某个时段总是很开心）\n'
  systemPrompt += '- 如果趋势在变好，真诚地为ta高兴；如果在下滑，温柔地陪伴，不要说教\n'
  systemPrompt += '- 可以轻声给一个很小的建议，但不要像专家，要像朋友随口提了一句\n'
  systemPrompt += '- 不要用"亲爱的"开头，也不要"此致敬礼"结尾，就像发一条稍微长一点的微信消息\n'
  systemPrompt += '- 语气自然，可以加1-2个合适的emoji\n\n'
  systemPrompt += '直接输出正文，不要加任何解释。'

  var result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
  ], 600)

  return { report: result }
}
// ═══ action: diary - AI 智能日记 ═══
async function smartDiary(text, userPortrait) {
  // 构建情绪列表文本
  const categoriesText = util.EMOTION_CATEGORIES.map(cat => {
    const subs = cat.subEmotions.map(s => `${s.icon} ${s.label}(${s.key})`).join('、')
    return `${cat.icon} ${cat.label}(${cat.key}): ${subs}`
  }).join('\n')

  // 构建用户画像上下文
  var portraitContext = ''
  if (userPortrait) {
    var score = parseFloat(userPortrait.avgScore || 0)
    var scoreLabel = score > 1 ? '偏积极' : score > 0 ? '总体良好' : score > -1 ? '略有起伏' : '需要关注'
    var trendText = userPortrait.trend === '改善中' ? '情绪正在变好' : userPortrait.trend === '下滑' ? '情绪有些下滑' : '情绪保持稳定'
    portraitContext = '用户画像参考：已记录' + userPortrait.recordCount + '条情绪，平均情绪' + scoreLabel + '（' + userPortrait.avgScore + '分），' + trendText + '。'
    if (userPortrait.streak > 0) {
      portraitContext += '已连续记录' + userPortrait.streak + '天，'
    }
    if (userPortrait.consecutiveAnxiousDays > 0) {
      portraitContext += '近期有' + userPortrait.consecutiveAnxiousDays + '天连续记录了负面情绪，'
    }
    portraitContext = '\n\n' + portraitContext.slice(0, -1) + '。'
  }

  const systemPrompt = `你是一个情绪日记助手。用户会写一段自由文字（可能是日记、碎碎念、吐槽等），你需要：
1. 理解文字中的情绪（先判断大类，再判断子情绪）
2. 给出温暖的回应

情绪分类体系：
${categoriesText}${portraitContext}

请严格按以下JSON格式回复：
{"category":"大类key","emotion":"子情绪key","confidence":0.9,"response":"你的一句温暖回应（30-50字，像朋友一样自然，可加emoji）"}`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ], 200)

  try {
    const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    const info = getEmotionInfo(parsed.emotion)
    const emotionKey = info && info.key !== 'neutral_routine' ? parsed.emotion : 'neutral_routine'

    return {
      emotion: emotionKey,
      category: info.categoryKey || 'neutral',
      score: getScore(emotionKey),
      confidence: parsed.confidence || 0.8,
      response: parsed.response || '记录下来了，辛苦啦 💚',
    }
  } catch (e) {
    return {
      emotion: 'neutral_routine',
      category: 'neutral',
      score: 0,
      confidence: 0.5,
      response: '记录下来了 💚',
    }
  }
}

// ═══ action: checkEmotionMatch - 检查情绪和文字是否匹配 ═══
async function checkEmotionMatch(emotions, text) {
  if (!text || !text.trim()) {
    // 如果没有文字，直接认为匹配（跳过检查）
    return { match: true, message: '' }
  }

  // 构建情绪列表文本
  const emotionList = emotions.map(key => {
    const info = getEmotionInfo(key)
    return `${info.categoryIcon} ${info.categoryLabel}·${info.icon}${info.label} (${key})`
  }).join('、')

  const systemPrompt = `你是"情绪胶囊"的AI助手。用户选择了以下情绪：${emotionList}
用户的文字记录："${text}"

请判断用户的情绪选择和文字内容是否匹配。
匹配的定义：文字中表达的情绪，与用户选择的情绪，在情绪类别上是一致的（比如都是积极情绪，或者都是难过情绪）。
不匹配的例子：
- 用户选择了"😊 开心"类别的情绪，但文字写的是"今天好难过"
- 用户选择了"😢 难过"类别的情绪，但文字写的是"今天中奖了！"
- 用户选择了"😠 愤怒"类别的情绪，但文字写的是"一切都好"

如果匹配，严格按以下JSON格式回复：
{"match": true}

如果不匹配，严格按以下JSON格式回复：
{"match": false, "message": "你的提醒文案，20-30字，温和地指出不匹配的地方，并建议用户重新选择或强制保存。不要用'亲'、'宝'等称呼，语气像朋友一样。"}

注意：只输出JSON，不要输出其他内容。`

  try {
    const result = await callDeepSeek([
      { role: 'system', content: systemPrompt },
    ], 150)

    // 提取 JSON
    const jsonStr = result.replace(/\`\`\`json?\\n?/g, '').replace(/\`\`\`/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    return {
      match: parsed.match === true,
      message: parsed.message || ''
    }
  } catch (e) {
    console.error('检查情绪匹配失败:', e)
    // 如果检查失败，默认认为匹配（避免误报）
    return { match: true, message: '' }
  }
}

// ═══ action: stt - 语音转文字 ═══
async function speechToText(fileID) {
  const https = require('https')
  const http = require('http')

  // 从云存储下载文件
  const fileRes = await cloud.downloadFile({ fileID })
  const audioBuffer = fileRes.fileContent

  // SiliconFlow 免费 Whisper API
  const SILICONFLOW_KEY = 'sk-qxpdnxpkwvxnzjaqwfjfmvbnpjkmfitluvwgsrgqjlrcrdmbf'
  const boundary = '----FormBoundary' + Date.now()

  const bodyParts = []
  bodyParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`)
  bodyParts.push(audioBuffer)
  bodyParts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nspeech-paraformer-v2`)
  bodyParts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nzh`)
  bodyParts.push(`\r\n--${boundary}--\r\n`)

  const body = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8')))

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.siliconflow.cn',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ text: parsed.text || '' })
        } catch (e) {
          reject(new Error('STT解析失败'))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('语音识别超时')) })
    req.write(body)
    req.end()
  })
}

// ═══ action: poetry - 情绪诗语生成 ═══
async function generatePoetry(userPortrait, date, todayEmotion) {
  // 构建用户画像描述
  var portraitText = '这是一位情绪记录新手，'
  if (userPortrait) {
    var score = parseFloat(userPortrait.avgScore)
    var scoreLabel = score > 1 ? '偏积极' : score > 0 ? '总体良好' : score > -1 ? '略有起伏' : '需要关注'
    var trendText = userPortrait.trend === '改善中' ? '正在变好' : userPortrait.trend === '下滑' ? '需要关心' : '保持稳定'
    portraitText = '这位用户'
    if (userPortrait.recordCount > 0) {
      portraitText += '已记录' + userPortrait.recordCount + '条情绪，'
    } else {
      portraitText += '开始记录情绪，'
    }
    portraitText += '平均情绪' + scoreLabel + '（' + userPortrait.avgScore + '分），趋势' + trendText + '。'
    if (userPortrait.streak > 0) {
      portraitText += '已连续记录' + userPortrait.streak + '天。'
    }
    if (userPortrait.consecutiveAnxiousDays > 0) {
      portraitText += '近期有' + userPortrait.consecutiveAnxiousDays + '天连续记录了负面情绪。'
    }
  }

  var dateObj = new Date(date)
  var weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()]
  var month = dateObj.getMonth() + 1
  var day = dateObj.getDate()
  var dateText = month + '月' + day + '日' + weekday

  // 今日情绪描述
  var todayEmotionText = ''
  if (todayEmotion) {
    var info = getEmotionInfo(todayEmotion)
    if (info && info.key !== 'neutral_routine') {
      todayEmotionText = '用户今日记录的主要情绪是：' + info.icon + info.label + '。'
    }
  }

  var systemPrompt = '你是一位温柔的情绪陪伴者。根据用户今日的情绪状态，写一句有诗意的话（20-35字）。\n\n要求：\n1. 只是一句话，不要分行，不要多句\n2. 风格温暖，像给好朋友发的私信\n3. 可以结合情绪趋势或今日日期，但不要生硬\n4. 有诗意但不矫情，自然舒服\n5. 不要emoji，不要引号包裹\n6. 直接输出这句话，不要加任何解释'

  var userPrompt = dateText + '。' + todayEmotionText + portraitText + '\n\n请为这位用户写一句有诗意的话（一句话，20-35字）。'

  try {
    var result = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 300)
    return { poetry: result }
  } catch (e) {
    console.error('诗语生成失败:', e)
    var fallbacks = [
      '情绪像今天的阳光，不急不慢，刚刚好。',
      '心里有点小波动也没关系，云飘过去就散了。',
      '今天的你，比昨天更接近想成为的自己。',
      '情绪来了就让它坐一会儿，不必急着赶它走。'
    ]
    return { poetry: fallbacks[Math.floor(Math.random() * fallbacks.length)] }
  }
}

// ═══ 云函数入口 ═══
exports.main = async (event, context) => {
  const { action, text, emotion, emotions, records, recentEmotions, fileID, rangeLabel, period, userPortrait, date, aiReport, records: reportRecords, source } = event

  switch (action) {
    case 'analyze':
      return await analyzeEmotion(text || '')

    case 'companion':
      return await companionResponse(emotion || 'neutral_routine', text || '', recentEmotions || [], period, userPortrait, aiReport, reportRecords)

    case 'report':
      return await generateReport(records || [], rangeLabel || '', userPortrait)

    case 'diary':
      return await smartDiary(text || '', userPortrait)

    case 'stt':
      return await speechToText(fileID)

    case 'checkEmotionMatch':
      return await checkEmotionMatch(emotions || [], text || '')

    case 'poetry':
      return await generatePoetry(userPortrait, date, event.todayEmotion)

    default:
      return { error: '未知操作类型' }
  }
}
