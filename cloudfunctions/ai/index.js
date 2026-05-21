// 云函数：AI 情绪助手
// 使用 DeepSeek API 实现情绪分析、陪伴对话、报告生成、智能日记
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init()

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = 'sk-46a79397a3884504a8972509e04a541c'

// 情绪定义
const EMOTIONS = [
  { key: 'excited', label: '兴奋', score: 2 },
  { key: 'happy', label: '愉快', score: 1 },
  { key: 'calm', label: '平静', score: 0 },
  { key: 'sad', label: '低落', score: -1 },
  { key: 'angry', label: '烦躁', score: -1 },
  { key: 'crying', label: '伤心', score: -2 },
  { key: 'tired', label: '疲惫', score: -2 },
]

/**
 * 调用 DeepSeek API
 */
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
    
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('AI请求超时'))
    })
    
    req.write(body)
    req.end()
  })
}

/**
 * action: analyze - 情绪分析
 * 用户输入文字，AI 识别情绪类型和分值
 */
async function analyzeEmotion(text) {
  const systemPrompt = `你是一个情绪分析助手。分析用户输入的文字，识别出情绪类型和分值。
可选的情绪类型及分值：
- 兴奋(excited): 2分
- 愉快(happy): 1分
- 平静(calm): 0分
- 低落(sad): -1分
- 烦躁(angry): -1分
- 伤心(crying): -2分
- 疲惫(tired): -2分

请严格按以下JSON格式回复，不要输出其他内容：
{"emotion":"情绪key","confidence":0.9,"reason":"一句话解释为什么判断为这个情绪"}`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ], 200)

  try {
    // 提取 JSON（可能被 markdown 包裹）
    const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    
    // 验证情绪key有效
    const validEmotion = EMOTIONS.find(e => e.key === parsed.emotion)
    if (!validEmotion) {
      parsed.emotion = 'calm'
    }
    
    return {
      emotion: parsed.emotion,
      score: EMOTIONS.find(e => e.key === parsed.emotion).score,
      confidence: parsed.confidence || 0.8,
      reason: parsed.reason || '',
    }
  } catch (e) {
    return {
      emotion: 'calm',
      score: 0,
      confidence: 0.5,
      reason: '未能准确识别，默认为平静',
    }
  }
}

/**
 * action: companion - AI 陪伴回应
 * 记录情绪后，AI 给出温暖的回应
 */
async function companionResponse(emotion, text, recentEmotions) {
  const emotionLabel = EMOTIONS.find(e => e.key === emotion)?.label || '平静'
  const recentInfo = recentEmotions && recentEmotions.length > 0
    ? `\n\n用户最近的情绪记录：${recentEmotions.map(e => {
        const em = EMOTIONS.find(x => x.key === e.emotion)
        return `${em?.label || e.emotion}(${e.text ? e.text.substring(0, 20) : '无文字'})`
      }).join('、')}`
    : ''

  const systemPrompt = `你是"情绪胶囊"里的AI小伙伴，一个温暖、善解人意、不啰嗦的倾听者。
用户刚刚记录了一条情绪：${emotionLabel}${text ? `，并留言："${text}"` : ''}${recentInfo}

请根据用户的情绪状态，给出一段简短的回应（50-80字）：
- 如果情绪积极，给予肯定和鼓励
- 如果情绪低落，给予温暖的安慰，不要说教
- 如果连续低落，可以轻柔地建议关注自己
- 语气自然亲切，像朋友一样，不用"亲"、"宝"等称呼
- 可以适当用1-2个emoji

直接输出回应内容，不要加引号或其他标记。`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
  ], 150)

  return { response: result }
}

/**
 * action: report - AI 报告生成
 * 基于近期情绪数据生成个性化报告（2-3天即可）
 */
async function generateReport(records) {
  const days = records.length
  
  // 整理数据摘要
  const emotionCounts = {}
  const dailySummary = {}
  const texts = []
  
  records.forEach(r => {
    emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1
    const dateStr = r.record_time ? new Date(r.record_time).toLocaleDateString('zh-CN') : '未知日期'
    if (!dailySummary[dateStr]) dailySummary[dateStr] = []
    const label = EMOTIONS.find(e => e.key === r.emotion)?.label || r.emotion
    dailySummary[dateStr].push(label)
    if (r.text) texts.push(r.text)
  })

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => `${EMOTIONS.find(e => e.key === key)?.label || key}(${count}次)`)
    .join('、')

  const scores = records.map(r => {
    const em = EMOTIONS.find(e => e.key === r.emotion)
    return em ? em.score : 0
  })
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  const avgLabel = avgScore > 1 ? '偏积极' : avgScore > 0 ? '总体良好' : avgScore > -1 ? '略有起伏' : '需要关注'

  const systemPrompt = `你是"情绪胶囊"的心理健康AI助手。请基于用户的情绪数据，生成一份温暖、有洞察力的个性化报告。

用户情绪数据：
- 记录天数：${days}天
- 总记录数：${records.length}条
- 平均情绪分值：${avgScore}（-2到2，正值积极）
- 情绪总体状态：${avgLabel}
- 最常见情绪：${topEmotions}
- 每日情绪：${Object.entries(dailySummary).map(([date, emotions]) => `${date}: ${emotions.join('、')}`).join('；')}
${texts.length > 0 ? `- 用户留言摘要：${texts.join('；').substring(0, 300)}` : ''}

请按以下结构生成报告（共200-300字）：

【情绪概览】一句话总结这段时间的整体情绪状态。

【AI洞察】发现1-2个有趣或有价值的情绪模式，比如什么时间段情绪最好、是否有反复出现的情绪等。

【小建议】根据情绪状态给出1-2个轻量、可操作的建议。不要泛泛而谈，要结合数据。

注意：语气温暖但不幼稚，专业但不冷冰冰。直接输出报告正文。`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
  ], 500)

  return { report: result }
}

/**
 * action: diary - AI 智能日记
 * 用户自由输入文字，AI 自动提取情绪并记录
 */
async function smartDiary(text) {
  const systemPrompt = `你是一个情绪日记助手。用户会写一段自由文字（可能是日记、碎碎念、吐槽等），你需要：
1. 理解文字中的情绪
2. 给出温暖的回应

请严格按以下JSON格式回复：
{"emotion":"情绪key","confidence":0.9,"response":"你的一句温暖回应（30-50字，像朋友一样自然，可加emoji）"}

可选情绪key：excited(兴奋/2)、happy(愉快/1)、calm(平静/0)、sad(低落/-1)、angry(烦躁/-1)、crying(伤心/-2)、tired(疲惫/-2)`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ], 200)

  try {
    const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    
    const validEmotion = EMOTIONS.find(e => e.key === parsed.emotion)
    const emotionKey = validEmotion ? parsed.emotion : 'calm'
    
    return {
      emotion: emotionKey,
      score: EMOTIONS.find(e => e.key === emotionKey).score,
      confidence: parsed.confidence || 0.8,
      response: parsed.response || '记录下来了，辛苦啦 💚',
    }
  } catch (e) {
    return {
      emotion: 'calm',
      score: 0,
      confidence: 0.5,
      response: '记录下来了 💚',
    }
  }
}

/**
 * action: stt - 语音转文字
 * 从云存储下载录音文件，调用 SiliconFlow Whisper API 识别
 */
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

// 云函数入口
exports.main = async (event, context) => {
  const { action, text, emotion, records, recentEmotions, fileID } = event

  switch (action) {
    case 'analyze':
      return await analyzeEmotion(text || '')
    
    case 'companion':
      return await companionResponse(emotion || 'calm', text || '', recentEmotions || [])
    
    case 'report':
      return await generateReport(records || [])
    
    case 'diary':
      return await smartDiary(text || '')
    
    case 'stt':
      return await speechToText(fileID)
    
    default:
      return { error: '未知操作类型' }
  }
}
