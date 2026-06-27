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
    }
  },

  data: {
    displayContent: '',
    showCursor: false,
    sections: []
  },

  observers: {
    'content': function(content) {
      this.setData({ displayContent: content });
      this.parseSections(content);
    },
    'status': function(status) {
      this.setData({ showCursor: status === 'streaming' });
    }
  },

  methods: {
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
