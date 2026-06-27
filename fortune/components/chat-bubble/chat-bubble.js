// fortune/components/chat-bubble/chat-bubble.js
Component({
  properties: {
    role: {
      type: String,
      value: 'user'
    },
    content: {
      type: String,
      value: ''
    },
    streaming: {
      type: Boolean,
      value: false
    }
  }
});
