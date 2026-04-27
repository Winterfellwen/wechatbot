Page({
  data: {
    files: [],
    currentTab: 'pdf'
  },

  uploadFile: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx'],
      success: function(res) {
        var file = res.tempFiles[0];
        that.setData({
          files: that.data.files.concat([{
            name: file.name,
            path: file.path,
            size: file.size,
            time: new Date().toLocaleTimeString()
          }])
        });
      }
    });
  },

  goToConvert: function(e) {
    var file = e.currentTarget.dataset.file;
    if (file) {
      wx.navigateTo({ url: '/pdf/pages/convert/convert?file=' + encodeURIComponent(file.name) + '&path=' + encodeURIComponent(file.path) });
    } else {
      wx.navigateTo({ url: '/pdf/pages/convert/convert' });
    }
  },

  goToEdit: function(e) {
    var file = e.currentTarget.dataset.file;
    if (file) {
      wx.navigateTo({ url: '/pdf/pages/edit/edit?file=' + encodeURIComponent(file.name) + '&path=' + encodeURIComponent(file.path) });
    } else {
      wx.navigateTo({ url: '/pdf/pages/edit/edit' });
    }
  },

  removeFile: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var files = this.data.files;
    files.splice(idx, 1);
    this.setData({ files: files });
  },

  previewFile: function(e) {
    var path = e.currentTarget.dataset.path;
    var type = e.currentTarget.dataset.type;
    wx.showToast({ title: '请在系统中打开查看', icon: 'none' });
  }
});
