# 悬浮胶囊重构为小球+面板

## 目标
将旧的三段式胶囊（头+体+尾）重新设计为：小圆形悬浮球 + 底部展开面板

## 改动

### index.wxml
- 删除旧 `capsule-float/capsule-pill/capsule-head/capsule-body/capsule-tail` 结构
- 新增 `emotion-fab`：96rpx 圆形球，内含图标+红色角标（已选数量）
- 新增 `emotion-panel`：底部抽屉面板，列表展示每条已选情绪（图标+文字+删除按钮）
- 拖拽事件从 capsule 改名为 fab（onFabTouchStart/Move/End/Tap）

### index.wxss
- 删除所有 `.capsule-*` 样式（~200行），替换为 `.emotion-fab-*` 和 `.emotion-panel-*`
- 小球：96rpx 圆形，淡紫渐变玻璃质感，backdrop-filter blur
- 角标：右上角红色圆角数字
- 面板：底部滑出，圆角顶部，淡白紫背景，每项带图标/文字/删除按钮
- 弹性出场动画 bounceIn

### index.js
- 拖拽方法重命名：onCapsuleTouch* → onFabTouch*
- onFabTap 点击打开面板（与拖拽冲突检测）
