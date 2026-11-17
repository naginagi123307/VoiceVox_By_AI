export class ApiError extends Error {
  constructor(message, retryAfter = 0) { super(message); this.retryAfter = retryAfter; }
}

function audioUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !/^audio\d+\.tts\.quest$/.test(url.hostname) || url.username || url.password || url.port) {
    throw new ApiError('音声サービスから想定外の接続先が返されました。');
  }
  return url.href;
}

async function json(response) {
  let data;
  try { data = await response.json(); }
  catch { throw new ApiError('音声サービスの応答を読み取れませんでした。'); }
  if (response.status === 429 || data.retryAfter) {
    const seconds = Math.max(5, Math.min(3600, Number(data.retryAfter) || 10));
    throw new ApiError(`利用制限中です。${Math.ceil(seconds)}秒以上待ってから再度お試しください。`, seconds);
  }
  if (!response.ok || data.success === false) {
    const known = { textTooLong: '文章が長すぎます。短くしてお試しください。', invalidSpeaker: 'この話者は現在利用できません。別の話者を選んでください。' };
    throw new ApiError(known[data.errorMessage] || '音声サービスを利用できません。しばらく待ってからお試しください。');
  }
  return data;
}

export async function loadSpeakers(signal) {
  const response = await fetch('https://static.tts.quest/voicevox_speakers.json', { signal, credentials: 'omit' });
  if (!response.ok) throw new ApiError('話者一覧を取得できません。再読み込みしてください。');
  const data = await response.json();
  if (!Array.isArray(data)) throw new ApiError('話者一覧の形式が正しくありません。');
  const speakers = data.flatMap((name, id) => typeof name === 'string' && name.startsWith('VOICEVOX:') ? [{ id, name }] : []);
  if (!speakers.length) throw new ApiError('利用可能な話者が見つかりません。');
  return speakers;
}

export function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const done = () => { signal.removeEventListener('abort', aborted); resolve(); };
    const timer = setTimeout(done, ms);
    const aborted = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    signal.addEventListener('abort', aborted, { once: true });
  });
}

export async function synthesize(text, speaker, signal, onWaiting = () => {}) {
  const response = await fetch('https://api.tts.quest/v3/voicevox/synthesis', {
    method: 'POST', body: new URLSearchParams({ text, speaker: String(speaker) }),
    signal, credentials: 'omit',
  });
  const job = await json(response);
  const statusUrl = audioUrl(job.audioStatusUrl);
  const wavUrl = audioUrl(job.wavDownloadUrl);
  onWaiting();
  for (let attempt = 0; attempt < 90; attempt++) {
    const status = await json(await fetch(statusUrl, { signal, cache: 'no-store', credentials: 'omit' }));
    if (status.isAudioError) throw new ApiError('音声サービスで生成に失敗しました。少し待ってからお試しください。');
    if (status.isAudioReady) {
      const audio = await fetch(wavUrl, { signal, credentials: 'omit' });
      if (!audio.ok) throw new ApiError('音声データを取得できませんでした。もう一度生成してください。');
      const blob = await audio.blob();
      const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
      if (String.fromCharCode(...signature.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...signature.slice(8, 12)) !== 'WAVE') {
        throw new ApiError('正しいWAV音声を受信できませんでした。');
      }
      return blob;
    }
    await pause(2000, signal);
  }
  throw new ApiError('音声生成に時間がかかっています。しばらく待ってから、もう一度お試しください。');
}
