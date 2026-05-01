Page({
  data: {
    rows: 2,
    cols: 2,
    grid: [
      ['', ''],
      ['', '']
    ]
  },

  tableIndex: -1,

  onLoad: function (options) {
    if (options.idx !== undefined) {
      this.tableIndex = parseInt(options.idx);
      // Load existing table data from editor handoff
      var editData = wx.getStorageSync('word_edit_table');
      wx.removeStorageSync('word_edit_table');
      if (editData && editData.tables && editData.tables[this.tableIndex]) {
        var t = editData.tables[this.tableIndex];
        this.setData({ rows: t.rows, cols: t.cols, grid: t.cells });
      }
    }
  },

  changeRows: function (e) {
    var delta = parseInt(e.currentTarget.dataset.delta);
    var newRows = Math.min(10, Math.max(1, this.data.rows + delta));
    this._resizeGrid(newRows, this.data.cols);
  },

  changeCols: function (e) {
    var delta = parseInt(e.currentTarget.dataset.delta);
    var newCols = Math.min(6, Math.max(1, this.data.cols + delta));
    this._resizeGrid(this.data.rows, newCols);
  },

  _resizeGrid: function (newRows, newCols) {
    var grid = [];
    for (var r = 0; r < newRows; r++) {
      var row = (this.data.grid[r] || []);
      var newRow = [];
      for (var c = 0; c < newCols; c++) {
        newRow.push(row[c] || '');
      }
      grid.push(newRow);
    }
    this.setData({ rows: newRows, cols: newCols, grid: grid });
  },

  onCellInput: function (e) {
    var r = parseInt(e.currentTarget.dataset.row);
    var c = parseInt(e.currentTarget.dataset.col);
    var grid = this.data.grid.slice();
    grid[r] = grid[r].slice();
    grid[r][c] = e.detail.value;
    this.setData({ grid: grid });
  },

  confirm: function () {
    var tableData = {
      rows: this.data.rows,
      cols: this.data.cols,
      cells: this.data.grid
    };
    // Pass table data back via storage
    wx.setStorageSync('word_pending_table', {
      index: this.tableIndex,
      data: tableData
    });
    wx.navigateBack();
  },

  cancel: function () {
    wx.navigateBack();
  },

});
