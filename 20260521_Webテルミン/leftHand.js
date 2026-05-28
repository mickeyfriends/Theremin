// ---- 設定値 ----
export const TOP_SIZE = 650;
export const BOTTOM_SIZE = 600;

const TOP_POS = {
  left: -8,
  bottom: 40
};

const BOTTOM_POS = {
  left: -10,
  bottom: 0
};

// ---- 状態 ----
let currentSize = BOTTOM_SIZE;

let currentYRatio = 0.5;

let moveSpeed = 0.030;

let preYRatio = 0.5;

let isDPress = false;

let isStart = 0;

// ========================================
// iPad 判定
// ========================================

const isIPad =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1
  );

// ========================================
// 音量メータ
// ========================================

const volumeLevel =
  document.getElementById("volume-level");

const volumeValueDisplay =
  document.getElementById("volume-value");

const volumeIconOn =
  document.getElementById("volume-icon-on");

const volumeIconOff =
  document.getElementById("volume-icon-off");

// ---- 入力状態 ----
let moveUp = false;
let moveDown = false;

// ========================================
// 左手画像生成
// ========================================

const photo = document.createElement("img");

photo.src = "leftHand.png";

photo.id = "left-hand-photo";

photo.style.position = "absolute";

photo.style.left =
  `${BOTTOM_POS.left}%`;

photo.style.bottom =
  `${BOTTOM_POS.bottom}%`;

photo.style.width =
  `${currentSize}px`;

photo.style.transition =
  "width 0.1s ease, " +
  "left 0.1s ease, " +
  "bottom 0.1s ease, " +
  "transform 0.1s ease";

photo.style.transformOrigin =
  "center center";

document.body.appendChild(photo);

// ========================================
// iPad スライダー（HTMLの #ipad-slider を使用）
// ========================================

const ipadSlider =
  document.getElementById("ipad-slider");

if (isIPad && ipadSlider) {

  ipadSlider.addEventListener("input", (e) => {

    isStart = 1;

    const value =
      Number(e.target.value);

    setLeftHandPositionRatio(
      1 - value / 100
    );

  });
}

// ========================================
// 線形補間
// ========================================

function lerp(a, b, t) {

  return a + (b - a) * t;
}

// ========================================
// 表示更新
// ========================================

function updatePosition() {

  currentYRatio =
    Math.min(
      1,
      Math.max(0, currentYRatio)
    );

  currentSize =
    TOP_SIZE +
    (BOTTOM_SIZE - TOP_SIZE) *
    currentYRatio;

  const currentLeft =
    lerp(
      TOP_POS.left,
      BOTTOM_POS.left,
      currentYRatio
    );

  const currentBottom =
    lerp(
      TOP_POS.bottom,
      BOTTOM_POS.bottom,
      currentYRatio
    );

  const verticalScale =
    lerp(
      0.7,
      1.0,
      currentYRatio
    );

  // ======================================
  // 左手画像更新
  // ======================================

  photo.style.width =
    `${currentSize}px`;

  photo.style.left =
    `${currentLeft}%`;

  photo.style.bottom =
    `${currentBottom}%`;

  photo.style.transform =
    `scaleY(${verticalScale})`;

  // ======================================
  // 音量メータ更新
  // ======================================

  if (
    volumeLevel &&
    volumeValueDisplay &&
    volumeIconOn &&
    volumeIconOff
  ) {

    const volumeRatio =
      1 - currentYRatio;

    // バー高さ
    if (isStart) {

      volumeLevel.style.transform =
        `scaleY(${volumeRatio})`;

    } else {

      volumeLevel.style.transform =
        `scaleY(0)`;
    }

    // 数値
    const volumePercent =
      Math.round(volumeRatio * 100);

    if (isStart) {

      volumeValueDisplay.textContent =
        volumePercent;

    } else {

      volumeValueDisplay.textContent =
        0;
    }

    // アイコン切替
    if (
      volumePercent > 0 &&
      isStart
    ) {

      volumeIconOn.style.display =
        'block';

      volumeIconOff.style.display =
        'none';

    } else {

      volumeIconOn.style.display =
        'none';

      volumeIconOff.style.display =
        'block';
    }
  }
}

// ========================================
// アニメーション
// ========================================

function animate() {

  // iPadでは
  // スライダー操作優先
  if (!isIPad) {

    if (!isDPress) {

      if (moveUp)
        currentYRatio -= moveSpeed;

      if (moveDown)
        currentYRatio += moveSpeed;
    }
  }

  updatePosition();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ========================================
// キーボード操作
// ========================================

document.addEventListener(
  "keydown",
  (e) => {

    if (
      e.key === "w" ||
      e.key === "W"
    ) {

      moveUp = true;

      moveSpeed = 0.030;

    } else if (
      e.key === "s" ||
      e.key === "S"
    ) {

      moveDown = true;

      moveSpeed = 0.030;

    } else if (
      e.key === "d" ||
      e.key === "D"
    ) {

      if (!isDPress) {

        isDPress = true;

        preYRatio =
          currentYRatio;

        currentYRatio = 1;

        updatePosition();
      }

    } else if (
      e.code === "Space"
    ) {

      isStart = 1 - isStart;
    }
  }
);

document.addEventListener(
  "keyup",
  (e) => {

    if (
      e.key === "w" ||
      e.key === "W"
    ) {

      moveUp = false;
    }

    if (
      e.key === "s" ||
      e.key === "S"
    ) {

      moveDown = false;
    }

    if (
      e.key === "d" ||
      e.key === "D"
    ) {

      if (isDPress) {

        isDPress = false;

        currentYRatio =
          preYRatio;

        updatePosition();
      }
    }
  }
);

// ========================================
// 外部から位置変更
// ========================================

export function setLeftHandPositionRatio(
  ratio
) {

  currentYRatio =
    Math.max(
      0,
      Math.min(1, ratio)
    );

  updatePosition();
}

// ========================================
// 状態取得
// ========================================

export function getLeftHandSize() {

  return currentSize;
}

export function getLeftHandPositionRatio() {

  return currentYRatio;
}