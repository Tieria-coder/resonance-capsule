const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 每个 SVG 的 1x 目标尺寸，以及 viewBox 尺寸
const iconConfig = {
  'ai-companion':       { viewBox: 32, logical: 32 },
  'user-avatar':        { viewBox: 32, logical: 32 },
  'continue-chat':      { viewBox: 24, logical: 24 },
  'plan-calendar':      { viewBox: 32, logical: 32 },
  'empty-state':        { viewBox: 48, logical: 48 },
  'record-default':     { viewBox: 32, logical: 32 },
  'poem-sparkle':      { viewBox: 24, logical: 24 },
  'ai-diary':          { viewBox: 24, logical: 24 },
  'mic-idle':          { viewBox: 28, logical: 28 },
  'mic-recording':      { viewBox: 28, logical: 28 },
  'write-something':    { viewBox: 24, logical: 24 },
  'today-done':        { viewBox: 24, logical: 24 },
  'success-confirm':    { viewBox: 24, logical: 24 },
  'close':              { viewBox: 24, logical: 24 },
  'tab-record':        { viewBox: 24, logical: 24 },
  'tab-ai-diary':      { viewBox: 24, logical: 24 },
  'tab-calendar':      { viewBox: 24, logical: 24 },
  'tab-report':        { viewBox: 24, logical: 24 },
  'tab-profile':       { viewBox: 24, logical: 24 },
  'plan-clock':        { viewBox: 24, logical: 24 },
  'plan-date':         { viewBox: 24, logical: 24 },
  'plan-flame':        { viewBox: 24, logical: 24 },
  'plan-flower':       { viewBox: 24, logical: 24 },
  'plan-seedling':     { viewBox: 24, logical: 24 },
  'achievement-badge': { viewBox: 24, logical: 24 },
  'theme-wardrobe':    { viewBox: 24, logical: 24 },
  'plan-tag':         { viewBox: 24, logical: 24 },
  'chart-bar':        { viewBox: 24, logical: 24 },
  'camera':           { viewBox: 24, logical: 24 },
  'tab-record-selected':   { viewBox: 24, logical: 24 },
  'tab-calendar-selected': { viewBox: 24, logical: 24 },
  'tab-report-selected':   { viewBox: 24, logical: 24 },
  'tab-profile-selected':  { viewBox: 24, logical: 24 },
};

const sourceDir = path.join(__dirname, 'batch1-ui');
const scaleLabels = ['1x', '2x', '3x'];
const scaleMultipliers = [1, 2, 3];
const densityBase = 72;

async function exportIcon(name, svgBuffer, scaleIdx) {
  const config = iconConfig[name];
  if (!config) return;

  const targetPx = config.logical * scaleMultipliers[scaleIdx];
  // density: pixels per SVG unit. density * viewBox = rendered pixels
  const density = densityBase * scaleMultipliers[scaleIdx];

  const outputDir = path.join(__dirname, 'exported', scaleLabels[scaleIdx]);
  const outputPath = path.join(outputDir, `${name}@${scaleLabels[scaleIdx]}.png`);

  try {
    await sharp(svgBuffer, { density })
      .resize(targetPx, targetPx, { fit: 'contain', kernel: 'lanczos3' })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${name}@${scaleLabels[scaleIdx]}.png (${targetPx}px, density=${density})`);
  } catch (e) {
    console.log(`  ❌ ${name}@${scaleLabels[scaleIdx]}.png - ${e.message}`);
  }
}

async function main() {
  const svgFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.svg'));
  console.log(`发现 ${svgFiles.length} 个 SVG 文件\n`);

  for (const svgFile of svgFiles) {
    const name = path.basename(svgFile, '.svg');
    const svgPath = path.join(sourceDir, svgFile);
    const svgBuffer = fs.readFileSync(svgPath);
    console.log(`📦 ${name}`);
    for (let i = 0; i < 3; i++) {
      await exportIcon(name, svgBuffer, i);
    }
  }

  console.log('\n🎉 Batch 1 PNG 导出完成！');
}

main().catch(console.error);
