const appState = {
  selectedFile: null,
  destinationMode: null,
  currentStep: 1,
  questions: [],
  formSettings: {
    title: "",
    description: "",
    isQuiz: true,
    required: true,
    existingFormUrl: "",
  },
};

const fileInput = document.querySelector("#question-file");
const fileNameElement = document.querySelector("#file-name");
const fileSummary = document.querySelector("#file-summary");
const fileSummaryName = document.querySelector("#file-summary-name");
const fileSummaryCount = document.querySelector("#file-summary-count");
const fileError = document.querySelector("#file-error");
const continueButton = document.querySelector("#continue-button");
const statusMessage = document.querySelector("#status-message");
const destinationHelp = document.querySelector("#destination-help");
const mobileStepLabel = document.querySelector("#mobile-step-label");

const previewSection = document.querySelector("#preview-section");
const previewList = document.querySelector("#preview-list");
const previewCount = document.querySelector("#preview-count");

const stepItems = document.querySelectorAll(".step-item");
const destinationCards = document.querySelectorAll(".destination-card");

const formSettingsSection = document.querySelector("#form-settings-section");

const formTitleInput = document.querySelector("#form-title");
const formDescriptionInput = document.querySelector("#form-description");
const formIsQuizInput = document.querySelector("#form-is-quiz");
const formRequiredInput = document.querySelector("#form-required");
const existingFormSettings = document.querySelector("#existing-form-settings");
const existingFormUrlInput = document.querySelector("#existing-form-url");

function setStatus(message, type = "default") {
  if (!statusMessage) return;

  statusMessage.textContent = message;

  statusMessage.classList.remove(
    "text-stone-500",
    "text-emerald-700",
    "text-red-600",
  );

  if (type === "success") {
    statusMessage.classList.add("text-emerald-700");
  } else if (type === "error") {
    statusMessage.classList.add("text-red-600");
  } else {
    statusMessage.classList.add("text-stone-500");
  }
}

function showError(message) {
  if (!fileError) return;

  fileError.textContent = message;
  fileError.classList.remove("hidden");
}

function hideError() {
  if (!fileError) return;

  fileError.textContent = "";
  fileError.classList.add("hidden");
}

function updateSteps(stepNumber) {
  appState.currentStep = stepNumber;

  stepItems.forEach((item) => {
    const itemStep = Number(item.dataset.step);

    item.classList.remove(
      "border-stone-900",
      "bg-stone-900",
      "text-white",
      "border-stone-200",
      "bg-white",
      "text-stone-400",
    );

    if (itemStep === stepNumber) {
      item.classList.add("border-stone-900", "bg-stone-900", "text-white");
    } else if (itemStep < stepNumber) {
      item.classList.add("border-stone-200", "bg-white", "text-stone-900");
    } else {
      item.classList.add("border-stone-200", "bg-white", "text-stone-400");
    }
  });

  if (mobileStepLabel) {
    mobileStepLabel.textContent = `Langkah ${stepNumber} dari 3`;
  }
}

function updateDestination(mode) {
  appState.destinationMode = mode;

  destinationCards.forEach((card) => {
    const isSelected = card.dataset.destination === mode;

    card.classList.toggle("border-stone-900", isSelected);
    card.classList.toggle("bg-stone-50", isSelected);
    card.classList.toggle("border-stone-200", !isSelected);
  });

  if (destinationHelp) {
    if (mode === "new") {
      destinationHelp.textContent =
        "Aplikasi akan membantu membuat Google Form baru dari kumpulan soal.";
    } else if (mode === "existing") {
      destinationHelp.textContent =
        "Soal akan ditambahkan ke Google Form yang sudah ada tanpa menghapus soal lama.";
    } else {
      destinationHelp.textContent =
        "Pilih tujuan Google Form untuk melanjutkan.";
    }
  }

  updateFormSettingsVisibility();
  updateContinueButton();
}

function updateFormSettingsVisibility() {
  if (!formSettingsSection) return;

  const shouldShow = appState.questions.length > 0;

  formSettingsSection.classList.toggle("hidden", !shouldShow);

  if (existingFormSettings) {
    existingFormSettings.classList.toggle(
      "hidden",
      appState.destinationMode !== "existing",
    );
  }
}

function collectFormSettings() {
  appState.formSettings = {
    title: formTitleInput?.value.trim() || "",
    description: formDescriptionInput?.value.trim() || "",
    isQuiz: Boolean(formIsQuizInput?.checked),
    required: Boolean(formRequiredInput?.checked),
    existingFormUrl: existingFormUrlInput?.value.trim() || "",
  };

  return appState.formSettings;
}

function updateContinueButton() {
  if (!continueButton) return;

  const canContinue =
    appState.questions.length > 0 && Boolean(appState.destinationMode);

  continueButton.disabled = !canContinue;
  continueButton.classList.toggle("opacity-50", !canContinue);
  continueButton.classList.toggle("cursor-not-allowed", !canContinue);
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getValue(row, possibleHeaders) {
  const rowKeys = Object.keys(row);

  for (const header of possibleHeaders) {
    const normalizedTarget = normalizeHeader(header);

    const matchingKey = rowKeys.find(
      (key) => normalizeHeader(key) === normalizedTarget,
    );

    if (matchingKey) {
      return row[matchingKey];
    }
  }

  return "";
}

function cleanValue(value) {
  return String(value ?? "").trim();
}

function extractQuestions(rows) {
  return rows
    .map((row, index) => {
      const question = cleanValue(
        getValue(row, [
          "Question",
          "Pertanyaan",
          "Soal",
          "question",
          "pertanyaan",
          "soal",
        ]),
      );

      const options = [
        getValue(row, ["Option 1", "Pilihan 1", "A"]),
        getValue(row, ["Option 2", "Pilihan 2", "B"]),
        getValue(row, ["Option 3", "Pilihan 3", "C"]),
        getValue(row, ["Option 4", "Pilihan 4", "D"]),
      ]
        .map(cleanValue)
        .filter(Boolean);

      const answer = cleanValue(
        getValue(row, [
          "Answer",
          "Correct Answer",
          "Jawaban",
          "Kunci Jawaban",
          "answer",
          "correct answer",
          "jawaban",
          "kunci jawaban",
        ]),
      );

      if (!question) {
        return null;
      }

      return {
        number: index + 1,
        question,
        options,
        answer,
        type: options.length > 0 ? "multiple_choice" : "paragraph",
      };
    })
    .filter(Boolean);
}

function getQuestionTypeLabel(question) {
  if (question.type === "multiple_choice") {
    return "Pilihan ganda";
  }

  return "Uraian";
}

function renderPreview() {
  if (!previewSection || !previewList || !previewCount) {
    return;
  }

  previewList.innerHTML = "";
  previewCount.textContent = `${appState.questions.length} soal`;

  if (appState.questions.length === 0) {
    previewSection.classList.add("hidden");
    return;
  }

  previewSection.classList.remove("hidden");

  appState.questions.forEach((question) => {
    const card = document.createElement("article");

    card.className =
      "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

    const header = document.createElement("div");
    header.className = "mb-3 flex flex-wrap items-center justify-between gap-2";

    const number = document.createElement("span");
    number.className =
      "text-xs font-semibold uppercase tracking-widest text-stone-400";
    number.textContent = `Soal ${question.number}`;

    const type = document.createElement("span");
    type.className =
      "rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600";
    type.textContent = getQuestionTypeLabel(question);

    header.append(number, type);

    const questionText = document.createElement("p");
    questionText.className = "text-base font-medium leading-7 text-stone-900";
    questionText.textContent = question.question;

    card.append(header, questionText);

    if (question.options.length > 0) {
      const optionList = document.createElement("ol");

      optionList.className = "mt-4 grid gap-2 sm:grid-cols-2";

      question.options.forEach((option, optionIndex) => {
        const optionItem = document.createElement("li");

        optionItem.className =
          "rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700";

        const letter = String.fromCharCode(65 + optionIndex);

        optionItem.textContent = `${letter}. ${option}`;

        optionList.appendChild(optionItem);
      });

      card.appendChild(optionList);
    }

    if (question.answer) {
      const answer = document.createElement("p");

      answer.className =
        "mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500";

      answer.textContent = `Kunci jawaban: ${question.answer}`;

      card.appendChild(answer);
    }

    previewList.appendChild(card);
  });
}

function updateFileSummary(file, questions) {
  if (!fileSummary || !fileSummaryName || !fileSummaryCount) {
    return;
  }

  const multipleChoiceCount = questions.filter(
    (question) => question.type === "multiple_choice",
  ).length;

  const paragraphCount = questions.filter(
    (question) => question.type === "paragraph",
  ).length;

  fileSummaryName.textContent = file.name;

  fileSummaryCount.textContent =
    `${questions.length} soal ditemukan · ` +
    `${multipleChoiceCount} pilihan ganda · ` +
    `${paragraphCount} uraian`;

  fileSummary.classList.remove("hidden");
}

async function readQuestionFile(file) {
  if (!window.XLSX) {
    throw new Error(
      "Library pembaca Excel belum tersedia. Pastikan script SheetJS sudah ditambahkan.",
    );
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["xlsx", "xls", "csv"].includes(extension)) {
    throw new Error(
      "Format file belum didukung. Gunakan file .xlsx, .xls, atau .csv.",
    );
  }

  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Sheet masih kosong.");
  }

  const questions = extractQuestions(rows);

  if (questions.length === 0) {
    throw new Error(
      "Kolom soal tidak ditemukan. Gunakan header seperti Question, Soal, atau Pertanyaan.",
    );
  }

  return questions;
}

fileInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  appState.selectedFile = file;
  appState.questions = [];

  hideError();
  previewSection?.classList.add("hidden");

  if (fileNameElement) {
    fileNameElement.textContent = file.name;
  }

  setStatus("Sedang membaca file...", "default");

  try {
    const questions = await readQuestionFile(file);

    appState.questions = questions;

    updateFileSummary(file, questions);
    renderPreview();
    updateFormSettingsVisibility();
    updateContinueButton();

    setStatus(`${questions.length} soal berhasil dibaca.`, "success");
  } catch (error) {
    console.error(error);

    if (fileSummary) {
      fileSummary.classList.add("hidden");
    }

    showError(error.message || "File gagal dibaca.");
    setStatus("File belum berhasil dibaca.", "error");
    updateContinueButton();
  }
});

destinationCards.forEach((card) => {
  card.addEventListener("click", () => {
    const destination = card.dataset.destination;

    if (!destination) return;

    updateDestination(destination);
  });
});

continueButton?.addEventListener("click", () => {
  if (appState.questions.length === 0) {
    setStatus("Upload file soal terlebih dahulu.", "error");
    return;
  }

  if (!appState.destinationMode) {
    setStatus("Pilih tujuan Google Form terlebih dahulu.", "error");
    return;
  }

  const settings = collectFormSettings();

  if (!settings.title) {
    setStatus("Isi judul Google Form terlebih dahulu.", "error");
    formTitleInput?.focus();
    return;
  }

  if (appState.destinationMode === "existing" && !settings.existingFormUrl) {
    setStatus("Masukkan link Google Form yang sudah ada.", "error");
    existingFormUrlInput?.focus();
    return;
  }

  updateSteps(3);

  setStatus(
    "Pengaturan form berhasil disimpan. Integrasi Google Forms akan dibuat pada tahap berikutnya.",
    "success",
  );

  console.log("Final app state:", appState);
});

updateSteps(1);
updateContinueButton();

formTitleInput?.addEventListener("input", collectFormSettings);

formDescriptionInput?.addEventListener("input", collectFormSettings);

formIsQuizInput?.addEventListener("change", collectFormSettings);

formRequiredInput?.addEventListener("change", collectFormSettings);

existingFormUrlInput?.addEventListener("input", collectFormSettings);
