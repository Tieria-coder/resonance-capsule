// components/capsule-status/capsule-status.js - ES5 compatible
// 胶囊组件 - 根据记录次数切换8阶段视觉演变动画

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前阶段 (0-7)
    stage: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.updateStage(newVal);
      }
    },
    // 记录次数
    recordCount: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.calculateStage(newVal);
      }
    },
    // 胶囊宽度
    width: {
      type: Number,
      value: 300
    },
    // 胶囊高度
    height: {
      type: Number,
      value: 400
    },
    // 是否显示阶段指示器
    showStage: {
      type: Boolean,
      value: true
    },
    // 主题
    theme: {
      type: String,
      value: 'default' // default, tree, monster, star
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    stageClass: 'stage-0',
    eyeAnimation: '',
    glowAnimation: '',
    capsuleSvg: '',
    currentStage: 0
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 组件挂载时
      this.calculateStage(this.properties.recordCount);
      this.generateCapsuleSvg();
    },
    detached: function() {
      // 组件卸载时
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 根据记录次数计算阶段
     * @param {Number} count - 记录次数
     */
    calculateStage: function(count) {
      var stage = 0;
      
      if (count >= 7) {
        stage = 7; // 觉醒
      } else if (count >= 6) {
        stage = 6; // 准备
      } else if (count >= 5) {
        stage = 5; // 脉动
      } else if (count >= 4) {
        stage = 4; // 充盈
      } else if (count >= 3) {
        stage = 3; // 成长
      } else if (count >= 2) {
        stage = 2; // 活跃
      } else if (count >= 1) {
        stage = 1; // 唤醒
      } else {
        stage = 0; // 沉睡
      }
      
      this.setData({
        currentStage: stage
      });
      this.updateStage(stage);
      
      // 触发阶段变化事件
      this.triggerEvent('stageChange', {
        stage: stage,
        recordCount: count
      });
    },

    /**
     * 更新阶段样式和动画
     * @param {Number} stage - 阶段编号 (0-7)
     */
    updateStage: function(stage) {
      var stageClass = 'stage-' + stage;
      var eyeAnimation = '';
      var glowAnimation = '';
      
      // 根据阶段设置眼睛动画
      if (stage >= 1) {
        if (stage <= 2) {
          eyeAnimation = 'eye-animation-blink';
        } else if (stage <= 4) {
          eyeAnimation = 'eye-animation-happy';
        } else if (stage >= 5) {
          eyeAnimation = 'eye-animation-surprised';
        }
      }
      
      // 根据阶段设置光效动画
      if (stage >= 1) {
        if (stage <= 3) {
          glowAnimation = 'glow-pulse';
        } else {
          glowAnimation = 'glow-strong';
        }
      }
      
      this.setData({
        stageClass: stageClass,
        eyeAnimation: eyeAnimation,
        glowAnimation: glowAnimation
      });
    },

    /**
     * 生成胶囊SVG图像
     * 在实际应用中，这里应该生成SVG字符串或通过其他方式渲染SVG
     * 这里简化为设置SVG路径
     */
    generateCapsuleSvg: function() {
      // 由于微信小程序对SVG的支持有限，这里使用base64编码的SVG
      // 或者通过<image>标签加载SVG文件
      // 这里提供一个示例SVG数据
      
      var svgData = this.createCapsuleSvgData();
      this.setData({
        capsuleSvg: svgData
      });
    },

    /**
     * 创建胶囊SVG数据
     * @returns {String} SVG数据URI
     */
    createCapsuleSvgData: function() {
      var width = this.properties.width;
      var height = this.properties.height;
      var theme = this.properties.theme;
      
      // 根据主题选择颜色
      var capsuleColor = '#d4d4d4';
      var highlightColor = '#f5f5f5';
      
      if (theme === 'tree') {
        capsuleColor = '#81c784';
        highlightColor = '#c8e6c9';
      } else if (theme === 'monster') {
        capsuleColor = '#ff7675';
        highlightColor = '#fab1a0';
      } else if (theme === 'star') {
        capsuleColor = '#ffeaa7';
        highlightColor = '#fff9c4';
      } else {
        capsuleColor = '#d4d4d4';
        highlightColor = '#f5f5f5';
      }
      
      // 创建SVG字符串
      // 注意：微信小程序中可能无法直接使用SVG字符串，这里提供概念代码
      var svgString = '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="capsule-gradient" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" style="stop-color:' + highlightColor + ';stop-opacity:1" />' +
            '<stop offset="100%" style="stop-color:' + capsuleColor + ';stop-opacity:1" />' +
          '</linearGradient>' +
        '</defs>' +
        '<rect x="10" y="10" width="' + (width - 20) + '" height="' + (height - 20) + '" rx="' + (height / 2) + '" ry="' + (height / 2) + '" ' +
              'fill="url(#capsule-gradient)" stroke="' + highlightColor + '" stroke-width="2"/>' +
        '<ellipse cx="' + (width / 2) + '" cy="' + (height * 0.3) + '" rx="' + (width * 0.3) + '" ry="' + (height * 0.1) + '" ' +
                 'fill="' + highlightColor + '" opacity="0.6"/>' +
      '</svg>';
      
      // 在实际项目中，应该将SVG保存为文件，然后使用<image>标签加载
      // 这里返回空字符串，实际使用时需要替换为真实的SVG文件路径
      return '';
    },

    /**
     * 触发进化动画
     */
    triggerEvolution: function() {
      if (this.data.currentStage >= 7) {
        this.triggerEvent('evolution', {
          theme: this.properties.theme
        });
      }
    },

    /**
     * 重置到初始状态
     */
    reset: function() {
      this.setData({
        currentStage: 0
      });
      this.updateStage(0);
    }
  }
});
