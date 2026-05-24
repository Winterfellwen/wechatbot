// ai-order/data/demo-menus.js
// Local fallback data + OCI remote sync

var OCI_DEMO_URL = 'https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/menus/demo-menus.json';
var CACHE_KEY = 'demo-menus-cache';
var DOWNLOAD_FLAG = 'demo-menus-downloaded';
var _downloading = false;

var localData = {
  "merchants": [
    {
      "id": "demo-restaurant-1",
      "name": "川味小厨（演示）",
      "dishes": [
        {
          "id": "dish-1",
          "name": "宫保鸡丁",
          "price": 28,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-1.jpg",
          "description": "经典川菜，鸡肉配花生米，麻辣鲜香",
          "taste": "麻辣",
          "spicyLevel": 2,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-2",
          "name": "红烧肉",
          "price": 32,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-2.jpg",
          "description": "五花肉红烧，肥而不腻，入口即化",
          "taste": "咸甜",
          "spicyLevel": 0,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-3",
          "name": "麻婆豆腐",
          "price": 18,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-3.jpg",
          "description": "嫩豆腐配肉末，麻辣鲜香烫",
          "taste": "麻辣",
          "spicyLevel": 3,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-4",
          "name": "糖醋排骨",
          "price": 38,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-4.jpg",
          "description": "排骨糖醋汁，酸甜可口",
          "taste": "酸甜",
          "spicyLevel": 0,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-5",
          "name": "水煮鱼",
          "price": 48,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-5.jpg",
          "description": "鲜嫩鱼片配豆芽，麻辣过瘾",
          "taste": "麻辣",
          "spicyLevel": 3,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-6",
          "name": "番茄炒蛋",
          "price": 15,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-6.jpg",
          "description": "家常经典，酸甜适口",
          "taste": "酸甜",
          "spicyLevel": 0,
          "status": "online",
          "category": "菜"
        },
        {
          "id": "dish-7",
          "name": "蛋炒饭",
          "price": 12,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-7.jpg",
          "description": "粒粒分明的蛋炒饭，简单美味",
          "taste": "清淡",
          "spicyLevel": 0,
          "status": "online",
          "category": "主食"
        },
        {
          "id": "dish-8",
          "name": "酸辣汤",
          "price": 16,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-8.jpg",
          "description": "酸辣开胃，暖心暖胃",
          "taste": "麻辣",
          "spicyLevel": 2,
          "status": "online",
          "category": "汤"
        },
        {
          "id": "dish-9",
          "name": "紫菜蛋花汤",
          "price": 10,
          "image": "https://objectstorage.ap-singapore-1.oraclecloud.com/n/axbfkubuntlt/b/wechatbot-demo/o/dishes/dish-9.jpg",
          "description": "清淡鲜美的家常汤品",
          "taste": "清淡",
          "spicyLevel": 0,
          "status": "online",
          "category": "汤"
        }
      ]
    }
  ]
};

/** 尝试从 OCI 下载最新 demo 数据并缓存（后台静默执行） */
function tryFetchInBackground() {
  if (_downloading) return;
  _downloading = true;
  wx.request({
    url: OCI_DEMO_URL,
    timeout: 10000,
    success: function (res) {
      if (res.statusCode === 200 && res.data && res.data.merchants) {
        wx.setStorageSync(CACHE_KEY, res.data);
        wx.setStorageSync(DOWNLOAD_FLAG, true);
      }
    },
    fail: function () {},
    complete: function () {
      _downloading = false;
    }
  });
}

/** 获取 demo 数据：缓存优先 → 触发后台下载 → 本地兜底 */
function getData() {
  var cached = wx.getStorageSync(CACHE_KEY);
  if (cached && cached.merchants) {
    // 已有缓存，后台静默更新
    tryFetchInBackground();
    return cached;
  }
  // 无缓存：立即返回本地数据，同时后台下载
  tryFetchInBackground();
  return localData;
}

/** 获取某个演示商家的完整菜单（含菜品） */
function getMerchant(merchantId) {
  var data = getData();
  var merchants = data.merchants || [];
  for (var i = 0; i < merchants.length; i++) {
    if (merchants[i].id === merchantId) {
      return merchants[i];
    }
  }
  return null;
}

/** 获取所有演示商家列表（不含菜品详情，轻量） */
function getMerchantList() {
  var data = getData();
  var merchants = data.merchants || [];
  return merchants.map(function (m) {
    return {
      id: m.id,
      name: m.name,
      description: m.description || '',
      type: 'demo',
      dishCount: (m.dishes && m.dishes.length) || 0
    };
  });
}

module.exports = {
  merchants: localData.merchants,
  getData: getData,
  getMerchant: getMerchant,
  getMerchantList: getMerchantList,
  tryFetchInBackground: tryFetchInBackground
};
