// 生成 plan_templates 示例数据
var data = {
  plan_name: '一周平静计划',
  theme: '慢下来，感受当下',
  description: '每天花1分钟记录当下的情绪状态。不需要分析，只需要感受。7天后你会发现自己和情绪的关系悄悄改变了。',
  cycle_days: 7,
  daily_target: 1,
  status: 'active',
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  is_new: true,
  created_at: new Date(),
}

console.log(JSON.stringify(data, null, 2))
console.log('\n\n--- 复制上方 JSON 到云开发控制台 plan_templates 集合手动添加记录 ---')
