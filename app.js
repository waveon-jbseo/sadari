const MIN_PLAYERS = 2;
const COLORS = [
  "#e1533f",
  "#147d76",
  "#315ca8",
  "#b06b14",
  "#7552a8",
  "#25804d",
  "#b63d72",
  "#53616f",
];

function getPlayerColor(index) {
  if (COLORS[index]) return COLORS[index];

  const hue = (index * 137.508) % 360;
  return `hsl(${hue} 62% 42%)`;
}

const state = {
  count: 16,
  names: [
    "대표님", 
    "이사님", 
    "본부장님", 
    "사팀장님",
    "김형기책임",
    "고대한수석님",
    "육근조수석님",
    "김요환책임",
    "박재원수석님",
    "박종국책임",
    "이재웅책임",
    "박현우책임",
    "이삼봉책임",
    "서정범책임",
    "김경섭수석님",
    "박성호수석님"
  ],
  results: [
    "1구역 - 사무공간 빗자루 담당 (2인)", 
    "1구역 - 사무공간 빗자루 담당 (2인)", 
    "2구역 - 사무공간 마대(물걸레) 담당 (2인)", 
    "2구역 - 사무공간 마대(물걸레) 담당 (2인)", 
    "3구역 - HW실 담당 (2인)", 
    "3구역 - HW실 담당 (2인)", 
    "4구역 - 대·소회의실 & 쇼룸 담당 (2인)", 
    "4구역 - 대·소회의실 & 쇼룸 담당 (2인)", 
    "5구역 - 쓰레기 배출 담당 (3인)", 
    "5구역 - 쓰레기 배출 담당 (3인)", 
    "5구역 - 쓰레기 배출 담당 (3인)", 
    "6구역 - 탕비실 & 공용공간 정리정돈 담당 (2인)", 
    "6구역 - 탕비실 & 공용공간 정리정돈 담당 (2인)",
    "7구역 - 삼순이 집 담당 (1인)~",
    "열외~",
    "열외~"
  ],
  shuffledResults: [],
  bridges: [],
  paths: [],
  completed: new Set(),
  running: false,
};

const elements = {
  playerCount: document.querySelector("#playerCount"),
  playerInputs: document.querySelector("#playerInputs"),
  resultInputs: document.querySelector("#resultInputs"),
  decreaseButton: document.querySelector("#decreaseButton"),
  increaseButton: document.querySelector("#increaseButton"),
  generateButton: document.querySelector("#generateButton"),
  resetButton: document.querySelector("#resetButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  showAllButton: document.querySelector("#showAllButton"),
  gamePanel: document.querySelector("#gamePanel"),
  summaryPanel: document.querySelector("#summaryPanel"),
  startButtons: document.querySelector("#startButtons"),
  resultLabels: document.querySelector("#resultLabels"),
  summaryList: document.querySelector("#summaryList"),
  announcement: document.querySelector("#announcement"),
  canvas: document.querySelector("#ladderCanvas"),
};

const context = elements.canvas.getContext("2d");

function syncInputValues() {
  state.names = [...elements.playerInputs.querySelectorAll("input")].map(
    (input) => input.value,
  );
  state.results = [...elements.resultInputs.querySelectorAll("input")].map(
    (input) => input.value,
  );
}

function random() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }

  return Math.random();
}

function randomInt(max) {
  return Math.floor(random() * max);
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(index + 1);
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function renderInputs() {
  elements.playerCount.textContent = state.count;
  elements.playerInputs.innerHTML = "";
  elements.resultInputs.innerHTML = "";

  for (let index = 0; index < state.count; index += 1) {
    elements.playerInputs.append(
      createField("참가자", index, state.names[index] || `참가자 ${index + 1}`),
    );
    elements.resultInputs.append(
      createField("결과", index, state.results[index] || `결과 ${index + 1}`),
    );
  }

  elements.decreaseButton.disabled = state.count <= MIN_PLAYERS;
  elements.increaseButton.disabled = false;
}

function createField(type, index, value) {
  const row = document.createElement("div");
  row.className = "field-row";

  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.maxLength = 60;
  input.placeholder = `${type} ${index + 1}`;
  input.setAttribute("aria-label", `${type} ${index + 1}`);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-field-button";
  removeButton.textContent = "−";
  removeButton.setAttribute("aria-label", `${type} ${index + 1} 삭제`);
  removeButton.disabled = state.count <= MIN_PLAYERS;
  removeButton.addEventListener("click", () => removeEntry(index));

  row.append(number, input, removeButton);
  return row;
}

function changeCount(amount) {
  syncInputValues();
  state.count = Math.max(MIN_PLAYERS, state.count + amount);
  renderInputs();
}

function removeEntry(index) {
  if (state.count <= MIN_PLAYERS) return;

  syncInputValues();
  state.names.splice(index, 1);
  state.results.splice(index, 1);
  state.count -= 1;
  renderInputs();
}

function createBridges() {
  const rows = Math.max(18, state.count * 6);
  const bridges = [];

  for (let row = 0; row < rows; row += 1) {
    const candidates = [];
    for (let column = 0; column < state.count - 1; column += 1) {
      if (random() < 0.68) candidates.push(column);
    }

    const used = new Set();
    for (const column of shuffleItems(candidates)) {
      if (!used.has(column) && !used.has(column + 1)) {
        bridges.push({ row, column });
        used.add(column);
        used.add(column + 1);
      }
    }
  }

  return { rows, bridges };
}

function createMixedLadder() {
  const attempts = Math.max(60, state.count * 5);
  let bestLadder = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ladder = createBridges();
    const paths = buildPaths(ladder.rows, ladder.bridges);
    const samePositionCount = paths.filter((path) => path.start === path.end).length;
    const totalDistance = paths.reduce(
      (sum, path) => sum + Math.abs(path.start - path.end),
      0,
    );
    const score = totalDistance - samePositionCount * state.count * 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestLadder = { ...ladder, paths };
    }
  }

  return bestLadder;
}

function buildPaths(rows, bridges) {
  const paths = [];

  for (let start = 0; start < state.count; start += 1) {
    let column = start;
    const points = [{ column, row: -0.5 }];

    for (let row = 0; row < rows; row += 1) {
      points.push({ column, row });
      const right = bridges.some(
        (bridge) => bridge.row === row && bridge.column === column,
      );
      const left = bridges.some(
        (bridge) => bridge.row === row && bridge.column === column - 1,
      );

      if (right) column += 1;
      else if (left) column -= 1;

      if (right || left) points.push({ column, row });
    }

    points.push({ column, row: rows - 0.5 });
    paths.push({ start, end: column, points });
  }

  return paths;
}

function generateGame() {
  syncInputValues();
  state.names = state.names.map((name, index) => name.trim() || `참가자 ${index + 1}`);
  state.results = state.results.map(
    (result, index) => result.trim() || `결과 ${index + 1}`,
  );
  state.shuffledResults = shuffleItems(state.results);

  const ladder = createMixedLadder();
  state.bridges = ladder.bridges;
  state.rows = ladder.rows;
  state.paths = ladder.paths;
  state.completed.clear();
  state.running = false;

  renderGameLabels();
  elements.gamePanel.hidden = false;
  elements.summaryPanel.hidden = true;
  elements.summaryList.innerHTML = "";
  elements.announcement.textContent = "참가자 이름을 선택하면 경로를 따라갑니다.";

  requestAnimationFrame(() => {
    resizeCanvas();
    drawBoard();
    elements.gamePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderGameLabels() {
  elements.startButtons.innerHTML = "";
  elements.resultLabels.innerHTML = "";
  const boardMinWidth = `${getBoardMinWidth()}px`;

  elements.startButtons.style.minWidth = boardMinWidth;
  elements.resultLabels.style.minWidth = boardMinWidth;
  elements.canvas.style.minWidth = boardMinWidth;

  state.names.forEach((name, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-button";
    button.textContent = name;
    button.style.background = getPlayerColor(index);
    button.addEventListener("click", () => runPath(index));
    elements.startButtons.append(button);
  });

  state.shuffledResults.forEach((result, index) => {
    const label = document.createElement("div");
    label.className = "result-label";
    label.textContent = result;
    label.dataset.index = index;
    elements.resultLabels.append(label);
  });
}

function resizeCanvas() {
  const cssWidth = Math.max(elements.canvas.clientWidth, getBoardMinWidth());
  const cssHeight = 410;
  const ratio = window.devicePixelRatio || 1;
  elements.canvas.width = cssWidth * ratio;
  elements.canvas.height = cssHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getBoardMinWidth() {
  return Math.max(560, state.count * 112);
}

function getGeometry() {
  const width = elements.canvas.clientWidth;
  const height = elements.canvas.clientHeight;
  const sidePadding = 48;
  const top = 20;
  const bottom = height - 20;
  const columnGap = (width - sidePadding * 2) / (state.count - 1);
  const rowGap = (bottom - top) / state.rows;

  return {
    width,
    height,
    top,
    bottom,
    x: (column) => sidePadding + column * columnGap,
    y: (row) => top + (row + 0.5) * rowGap,
  };
}

function drawBoard(activePath = null, progress = 0) {
  const geometry = getGeometry();
  context.clearRect(0, 0, geometry.width, geometry.height);
  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = "#b8c1cc";
  context.lineWidth = 3;
  for (let column = 0; column < state.count; column += 1) {
    context.beginPath();
    context.moveTo(geometry.x(column), geometry.top);
    context.lineTo(geometry.x(column), geometry.bottom);
    context.stroke();
  }

  context.strokeStyle = "#6f7b89";
  context.lineWidth = 3;
  for (const bridge of state.bridges) {
    context.beginPath();
    context.moveTo(geometry.x(bridge.column), geometry.y(bridge.row));
    context.lineTo(geometry.x(bridge.column + 1), geometry.y(bridge.row));
    context.stroke();
  }

  for (const start of state.completed) {
    drawPath(state.paths[start], 1, getPlayerColor(start), 4, geometry);
  }

  if (activePath) {
    drawPath(activePath, progress, getPlayerColor(activePath.start), 6, geometry);
  }
}

function drawPath(path, progress, color, lineWidth, geometry) {
  const coordinates = path.points.map((point) => ({
    x: geometry.x(point.column),
    y:
      point.row < 0
        ? geometry.top
        : point.row >= state.rows - 0.5
          ? geometry.bottom
          : geometry.y(point.row),
  }));

  const segments = coordinates.slice(1).map((point, index) => {
    const previous = coordinates[index];
    return {
      from: previous,
      to: point,
      length: Math.hypot(point.x - previous.x, point.y - previous.y),
    };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = totalLength * progress;

  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(coordinates[0].x, coordinates[0].y);

  for (const segment of segments) {
    if (remaining <= 0) break;
    const portion = Math.min(1, remaining / segment.length);
    context.lineTo(
      segment.from.x + (segment.to.x - segment.from.x) * portion,
      segment.from.y + (segment.to.y - segment.from.y) * portion,
    );
    remaining -= segment.length;
  }
  context.stroke();
}

function runPath(start) {
  if (state.running || state.completed.has(start)) return;
  state.running = true;

  const buttons = [...elements.startButtons.children];
  buttons.forEach((button) => {
    button.disabled = true;
  });
  elements.announcement.textContent = `${state.names[start]} 출발!`;

  const path = state.paths[start];
  const duration = 1500;
  const startedAt = performance.now();

  function animate(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    drawBoard(path, eased);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    state.completed.add(start);
    state.running = false;
    buttons.forEach((button, index) => {
      button.disabled = state.completed.has(index);
      button.classList.toggle("done", state.completed.has(index));
    });
    elements.resultLabels.children[path.end].classList.add("revealed");
    elements.announcement.textContent =
      `${state.names[start]}의 결과는 “${state.shuffledResults[path.end]}”입니다.`;
    appendResult(start, path.end);
    drawBoard();
  }

  requestAnimationFrame(animate);
}

function appendResult(start, end) {
  const row = document.createElement("div");
  row.className = "summary-row";

  const name = document.createElement("span");
  name.textContent = state.names[start];
  const result = document.createElement("strong");
  result.textContent = state.shuffledResults[end];

  row.append(name, result);
  elements.summaryList.append(row);
  elements.summaryPanel.hidden = false;
}

function showAllResults() {
  if (state.running) return;

  state.completed = new Set(state.paths.map((path) => path.start));
  elements.summaryList.innerHTML = "";

  [...elements.startButtons.children].forEach((button) => {
    button.disabled = true;
    button.classList.add("done");
  });
  [...elements.resultLabels.children].forEach((label) => {
    label.classList.add("revealed");
  });

  state.paths.forEach((path) => appendResult(path.start, path.end));
  elements.announcement.textContent = "전체 결과를 공개했습니다.";
  drawBoard();
  elements.summaryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetGame() {
  state.completed.clear();
  state.running = false;
  elements.gamePanel.hidden = true;
  elements.summaryPanel.hidden = true;
  elements.summaryList.innerHTML = "";
  elements.announcement.textContent = "참가자 이름을 선택하면 경로를 따라갑니다.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

elements.decreaseButton.addEventListener("click", () => changeCount(-1));
elements.increaseButton.addEventListener("click", () => changeCount(1));
elements.generateButton.addEventListener("click", generateGame);
elements.shuffleButton.addEventListener("click", generateGame);
elements.showAllButton.addEventListener("click", showAllResults);
elements.resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  if (!elements.gamePanel.hidden) {
    resizeCanvas();
    drawBoard();
  }
});

renderInputs();
