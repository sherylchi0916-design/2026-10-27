function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
}
// ============================================================
// 交通安全小達人
// 可完整拼合的真實拼圖答題系統
// ============================================================

// ------------------------------------------------------------
// 圖片路徑
// ------------------------------------------------------------
const IMAGE_PATH = "照片.jpg";

// ------------------------------------------------------------
// 拼圖設定
// ------------------------------------------------------------
const ROWS = 3;
const COLS = 3;
const TOTAL_PIECES = ROWS * COLS;

// 拼圖凸起／凹槽的深度比例
const TAB_SIZE_RATIO = 0.22;

// 吸附距離
const SNAP_RATIO = 0.58;

// ------------------------------------------------------------
// 顏色設定
// ------------------------------------------------------------
const COLORS = {
  background: "#F0F0F0",
  white: "#FFFFFF",
  board: "#FAFAFA",
  text: "#263238",
  subText: "#607D8B",
  blue: "#1976D2",
  blueDark: "#125AA0",
  locked: "#68757D",
  lockedDark: "#4D585E",
  green: "#43A047",
  lightGreen: "#E8F5E9",
  red: "#D32F2F",
  lightRed: "#FFEBEE",
  dashed: "#B8B8B8",
  border: "#D5D5D5"
};

// ------------------------------------------------------------
// 全域變數
// ------------------------------------------------------------
let sourceImage;
let imageReady = false;
let imageLoadError = false;

let pieces = [];
let questions = [];

let score = 0;
let correctCount = 0;
let wrongCount = 0;

let currentQuestionIndex = -1;
let selectedAnswer = -1;

let showQuestionModal = false;
let showResultModal = false;
let answerCorrect = false;

let draggedPiece = null;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let lastTouchTime = 0;
let restartButton = null;
let canvasElement = null;

let submitButtonRect = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

let continueButtonRect = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

let layout = {
  boardCardX: 0,
  boardCardY: 0,
  boardCardW: 0,
  boardCardH: 0,

  boardX: 0,
  boardY: 0,
  boardSize: 0,
  cellSize: 0,

  panelX: 0,
  panelY: 0,
  panelW: 0,
  panelH: 0,

  cardsX: 0,
  cardsY: 0,
  cardWidth: 0,
  cardHeight: 0,
  cardGap: 10
};

// ------------------------------------------------------------
// preload：載入圖片
// ------------------------------------------------------------
function preload() {
  // 載入原始圖片
  sourceImage = loadImage(
    IMAGE_PATH,

    // 圖片載入成功
    function () {
      imageReady = true;
      imageLoadError = false;
    },

    // 圖片載入失敗
    function () {
      imageReady = false;
      imageLoadError = true;
    }
  );
}

// ------------------------------------------------------------
// setup：初始化
// ------------------------------------------------------------
function setup() {
  // 建立畫布
  canvasElement = createCanvas(windowWidth, windowHeight);

  // 設定文字置中
  textAlign(CENTER, CENTER);

  // 設定矩形左上角模式
  rectMode(CORNER);

  // 設定線條接合樣式
  strokeJoin(ROUND);
  strokeCap(ROUND);

  // 建立題目
  createQuestions();

  // 建立拼圖
  createPuzzlePieces();

  // 建立重新開始按鈕
  createRestartButton();

  // 設定觸控
  setupTouchSupport();
}

// ------------------------------------------------------------
// 建立題目
// ------------------------------------------------------------
function createQuestions() {
  // 建立九道題目
  questions = [
    {
      question: "過馬路時，應該走哪裡？",
      options: [
        "斑馬線或行人穿越道",
        "馬路中央",
        "車道中間",
        "任何地方"
      ],
      answer: 0
    },
    {
      question: "紅燈亮起時，行人應該怎麼做？",
      options: [
        "快速跑過去",
        "停在安全位置等待",
        "邊滑手機邊走",
        "請車子繞路"
      ],
      answer: 1
    },
    {
      question: "騎自行車時，應該戴什麼？",
      options: [
        "太陽眼鏡",
        "安全帽",
        "圍巾",
        "手套就好"
      ],
      answer: 1
    },
    {
      question: "搭乘汽車時，應該繫上什麼？",
      options: [
        "安全帶",
        "鞋帶",
        "背包帶",
        "帽帶"
      ],
      answer: 0
    },
    {
      question: "遇到救護車鳴笛時，應該怎麼做？",
      options: [
        "跟著救護車",
        "禮讓救護車先通過",
        "加速超越救護車",
        "停在道路中央"
      ],
      answer: 1
    },
    {
      question: "過馬路前應該怎麼做？",
      options: [
        "只看左邊",
        "只看右邊",
        "左右查看並確認安全",
        "低頭看手機"
      ],
      answer: 2
    },
    {
      question: "騎車時可以滑手機嗎？",
      options: [
        "可以，只滑一下",
        "可以，速度慢就好",
        "不可以",
        "晚上才可以"
      ],
      answer: 2
    },
    {
      question: "看到綠燈時，行人應該怎麼做？",
      options: [
        "確認車輛停下後再通過",
        "立刻衝過去",
        "閉著眼睛走",
        "完全不用看車"
      ],
      answer: 0
    },
    {
      question: "走在道路旁時，應該注意什麼？",
      options: [
        "注意車輛與周圍環境",
        "只看天空",
        "一直奔跑",
        "邊走邊玩耍"
      ],
      answer: 0
    }
  ];
}

// ------------------------------------------------------------
// 建立可以完整拼合的拼圖
//
// 重要設計：
// 1. 共享邊只建立一次。
// 2. 上方拼圖和下方拼圖使用同一條水平共享邊。
// 3. 左方拼圖和右方拼圖使用同一條垂直共享邊。
// 4. 相鄰拼圖的凸凹形狀來自同一組幾何資料。
// ------------------------------------------------------------
function createPuzzlePieces() {
  // 清空拼圖
  pieces = [];

  // 建立水平共享邊資料
  let horizontalEdges = [];

  for (let row = 0; row < ROWS - 1; row++) {
    horizontalEdges[row] = [];

    for (let col = 0; col < COLS; col++) {
      // 每條共享邊只產生一次方向
      horizontalEdges[row][col] = random([1, -1]);
    }
  }

  // 建立垂直共享邊資料
  let verticalEdges = [];

  for (let row = 0; row < ROWS; row++) {
    verticalEdges[row] = [];

    for (let col = 0; col < COLS - 1; col++) {
      // 每條共享邊只產生一次方向
      verticalEdges[row][col] = random([1, -1]);
    }
  }

  // 建立九塊拼圖
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // 計算拼圖編號
      let index = row * COLS + col;

      // 建立四邊方向
      let edges = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };

      // 上邊
      if (row > 0) {
        // 使用上方共享邊的相反方向
        edges.top = -horizontalEdges[row - 1][col];
      }

      // 下邊
      if (row < ROWS - 1) {
        // 使用本拼圖下方共享邊
        edges.bottom = horizontalEdges[row][col];
      }

      // 左邊
      if (col > 0) {
        // 使用左方共享邊的相反方向
        edges.left = -verticalEdges[row][col - 1];
      }

      // 右邊
      if (col < COLS - 1) {
        // 使用本拼圖右方共享邊
        edges.right = verticalEdges[row][col];
      }

      // 建立拼圖資料
      let piece = {
        index: index,
        row: row,
        col: col,

        // 三種狀態
        state: "locked",

        // 四條邊方向
        edges: edges,

        // 真實 Path2D
        path: null,

        // 目前位置
        x: 0,
        y: 0,

        // 目標位置
        targetX: 0,
        targetY: 0,

        // 卡片區位置
        homeX: 0,
        homeY: 0,

        // 拼圖大小
        width: 0,
        height: 0,

        // 答題資料
        answered: false,
        correct: false,

        // 是否已初始化
        initialized: false
      };

      // 加入拼圖陣列
      pieces.push(piece);
    }
  }

  // 驗證所有共享邊
  validateSharedEdges();
}

// ------------------------------------------------------------
// 驗證相鄰拼圖方向
// ------------------------------------------------------------
function validateSharedEdges() {
  // 逐一檢查拼圖
  for (let p of pieces) {
    // 檢查右方拼圖
    if (p.col < COLS - 1) {
      let rightPiece = pieces[p.index + 1];

      // 右邊與右方拼圖左邊必須互為相反
      if (p.edges.right !== -rightPiece.edges.left) {
        console.warn("左右共享邊方向錯誤");
      }
    }

    // 檢查下方拼圖
    if (p.row < ROWS - 1) {
      let bottomPiece = pieces[p.index + COLS];

      // 下邊與下方拼圖上邊必須互為相反
      if (p.edges.bottom !== -bottomPiece.edges.top) {
        console.warn("上下共享邊方向錯誤");
      }
    }
  }
}

// ------------------------------------------------------------
// 建立重新開始按鈕
// ------------------------------------------------------------
function createRestartButton() {
  // 建立 p5 按鈕
  restartButton = createButton("重新開始");

  // 設定按鈕功能
  restartButton.mousePressed(function () {
    restartGame();
  });

  // 設定按鈕樣式
  restartButton.style("font-size", "15px");
  restartButton.style("padding", "8px 16px");
  restartButton.style("border-radius", "8px");
  restartButton.style("border", "none");
  restartButton.style("background-color", COLORS.blue);
  restartButton.style("color", "#FFFFFF");
  restartButton.style("cursor", "pointer");
  restartButton.style("box-shadow", "0 3px 8px rgba(0,0,0,0.16)");

  // 更新按鈕位置
  updateRestartButtonPosition();
}

// ------------------------------------------------------------
// draw：主繪圖函式
// ------------------------------------------------------------
function draw() {
  // 使用淺灰色背景
  background(COLORS.background);

  // 圖片載入失敗
  if (imageLoadError) {
    drawImageErrorScreen();
    return;
  }

  // 圖片載入中
  if (!imageReady) {
    drawLoadingScreen();
    return;
  }

  // 計算版面
  calculateLayout();

  // 建立所有拼圖路徑
  rebuildAllPiecePaths();

  // 繪製頁面標題
  drawPageHeader();

  // 繪製拼圖板
  drawBoardCard();

  // 繪製拼圖卡片面板
  drawCardsPanel();

  // 顯示完成資訊
  if (isGameComplete()) {
    drawCompleteScreen();
  }

  // 顯示題目
  if (showQuestionModal) {
    drawQuestionModal();
  }

  // 顯示答案結果
  if (showResultModal) {
    drawResultModal();
  }
}

// ------------------------------------------------------------
// 計算響應式版面
// ------------------------------------------------------------
function calculateLayout() {
  // 判斷是否為窄螢幕
  let smallScreen = width < 820;

  // 窄螢幕上下排列
  if (smallScreen) {
    // 拼圖板白色卡片
    layout.boardCardW = min(width - 28, 520);
    layout.boardCardH = layout.boardCardW + 70;
    layout.boardCardX = (width - layout.boardCardW) / 2;
    layout.boardCardY = 124;

    // 拼圖板尺寸
    layout.boardSize = min(width - 66, 420);
    layout.boardX =
      layout.boardCardX +
      (layout.boardCardW - layout.boardSize) / 2;
    layout.boardY = layout.boardCardY + 48;
    layout.cellSize = layout.boardSize / COLS;

    // 拼圖卡片面板
    layout.panelW = min(width - 28, 520);
    layout.panelH = 430;
    layout.panelX = (width - layout.panelW) / 2;
    layout.panelY =
      layout.boardCardY +
      layout.boardCardH +
      18;

    // 拼圖卡片尺寸
    layout.cardWidth = min(108, (width - 58) / 3);
    layout.cardHeight = layout.cardWidth * 0.86;
    layout.cardGap = 8;

    // 拼圖卡片起點
    layout.cardsX =
      layout.panelX +
      (layout.panelW -
        layout.cardWidth * 3 -
        layout.cardGap * 2) /
        2;

    layout.cardsY = layout.panelY + 60;
  } else {
    // 大螢幕左右排列
    layout.boardCardW = min(width * 0.54, 680);
    layout.boardCardH = min(height - 160, 700);
    layout.boardCardX = 24;
    layout.boardCardY = 124;

    // 拼圖板尺寸
    layout.boardSize = min(
      layout.boardCardW - 74,
      layout.boardCardH - 94
    );

    layout.boardX =
      layout.boardCardX +
      (layout.boardCardW - layout.boardSize) / 2;

    layout.boardY = layout.boardCardY + 56;
    layout.cellSize = layout.boardSize / COLS;

    // 右側卡片面板
    layout.panelX =
      layout.boardCardX +
      layout.boardCardW +
      20;

    layout.panelY = 124;
    layout.panelW =
      width -
      layout.panelX -
      24;

    layout.panelH = min(height - 160, 700);

    // 拼圖卡片尺寸
    layout.cardWidth = min(
      145,
      (layout.panelW - 58) / 3
    );

    layout.cardHeight = layout.cardWidth * 0.86;
    layout.cardGap = 10;

    // 拼圖卡片起點
    layout.cardsX =
      layout.panelX +
      (layout.panelW -
        layout.cardWidth * 3 -
        layout.cardGap * 2) /
        2;

    layout.cardsY = layout.panelY + 78;
  }

  // 設定每塊拼圖尺寸與位置
  for (let p of pieces) {
    // 拼圖大小
    p.width = layout.cellSize;
    p.height = layout.cellSize;

    // 目標位置
    p.targetX =
      layout.boardX +
      p.col * layout.cellSize;

    p.targetY =
      layout.boardY +
      p.row * layout.cellSize;

    // 第一次設定拼圖卡片位置
    if (!p.initialized) {
      let cardCol = p.index % COLS;
      let cardRow = floor(p.index / COLS);

      p.homeX =
        layout.cardsX +
        cardCol * (layout.cardWidth + layout.cardGap);

      p.homeY =
        layout.cardsY +
        cardRow * (layout.cardHeight + layout.cardGap);

      p.x = p.homeX;
      p.y = p.homeY;
      p.initialized = true;
    }

    // 已完成拼圖固定於目標位置
    if (p.state === "placed") {
      p.x = p.targetX;
      p.y = p.targetY;
    }
  }
}

// ------------------------------------------------------------
// 繪製頁面標題
// ------------------------------------------------------------
function drawPageHeader() {
  // 左上角英文標籤
  fill(COLORS.blue);
  textAlign(LEFT, CENTER);
  textSize(13);
  text("PUZZLE QUIZ", 28, 29);

  // 主標題
  fill(COLORS.text);
  textSize(width < 600 ? 25 : 30);
  text("交通安全小達人", 28, 61);

  // 說明
  fill(COLORS.subText);
  textSize(14);
  text(
    "回答問題、解鎖拼圖，完成交通安全挑戰",
    28,
    89
  );

  // 恢復置中
  textAlign(CENTER, CENTER);
}

// ------------------------------------------------------------
// 繪製拼圖板卡片
// ------------------------------------------------------------
function drawBoardCard() {
  // 繪製白色圓角卡片
  drawSoftCard(
    layout.boardCardX,
    layout.boardCardY,
    layout.boardCardW,
    layout.boardCardH,
    18
  );

  // 卡片標題
  fill(COLORS.text);
  textSize(18);
  text(
    "完整拼圖",
    layout.boardCardX + 30,
    layout.boardCardY + 27
  );

  // 卡片提示
  fill(COLORS.subText);
  textSize(12);
  text(
    "把彩色拼圖拖到虛線位置",
    layout.boardCardX + layout.boardCardW - 145,
    layout.boardCardY + 27
  );

  // 拼圖板背景
  fill(COLORS.board);
  noStroke();
  rect(
    layout.boardX,
    layout.boardY,
    layout.boardSize,
    layout.boardSize,
    12
  );

  // 繪製放置格
  for (let p of pieces) {
    if (p.state !== "placed") {
      drawDashedSlot(
        p.targetX + 2,
        p.targetY + 2,
        p.width - 4,
        p.height - 4
      );

      // 顯示拼圖編號
      fill("#9E9E9E");
      textSize(13);
      text(
        p.index + 1,
        p.targetX + p.width / 2,
        p.targetY + p.height / 2
      );
    }
  }

  // 繪製已放置拼圖
  for (let p of pieces) {
    if (p.state === "placed") {
      drawPieceImage(p);
      drawPieceOutline(p, COLORS.green, 2);
    }
  }
}

// ------------------------------------------------------------
// 繪製右側拼圖面板
// ------------------------------------------------------------
function drawCardsPanel() {
  // 繪製白色卡片
  drawSoftCard(
    layout.panelX,
    layout.panelY,
    layout.panelW,
    layout.panelH,
    18
  );

  // 繪製標題
  fill(COLORS.text);
  textSize(18);
  text(
    "解鎖拼圖",
    layout.panelX + 30,
    layout.panelY + 29
  );

  // 繪製進度標籤
  fill("#EEF5FC");
  noStroke();
  rect(
    layout.panelX + layout.panelW - 150,
    layout.panelY + 15,
    120,
    28,
    14
  );

  fill(COLORS.blueDark);
  textSize(12);
  text(
    "進度 " + getOpenCount() + " / 9",
    layout.panelX + layout.panelW - 90,
    layout.panelY + 29
  );

  // 繪製拼圖卡片
  for (let p of pieces) {
    if (p.state !== "placed") {
      drawPieceCard(p);
    }
  }

  // 繪製說明
  fill(COLORS.subText);
  textSize(12);
  text(
    "灰色：尚未答題　彩色：可以拖曳",
    layout.panelX + layout.panelW / 2,
    layout.panelY + layout.panelH - 36
  );
}

// ------------------------------------------------------------
// 繪製柔和白色卡片
// ------------------------------------------------------------
function drawSoftCard(x, y, w, h, radius) {
  // 取得 Canvas context
  const ctx = drawingContext;

  // 儲存狀態
  ctx.save();

  // 設定陰影
  ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

  // 設定填色
  ctx.fillStyle = COLORS.white;

  // 建立圓角路徑
  roundedRectPath(ctx, x, y, w, h, radius);

  // 填滿卡片
  ctx.fill();

  // 還原狀態
  ctx.restore();
}

// ------------------------------------------------------------
// 建立圓角矩形路徑
// ------------------------------------------------------------
function roundedRectPath(ctx, x, y, w, h, r) {
  // 限制圓角
  r = min(r, w / 2, h / 2);

  // 開始建立路徑
  ctx.beginPath();

  // 左上角開始
  ctx.moveTo(x + r, y);

  // 上邊
  ctx.lineTo(x + w - r, y);

  // 右上角
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);

  // 右邊
  ctx.lineTo(x + w, y + h - r);

  // 右下角
  ctx.quadraticCurveTo(
    x + w,
    y + h,
    x + w - r,
    y + h
  );

  // 下邊
  ctx.lineTo(x + r, y + h);

  // 左下角
  ctx.quadraticCurveTo(
    x,
    y + h,
    x,
    y + h - r
  );

  // 左邊
  ctx.lineTo(x, y + r);

  // 左上角
  ctx.quadraticCurveTo(x, y, x + r, y);

  // 關閉路徑
  ctx.closePath();
}

// ------------------------------------------------------------
// 繪製虛線格
// ------------------------------------------------------------
function drawDashedSlot(x, y, w, h) {
  // 取得 Canvas context
  const ctx = drawingContext;

  // 儲存狀態
  ctx.save();

  // 設定虛線
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.dashed;
  ctx.fillStyle = "#F7F7F7";

  // 建立格子路徑
  roundedRectPath(ctx, x, y, w, h, 8);

  // 填滿與描邊
  ctx.fill();
  ctx.stroke();

  // 還原狀態
  ctx.restore();
}

// ------------------------------------------------------------
// 繪製拼圖卡片
// ------------------------------------------------------------
function drawPieceCard(p) {
  // locked 狀態
  if (p.state === "locked") {
    drawLockedPiece(p);
    return;
  }

  // open 狀態
  if (p.state === "open") {
    // 繪製圖片拼圖
    drawPieceImage(p);

    // 繪製綠色輪廓
    drawPieceOutline(p, COLORS.green, 2.5);

    // 顯示 OPEN 標籤
    drawStatusBadge(
      p.x + p.width / 2,
      p.y + p.height - 17,
      "OPEN",
      COLORS.green
    );
  }
}

// ------------------------------------------------------------
// 繪製鎖定拼圖
// ------------------------------------------------------------
function drawLockedPiece(p) {
  // 取得 Canvas context
  const ctx = drawingContext;

  // 儲存狀態
  ctx.save();

  // 設定陰影
  ctx.shadowColor = "rgba(0,0,0,0.16)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  // 設定鎖定拼圖顏色
  ctx.fillStyle = COLORS.locked;

  // 使用真實路徑繪製
  if (
    typeof Path2D !== "undefined" &&
    p.path !== null
  ) {
    ctx.fill(p.path);

    // 描繪輪廓
    ctx.strokeStyle = COLORS.lockedDark;
    ctx.lineWidth = 2;
    ctx.stroke(p.path);
  }

  // 還原狀態
  ctx.restore();

  // 顯示問號
  fill("#FFFFFF");
  textSize(min(p.width * 0.5, 60));
  text(
    "?",
    p.x + p.width / 2,
    p.y + p.height / 2 - 8
  );

  // 顯示 LOCKED 標籤
  drawStatusBadge(
    p.x + p.width / 2,
    p.y + p.height - 17,
    "LOCKED",
    COLORS.lockedDark
  );
}

// ------------------------------------------------------------
// 繪製狀態標籤
// ------------------------------------------------------------
function drawStatusBadge(x, y, label, color) {
  // 設定標籤尺寸
  let badgeW = label === "LOCKED" ? 58 : 42;
  let badgeH = 19;

  // 繪製標籤背景
  fill(255, 255, 255, 225);
  noStroke();
  rect(
    x - badgeW / 2,
    y - badgeH / 2,
    badgeW,
    badgeH,
    10
  );

  // 繪製標籤文字
  fill(color);
  textSize(9);
  text(label, x, y);
}

// ------------------------------------------------------------
// 建立所有拼圖路徑
// ------------------------------------------------------------
function rebuildAllPiecePaths() {
  // 瀏覽器不支援 Path2D 時略過
  if (typeof Path2D === "undefined") {
    return;
  }

  // 重新建立每塊拼圖路徑
  for (let p of pieces) {
    p.path = buildPiecePath(
      p.x,
      p.y,
      p.width,
      p.height,
      p.edges
    );
  }
}

// ------------------------------------------------------------
// 建立拼圖形狀
// ------------------------------------------------------------
function buildPiecePath(x, y, w, h, edges) {
  // 建立 Path2D
  let path = new Path2D();

  // 四個角落
  let left = x;
  let top = y;
  let right = x + w;
  let bottom = y + h;

  // 四條邊切點
  let topStart = x + w * 0.25;
  let topEnd = x + w * 0.75;

  let rightStart = y + h * 0.25;
  let rightEnd = y + h * 0.75;

  let bottomStart = x + w * 0.25;
  let bottomEnd = x + w * 0.75;

  let leftStart = y + h * 0.25;
  let leftEnd = y + h * 0.75;

  // 從左上角開始
  path.moveTo(left, top);

  // 上邊
  path.lineTo(topStart, top);

  appendTopEdge(
    path,
    topStart,
    top,
    topEnd,
    top,
    edges.top,
    w
  );

  path.lineTo(right, top);

  // 右邊
  path.lineTo(right, rightStart);

  appendRightEdge(
    path,
    right,
    rightStart,
    right,
    rightEnd,
    edges.right,
    h
  );

  path.lineTo(right, bottom);

  // 下邊
  path.lineTo(bottomEnd, bottom);

  appendBottomEdge(
    path,
    bottomEnd,
    bottom,
    bottomStart,
    bottom,
    edges.bottom,
    w
  );

  path.lineTo(left, bottom);

  // 左邊
  path.lineTo(left, leftEnd);

  appendLeftEdge(
    path,
    left,
    leftEnd,
    left,
    leftStart,
    edges.left,
    h
  );

  path.lineTo(left, top);

  // 關閉路徑
  path.closePath();

  return path;
}

// ------------------------------------------------------------
// 產生上邊曲線
//
// 注意：
// 這裡的幾何方向與下方相鄰拼圖完全共用同一組座標比例。
// 因此兩塊拼圖拼接後不會出現縫隙。
// ------------------------------------------------------------
function appendTopEdge(
  path,
  x1,
  y1,
  x2,
  y2,
  direction,
  size
) {
  // 外框平邊
  if (direction === 0) {
    path.lineTo(x2, y2);
    return;
  }

  // 計算凸起或凹槽深度
  let depth = size * TAB_SIZE_RATIO * direction;

  // 計算中點
  let middleX = (x1 + x2) / 2;

  // 計算半長度
  let half = (x2 - x1) / 2;

  // 第一段 bezierCurveTo
  path.bezierCurveTo(
    x1 + half * 0.24,
    y1,
    middleX - half * 0.52,
    y1 + depth,
    middleX,
    y1 + depth
  );

  // 第二段 bezierCurveTo
  path.bezierCurveTo(
    middleX + half * 0.52,
    y1 + depth,
    x2 - half * 0.24,
    y1,
    x2,
    y2
  );
}

// ------------------------------------------------------------
// 產生右邊曲線
// ------------------------------------------------------------
function appendRightEdge(
  path,
  x1,
  y1,
  x2,
  y2,
  direction,
  size
) {
  // 外框平邊
  if (direction === 0) {
    path.lineTo(x2, y2);
    return;
  }

  // 計算凸起或凹槽深度
  let depth = size * TAB_SIZE_RATIO * direction;

  // 計算中點
  let middleY = (y1 + y2) / 2;

  // 計算半長度
  let half = (y2 - y1) / 2;

  // 第一段 bezierCurveTo
  path.bezierCurveTo(
    x1,
    y1 + half * 0.24,
    x1 + depth,
    middleY - half * 0.52,
    x1 + depth,
    middleY
  );

  // 第二段 bezierCurveTo
  path.bezierCurveTo(
    x1 + depth,
    middleY + half * 0.52,
    x1,
    y2 - half * 0.24,
    x2,
    y2
  );
}

// ------------------------------------------------------------
// 產生下邊曲線
//
// 下邊使用與上邊相同的相對曲線。
// 因為下方拼圖的上邊方向是相反值，兩邊會完全互補。
// ------------------------------------------------------------
function appendBottomEdge(
  path,
  x1,
  y1,
  x2,
  y2,
  direction,
  size
) {
  // 外框平邊
  if (direction === 0) {
    path.lineTo(x2, y2);
    return;
  }

  // 計算深度
  let depth = size * TAB_SIZE_RATIO * direction;

  // 計算中點
  let middleX = (x1 + x2) / 2;

  // 下邊由右往左繪製
  let half = (x1 - x2) / 2;

  // 第一段 bezierCurveTo
  path.bezierCurveTo(
    x1 - half * 0.24,
    y1,
    middleX + half * 0.52,
    y1 + depth,
    middleX,
    y1 + depth
  );

  // 第二段 bezierCurveTo
  path.bezierCurveTo(
    middleX - half * 0.52,
    y1 + depth,
    x2 + half * 0.24,
    y1,
    x2,
    y2
  );
}

// ------------------------------------------------------------
// 產生左邊曲線
// ------------------------------------------------------------
function appendLeftEdge(
  path,
  x1,
  y1,
  x2,
  y2,
  direction,
  size
) {
  // 外框平邊
  if (direction === 0) {
    path.lineTo(x2, y2);
    return;
  }

  // 計算深度
  let depth = size * TAB_SIZE_RATIO * direction;

  // 計算中點
  let middleY = (y1 + y2) / 2;

  // 左邊由下往上繪製
  let half = (y1 - y2) / 2;

  // 第一段 bezierCurveTo
  path.bezierCurveTo(
    x1,
    y1 - half * 0.24,
    x1 + depth,
    middleY + half * 0.52,
    x1 + depth,
    middleY
  );

  // 第二段 bezierCurveTo
  path.bezierCurveTo(
    x1 + depth,
    middleY - half * 0.52,
    x1,
    y2 + half * 0.24,
    x2,
    y2
  );
}

// ------------------------------------------------------------
// 以真實形狀裁切圖片
// ------------------------------------------------------------
function drawPieceImage(p) {
  // 不支援 Path2D 時使用備援
  if (
    typeof Path2D === "undefined" ||
    p.path === null
  ) {
    drawImageFallback(p);
    return;
  }

  // 取得 Canvas context
  const ctx = drawingContext;

  // 儲存狀態
  ctx.save();

  // 使用真實拼圖形狀裁切
  ctx.clip(p.path);

  // 計算圖片切片位置
  let sx = p.col * sourceImage.width / COLS;
  let sy = p.row * sourceImage.height / ROWS;
  let sw = sourceImage.width / COLS;
  let sh = sourceImage.height / ROWS;

  // 取得圖片來源
  let imageSource = sourceImage.canvas;

  if (!imageSource) {
    imageSource = sourceImage.elt;
  }

  // 繪製圖片
  if (imageSource) {
    ctx.drawImage(
      imageSource,
      sx,
      sy,
      sw,
      sh,
      p.x,
      p.y,
      p.width,
      p.height
    );
  }

  // 還原狀態
  ctx.restore();
}

// ------------------------------------------------------------
// 圖片備援繪製
// ------------------------------------------------------------
function drawImageFallback(p) {
  // 使用 p5.js image() 繪製
  image(
    sourceImage,
    p.x,
    p.y,
    p.width,
    p.height,
    p.col * sourceImage.width / COLS,
    p.row * sourceImage.height / ROWS,
    sourceImage.width / COLS,
    sourceImage.height / ROWS
  );
}

// ------------------------------------------------------------
// 繪製拼圖邊界
// ------------------------------------------------------------
function drawPieceOutline(p, color, thickness) {
  // 沒有 Path2D 時結束
  if (
    typeof Path2D === "undefined" ||
    p.path === null
  ) {
    return;
  }

  // 取得 Canvas context
  const ctx = drawingContext;

  // 儲存狀態
  ctx.save();

  // 設定輪廓
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;

  // 繪製輪廓
  ctx.stroke(p.path);

  // 還原狀態
  ctx.restore();
}

// ------------------------------------------------------------
// 真實拼圖形狀點擊判斷
//
// 指定程式：
// // 點到哪一塊：用拼圖的真實形狀判斷
// ctx.isPointInPath(p.path, lx, ly)
// ------------------------------------------------------------
function getPieceAtPosition(px, py) {
  // 取得原生 Canvas context
  const ctx = drawingContext;

  // 從最上層開始判斷
  for (let i = pieces.length - 1; i >= 0; i--) {
    // p 代表目前拼圖
    let p = pieces[i];

    // 只有 open 狀態可以拖曳
    if (p.state !== "open") {
      continue;
    }

    // 使用畫布 CSS 座標
    let lx = px;
    let ly = py;

    // 點到哪一塊：用拼圖的真實形狀判斷
    if (
      p.path !== null &&
      ctx.isPointInPath(p.path, lx, ly)
    ) {
      return p;
    }
  }

  // 沒有點到任何拼圖
  return null;
}

// ------------------------------------------------------------
// 判斷點是否在矩形內
// ------------------------------------------------------------
function isPointInRect(px, py, x, y, w, h) {
  return (
    px >= x &&
    px <= x + w &&
    py >= y &&
    py <= y + h
  );
}

// ------------------------------------------------------------
// 開啟題目
// ------------------------------------------------------------
function openQuestion(p) {
  // 只有 locked 狀態可答題
  if (p.state !== "locked") {
    return;
  }

  // 設定目前題目
  currentQuestionIndex = p.index;

  // 清除選項
  selectedAnswer = -1;

  // 顯示題目視窗
  showQuestionModal = true;

  // 關閉結果視窗
  showResultModal = false;
}

// ------------------------------------------------------------
// 選擇答案
// ------------------------------------------------------------
function selectAnswer(index) {
  // 題目視窗未開啟時不處理
  if (!showQuestionModal) {
    return;
  }

  // 記錄答案
  selectedAnswer = index;
}

// ------------------------------------------------------------
// 送出答案
// ------------------------------------------------------------
function submitAnswer() {
  // 沒有選擇答案時不處理
  if (selectedAnswer === -1) {
    return;
  }

  // 取得題目與拼圖
  let question = questions[currentQuestionIndex];
  let p = pieces[currentQuestionIndex];

  // 判斷答案
  answerCorrect =
    selectedAnswer === question.answer;

  // 記錄答題
  p.answered = true;
  p.correct = answerCorrect;

  // locked → open
  p.state = "open";

  // 答對加分
  if (answerCorrect) {
    score++;
    correctCount++;
  } else {
    wrongCount++;
  }

  // 關閉題目
  showQuestionModal = false;

  // 顯示結果
  showResultModal = true;
}

// ------------------------------------------------------------
// 開始拖曳
// ------------------------------------------------------------
function startDragging(px, py) {
  // 題目視窗或結果視窗開啟時停止
  if (showQuestionModal || showResultModal) {
    return;
  }

  // 尋找 open 拼圖
  let selectedPiece = getPieceAtPosition(px, py);

  // 找到拼圖後開始拖曳
  if (selectedPiece !== null) {
    // 儲存拖曳拼圖
    draggedPiece = selectedPiece;

    // 設定拖曳狀態
    dragging = true;

    // 記錄偏移
    dragOffsetX = px - selectedPiece.x;
    dragOffsetY = py - selectedPiece.y;

    // 移到最上層
    let oldIndex = pieces.indexOf(selectedPiece);

    if (oldIndex !== -1) {
      pieces.splice(oldIndex, 1);
      pieces.push(selectedPiece);
    }

    return;
  }

  // 沒有點到 open 時，檢查 locked
  for (let p of pieces) {
    // 只處理 locked
    if (p.state !== "locked") {
      continue;
    }

    // 取得 Canvas context
    const ctx = drawingContext;

    // 使用畫布 CSS 座標
    let lx = px;
    let ly = py;

    // 使用真實形狀判斷
    if (
      p.path !== null &&
      ctx.isPointInPath(p.path, lx, ly)
    ) {
      openQuestion(p);
      return;
    }
  }
}

// ------------------------------------------------------------
// 移動拼圖
// ------------------------------------------------------------
function moveDragging(px, py) {
  // 沒有拖曳時停止
  if (!dragging || draggedPiece === null) {
    return;
  }

  // 更新位置
  draggedPiece.x = px - dragOffsetX;
  draggedPiece.y = py - dragOffsetY;

  // 更新路徑
  draggedPiece.path = buildPiecePath(
    draggedPiece.x,
    draggedPiece.y,
    draggedPiece.width,
    draggedPiece.height,
    draggedPiece.edges
  );
}

// ------------------------------------------------------------
// 結束拖曳
// ------------------------------------------------------------
function stopDragging() {
  // 沒有拖曳時停止
  if (!dragging || draggedPiece === null) {
    return;
  }

  // 目前拼圖
  let p = draggedPiece;

  // 目標位置
  let t = {
    x: p.targetX,
    y: p.targetY
  };

  // 設定吸附距離
  let 吸附距離 = p.width * SNAP_RATIO;

  // 放開時離正確位置夠近 → 吸附
  if (
    dist(p.x, p.y, t.x, t.y) < 吸附距離
  ) {
    // 移到正確位置
    p.x = t.x;
    p.y = t.y;

    // open → placed
    p.state = "placed";
  } else {
    // 放錯位置，回到卡片區
    p.x = p.homeX;
    p.y = p.homeY;
  }

  // 重新建立路徑
  p.path = buildPiecePath(
    p.x,
    p.y,
    p.width,
    p.height,
    p.edges
  );

  // 清除拖曳狀態
  draggedPiece = null;
  dragging = false;
}

// ------------------------------------------------------------
// 判斷是否全部完成
//
// 指定程式：
// // 每一塊都放好 → 完成
// pieces.every(z => z.state === "placed")
// ------------------------------------------------------------
function isGameComplete() {
  // 每一塊都放好 → 完成
  return pieces.every(
    z => z.state === "placed"
  );
}

// ------------------------------------------------------------
// 計算已解鎖數量
// ------------------------------------------------------------
function getOpenCount() {
  let count = 0;

  for (let p of pieces) {
    if (
      p.state === "open" ||
      p.state === "placed"
    ) {
      count++;
    }
  }

  return count;
}

// ------------------------------------------------------------
// 顯示題目視窗
// ------------------------------------------------------------
function drawQuestionModal() {
  // 繪製遮罩
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // 設定視窗大小
  let modalWidth = min(width - 32, 610);
  let modalHeight = min(height - 48, 520);

  // 設定視窗位置
  let modalX = (width - modalWidth) / 2;
  let modalY = (height - modalHeight) / 2;

  // 繪製視窗
  drawSoftCard(
    modalX,
    modalY,
    modalWidth,
    modalHeight,
    18
  );

  // 顯示題號
  fill(COLORS.text);
  textSize(22);
  text(
    "第 " + (currentQuestionIndex + 1) + " 題",
    width / 2,
    modalY + 40
  );

  // 顯示問題
  fill("#37474F");
  textSize(width < 500 ? 17 : 20);

  drawWrappedText(
    questions[currentQuestionIndex].question,
    width / 2,
    modalY + 84,
    modalWidth - 50,
    28
  );

  // 選項尺寸
  let optionStartY = modalY + 140;
  let optionHeight = min(52, (modalHeight - 215) / 4);
  let optionGap = 10;

  // 繪製選項
  for (let i = 0; i < 4; i++) {
    let optionX = modalX + 25;
    let optionY =
      optionStartY +
      i * (optionHeight + optionGap);
    let optionW = modalWidth - 50;

    // 選取狀態
    if (selectedAnswer === i) {
      fill("#E3F2FD");
      stroke(COLORS.blue);
    } else {
      fill("#FAFAFA");
      stroke(COLORS.border);
    }

    // 繪製選項
    strokeWeight(2);
    rect(
      optionX,
      optionY,
      optionW,
      optionHeight,
      10
    );

    // 繪製選項文字
    noStroke();
    fill(COLORS.text);
    textSize(width < 500 ? 14 : 16);

    drawWrappedText(
      String.fromCharCode(65 + i) +
        ". " +
        questions[currentQuestionIndex].options[i],
      width / 2,
      optionY + optionHeight / 2,
      optionW - 30,
      20
    );
  }

  // 送出按鈕
  let buttonW = 150;
  let buttonH = 42;
  let buttonX = width / 2 - buttonW / 2;
  let buttonY = modalY + modalHeight - 59;

  // 是否選擇答案
  fill(
    selectedAnswer === -1
      ? "#B0BEC5"
      : COLORS.blue
  );

  // 繪製按鈕
  noStroke();
  rect(
    buttonX,
    buttonY,
    buttonW,
    buttonH,
    10
  );

  // 繪製文字
  fill("#FFFFFF");
  textSize(16);
  text(
    "送出答案",
    width / 2,
    buttonY + buttonH / 2
  );

  // 儲存按鈕位置
  submitButtonRect = {
    x: buttonX,
    y: buttonY,
    w: buttonW,
    h: buttonH
  };
}

// ------------------------------------------------------------
// 顯示答題結果
// ------------------------------------------------------------
function drawResultModal() {
  // 繪製遮罩
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // 設定視窗尺寸
  let modalWidth = min(width - 40, 440);
  let modalHeight = 270;

  // 設定位置
  let modalX = (width - modalWidth) / 2;
  let modalY = (height - modalHeight) / 2;

  // 繪製視窗
  drawSoftCard(
    modalX,
    modalY,
    modalWidth,
    modalHeight,
    18
  );

  // 結果標題
  fill(answerCorrect ? COLORS.green : COLORS.red);
  textSize(30);
  text(
    answerCorrect ? "答對了！" : "答錯了！",
    width / 2,
    modalY + 58
  );

  // 結果說明
  fill(COLORS.text);
  textSize(17);

  if (answerCorrect) {
    text(
      "拼圖已解鎖，獲得 1 分！",
      width / 2,
      modalY + 105
    );
  } else {
    text(
      "拼圖已解鎖，但本題不計分。",
      width / 2,
      modalY + 105
    );
  }

  // 正確答案
  fill(COLORS.subText);
  textSize(14);

  drawWrappedText(
    "正確答案：" +
      questions[currentQuestionIndex].options[
        questions[currentQuestionIndex].answer
      ],
    width / 2,
    modalY + 145,
    modalWidth - 40,
    20
  );

  // 繼續按鈕
  let buttonW = 140;
  let buttonH = 42;
  let buttonX = width / 2 - buttonW / 2;
  let buttonY = modalY + modalHeight - 60;

  fill(COLORS.blue);
  rect(
    buttonX,
    buttonY,
    buttonW,
    buttonH,
    10
  );

  fill("#FFFFFF");
  textSize(16);
  text(
    "繼續遊戲",
    width / 2,
    buttonY + buttonH / 2
  );

  // 記錄按鈕
  continueButtonRect = {
    x: buttonX,
    y: buttonY,
    w: buttonW,
    h: buttonH
  };
}

// ------------------------------------------------------------
// 繪製完成畫面
// ------------------------------------------------------------
function drawCompleteScreen() {
  // 設定完成框
  let boxW = min(width - 32, 620);
  let boxH = 135;
  let boxX = (width - boxW) / 2;

  // 設定完成框位置
  let boxY;

  if (width >= 820) {
    boxY =
      layout.boardCardY +
      layout.boardCardH +
      18;
  } else {
    boxY =
      layout.panelY +
      layout.panelH +
      18;
  }

  // 繪製淡綠色成功卡片
  fill(COLORS.lightGreen);
  stroke("#A5D6A7");
  strokeWeight(2);
  rect(
    boxX,
    boxY,
    boxW,
    boxH,
    16
  );

  // 完成標題
  noStroke();
  fill("#2E7D32");
  textSize(22);
  text(
    "恭喜完成交通安全拼圖！",
    width / 2,
    boxY + 30
  );

  // 成績
  fill(COLORS.text);
  textSize(16);
  text(
    "總分：" +
      score +
      " / 9　答對：" +
      correctCount +
      " 題　答錯：" +
      wrongCount +
      " 題",
    width / 2,
    boxY + 70
  );

  // 提示
  fill("#4E6E58");
  textSize(14);
  text(
    "請查看答題成績九宮格",
    width / 2,
    boxY + 105
  );

  // 繪製九宮格
  drawScoreGrid(boxY + boxH + 20);
}

// ------------------------------------------------------------
// 繪製成績九宮格
// ------------------------------------------------------------
function drawScoreGrid(gridY) {
  // 設定九宮格大小
  let gridSize = min(270, width - 40);
  let gridX = (width - gridSize) / 2;
  let cellSize = gridSize / 3;

  // 避免超出螢幕
  if (gridY + gridSize > height - 12) {
    gridY = height - gridSize - 12;
  }

  // 標題
  fill(COLORS.text);
  textSize(18);
  text(
    "答題成績九宮格",
    width / 2,
    gridY - 20
  );

  // 九個格子
  for (let i = 0; i < TOTAL_PIECES; i++) {
    let row = floor(i / 3);
    let col = i % 3;

    let x = gridX + col * cellSize;
    let y = gridY + row * cellSize;

    // 答對為綠色，答錯為紅色
    if (pieces[i].correct) {
      fill(COLORS.lightGreen);
      stroke("#81C784");
    } else {
      fill(COLORS.lightRed);
      stroke("#EF9A9A");
    }

    // 繪製格子
    strokeWeight(2);
    rect(
      x + 2,
      y + 2,
      cellSize - 4,
      cellSize - 4,
      10
    );

    // 題號
    noStroke();
    fill(COLORS.text);
    textSize(13);
    text(
      "第 " + (i + 1) + " 題",
      x + cellSize / 2,
      y + cellSize * 0.34
    );

    // 符號
    textSize(min(cellSize * 0.4, 38));

    if (pieces[i].correct) {
      fill(COLORS.green);
      text(
        "✓",
        x + cellSize / 2,
        y + cellSize * 0.7
      );
    } else {
      fill(COLORS.red);
      text(
        "✗",
        x + cellSize / 2,
        y + cellSize * 0.7
      );
    }
  }
}

// ------------------------------------------------------------
// 處理按下
// ------------------------------------------------------------
function handlePointerPressed(px, py) {
  // 結果視窗
  if (showResultModal) {
    if (
      isPointInRect(
        px,
        py,
        continueButtonRect.x,
        continueButtonRect.y,
        continueButtonRect.w,
        continueButtonRect.h
      )
    ) {
      showResultModal = false;
      currentQuestionIndex = -1;
      selectedAnswer = -1;
    }

    return;
  }

  // 題目視窗
  if (showQuestionModal) {
    handleQuestionPointerPressed(px, py);
    return;
  }

  // 遊戲完成後停止拖曳
  if (isGameComplete()) {
    return;
  }

  // 開始拖曳
  startDragging(px, py);
}

// ------------------------------------------------------------
// 處理移動
// ------------------------------------------------------------
function handlePointerMoved(px, py) {
  // 題目或結果視窗開啟時停止
  if (showQuestionModal || showResultModal) {
    return;
  }

  // 移動拼圖
  moveDragging(px, py);
}

// ------------------------------------------------------------
// 處理放開
// ------------------------------------------------------------
function handlePointerReleased() {
  // 題目或結果視窗開啟時停止
  if (showQuestionModal || showResultModal) {
    return;
  }

  // 結束拖曳
  stopDragging();
}

// ------------------------------------------------------------
// 題目視窗點擊
// ------------------------------------------------------------
function handleQuestionPointerPressed(px, py) {
  // 計算視窗位置
  let modalWidth = min(width - 32, 610);
  let modalHeight = min(height - 48, 520);
  let modalX = (width - modalWidth) / 2;
  let modalY = (height - modalHeight) / 2;

  // 計算選項
  let optionStartY = modalY + 140;
  let optionHeight = min(52, (modalHeight - 215) / 4);
  let optionGap = 10;

  // 檢查四個選項
  for (let i = 0; i < 4; i++) {
    let optionX = modalX + 25;
    let optionY =
      optionStartY +
      i * (optionHeight + optionGap);
    let optionW = modalWidth - 50;

    // 點擊選項
    if (
      isPointInRect(
        px,
        py,
        optionX,
        optionY,
        optionW,
        optionHeight
      )
    ) {
      selectAnswer(i);
      return;
    }
  }

  // 點擊送出
  if (
    isPointInRect(
      px,
      py,
      submitButtonRect.x,
      submitButtonRect.y,
      submitButtonRect.w,
      submitButtonRect.h
    )
  ) {
    submitAnswer();
  }
}

// ------------------------------------------------------------
// 滑鼠事件
// ------------------------------------------------------------
function mousePressed() {
  // 防止觸控與滑鼠重複
  if (millis() - lastTouchTime < 500) {
    return false;
  }

  // 處理滑鼠按下
  handlePointerPressed(mouseX, mouseY);

  // 阻止預設行為
  return false;
}

function mouseDragged() {
  // 防止觸控與滑鼠重複
  if (millis() - lastTouchTime < 500) {
    return false;
  }

  // 處理滑鼠移動
  handlePointerMoved(mouseX, mouseY);

  // 阻止預設行為
  return false;
}

function mouseReleased() {
  // 防止觸控與滑鼠重複
  if (millis() - lastTouchTime < 500) {
    return false;
  }

  // 處理滑鼠放開
  handlePointerReleased();

  // 阻止預設行為
  return false;
}

// ------------------------------------------------------------
// 觸控事件
// ------------------------------------------------------------
function touchStarted() {
  // 記錄觸控時間
  lastTouchTime = millis();

  // 沒有觸控點時離開
  if (touches.length === 0) {
    return false;
  }

  // 取得第一個觸控點
  let point = touches[0];

  // 處理觸控按下
  handlePointerPressed(point.x, point.y);

  // 阻止頁面預設行為
  return false;
}

function touchMoved() {
  // 記錄觸控時間
  lastTouchTime = millis();

  // 沒有觸控點時離開
  if (touches.length === 0) {
    return false;
  }

  // 取得第一個觸控點
  let point = touches[0];

  // 處理觸控移動
  handlePointerMoved(point.x, point.y);

  // 阻止頁面捲動
  return false;
}

function touchEnded() {
  // 記錄觸控時間
  lastTouchTime = millis();

  // 處理觸控放開
  handlePointerReleased();

  // 阻止頁面預設行為
  return false;
}

// ------------------------------------------------------------
// 重新開始
// ------------------------------------------------------------
function restartGame() {
  // 重設成績
  score = 0;
  correctCount = 0;
  wrongCount = 0;

  // 關閉視窗
  showQuestionModal = false;
  showResultModal = false;

  // 重設題目
  currentQuestionIndex = -1;
  selectedAnswer = -1;

  // 清除拖曳
  draggedPiece = null;
  dragging = false;

  // 重設每塊拼圖
  for (let p of pieces) {
    // placed → locked
    p.state = "locked";

    // 清除答題
    p.answered = false;
    p.correct = false;

    // 放回卡片區
    p.x = p.homeX;
    p.y = p.homeY;
  }
}

// ------------------------------------------------------------
// 圖片載入中畫面
// ------------------------------------------------------------
function drawLoadingScreen() {
  // 設定背景
  background(COLORS.background);

  // 卡片尺寸
  let cardW = min(width - 36, 430);
  let cardH = 180;
  let cardX = (width - cardW) / 2;
  let cardY = (height - cardH) / 2;

  // 繪製卡片
  drawSoftCard(cardX, cardY, cardW, cardH, 18);

  // 顯示文字
  fill(COLORS.text);
  textSize(24);
  text(
    "圖片載入中...",
    width / 2,
    cardY + 70
  );

  // 顯示提示
  fill(COLORS.subText);
  textSize(14);
  text(
    "請稍候片刻",
    width / 2,
    cardY + 112
  );
}

// ------------------------------------------------------------
// 圖片載入錯誤畫面
// ------------------------------------------------------------
function drawImageErrorScreen() {
  // 設定背景
  background(COLORS.background);

  // 卡片尺寸
  let cardW = min(width - 36, 520);
  let cardH = 220;
  let cardX = (width - cardW) / 2;
  let cardY = (height - cardH) / 2;

  // 繪製卡片
  drawSoftCard(cardX, cardY, cardW, cardH, 18);

  // 錯誤標題
  fill(COLORS.red);
  textSize(24);
  text(
    "圖片載入失敗",
    width / 2,
    cardY + 62
  );

  // 檔名提示
  fill(COLORS.text);
  textSize(16);
  text(
    "請確認圖片名稱為：照片.jpg",
    width / 2,
    cardY + 112
  );

  // 資料夾提示
  fill(COLORS.subText);
  textSize(14);
  text(
    "並放在 p5.js 專案的同一個資料夾",
    width / 2,
    cardY + 150
  );
}

// ------------------------------------------------------------
// 自動換行
// ------------------------------------------------------------
function drawWrappedText(
  message,
  x,
  y,
  maxWidth,
  lineHeight
) {
  // 轉成字串
  let content = String(message);

  // 中文逐字，英文依空白
  let parts = content.includes(" ")
    ? content.split(" ")
    : content.split("");

  // 儲存文字列
  let lines = [];
  let currentLine = "";

  // 建立每行文字
  for (let part of parts) {
    let testLine;

    if (
      content.includes(" ") &&
      currentLine !== ""
    ) {
      testLine =
        currentLine + " " + part;
    } else {
      testLine = currentLine + part;
    }

    // 超出寬度就換行
    if (
      textWidth(testLine) > maxWidth &&
      currentLine !== ""
    ) {
      lines.push(currentLine);
      currentLine = part;
    } else {
      currentLine = testLine;
    }
  }

  // 加入最後一行
  if (currentLine !== "") {
    lines.push(currentLine);
  }

  // 計算起始位置
  let totalHeight = lines.length * lineHeight;
  let startY =
    y -
    totalHeight / 2 +
    lineHeight / 2;

  // 繪製文字
  for (let i = 0; i < lines.length; i++) {
    text(
      lines[i],
      x,
      startY + i * lineHeight
    );
  }
}

// ------------------------------------------------------------
// 視窗大小改變
// ------------------------------------------------------------
function windowResized() {
  // 調整畫布
  resizeCanvas(windowWidth, windowHeight);

  // 更新按鈕
  updateRestartButtonPosition();

  // 更新版面
  calculateLayout();
}

// ------------------------------------------------------------
// 更新重新開始按鈕
// ------------------------------------------------------------
function updateRestartButtonPosition() {
  // 按鈕尚未建立時結束
  if (!restartButton) {
    return;
  }

  // 放置右上角
  restartButton.position(width - 132, 16);
}

// ------------------------------------------------------------
// 設定觸控
// ------------------------------------------------------------
function setupTouchSupport() {
  // 等 Canvas 建立後設定
  setTimeout(function () {
    let canvas = document.querySelector("canvas");

    // 停止瀏覽器預設觸控行為
    if (canvas) {
      canvas.style.touchAction = "none";
    }
  }, 100);
}