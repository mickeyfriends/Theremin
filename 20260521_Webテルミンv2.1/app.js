import { getRightHandDepth } from './rightHand.js';
import { getLeftHandPositionRatio } from './leftHand.js';

// === 定数 ===
const NUM_OSCILLATORS = 10;
const MAX_FREQ = 1100;
const MIN_FREQ = 240;
const INITIAL_VOL = 0.2;
const NOTE_NAMES = ["ド", "ド#", "レ", "レ#", "ミ", "ファ", "ファ#", "ソ", "ソ#", "ラ", "ラ#", "シ"];
const R = Math.pow(2, 1 / 12);

// === 状態 ===
let audioCtx, gainNode, vibratoLFO, vibratoGain;
let oscillators = [];
let ampData;
let lastY = null, lastTime = null, stopTimeout = null;
let playFlag = false;
let isWPressed = false, isSPressed = false, isDPressed = false, loopActive = false;

// === UI ===
const sliderValueDisplay = document.getElementById('freq-value');
const outputTextDisplay = document.getElementById('outputText');

document.querySelector('.app-contents').style.display = 'block';

// === 初期化 ===
window.onload = async () => {
  await loadData();
  setupInputHandlers();

  // 起動時メッセージ
  const msg = document.getElementById("press-space-message");
  if (msg) msg.style.display = "block";
};

// === イベント登録 ===
function setupInputHandlers() {

  // PC マウス対応
  document.addEventListener('mousemove', (e) => {
    refreshAudio(e.clientY);
  });

  // iPad / iPhone タッチ開始
  document.addEventListener('touchstart', handleTouchStart, {
    passive: true
  });

  // iPad / iPhone タッチ移動
  document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];

    if (touch) {
      refreshAudio(touch.clientY);
    }
  }, {
    passive: true
  });

  // 起動メッセージをタップしても音が出るように
  const msg =
    document.getElementById("press-space-message");

  if (msg) {
    msg.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });

    msg.addEventListener('click', handlePointerStart);
  }

  // iPad 左手スライダー → 音量反映
  const ipadSlider =
    document.getElementById("ipad-slider");

  if (ipadSlider) {
    ipadSlider.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });

    ipadSlider.addEventListener('input', () => {
      startPlaybackIfNeeded();
      refreshAudio(lastY);
    }, {
      passive: true
    });
  }

  // iPad 右手スライダー → 音程反映
  const ipadRightSlider =
    document.getElementById("ipad-right-slider");

  if (ipadRightSlider) {
    ipadRightSlider.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });

    ipadRightSlider.addEventListener('input', () => {
      startPlaybackIfNeeded();
      refreshAudio(lastY);
    }, {
      passive: true
    });
  }

  // キーボード
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

// === タッチ開始（iOS は同期的に AudioContext を起動する必要あり） ===
function handleTouchStart(e) {
  unlockAudioContext();
  startPlaybackIfNeeded();

  const touch = e.touches[0];

  if (touch) {
    refreshAudio(touch.clientY);
  } else {
    refreshAudio(lastY);
  }
}

function handlePointerStart() {
  unlockAudioContext();
  startPlaybackIfNeeded();
  refreshAudio(lastY);
}

function startPlaybackIfNeeded() {
  unlockAudioContext();

  if (!gainNode) return;

  if (!playFlag) {
    toggleSound();
  }
}

function refreshAudio(y) {
  const frequency =
    updateOscillators(y);

  updateUI(frequency);
}

// === キー操作 ===
function handleKeyDown(e) {

  switch (e.code) {

    case "Space":

      unlockAudioContext();

      toggleSound();

      refreshAudio(lastY);

      break;

    case "KeyW":

      if (!isDPressed && !isWPressed) {
        isWPressed = true;
        startContinuousUpdate();
      }

      break;

    case "KeyS":

      if (!isDPressed && !isSPressed) {
        isSPressed = true;
        startContinuousUpdate();
      }

      break;

    case "KeyD":

      if (gainNode && playFlag && !isDPressed) {

        isDPressed = true;

        const now = audioCtx.currentTime;

        gainNode.gain.cancelScheduledValues(now);

        gainNode.gain.setTargetAtTime(0, now, 0.02);

      }

      break;
  }
}

function handleKeyUp(e) {

  if (e.code === "KeyW") isWPressed = false;

  if (e.code === "KeyS") isSPressed = false;

  if (e.code === "KeyD") {

    isDPressed = false;

    if (gainNode && playFlag) {

      const now = audioCtx.currentTime;

      gainNode.gain.cancelScheduledValues(now);

      gainNode.gain.setTargetAtTime(
        INITIAL_VOL,
        now,
        0.05
      );

      updateOscillators(lastY);
    }
  }
}

// === 押している間だけ更新 ===
function startContinuousUpdate() {

  if (loopActive) return;

  loopActive = true;

  function loop() {

    if (isWPressed || isSPressed) {

      updateOscillators(lastY);

      requestAnimationFrame(loop);

    } else {

      loopActive = false;

    }
  }

  requestAnimationFrame(loop);
}

// === Audio 初期化 ===
// iOS Safari ではユーザー操作のコールスタック内で同期的に起動する必要がある
function unlockAudioContext() {

  if (!audioCtx) {

    audioCtx = new AudioContext();

    gainNode = audioCtx.createGain();

    gainNode.gain.setValueAtTime(
      0,
      audioCtx.currentTime
    );

    gainNode.connect(audioCtx.destination);

    createLFO();

    createOscillators();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// === LFO ===
function createLFO() {

  vibratoLFO = audioCtx.createOscillator();

  vibratoGain = audioCtx.createGain();

  vibratoLFO.frequency.value = 6;

  vibratoGain.gain.value = 0;

  vibratoLFO.connect(vibratoGain);

  vibratoLFO.start();
}

// === 発振器 ===
function createOscillators() {

  const startTime = audioCtx.currentTime + 0.1;

  for (let i = 1; i <= NUM_OSCILLATORS; i++) {

    const osc = audioCtx.createOscillator();

    const gain = audioCtx.createGain();

    const harmonicGain = audioCtx.createGain();

    harmonicGain.gain.value = i;

    vibratoGain.connect(harmonicGain);

    harmonicGain.connect(osc.frequency);

    osc.connect(gain);

    gain.connect(gainNode);

    gain.gain.value = 1;

    osc.start(startTime);

    oscillators.push({
      osc,
      gain,
      harmonic: i
    });
  }
}

// === 周波数更新 ===
function updateOscillators(y) {

  if (!audioCtx || oscillators.length === 0) {
    return null;
  }

  const touchY =
    y ?? lastY ?? window.innerHeight * 0.5;

  const now = performance.now();

  const depth = 1 - getRightHandDepth();

  const ampDist = 35 - getLeftHandPositionRatio() * 35;

  // ============================================
  // 左手 → 音量
  // ============================================

  const volumeRatio =
    1 - getLeftHandPositionRatio();

  // なめらかに音量変更
  if (gainNode && playFlag && !isDPressed) {

    gainNode.gain.setTargetAtTime(
      volumeRatio * INITIAL_VOL,
      audioCtx.currentTime,
      0.03
    );
  }

  let frequency =
    MIN_FREQ +
    depth * (MAX_FREQ - MIN_FREQ);

  // 移動速度
  if (lastY !== null && lastTime !== null) {

    const dy = touchY - lastY;

    const dt = now - lastTime;

    const speed = dy / dt;

    const offset =
      Math.max(-1, Math.min(1, speed)) * 10;

    frequency += offset;

    // ビブラート
    const vibratoDepth =
      Math.min(Math.abs(speed * 100), 10);

    vibratoGain.gain.setTargetAtTime(
      vibratoDepth,
      audioCtx.currentTime,
      0.05
    );

    // 停止
    clearTimeout(stopTimeout);

    stopTimeout = setTimeout(() => {

      vibratoGain.gain.setTargetAtTime(
        0,
        audioCtx.currentTime,
        0.2
      );

    }, 100);
  }

  oscillators.forEach(({ osc, gain, harmonic }) => {

    osc.frequency.value = frequency * harmonic;

    gain.gain.value =
      getHarmonicAmplitudes(
        frequency,
        ampDist,
        harmonic
      );
  });

  lastY = touchY;

  lastTime = now;

  return frequency;
}

// === 音 ON/OFF ===
function toggleSound() {

  if (!gainNode) return;

  playFlag = !playFlag;

  if (playFlag) {

    const volumeRatio =
      1 - getLeftHandPositionRatio();

    gainNode.gain.setValueAtTime(
      volumeRatio * INITIAL_VOL,
      audioCtx.currentTime
    );

  } else {

    gainNode.gain.setValueAtTime(
      0,
      audioCtx.currentTime
    );
  }

  const msg =
    document.getElementById(
      "press-space-message"
    );

  if (msg) {
    msg.style.display =
      playFlag ? "none" : "block";
  }

  if (!playFlag) {

    sliderValueDisplay.textContent = "";

    outputTextDisplay.textContent = "";

    highlightKey("");

    updateTuner("");
  }
}

// === UI更新 ===
function updateUI(frequency) {

  if (!frequency) return;

  if (!playFlag) return;

  sliderValueDisplay.textContent =
    Math.round(frequency);

  const scale = scaleOutput(frequency);

  outputTextDisplay.textContent = scale;

  highlightKey(scale);

  updateTuner(frequency);
}

// === チューナー ===
function updateTuner(frequency) {

  const pointer =
    document.getElementById('tuner-pointer');

  const text =
    document.getElementById('tuner-text');

  if (
    !frequency ||
    frequency === "" ||
    frequency <= 0
  ) {

    pointer.style.left = "50%";

    text.textContent = "";

    return;
  }

  const A4 = 440;

  const semitone =
    12 * Math.log2(frequency / A4);

  const rounded = Math.round(semitone);

  const nearestFreq =
    A4 * Math.pow(2, rounded / 12);

  const diffCents =
    1200 *
    Math.log2(frequency / nearestFreq);

  const clamped =
    Math.max(-50, Math.min(50, diffCents));

  const percent =
    ((clamped + 50) / 100) * 100;

  pointer.style.left = `${percent}%`;

  text.textContent =
    `${diffCents.toFixed(1)} cents ` +
    `${diffCents > 0 ? '高め' :
      diffCents < 0 ? '低め' :
      'ぴったり'}`;
}

// === 音名 ===
function scaleOutput(frequency) {

  if (!frequency || frequency <= 0)
    return "";

  const A4 = 440;

  const semitone =
    12 * Math.log2(frequency / A4);

  const rounded = Math.round(semitone);

  const noteIndex =
    (rounded + 9) % 12;

  return NOTE_NAMES[
    (noteIndex + 12) % 12
  ];
}

// === データ読み込み ===
async function loadData() {

  try {

    const res =
      await fetch('./amp_data.json');

    if (!res.ok)
      throw new Error(`HTTP ${res.status}`);

    ampData = await res.json();

  } catch (err) {

    console.error(
      "Failed to load amp_data.json:",
      err
    );
  }
}

// === 倍音補間 ===
function getHarmonicAmplitudes(
  freq,
  ampDist,
  h
) {

  let amp = ampDist;

  if (amp == 0) return 0;

  if (!ampData) {
    return h === 1 ? 1 : 0.15 / h;
  }

  if (
    ampData[0].dist > amp ||
    freq === 0
  ) return 0;

  let i = 0;

  if (ampData.at(-1).dist < amp)
    amp = ampData.at(-1).dist;

  while (
    amp < ampData[i].dist ||
    ampData[i + 1].dist < amp
  ) i++;

  if (i >= ampData.length - 2)
    i = ampData.length - 3;

  const amps = Array.from(
    { length: 3 },
    (_, j) => {

      const data = ampData[i + j].data;

      let k = 0;

      while (
        freq < data[k][0] ||
        data[k + 1][0] < freq
      ) k++;

      if (k >= 4) k = 3;

      return dim2Inpol(
        freq,
        data[k][0],
        data[k + 1][0],
        data[k + 2][0],
        data[k][h],
        data[k + 1][h],
        data[k + 2][h]
      );
    }
  );

  return dim2Inpol(
    ampDist,
    ampData[i].dist,
    ampData[i + 1].dist,
    ampData[i + 2].dist,
    amps[0],
    amps[1],
    amps[2]
  );
}

// === 2次補間 ===
function dim2Inpol(
  x,
  x0,
  x1,
  x2,
  y0,
  y1,
  y2
) {

  return (
    ((x - x1) * (x - x2) * y0) /
    ((x0 - x1) * (x0 - x2)) +

    ((x - x0) * (x - x2) * y1) /
    ((x1 - x0) * (x1 - x2)) +

    ((x - x0) * (x - x1) * y2) /
    ((x2 - x0) * (x2 - x1))
  );
}

// === 鍵盤表示 ===
function highlightKey(noteName) {

  const keys =
    document.querySelectorAll('.key');

  keys.forEach(key => {
    key.classList.remove('active');
  });

  if (noteName === "") return;

  const key =
    document.querySelector(
      `.key[data-note="${noteName}"]`
    );

  if (key)
    key.classList.add('active');
}