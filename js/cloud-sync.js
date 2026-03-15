/* ============================================
   クラウド同期 — デバイスIDベース認証
   スタブモード（API_BASE空）: localStorage内で完結
   本番モード: API_BASE にURLを設定するだけで切替
   ============================================ */

const CloudSync = (() => {
  const DEVICE_ID_KEY = 'kanji-device-id';
  const STUB_SAVE_KEY = 'kanji-cloud-stub';
  const STUB_TRANSFER_KEY = 'kanji-transfer-stub';
  const API_BASE = 'https://lojuomjut1.execute-api.ap-northeast-1.amazonaws.com/prod'; // 空 = スタブモード

  function _isStubMode() {
    return !API_BASE;
  }

  function _generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Safari 15.4未満向けフォールバック
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var i = 0; i < 16; i++) {
      hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  }

  function getDeviceId() {
    var id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = _generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  function _collectSaveData() {
    var gameState = localStorage.getItem('kanji-game-state');
    var progress = localStorage.getItem('kanji-practice-progress');
    return {
      version: 1,
      gameState: gameState ? JSON.parse(gameState) : null,
      progress: progress ? JSON.parse(progress) : null,
      savedAt: new Date().toISOString(),
    };
  }

  function _applySaveData(data) {
    if (!data) return;
    if (data.gameState) {
      localStorage.setItem('kanji-game-state', JSON.stringify(data.gameState));
    }
    if (data.progress) {
      localStorage.setItem('kanji-practice-progress', JSON.stringify(data.progress));
    }
  }

  function _generateCode() {
    var digits = '';
    for (var i = 0; i < 6; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    return digits;
  }

  // --- スタブモード実装 ---

  function _stubUpload() {
    var data = _collectSaveData();
    var store = {};
    try {
      var raw = localStorage.getItem(STUB_SAVE_KEY);
      if (raw) store = JSON.parse(raw);
    } catch (e) {}
    store[getDeviceId()] = data;
    localStorage.setItem(STUB_SAVE_KEY, JSON.stringify(store));
    return { success: true, savedAt: data.savedAt };
  }

  function _stubDownload() {
    try {
      var raw = localStorage.getItem(STUB_SAVE_KEY);
      if (!raw) return { success: false, error: 'セーブデータがみつかりません' };
      var store = JSON.parse(raw);
      var data = store[getDeviceId()];
      if (!data) return { success: false, error: 'このデバイスのセーブデータがありません' };
      return { success: true, data: data };
    } catch (e) {
      return { success: false, error: 'データのよみこみにしっぱいしました' };
    }
  }

  function _stubGenerateTransferCode() {
    var code = _generateCode();
    var data = _collectSaveData();
    var transfers = {};
    try {
      var raw = localStorage.getItem(STUB_TRANSFER_KEY);
      if (raw) transfers = JSON.parse(raw);
    } catch (e) {}
    var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    transfers[code] = {
      deviceId: getDeviceId(),
      data: data,
      expiresAt: expiresAt,
      used: false,
    };
    localStorage.setItem(STUB_TRANSFER_KEY, JSON.stringify(transfers));
    return { success: true, code: code, expiresAt: expiresAt };
  }

  function _stubRedeemTransferCode(code) {
    try {
      var raw = localStorage.getItem(STUB_TRANSFER_KEY);
      if (!raw) return { success: false, error: 'ひきつぎコードがみつかりません' };
      var transfers = JSON.parse(raw);
      var entry = transfers[code];
      if (!entry) return { success: false, error: 'ひきつぎコードがまちがっています' };
      if (entry.used) return { success: false, error: 'このコードはすでにつかわれています' };
      if (new Date(entry.expiresAt) < new Date()) return { success: false, error: 'このコードのきげんがきれています' };
      entry.used = true;
      localStorage.setItem(STUB_TRANSFER_KEY, JSON.stringify(transfers));
      return { success: true, data: entry.data };
    } catch (e) {
      return { success: false, error: 'ひきつぎにしっぱいしました' };
    }
  }

  // --- APIモード実装 ---

  function _apiRequest(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_BASE + path, opts)
      .then(function (res) { return res.json(); });
  }

  // --- 公開API ---

  function upload() {
    try {
      if (_isStubMode()) return Promise.resolve(_stubUpload());
      var data = _collectSaveData();
      return _apiRequest('POST', '/api/save', { deviceId: getDeviceId(), data: data });
    } catch (e) {
      return Promise.resolve({ success: false, error: 'アップロードにしっぱいしました' });
    }
  }

  function download() {
    try {
      if (_isStubMode()) return Promise.resolve(_stubDownload());
      return _apiRequest('GET', '/api/save/' + getDeviceId());
    } catch (e) {
      return Promise.resolve({ success: false, error: 'ダウンロードにしっぱいしました' });
    }
  }

  function generateTransferCode() {
    try {
      if (_isStubMode()) return Promise.resolve(_stubGenerateTransferCode());
      return _apiRequest('POST', '/api/transfer/generate', { deviceId: getDeviceId() });
    } catch (e) {
      return Promise.resolve({ success: false, error: 'コードのはっこうにしっぱいしました' });
    }
  }

  function redeemTransferCode(code, newDeviceId) {
    try {
      if (_isStubMode()) return Promise.resolve(_stubRedeemTransferCode(code));
      return _apiRequest('POST', '/api/transfer/redeem', { code: code, newDeviceId: newDeviceId || getDeviceId() });
    } catch (e) {
      return Promise.resolve({ success: false, error: 'ひきつぎにしっぱいしました' });
    }
  }

  function applySaveData(data) {
    _applySaveData(data);
  }

  return {
    getDeviceId: getDeviceId,
    upload: upload,
    download: download,
    generateTransferCode: generateTransferCode,
    redeemTransferCode: redeemTransferCode,
    applySaveData: applySaveData,
  };
})();
