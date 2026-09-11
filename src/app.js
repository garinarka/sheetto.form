const appState = {
  selectedFile: null,
  destinationMode: null,
  currentStep: 1,
  questions: [],
  workbookName: null,
};

const fileInput = document.querySelector("#question-file");
const fileName = document.querySelector("#file-name");
const fileSummary = document.querySelector("#file-summary");
const fileSummaryName = document.querySelector("#file-summary-name");
const fileSummaryCount = document.querySelector("#file-summary-count");
const fileError = document.querySelector("#file-error");

const continueButton = document.querySelector("#continue-button");
const statusMessage = document.querySelector("#status-message");
const destinationHelp = document.querySelector("#destination-help");

const destinationOptions = document.querySelectorAll(".destination-card");

const stepItems = document.querySelectorAll(".step-item");
const mobileStepLabel = document.querySelector("#mobile-step-label");

const destinationDescriptions = {
  create_new: `
    <strong class="font-semibold text-[var(--color-ink)]">
      Mode formulir baru dipilih.
    </strong>
    <br />
    Nanti kamu dapat mengatur judul formulir, deskripsi,
    dan pengaturan kuis sebelum formulir dibuat.
  `,

  add_existing: `
    <strong class="font-semibold text-[var(--color-ink)]">
      Mode formulir yang sudah ada dipilih.
    </strong>
    <br />
    Nanti kamu dapat menempelkan link Google Form tujuan.
    Soal lama tidak akan dihapus. Soal baru akan ditambahkan
    di bagian akhir formulir.
  `,
};

const stepNames = {
  1: "File soal",
  2: "Tujuan formulir",
  3: "Periksa",
};

function updateSteps() {
  stepItems.forEach((item) => {
    const step = Number(item.dataset.step);

    item.dataset.active = String(step === appState.currentStep);

    item.dataset.complete = String(step < appState.currentStep);
  });

  mobileStepLabel.textContent =
    `Langkah ${appState.currentStep} dari 3 · ` +
    stepNames[appState.currentStep];
}

function updateContinueButton() {
  const isReady =
    appState.selectedFile !== null &&
    appState.destinationMode !== null &&
    appState.questions.length > 0;

  continueButton.disabled = !isReady;

  if (!appState.selectedFile) {
    statusMessage.textContent = "Pilih file soal terlebih dahulu.";
    return;
  }

  if (appState.questions.length === 0) {
    statusMessage.textContent = "Belum ada soal yang berhasil dibaca.";
    return;
  }

  if (!appState.destinationMode) {
    statusMessage.textContent = "Pilih tujuan formulir untuk melanjutkan.";
    return;
  }

  statusMessage.textContent = "Semua sudah siap. Kamu bisa melanjutkan.";
}

function showFileError(message) {
  fileError.textContent = message;
  fileError.classList.remove("hidden");
  fileSummary.classList.add("hidden");
}

function clearFileMessages() {
  fileError.textContent = "";
  fileError.classList.add("hidden");
  fileSummary.classList.add("hidden");
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeHeader(header) {
  return normalizeValue(header)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]/g, " ");
}

function findColumn(row, possibleNames) {
  const rowKeys = Object.keys(row);

  for (const key of rowKeys) {
    const normalizedKey = normalizeHeader(key);

    if (possibleNames.includes(normalizedKey)) {
      return key;
    }
  }

  return null;
}

function convertRowsToQuestions(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const firstRow = rows[0];

  const questionColumn = findColumn(firstRow, [
    "question",
    "pertanyaan",
    "soal",
    "questions",
  ]);

  const optionAColumn = findColumn(firstRow, [
    "option 1",
    "option a",
    "opsi 1",
    "opsi a",
    "a",
  ]);

  const optionBColumn = findColumn(firstRow, [
    "option 2",
    "option b",
    "opsi 2",
    "opsi b",
    "b",
  ]);

  const optionCColumn = findColumn(firstRow, [
    "option 3",
    "option c",
    "opsi 3",
    "opsi c",
    "c",
  ]);

  const optionDColumn = findColumn(firstRow, [
    "option 4",
    "option d",
    "opsi 4",
    "opsi d",
    "d",
  ]);

  const answerColumn = findColumn(firstRow, [
    "answer",
    "correct answer",
    "jawaban",
    "kunci jawaban",
  ]);

  if (!questionColumn) {
    throw new Error(
      "Kolom pertanyaan tidak ditemukan. " +
        "Gunakan nama kolom Question, Pertanyaan, atau Soal.",
    );
  }

  return rows
    .map((row, index) => {
      const questionText = normalizeValue(row[questionColumn]);

      if (!questionText) {
        return null;
      }

      const options = [
        normalizeValue(optionAColumn ? row[optionAColumn] : ""),
        normalizeValue(optionBColumn ? row[optionBColumn] : ""),
        normalizeValue(optionCColumn ? row[optionCColumn] : ""),
        normalizeValue(optionDColumn ? row[optionDColumn] : ""),
      ].filter(Boolean);

      const answer = answerColumn ? normalizeValue(row[answerColumn]) : "";

      return {
        number: index + 1,
        question: questionText,
        options,
        answer,
        type: options.length > 0 ? "multiple_choice" : "paragraph",
      };
    })
    .filter(Boolean);
}

function getQuestionTypeSummary(questions) {
  const multipleChoiceCount = questions.filter(
    (question) => question.type === "multiple_choice",
  ).length;

  const paragraphCount = questions.filter(
    (question) => question.type === "paragraph",
  ).length;

  return {
    multipleChoiceCount,
    paragraphCount,
  };
}

function showFileSummary(file, questions) {
  const summary = getQuestionTypeSummary(questions);

  fileSummaryName.textContent = file.name;

  fileSummaryCount.textContent =
    `${questions.length} soal ditemukan · ` +
    `${summary.multipleChoiceCount} pilihan ganda · ` +
    `${summary.paragraphCount} uraian`;

  fileSummary.classList.remove("hidden");
}

async function readExcelFile(file) {
  clearFileMessages();

  if (!window.XLSX) {
    showFileError(
      "Library pembaca Excel belum berhasil dimuat. " +
        "Periksa koneksi internet lalu muat ulang halaman.",
    );

    return;
  }

  const validExtensions = [".xlsx", ".xls", ".csv"];

  const fileNameLower = file.name.toLowerCase();

  const isValidExtension = validExtensions.some((extension) =>
    fileNameLower.endsWith(extension),
  );

  if (!isValidExtension) {
    showFileError(
      "Format file belum didukung. " + "Gunakan file .xlsx, .xls, atau .csv.",
    );

    return;
  }

  try {
    statusMessage.textContent = "Sedang membaca file soal...";

    const arrayBuffer = await file.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
    });

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("File tidak memiliki sheet yang dapat dibaca.");
    }

    const firstSheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(firstSheet, {
      defval: "",
      raw: false,
    });

    const questions = convertRowsToQuestions(rows);

    if (questions.length === 0) {
      throw new Error(
        "Tidak ada soal yang berhasil ditemukan. " +
          "Pastikan sheet memiliki kolom Question atau Soal.",
      );
    }

    appState.selectedFile = file;
    appState.workbookName = firstSheetName;
    appState.questions = questions;

    showFileSummary(file, questions);
    updateContinueButton();

    console.log("Workbook:", workbook);
    console.log("Sheet:", firstSheetName);
    console.log("Questions:", questions);
  } catch (error) {
    console.error(error);

    appState.questions = [];

    showFileError(
      error.message || "File tidak dapat dibaca. Periksa format Excel kamu.",
    );

    updateContinueButton();
  }
}

function selectDestination(destination) {
  appState.destinationMode = destination;

  destinationOptions.forEach((option) => {
    const isSelected = option.dataset.destination === destination;

    option.setAttribute("aria-pressed", String(isSelected));
  });

  destinationHelp.innerHTML = destinationDescriptions[destination];

  destinationHelp.classList.remove("hidden");

  updateContinueButton();
}

fileInput.addEventListener("change", (event) => {
  const selectedFile = event.target.files[0];

  if (!selectedFile) {
    return;
  }

  fileName.textContent = `File dipilih: ${selectedFile.name}`;

  fileName.classList.remove("hidden");

  readExcelFile(selectedFile);
});

destinationOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectDestination(option.dataset.destination);
  });
});

continueButton.addEventListener("click", () => {
  if (
    !appState.selectedFile ||
    !appState.destinationMode ||
    appState.questions.length === 0
  ) {
    return;
  }

  appState.currentStep = 2;
  updateSteps();

  const destinationText =
    appState.destinationMode === "create_new"
      ? "membuat Google Form baru"
      : "menambahkan soal ke Google Form yang sudah ada";

  statusMessage.textContent = `Tahap berikutnya adalah ${destinationText}.`;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

updateSteps();
updateContinueButton();
