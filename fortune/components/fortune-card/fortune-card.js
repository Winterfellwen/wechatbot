const { getRandomTexts } = require('../../data/thinking-texts');

Component({
  properties: {
    typeName: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    status: {
      type: String,
      value: 'pending'
    },
    category: {
      type: String,
      value: 'chinese'
    }
  },

  data: {
    displayContent: '',
    showCursor: false,
    sections: [],
    thinkingTexts: [],
    currentThinkingIndex: 0,
    isThinking: false,
    showThinkingAnimation: false
  },

  lifetimes: {
    attached() {
      this.startThinkingTexts();
    },
    detached() {
      this.stopThinkingTexts();
    }
  },

  observers: {
    'content': function(content) {
      this.setData({ displayContent: content });
      this.parseSections(content);
    },
    'status': function(status) {
      if (status === 'loading') {
        this.setData({ showCursor: false });
        this.startThinkingAnimation();
      } else {
        this.stopThinkingAnimation();
        if (status === 'streaming') {
          this.setData({ showCursor: true });
        }
      }
    }
  },

  methods: {
    startThinkingTexts() {
      const texts = getRandomTexts(this.data.category, 5);
      this.setData({ thinkingTexts: texts });
    },

    startThinkingAnimation() {
      if (this._thinkingTimer) return;
      
      const texts = this.data.thinkingTexts;
      if (!texts || texts.length === 0) {
        this.startThinkingTexts();
      }
      
      this.setData({ 
        isThinking: true, 
        showThinkingAnimation: true,
        currentThinkingIndex: 0 
      });
      
      this._thinkingTimer = setInterval(() => {
        const nextIndex = (this.data.currentThinkingIndex + 1) % this.data.thinkingTexts.length;
        this.setData({ currentThinkingIndex: nextIndex });
      }, 2000);
    },

    stopThinkingAnimation() {
      if (this._thinkingTimer) {
        clearInterval(this._thinkingTimer);
        this._thinkingTimer = null;
      }
      this.setData({ 
        isThinking: false, 
        showThinkingAnimation: false 
      });
    },

    parseSections(content) {
      if (!content) {
        this.setData({ sections: [] });
        return;
      }
      const lines = content.split('\n');
      const sections = [];
      let currentSection = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const emojiPattern = /^[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\u2B50\u2705\u274C\u26A0\u2728\u2B55\u23F0\u231A\uFE0F\u200D\u20E3\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
        const isSectionHeader = emojiPattern.test(line.trim().charAt(0)) && line.trim().length > 1;

        if (isSectionHeader) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            header: line.trim(),
            body: ''
          };
        } else if (currentSection) {
          currentSection.body += (currentSection.body ? '\n' : '') + line;
        } else {
          currentSection = {
            header: '',
            body: line
          };
        }
      }

      if (currentSection) {
        sections.push(currentSection);
      }

      this.setData({ sections });
    },

    handleRetry() {
      this.triggerEvent('retry');
    }
  }
});
