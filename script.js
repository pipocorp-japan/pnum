// カラーパレット(複数式用)
const colors = [
  "#0074D9",
  "#FF4136",
  "#2ECC40",
  "#FF851B",
  "#B10DC9",
  "#FFDC00",
  "#001f3f",
];
let isSaved = true;

function markUnsaved() {
  isSaved = false;
  document.getElementById("save-warning").classList.remove("hidden");
}

function markSaved() {
  isSaved = true;
  document.getElementById("save-warning").classList.add("hidden");
}

// 変更検知（テキストエリアなど）
document.getElementById("equations").addEventListener("input", function () {
  markUnsaved();
  autoSave();
});
document.getElementById("paramSlider").addEventListener("input", function () {
  markUnsaved();
  autoSave();
});

// ダークモード切替
function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

// スライダー値更新表示
function updateSliderValue(val) {
  document.getElementById("sliderValue").textContent = val;
}

// グラフ描画関数
function drawGraph() {
  const equationsText = document.getElementById("equations").value;
  const lines = equationsText.split("\n").filter((line) => line.trim() !== "");
  const sliderParam = Number(document.getElementById("paramSlider").value);

  let traces = [];
  let colorIndex = 0;

  lines.forEach((line) => {
    // 正規表現で "y = ..." を抽出
    const match = line.match(/y\s*=\s*(.+)/);
    if (!match) {
      alert(`数式の形式が不正です: ${line}`);
      return;
    }
    const expr = match[1];
    const xValues = [];
    const yValues = [];

    for (let x = -10; x <= 10; x += 0.1) {
      try {
        // 変数xとパラメータaをスコープに設定
        const scope = { x: x, a: sliderParam };
        let y = math.evaluate(expr, scope);
        // NaNやInfinityの場合はスキップ
        if (isNaN(y) || !isFinite(y)) {
          y = null;
        }
        xValues.push(x);
        yValues.push(y);
      } catch (err) {
        console.error(err);
        alert(`数式にエラーがあります: ${line}`);
        return;
      }
    }

    let trace = {
      x: xValues,
      y: yValues,
      type: "scatter",
      mode: "lines",
      line: { color: colors[colorIndex % colors.length] },
      name: line,
    };
    traces.push(trace);
    colorIndex++;
  });

  const layout = {
    title: "グラフ表示",
    xaxis: { title: "x" },
    yaxis: { title: "y" },
  };

  Plotly.newPlot("graph", traces, layout);
}

// 保存機能 (.pnumファイルとして保存)
function saveFile() {
  const data = {
    equations: document.getElementById("equations").value,
    slider: document.getElementById("paramSlider").value,
    darkMode: document.body.classList.contains("dark"),
  };
  const filename = prompt("ファイル名を入力");
  if (filename != null && filename != "") {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".pnum";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 保存処理...
    markSaved();
    clearAutoSave();
  }
}

// 読み込み機能
function loadFile() {
  document.getElementById("fileInput").click();
}

function handleFile(files) {
  if (files.length <= 0) return;
  const file = files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      document.getElementById("equations").value = data.equations || "";
      document.getElementById("paramSlider").value = data.slider || 1;
      updateSliderValue(document.getElementById("paramSlider").value);
      if (data.darkMode) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
      drawGraph();
    } catch (err) {
      alert("ファイル読み込み失敗:" + err);
    }
  };
  reader.readAsText(file);
}

// PNG出力
function exportPNG() {
  Plotly.toImage("graph", { format: "png", height: 500, width: 800 })
    .then(function (dataUrl) {
      const a = document.createElement("a");
      const filename = prompt("ファイル名を入力") + ".png";
      if (filename != null && filename != "") {
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    })
    .catch(function (err) {
      alert("PNG出力エラー:", err);
    });
}

// PDF出力
function exportPDF() {
  Plotly.toImage("graph", { format: "png", height: 500, width: 800 })
    .then(function (dataUrl) {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [800, 500],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, 800, 500);
      const filename = prompt("ファイル名を入力") + ".pdf";
      if (filename != null && filename != "") {
        pdf.save(filename);
      }
    })
    .catch(function (err) {
      alert("PDF出力エラー:", err);
    });
}

const STORAGE_KEY = "pnum-autosave";

function autoSave() {
  const input = document.getElementById("equations").value;
  const slider = document.getElementById("paramSlider").value;
  const data = {
    formula: input,
    slider: slider,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  markUnsaved(); // バナーも出す
}

function autoLoad() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    document.getElementById("equations").value = data.formula || "";
    document.getElementById("paramSlider").value = data.slider || 1;
    updateSliderValue(data.slider);
    markUnsaved(); // 復元したら未保存表示にしておく
  }
}

function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
  markSaved(); // 保存完了バナー出すとか
}
window.addEventListener("beforeunload", (e) => {
  autoSave(); // 念のため最後にもう一回保存
});
window.onload = function () {
  autoLoad();
};
