// 更新 ai/index.js 以支持多选情绪
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, 'cloudfunctions', 'ai', 'index.js')
let content = fs.readFileSync(filePath, 'utf8')

// 修改1: 在 companionResponse 函数中，构建 emotionDesc 变量后，修改 systemPrompt
// 找到 systemPrompt 中的 "第二步——再看情绪选择：" 部分
const oldSystemPromptPart = `第二步——再看情绪选择：\\n用户选了【' + emotionLabel + '】（' + emotionInfo.categoryLabel + '情绪，' + (valence === 'positive' ? '正向' : '负向') + '，' + (energy === 'high' ? '高能量' : '低能量') + '）\\n`

const newSystemPromptPart = `第二步——再看情绪选择：\\n用户选了这些情绪：' + emotionDesc + '\\n`

if (content.includes(oldSystemPromptPart)) {
  content = content.replace(oldSystemPromptPart, newSystemPromptPart)
  console.log('✅ 已修改 companionResponse 的 systemPrompt')
} else {
  console.log('⚠️  未找到 companionResponse 的 systemPrompt 部分，可能需要手动修改')
}

// 修改2: 在 chatContinued 函数中，同样修改 systemPrompt
// 先找到 chatContinued 函数中的类似部分
const oldChatSystemPromptPart = `用户刚刚记录了一种情绪：' + emotionLabel + '（' + emotionInfo.categoryIcon + '），属于"' + emotionInfo.categoryLabel + '"情绪。\\n\\n【你的核心任务`
const newChatSystemPromptPart = `用户刚刚记录了这些情绪：' + emotionDesc + '\\n\\n【你的核心任务`

if (content.includes(oldChatSystemPromptPart)) {
  content = content.replace(oldChatSystemPromptPart, newChatSystemPromptPart)
  console.log('✅ 已修改 chatContinued 的 systemPrompt')
} else {
  console.log('⚠️  未找到 chatContinued 的 systemPrompt 部分，可能需要手动修改')
}

// 修改3: 在 generateReport 函数中，遍历 emotions 数组进行统计
const oldReportStats = `records.forEach(function(r) {\n    var label = getEmotionLabel(r.emotion)\n    emotionCounts[label] = (emotionCounts[label] || 0) + 1`
const newReportStats = `records.forEach(function(r) {\n    // 兼容旧数据：r.emotions 可能不存在，此时使用 r.emotion\n    var emotions = r.emotions || [r.emotion]\n    emotions.forEach(function(emotionKey) {\n      var label = getEmotionLabel(emotionKey)\n      emotionCounts[label] = (emotionCounts[label] || 0) + 1\n    })`

if (content.includes(oldReportStats)) {
  content = content.replace(oldReportStats, newReportStats)
  console.log('✅ 已修改 generateReport 的统计逻辑')
} else {
  console.log('⚠️  未找到 generateReport 的统计部分，可能需要手动修改')
}

// 写入文件
fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ 文件已更新:', filePath)
