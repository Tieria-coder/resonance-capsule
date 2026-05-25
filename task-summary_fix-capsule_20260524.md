# 任务总结：修复悬浮胶囊不显示问题

**时间**: 2026-05-24 10:59 GMT+8

---

## 🔍 问题分析

用户反馈：选择情绪后，没有看到悬浮胶囊效果。

### 原因

1. **显示条件错误**
   ```wxml
   {{tempSubEmotions.length > 0 && !expandedCategoryKey ? 'show' : ''}}
   ```
   当用户展开大类时，`expandedCategoryKey` 有值，导致胶囊隐藏。

2. **z-index 太低**
   - 胶囊 z-index: 90
   - 弹窗 z-index: 100
   - 胶囊被弹窗遮挡

3. **位置不合适**
   - bottom: 200rpx（太高）

---

## ✅ 修复内容

### 1. 修改显示条件

**文件**: `pages/index/index.wxml`

```wxml
<!-- 修改前 -->
{{tempSubEmotions.length > 0 && !expandedCategoryKey ? 'show' : ''}}

<!-- 修改后 -->
{{tempSubEmotions.length > 0 ? 'show' : ''}}
```

只要选了情绪就显示，不管是否展开大类。

---

### 2. 调整层级和位置

**文件**: `pages/index/index.wxss`

```css
/* 修改前 */
.capsule-float {
  right: 36rpx;
  bottom: 200rpx;
  z-index: 90;
}

/* 修改后 */
.capsule-float {
  right: 24rpx;
  bottom: 120rpx;
  z-index: 110;
}
```

---

## 🎨 预期效果

选择情绪后：
```
╭────╮─────────────────╭────╮
│ 🫧 │ 🤩兴奋  😄愉快  │ 2  │
╰────╯─────────────────╰────╯
```

- 药丸胶囊分割造型
- 在弹窗之上显示
- 右下角位置合适

---

## 📁 修改文件清单

1. `pages/index/index.wxml` - 显示条件
2. `pages/index/index.wxss` - 层级和位置