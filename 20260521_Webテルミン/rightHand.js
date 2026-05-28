// ---- 設定値 ----
export const MAX_SIZE = 600;  // 手前（大きい）
export const MIN_SIZE = 200;  // 奥（小さい）

// 「手前」と「奥」の座標（%）
const MAX_POS = { right: -5, bottom: 0 }; // 手前
const MIN_POS = { right: 12, bottom: 50 };  // 奥

// ========================================
// iPad 判定
// ========================================

const isIPad =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1
  );

// ---- 状態 ----
let targetYRatio = 0.5;  // 目標値
let currentYRatio = 0.5; // 実際の補間用値
let currentSize = MAX_SIZE;

// ---- 写真生成（右手） ----
const photo = document.createElement("img");
photo.src = "rightHand.png";
photo.id = "right-hand-photo";
photo.style.position = "absolute";
photo.style.width = `${currentSize}px`;
photo.style.right = `${MAX_POS.right}%`;
photo.style.bottom = `${MAX_POS.bottom}%`;
photo.style.transformOrigin = "center center";
photo.style.willChange = "width, right, bottom"; // ← ブラウザ最適化のヒント
document.body.appendChild(photo);

// ---- 線形補間関数（lerp） ----
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---- マウス / タッチ操作（PCのみ） ----
function setTargetFromClientY(clientY) {
  targetYRatio = clientY / window.innerHeight;
}

if (!isIPad) {

  document.addEventListener("mousemove", (e) => {
    setTargetFromClientY(e.clientY);
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];

    if (touch) {
      setTargetFromClientY(touch.clientY);
    }
  }, {
    passive: true
  });

  document.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];

    if (touch) {
      setTargetFromClientY(touch.clientY);
    }
  }, {
    passive: true
  });
}

// ========================================
// iPad 右手スライダー
// ========================================

const ipadRightSlider =
  document.getElementById("ipad-right-slider");

if (isIPad && ipadRightSlider) {

  ipadRightSlider.addEventListener("input", (e) => {

    const value =
      Number(e.target.value);

    // 上=遠い(0) / 下=近い(1) ※画面タッチと同じ向き
    setRightHandDepthRatio(
      value / 100
    );

  });
}

// ---- アニメーションループ ----
function animate() {

  // iPadではスライダー操作を優先（即時反映）
  if (!isIPad) {
    currentYRatio = lerp(currentYRatio, targetYRatio, 0.2);
  }

  // サイズ補間
  currentSize = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * currentYRatio;

  // 位置補間
  const currentRight = lerp(MIN_POS.right, MAX_POS.right, currentYRatio);
  const currentBottom = lerp(MIN_POS.bottom, MAX_POS.bottom, currentYRatio);

  // 適用
  photo.style.width = `${currentSize}px`;
  photo.style.right = `${currentRight}%`;
  photo.style.bottom = `${currentBottom}%`;

  requestAnimationFrame(animate);
}

// ---- スタート ----
requestAnimationFrame(animate);

// ---- 状態取得 ----
export function getRightHandSize() {
  return currentSize;
}
//どれぐらいの深さに手があるかを返す関数→APIなどで使う
export function getRightHandDepth() {
  return currentYRatio;
}

export function setRightHandDepthRatio(ratio) {

  const clamped =
    Math.max(0, Math.min(1, ratio));

  targetYRatio = clamped;
  currentYRatio = clamped;
}
