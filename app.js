import { loadSpeakers, synthesize } from './api.mjs';

const $ = id => document.getElementById(id);
const text = $('text'), generate = $('generate'), audio = $('audio');
let speakers = [], current = null, controller = null, cooldown = 0, busy = false, saving = false;
let dbPromise = null;
const recordUrls = new Map();
try { cooldown = Number(localStorage.getItem('voicevox-cooldown')) || 0; } catch {}

function status(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}
function syncControls() {
  const remaining = Math.max(0, Math.ceil((cooldown - Date.now()) / 1000));
  generate.disabled = busy || !text.value.trim() || !speakers.length || remaining > 0;
  generate.textContent = remaining && !busy ? `あと${remaining}秒お待ちください` : busy ? '音声を生成中…' : '✦ 音声を生成';
  $('speaker').disabled = busy || !speakers.length;
  $('save').disabled = busy || saving || !current || Boolean(current.saved);
  $('cancel').hidden = !busy;
  text.readOnly = busy;
  $('count').textContent = `${text.value.length} / 200文字`;
}
text.addEventListener('input', syncControls);
setInterval(syncControls, 500);
$('speed').addEventListener('input', () => {
  $('speed-value').textContent = `${Number($('speed').value).toFixed(1)}倍`;
  document.querySelectorAll('audio').forEach(player => { player.playbackRate = Number($('speed').value); });
});
audio.addEventListener('loadedmetadata', () => { audio.playbackRate = Number($('speed').value); });
$('cancel').addEventListener('click', () => controller?.abort());

async function speakersInit() {
  $('reload').hidden = true;
  const loading = new AbortController();
  const timer = setTimeout(() => loading.abort(), 20000);
  try {
    speakers = await loadSpeakers(loading.signal);
    $('speaker').replaceChildren(...speakers.map(speaker => {
      const option = document.createElement('option');
      option.value = speaker.id;
      option.textContent = speaker.name.replace(/^VOICEVOX:/, '');
      return option;
    }));
    if (speakers.some(s => s.id === 3)) $('speaker').value = '3';
    status('文章と話者を選んで「音声を生成」を押してください。');
  } catch {
    $('speaker').replaceChildren(new Option('話者の取得に失敗しました', ''));
    $('reload').hidden = false;
    status('話者一覧を読み込めませんでした。インターネット接続を確認して、再読み込みしてください。', 'error');
  } finally { clearTimeout(timer); syncControls(); }
}
$('reload').addEventListener('click', speakersInit);

generate.addEventListener('click', async () => {
  if (generate.disabled) return;
  const message = text.value.trim();
  const speaker = speakers.find(s => s.id === Number($('speaker').value));
  if (!speaker || !message) return;
  busy = true;
  controller = new AbortController();
  const active = controller;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; active.abort(); }, 190000);
  syncControls();
  status('音声サービスに接続しています…', 'busy');
  try {
    const blob = await synthesize(message, speaker.id, active.signal, () => status('VOICEVOXで音声を生成しています。混雑時は時間がかかります…', 'busy'));
    if (active.signal.aborted) return;
    audio.pause();
    if (current) URL.revokeObjectURL(current.url);
    current = { text: message, speaker: speaker.name, speakerId: speaker.id, blob, createdAt: Date.now(), saved: false, url: URL.createObjectURL(blob) };
    audio.src = current.url;
    audio.load();
    $('result-text').textContent = message;
    $('credit').textContent = speaker.name;
    $('download').href = current.url;
    $('result').hidden = false;
    $('save').textContent = 'この端末に記録';
    status('音声ができました。再生ボタンで聴くことができます。');
    cooldown = Date.now() + 5000;
  } catch (error) {
    if (error.retryAfter) {
      cooldown = Date.now() + error.retryAfter * 1000;
    }
    status(active.signal.aborted ? timedOut ? '音声生成が時間内に完了しませんでした。時間を置いてお試しください。' : '生成をキャンセルしました。送信済みの文章の処理は外部サービス側で続く場合があります。' : error instanceof TypeError ? '通信できませんでした。接続状況を確認して、しばらく待ってからお試しください。' : error.message, active.signal.aborted && !timedOut ? '' : 'error');
  } finally {
    clearTimeout(timer);
    busy = false;
    controller = null;
    try { localStorage.setItem('voicevox-cooldown', String(cooldown)); } catch {}
    syncControls();
  }
});

function database() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('voicevox-audio-notes', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('保存先を開けませんでした。'));
  });
  return dbPromise;
}
async function storage(action, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', action === 'getAll' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('records');
    const request = action === 'getAll' ? store.getAll() : store[action](value);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function showRecord(record, prepend = false) {
  const url = URL.createObjectURL(record.blob);
  recordUrls.set(record.id, url);
  const card = document.createElement('article');
  card.className = 'record';
  const head = document.createElement('div'); head.className = 'record-head';
  const voice = document.createElement('strong'); voice.textContent = record.speaker;
  head.append(voice);
  const body = document.createElement('p'); body.textContent = record.text;
  const date = document.createElement('span'); date.className = 'small';
  date.textContent = new Date(record.createdAt).toLocaleString('ja-JP');
  const player = document.createElement('audio'); player.controls = true; player.preload = 'none'; player.src = url;
  player.addEventListener('loadedmetadata', () => { player.playbackRate = Number($('speed').value); });
  const foot = document.createElement('div'); foot.className = 'record-foot';
  const download = document.createElement('a'); download.href = url; download.download = `voicevox-${record.id}.wav`; download.textContent = 'WAVを保存 ↓';
  const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = '削除';
  remove.addEventListener('click', async () => {
    if (!confirm('この端末の記録から、この音声を削除しますか？')) return;
    try {
      await storage('delete', record.id);
      player.pause(); card.remove(); URL.revokeObjectURL(url); recordUrls.delete(record.id);
      $('empty').hidden = recordUrls.size > 0;
      $('history-status').textContent = '記録を削除しました。';
    } catch { $('history-status').textContent = '削除できませんでした。もう一度お試しください。'; }
  });
  foot.append(download, remove); card.append(head, date, body, player, foot);
  if (prepend) $('history-list').prepend(card); else $('history-list').append(card);
  $('empty').hidden = true;
}
$('save').addEventListener('click', async () => {
  if (!current || current.saved || busy || saving) return;
  const entry = current;
  saving = true;
  $('save').disabled = true;
  try {
    const record = { text: entry.text, speaker: entry.speaker, blob: entry.blob, createdAt: entry.createdAt };
    record.id = await storage('add', record);
    entry.saved = true;
    showRecord(record, true);
    if (current === entry) $('save').textContent = '記録しました';
    $('history-status').textContent = 'このブラウザーに音声を保存しました。';
  } catch {
    $('history-status').textContent = '記録できませんでした。空き容量やブラウザーの設定を確認してください。WAVのダウンロードも利用できます。';
  } finally { saving = false; syncControls(); }
});

async function historyInit() {
  try {
    const records = await storage('getAll');
    records.sort((a, b) => b.createdAt - a.createdAt).forEach(record => {
      if (record.blob instanceof Blob) showRecord(record);
    });
  } catch { $('history-status').textContent = 'このブラウザーでは記録を利用できません。生成した音声はWAVでダウンロードしてください。'; }
}
window.addEventListener('pagehide', () => controller?.abort());
speakersInit();
historyInit();
syncControls();
