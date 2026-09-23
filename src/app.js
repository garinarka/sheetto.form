const appState = {
  selectedFile: null,
  destinationMode: null,
  questions: [],
  pendingWorkbook: null,
  google: {
    accessToken: null,
    connected: false,
  },
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
const sheetPicker = document.querySelector("#sheet-picker");
const sheetPickerSelect = document.querySelector("#sheet-picker-select");
const fileError = document.querySelector("#file-error");
const continueButton = document.querySelector("#continue-button");
const statusMessage = document.querySelector("#status-message");
const destinationHelp = document.querySelector("#destination-help");
const mobileStepLabel = document.querySelector("#mobile-step-label");
const wizardSidebar = document.getElementById("wizard-sidebar");
const wizardSidebarToggle = document.getElementById("wizard-sidebar-toggle");
const wizardSidebarToggleIcon = document.getElementById(
  "wizard-sidebar-toggle-icon",
);
const sidebarCollapseToggle = document.getElementById(
  "sidebar-collapse-toggle",
);
const mainContent = document.getElementById("main-content");
const SIDEBAR_COLLAPSE_STORAGE_KEY = "sheet2form:sidebar-collapsed";

const previewSection = document.querySelector("#preview-section");
const previewList = document.querySelector("#preview-list");
const previewCount = document.querySelector("#preview-count");
const previewBreakdown = document.querySelector("#preview-breakdown");

const stepItems = document.querySelectorAll(".step-item");
const destinationCards = document.querySelectorAll(".destination-card");

const formSettingsSection = document.querySelector("#form-settings-section");

const formTitleInput = document.querySelector("#form-title");
const formDescriptionInput = document.querySelector("#form-description");
const formIsQuizInput = document.querySelector("#form-is-quiz");
const formRequiredInput = document.querySelector("#form-required");
const existingFormSettings = document.querySelector("#existing-form-settings");
const existingFormUrlInput = document.querySelector("#existing-form-url");

const googleConnectButton = document.querySelector("#google-connect-button");

const googleConnectionStatus = document.querySelector(
  "#google-connection-status",
);

const googleConnectionDetail = document.querySelector(
  "#google-connection-detail",
);

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
  fileError.style.whiteSpace = "pre-line";
}

function hideError() {
  if (!fileError) return;

  fileError.textContent = "";
  fileError.classList.add("hidden");
}

function updateDestination(mode) {
  appState.destinationMode = mode;

  destinationCards.forEach((card) => {
    const isSelected = card.dataset.destination === mode;

    card.classList.toggle("border-stone-900", isSelected);
    card.classList.toggle("bg-stone-50", isSelected);
    card.classList.toggle("border-stone-200", !isSelected);

    card.setAttribute("aria-pressed", String(isSelected));
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
  updateCreateFormCopy();
  updateWizardButtons();
  saveWizardProgress();
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

  saveWizardProgress();

  return appState.formSettings;
}

const WIZARD_PROGRESS_STORAGE_KEY = "sheet2form:wizard-progress";

function saveWizardProgress() {
  try {
    const payload = {
      fileName: appState.selectedFile?.name || appState.restoredFileName || "",
      questions: appState.questions,
      destinationMode: appState.destinationMode,
      formSettings: appState.formSettings,
      currentStep: wizardState.currentStep,
    };

    window.sessionStorage.setItem(
      WIZARD_PROGRESS_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn("Tidak dapat menyimpan progres wizard.", error);
  }
}

function clearWizardProgress() {
  try {
    window.sessionStorage.removeItem(WIZARD_PROGRESS_STORAGE_KEY);
  } catch (error) {
    console.warn("Tidak dapat menghapus progres wizard.", error);
  }
}

function restoreWizardProgress() {
  let stored;

  try {
    const raw = window.sessionStorage.getItem(WIZARD_PROGRESS_STORAGE_KEY);
    if (!raw) return false;
    stored = JSON.parse(raw);
  } catch (error) {
    console.warn("Tidak dapat membaca progres wizard.", error);
    return false;
  }

  if (
    !stored ||
    !Array.isArray(stored.questions) ||
    stored.questions.length === 0
  ) {
    return false;
  }

  appState.questions = stored.questions;
  appState.restoredFileName = stored.fileName || "";

  updateFileSummary(
    { name: stored.fileName || "File sebelumnya" },
    appState.questions,
  );
  renderPreview();
  updateFormSettingsVisibility();

  if (stored.formSettings) {
    appState.formSettings = {
      ...appState.formSettings,
      ...stored.formSettings,
    };

    if (formTitleInput) {
      formTitleInput.value = appState.formSettings.title || "";
    }
    if (formDescriptionInput) {
      formDescriptionInput.value = appState.formSettings.description || "";
    }
    if (formIsQuizInput) {
      formIsQuizInput.checked = Boolean(appState.formSettings.isQuiz);
    }
    if (formRequiredInput) {
      formRequiredInput.checked = Boolean(appState.formSettings.required);
    }
    if (existingFormUrlInput) {
      existingFormUrlInput.value = appState.formSettings.existingFormUrl || "";
    }
  }

  if (stored.destinationMode) {
    updateDestination(stored.destinationMode);
  }

  const restoredStep = Math.min(
    Math.max(Number(stored.currentStep) || 1, 1),
    4,
  );
  showStep(restoredStep, { moveFocus: false });

  setStatus("Progres sebelumnya berhasil dipulihkan.", "success");

  return true;
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

function validateQuestions(questions) {
  const errors = [];

  questions.forEach((question) => {
    const rowNumber = question.number;
    const hasAnyContent =
      question.question || question.options.length > 0 || question.answer;

    if (!hasAnyContent) {
      errors.push({ rowNumber, message: "Baris Excel kosong." });
      return;
    }

    if (!question.question.trim()) {
      errors.push({
        rowNumber,
        message: "Kolom Question/Pertanyaan kosong.",
      });
      return;
    }

    if (question.hasOptionGap) {
      errors.push({
        rowNumber,
        message:
          "Pilihan tidak boleh bolong. Isi pilihan secara berurutan dari Option 1.",
      });
    }

    if (question.type === "multiple_choice" || question.type === "checkbox") {
      if (question.options.length < 2) {
        errors.push({
          rowNumber,
          message: "Pilihan ganda harus memiliki minimal 2 opsi.",
        });
      }

      if (appState.formSettings.isQuiz && question.answers.length === 0) {
        errors.push({
          rowNumber,
          message: "Jawaban wajib diisi saat mode quiz aktif.",
        });
      }

      question.answers.forEach((answerValue) => {
        const answerExists = question.options.some(
          (option) =>
            option.toLowerCase().trim() === answerValue.toLowerCase().trim(),
        );

        if (!answerExists) {
          errors.push({
            rowNumber,
            message: `Jawaban "${answerValue}" tidak cocok dengan pilihan.`,
          });
        }
      });
    }
  });

  return errors;
}

function extractQuestions(rows) {
  return rows.map((row, index) => {
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
    ].map(cleanValue);

    const filledOptions = options.filter(Boolean);

    const firstEmptyOptionIndex = options.findIndex((option) => !option);

    const hasOptionAfterEmpty =
      firstEmptyOptionIndex !== -1 &&
      options.slice(firstEmptyOptionIndex + 1).some(Boolean);

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

    const rawType = cleanValue(
      getValue(row, [
        "Type",
        "Tipe",
        "Jenis Soal",
        "type",
        "tipe",
        "jenis soal",
      ]),
    ).toLowerCase();

    const isCheckboxType = [
      "checkbox",
      "kotak centang",
      "multi",
      "multiple",
      "pilihan ganda (multi)",
    ].includes(rawType);

    let type;
    if (filledOptions.length === 0) {
      type = "paragraph";
    } else if (isCheckboxType) {
      type = "checkbox";
    } else {
      type = "multiple_choice";
    }

    const answers =
      type === "checkbox"
        ? answer
            .split(/[,;]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : answer
          ? [answer]
          : [];

    return {
      number: index + 2,
      question,
      options: filledOptions,
      answer,
      answers,
      type,
      hasOptionGap: hasOptionAfterEmpty,
    };
  });
}

function getQuestionTypeLabel(question) {
  if (question.type === "checkbox") {
    return "Kotak centang (multi-jawaban)";
  }

  if (question.type === "multiple_choice") {
    return "Pilihan ganda";
  }

  return "Uraian";
}

function renderPreview(questionErrors = new Map()) {
  if (!previewSection || !previewList || !previewCount) {
    return;
  }

  previewList.innerHTML = "";
  previewCount.textContent = `${appState.questions.length} soal`;

  if (previewBreakdown) {
    previewBreakdown.textContent = getQuestionTypeBreakdown(
      appState.questions,
    ).text;
  }

  if (appState.questions.length === 0) {
    previewSection.classList.add("hidden");
    return;
  }

  previewSection.classList.remove("hidden");

  appState.questions.forEach((question) => {
    const cardErrors = questionErrors.get(question.number) || [];
    const hasError = cardErrors.length > 0;

    const card = document.createElement("article");

    card.className = hasError
      ? "rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm"
      : "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

    const header = document.createElement("div");
    header.className = "mb-3 flex flex-wrap items-center justify-between gap-2";

    const number = document.createElement("span");
    number.className = hasError
      ? "text-xs font-semibold uppercase tracking-widest text-red-500"
      : "text-xs font-semibold uppercase tracking-widest text-stone-400";
    number.textContent = `Soal ${question.number}`;

    const headerRight = document.createElement("div");
    headerRight.className = "flex items-center gap-2";

    const type = document.createElement("span");
    type.className =
      "rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600";
    type.textContent = getQuestionTypeLabel(question);

    headerRight.appendChild(type);

    if (hasError) {
      const badge = document.createElement("span");
      badge.className =
        "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700";
      badge.textContent = "Perlu diperbaiki";
      headerRight.appendChild(badge);
    }

    header.append(number, headerRight);

    const questionText = document.createElement("p");
    questionText.className = "text-base font-medium leading-7 text-stone-900";
    questionText.textContent = question.question || "(Pertanyaan kosong)";

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

    if (hasError) {
      const errorBox = document.createElement("div");
      errorBox.className =
        "mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm leading-6 text-red-700";

      const errorList = document.createElement("ul");
      errorList.className = "list-disc space-y-1 pl-4";

      cardErrors.forEach((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        errorList.appendChild(item);
      });

      errorBox.appendChild(errorList);
      card.appendChild(errorBox);
    }

    previewList.appendChild(card);
  });
}

function getQuestionTypeBreakdown(questions) {
  const multipleChoiceCount = questions.filter(
    (question) => question.type === "multiple_choice",
  ).length;

  const checkboxCount = questions.filter(
    (question) => question.type === "checkbox",
  ).length;

  const paragraphCount = questions.filter(
    (question) => question.type === "paragraph",
  ).length;

  const parts = [];
  if (multipleChoiceCount > 0) {
    parts.push(`${multipleChoiceCount} pilihan ganda`);
  }
  if (checkboxCount > 0) {
    parts.push(`${checkboxCount} kotak centang`);
  }
  if (paragraphCount > 0) {
    parts.push(`${paragraphCount} uraian`);
  }

  return {
    multipleChoiceCount,
    checkboxCount,
    paragraphCount,
    text: parts.join(" · "),
  };
}

function updateFileSummary(file, questions) {
  if (!fileSummary || !fileSummaryName || !fileSummaryCount) {
    return;
  }

  const breakdown = getQuestionTypeBreakdown(questions);

  fileSummaryName.textContent = file.name;

  fileSummaryCount.textContent =
    `${questions.length} soal ditemukan · ` + breakdown.text;

  fileSummary.classList.remove("hidden");
}

function updateGoogleConnectionUI() {
  if (
    !googleConnectButton ||
    !googleConnectionStatus ||
    !googleConnectionDetail
  ) {
    return;
  }

  if (appState.google.connected) {
    googleConnectionStatus.textContent = "Sudah terhubung ke akun Google.";

    googleConnectionStatus.className = "mt-1 text-sm text-emerald-700";

    googleConnectButton.textContent = "Google Terhubung";
    googleConnectButton.disabled = true;

    googleConnectionDetail.textContent =
      "Access token berhasil diterima. Tahap berikutnya akan menggunakan token ini untuk Google Forms API.";

    googleConnectionDetail.classList.remove("hidden");
  } else {
    googleConnectionStatus.textContent = "Belum terhubung ke Google.";

    googleConnectionStatus.className = "mt-1 text-sm text-stone-500";

    googleConnectButton.textContent = "Hubungkan Google";
    googleConnectButton.disabled = false;

    googleConnectionDetail.textContent = "";
    googleConnectionDetail.classList.add("hidden");
  }
}

const GOOGLE_PREVIOUSLY_CONNECTED_KEY =
  "sheet2form:google-previously-connected";

function attemptSilentGoogleReconnect(retriesLeft = 10) {
  let wasPreviouslyConnected = false;
  try {
    wasPreviouslyConnected =
      window.localStorage.getItem(GOOGLE_PREVIOUSLY_CONNECTED_KEY) === "true";
  } catch (error) {
    wasPreviouslyConnected = false;
  }

  if (!wasPreviouslyConnected) {
    // Belum pernah connect di browser ini — GIS tidak akan bisa silent
    // (tidak ada sesi/consent buat dipulihkan), dan requestAccessToken
    // tetap akan mencoba buka popup lalu diblokir browser. Lebih baik
    // tidak dicoba sama sekali daripada memicu warning popup-blocked.
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    if (retriesLeft > 0) {
      window.setTimeout(
        () => attemptSilentGoogleReconnect(retriesLeft - 1),
        300,
      );
    }

    return;
  }

  if (
    !window.GOOGLE_CONFIG?.clientId ||
    window.GOOGLE_CONFIG.clientId.includes("GANTI_DENGAN")
  ) {
    return;
  }

  const silentTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: window.GOOGLE_CONFIG.clientId,

    scope: "https://www.googleapis.com/auth/forms.body",

    callback: (tokenResponse) => {
      if (tokenResponse.error || !tokenResponse.access_token) {
        // Percobaan diam-diam gagal (belum ada sesi Google aktif, atau
        // belum pernah consent) — tetap di status "belum terhubung",
        // tanpa mengganggu user dengan pesan error.
        return;
      }

      appState.google.accessToken = tokenResponse.access_token;
      appState.google.connected = true;

      updateGoogleConnectionUI();
      updateWizardButtons();

      console.log("Google OAuth dipulihkan otomatis (silent).");
    },
  });

  silentTokenClient.requestAccessToken({ prompt: "" });
}

function connectToGoogle() {
  if (!window.google?.accounts?.oauth2) {
    setStatus(
      "Google Identity Services belum siap. Tunggu sebentar lalu coba lagi.",
      "error",
    );

    return;
  }

  if (
    !window.GOOGLE_CONFIG?.clientId ||
    window.GOOGLE_CONFIG.clientId.includes("GANTI_DENGAN")
  ) {
    setStatus("Client ID Google belum dikonfigurasi dengan benar.", "error");

    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: window.GOOGLE_CONFIG.clientId,

    scope: "https://www.googleapis.com/auth/forms.body",

    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        console.error("Google OAuth error:", tokenResponse);

        setStatus("Koneksi Google gagal atau izin ditolak.", "error");

        return;
      }

      if (!tokenResponse.access_token) {
        setStatus("Google tidak mengembalikan access token.", "error");

        return;
      }

      appState.google.accessToken = tokenResponse.access_token;

      appState.google.connected = true;

      try {
        window.localStorage.setItem(GOOGLE_PREVIOUSLY_CONNECTED_KEY, "true");
      } catch (error) {
        console.warn("Tidak dapat menyimpan status koneksi Google.", error);
      }

      updateGoogleConnectionUI();
      updateWizardButtons();

      setStatus("Berhasil terhubung ke Google.", "success");

      console.log("Google OAuth berhasil.");
    },
  });

  tokenClient.requestAccessToken({
    prompt: "consent",
  });
}

async function parseWorkbookFromFile(file) {
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

  if (!workbook.SheetNames.length) {
    throw new Error("File tidak memiliki sheet yang bisa dibaca.");
  }

  return workbook;
}

function loadQuestionsFromSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    blankrows: true,
  });

  if (rows.length === 0) {
    throw new Error(`Sheet "${sheetName}" masih kosong.`);
  }

  const questions = extractQuestions(rows);

  if (questions.length === 0) {
    throw new Error(
      "Kolom soal tidak ditemukan. Gunakan header seperti Question, Soal, atau Pertanyaan.",
    );
  }

  return questions;
}

function hideSheetPicker() {
  sheetPicker?.classList.add("hidden");
  if (sheetPickerSelect) sheetPickerSelect.innerHTML = "";
}

function showSheetPicker(sheetNames) {
  if (!sheetPicker || !sheetPickerSelect) return;

  sheetPickerSelect.innerHTML = "";

  sheetNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sheetPickerSelect.appendChild(option);
  });

  sheetPicker.classList.remove("hidden");
}

async function finalizeSheetSelection(file, workbook, sheetName) {
  try {
    const questions = loadQuestionsFromSheet(workbook, sheetName);
    const validationErrors = validateQuestions(questions);

    appState.questions = questions;

    if (validationErrors.length > 0) {
      const errorsByRow = new Map();

      validationErrors.forEach((error) => {
        const messages = errorsByRow.get(error.rowNumber) || [];
        messages.push(error.message);
        errorsByRow.set(error.rowNumber, messages);
      });

      updateFileSummary(file, questions);
      renderPreview(errorsByRow);
      updateFormSettingsVisibility();

      showError(
        `${errorsByRow.size} dari ${questions.length} soal memiliki masalah. ` +
          "Perbaiki file Excel-nya, lalu upload ulang — detail ada di bawah tiap soal yang ditandai merah.",
      );
      setStatus("File terbaca, tetapi ada kesalahan pada data.", "error");
      updateWizardButtons();
      return;
    }

    updateFileSummary(file, questions);
    renderPreview();
    updateFormSettingsVisibility();
    updateWizardButtons();
    saveWizardProgress();

    setStatus(`${questions.length} soal berhasil dibaca.`, "success");
  } catch (error) {
    console.error(error);
    appState.questions = [];

    if (fileSummary) {
      fileSummary.classList.add("hidden");
    }

    showError(error.message || "File gagal dibaca.");
    setStatus("File belum berhasil dibaca.", "error");
    updateWizardButtons();
  }
}

fileInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  appState.selectedFile = file;
  appState.questions = [];

  hideError();
  hideSheetPicker();
  previewSection?.classList.add("hidden");

  if (fileNameElement) {
    fileNameElement.textContent = file.name;
    fileNameElement.classList.remove("hidden");
  }

  setStatus("Sedang membaca file...", "default");

  try {
    const workbook = await parseWorkbookFromFile(file);

    if (workbook.SheetNames.length > 1) {
      appState.pendingWorkbook = workbook;
      showSheetPicker(workbook.SheetNames);
      setStatus(
        "File punya beberapa sheet — pilih salah satu untuk dibaca.",
        "default",
      );
      return;
    }

    await finalizeSheetSelection(file, workbook, workbook.SheetNames[0]);
  } catch (error) {
    console.error(error);
    appState.selectedFile = null;
    appState.questions = [];

    if (fileSummary) {
      fileSummary.classList.add("hidden");
    }

    showError(error.message || "File gagal dibaca.");
    setStatus("File belum berhasil dibaca.", "error");
    updateWizardButtons();
  }
});

sheetPickerSelect?.addEventListener("change", async () => {
  if (!appState.selectedFile || !appState.pendingWorkbook) return;

  await finalizeSheetSelection(
    appState.selectedFile,
    appState.pendingWorkbook,
    sheetPickerSelect.value,
  );
});

destinationCards.forEach((card) => {
  card.addEventListener("click", () => {
    const destination = card.dataset.destination;

    if (!destination) return;

    updateDestination(destination);
  });
});

async function googleFormsRequest(url, options = {}) {
  if (!appState.google.accessToken) {
    throw new Error("Hubungkan akun Google terlebih dahulu.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${appState.google.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Google Forms API gagal (${response.status}).`,
    );
  }

  return data;
}

function extractFormId(value) {
  const input = String(value || "").trim();

  const match = input.match(
    /^https:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)(?:\/.*)?$/,
  );

  return match ? match[1] : null;
}

function buildBatchRequests() {
  const requests = [];
  const settings = appState.formSettings;

  if (settings.description) {
    requests.push({
      updateFormInfo: {
        info: { description: settings.description },
        updateMask: "description",
      },
    });
  }

  requests.push({
    updateSettings: {
      settings: { quizSettings: { isQuiz: Boolean(settings.isQuiz) } },
      updateMask: "quizSettings.isQuiz",
    },
  });

  appState.questions.forEach((question, index) => {
    const item = {
      title: question.question,
      questionItem: {
        question: {
          required: Boolean(settings.required),
        },
      },
    };

    if (question.type === "multiple_choice" || question.type === "checkbox") {
      item.questionItem.question.choiceQuestion = {
        type: question.type === "checkbox" ? "CHECKBOX" : "RADIO",
        options: question.options.map((value) => ({ value })),
      };

      if (settings.isQuiz && question.answers.length > 0) {
        const matchedOptions = question.options.filter((option) =>
          question.answers.some(
            (answerValue) =>
              option.toLowerCase().trim() === answerValue.toLowerCase().trim(),
          ),
        );

        if (matchedOptions.length > 0) {
          item.questionItem.question.grading = {
            pointValue: 1,
            correctAnswers: {
              answers: matchedOptions.map((value) => ({ value })),
            },
          };
        }
      }
    } else {
      item.questionItem.question.textQuestion = { paragraph: true };
    }

    requests.push({ createItem: { item, location: { index } } });
  });

  return requests;
}

function setProcessProgress(step, total, label) {
  const container = document.getElementById("process-progress");
  const labelElement = document.getElementById("process-progress-label");
  const percentElement = document.getElementById("process-progress-percent");
  const barElement = document.getElementById("process-progress-bar");

  if (!container) return;

  container.classList.remove("hidden");

  const percent = Math.round((step / total) * 100);

  if (labelElement) labelElement.textContent = label;
  if (percentElement) percentElement.textContent = `${percent}%`;
  if (barElement) barElement.style.width = `${percent}%`;
}

function hideProcessProgress() {
  document.getElementById("process-progress")?.classList.add("hidden");
}

async function createGoogleForm(onProgress) {
  onProgress?.(1, 4, "Mempersiapkan data...");

  const settings = collectFormSettings();
  if (!appState.google.connected)
    throw new Error("Hubungkan akun Google terlebih dahulu.");
  if (!settings.title) throw new Error("Judul Google Form belum diisi.");

  onProgress?.(2, 4, "Membuat Google Form...");

  const created = await googleFormsRequest(
    "https://forms.googleapis.com/v1/forms",
    {
      method: "POST",
      body: JSON.stringify({
        info: { title: settings.title, documentTitle: settings.title },
      }),
    },
  );

  onProgress?.(3, 4, "Menambahkan soal...");

  await googleFormsRequest(
    `https://forms.googleapis.com/v1/forms/${created.formId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests: buildBatchRequests() }),
    },
  );

  onProgress?.(4, 4, "Menyelesaikan proses...");

  return {
    formId: created.formId,
    title: settings.title,
    url: `https://docs.google.com/forms/d/${created.formId}/edit`,
  };
}

async function appendToExistingGoogleForm(onProgress) {
  onProgress?.(1, 4, "Mempersiapkan data...");

  const settings = collectFormSettings();
  const formId = extractFormId(settings.existingFormUrl);
  if (!formId) throw new Error("Link Google Form belum valid.");

  onProgress?.(2, 4, "Membuka Google Form yang dipilih...");

  const requests = buildBatchRequests().filter(
    (request) => !request.updateFormInfo && !request.updateSettings,
  );

  onProgress?.(3, 4, "Menambahkan soal...");

  await googleFormsRequest(
    `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests }),
    },
  );

  onProgress?.(4, 4, "Menyelesaikan proses...");

  return {
    formId,
    title: settings.title || "Google Form",
    url: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}

function getDestinationCopy() {
  if (appState.destinationMode === "existing") {
    return {
      title: "Tambahkan soal ke Google Form",
      description:
        "Klik tombol ini untuk menambahkan soal ke Google Form yang sudah ada. Soal lama tidak akan dihapus.",
      buttonLabel: "Tambahkan soal sekarang",
    };
  }

  return {
    title: "Buat Google Form",
    description:
      "Setelah terhubung ke Google, klik tombol ini untuk membuat Form baru dan memasukkan soal.",
    buttonLabel: "Buat Google Form sekarang",
  };
}

function updateCreateFormCopy() {
  const copy = getDestinationCopy();

  const createFormTitle = document.querySelector("#process-form-title");
  if (createFormTitle) createFormTitle.textContent = copy.title;

  const createFormDescription = document.querySelector(
    "#create-form-description",
  );
  if (createFormDescription)
    createFormDescription.textContent = copy.description;

  const button = document.querySelector("#create-google-form-button");
  if (button && !button.disabled) button.textContent = copy.buttonLabel;
}

function showCreatedFormResult(result) {
  const section = document.querySelector("#create-form-section");
  const resultBox = document.querySelector("#created-form-result");
  const title = document.querySelector("#created-form-title");
  const link = document.querySelector("#created-form-link");

  section?.classList.remove("hidden");
  resultBox?.classList.remove("hidden");
  if (title) title.textContent = `${result.title} berhasil diproses`;
  if (link) {
    link.href = result.url;
    link.textContent = result.url;
  }
}

async function processGoogleForm() {
  if (!isGoogleConnected()) {
    setStatus(
      "Hubungkan akun Google dulu lewat sidebar sebelum memproses form.",
      "error",
    );
    return;
  }

  const button = document.querySelector("#create-google-form-button");
  if (button) {
    button.disabled = true;
    button.textContent = "Sedang memproses...";
  }

  updateCreateFormCopy();

  try {
    const result =
      appState.destinationMode === "new"
        ? await createGoogleForm(setProcessProgress)
        : await appendToExistingGoogleForm(setProcessProgress);

    showCreatedFormResult(result);
    setStatus("Google Form berhasil diproses.", "success");
    clearWizardProgress();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Google Form gagal diproses.", "error");
  } finally {
    if (button) {
      button.disabled = false;
    }
    updateCreateFormCopy();
    hideProcessProgress();
  }
}

function downloadExcelTemplate() {
  if (!window.XLSX) {
    setStatus("Library Excel belum siap. Coba refresh halaman.", "error");
    return;
  }

  const rows = [
    {
      Question: "Ibukota Indonesia adalah ...",
      "Option 1": "Jakarta",
      "Option 2": "Bandung",
      "Option 3": "Surabaya",
      "Option 4": "Yogyakarta",
      Answer: "Jakarta",
    },
    {
      Question: "Jelaskan pengertian seni tari.",
      "Option 1": "",
      "Option 2": "",
      "Option 3": "",
      "Option 4": "",
      Answer: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Soal");

  XLSX.writeFile(workbook, "template-soal-google-form.xlsx");

  setStatus("Template Excel berhasil dibuat.", "success");
}

document
  .querySelector("#template-button")
  ?.addEventListener("click", downloadExcelTemplate);

formTitleInput?.addEventListener("input", collectFormSettings);
formDescriptionInput?.addEventListener("input", collectFormSettings);
formIsQuizInput?.addEventListener("change", collectFormSettings);
formRequiredInput?.addEventListener("change", collectFormSettings);
existingFormUrlInput?.addEventListener("input", collectFormSettings);
googleConnectButton?.addEventListener("click", connectToGoogle);
document
  .querySelector("#create-google-form-button")
  ?.addEventListener("click", processGoogleForm);

updateGoogleConnectionUI();

// Guide modal
const guideModal = document.getElementById("guide-modal");
const guideOpenButton = document.getElementById("guide-open-button");
const guideCloseButton = document.getElementById("guide-close-button");
const guideDoneButton = document.getElementById("guide-done-button");
const guideModalBackdrop = document.getElementById("guide-modal-backdrop");

let lastFocusedElement = null;

function openGuideModal() {
  if (!guideModal) return;

  lastFocusedElement = document.activeElement;

  guideModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  guideCloseButton?.focus();
}

function closeGuideModal() {
  if (!guideModal) return;

  guideModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

guideOpenButton?.addEventListener("click", openGuideModal);
guideCloseButton?.addEventListener("click", closeGuideModal);
guideDoneButton?.addEventListener("click", closeGuideModal);
guideModalBackdrop?.addEventListener("click", closeGuideModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !guideModal?.classList.contains("hidden")) {
    closeGuideModal();
  }
});

const wizardState = {
  currentStep: 1,
};

const stepPanels = Array.from(document.querySelectorAll("[data-step-panel]"));

const backButton = document.getElementById("back-button");

const questionFileInput = document.getElementById("question-file");

const destinationButtons = Array.from(
  document.querySelectorAll("[data-destination]"),
);

const stepNames = {
  1: "Upload File",
  2: "Preview Soal",
  3: "Pengaturan Google Form",
  4: "Proses Google Form",
};

function isGoogleConnected() {
  return appState.google.connected === true;
}

function hasSelectedFile() {
  return Boolean(
    questionFileInput &&
    questionFileInput.files &&
    questionFileInput.files.length > 0,
  );
}

function hasValidFile() {
  if (!hasSelectedFile()) return false;
  if (fileError && !fileError.classList.contains("hidden")) return false;
  return appState.questions.length > 0;
}

function getSelectedDestination() {
  const selectedButton = destinationButtons.find(
    (button) => button.getAttribute("aria-pressed") === "true",
  );

  return selectedButton?.dataset.destination || "";
}

function isValidExistingFormUrl() {
  const value = existingFormUrlInput?.value.trim() || "";

  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.hostname === "docs.google.com" && url.pathname.includes("/forms/")
    );
  } catch {
    return false;
  }
}

function hasValidStep1() {
  return hasValidFile();
}

function hasValidStep2() {
  const hasPreviewItems = previewList && previewList.children.length > 0;

  const hasVisibleFileError =
    fileError && !fileError.classList.contains("hidden");

  return Boolean(hasPreviewItems && !hasVisibleFileError);
}

function hasValidStep3() {
  const destination = getSelectedDestination();

  if (!destination) {
    return false;
  }

  if (destination === "existing") {
    return isValidExistingFormUrl();
  }

  return destination === "new";
}

function hasValidStep4() {
  return true;
}

function isCurrentStepValid() {
  if (wizardState.currentStep === 1) {
    return hasValidStep1();
  }

  if (wizardState.currentStep === 2) {
    return hasValidStep2();
  }

  if (wizardState.currentStep === 3) {
    return hasValidStep3();
  }

  if (wizardState.currentStep === 4) {
    return hasValidStep4();
  }

  return false;
}

function updateStepIndicator() {
  stepItems.forEach((item) => {
    const stepNumber = Number(item.dataset.step);
    const isCurrent = stepNumber === wizardState.currentStep;
    const isCompleted = stepNumber < wizardState.currentStep;
    const stepName = stepNames[stepNumber] || "";

    item.dataset.active = String(isCurrent);
    item.dataset.completed = String(isCompleted);

    if (isCurrent) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }

    const status = isCompleted
      ? "selesai"
      : isCurrent
        ? "sedang dikerjakan"
        : "belum dibuka";
    item.setAttribute(
      "aria-label",
      `Langkah ${stepNumber}: ${stepName}, ${status}`,
    );

    const numberElement = item.querySelector(".step-number");

    if (numberElement) {
      numberElement.textContent = isCompleted ? "✓" : String(stepNumber);
    }
  });

  if (mobileStepLabel) {
    mobileStepLabel.textContent =
      `Langkah ${wizardState.currentStep} dari 4 · ` +
      stepNames[wizardState.currentStep];
  }
}

function updateWizardButtons() {
  const currentStep = wizardState.currentStep;
  const isValid = isCurrentStepValid();

  if (continueButton) {
    continueButton.disabled = !isValid;

    if (currentStep === 4) {
      continueButton.classList.add("hidden");
    } else {
      continueButton.classList.remove("hidden");

      continueButton.innerHTML =
        currentStep === 1
          ? 'Lanjut ke preview <span aria-hidden="true">→</span>'
          : 'Lanjutkan <span aria-hidden="true">→</span>';
    }
  }

  if (backButton) {
    if (currentStep === 1) {
      backButton.classList.add("hidden");
    } else {
      backButton.classList.remove("hidden");
    }
  }

  if (statusMessage) {
    if (isValid) {
      if (currentStep === 1) {
        statusMessage.textContent =
          "File siap. Klik Lanjutkan untuk memeriksa soal.";
      } else if (currentStep === 2) {
        statusMessage.textContent =
          "Soal sudah diperiksa. Klik Lanjutkan untuk memilih tujuan formulir.";
      } else if (currentStep === 3) {
        statusMessage.textContent =
          "Pengaturan tujuan sudah lengkap. Klik Lanjutkan untuk proses Google Form.";
      } else {
        statusMessage.textContent = "Soal siap diproses ke Google Forms.";
      }
    } else {
      if (currentStep === 1) {
        statusMessage.textContent =
          "Pilih file soal yang valid untuk melanjutkan.";
      } else if (currentStep === 2) {
        statusMessage.textContent =
          "Pastikan preview soal sudah tersedia dan tidak memiliki error.";
      } else if (currentStep === 3) {
        statusMessage.textContent =
          "Pilih tujuan formulir dan lengkapi data yang diperlukan.";
      } else {
        statusMessage.textContent = "Soal siap diproses ke Google Forms.";
      }
    }
  }
}

function syncSidebarCollapseTogglePosition() {
  if (!sidebarCollapseToggle) return;

  const isExpanded =
    sidebarCollapseToggle.getAttribute("aria-expanded") === "true";

  sidebarCollapseToggle.classList.toggle("self-end", isExpanded);
}

function collapseSidebar() {
  if (!wizardSidebar || !sidebarCollapseToggle) return;

  wizardSidebar.setAttribute("data-collapsed", "true");
  mainContent?.setAttribute("data-sidebar-collapsed", "true");
  sidebarCollapseToggle.setAttribute("aria-expanded", "false");

  const label = sidebarCollapseToggle.querySelector(".sr-only");
  if (label) label.textContent = "Perluas sidebar";

  syncSidebarCollapseTogglePosition();

  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, "true");
  } catch (error) {
    console.warn("Tidak dapat menyimpan preferensi sidebar.", error);
  }
}

function expandSidebar() {
  if (!wizardSidebar || !sidebarCollapseToggle) return;

  wizardSidebar.setAttribute("data-collapsed", "false");
  mainContent?.setAttribute("data-sidebar-collapsed", "false");
  sidebarCollapseToggle.setAttribute("aria-expanded", "true");

  const label = sidebarCollapseToggle.querySelector(".sr-only");
  if (label) label.textContent = "Ciutkan sidebar";

  syncSidebarCollapseTogglePosition();

  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, "false");
  } catch (error) {
    console.warn("Tidak dapat menyimpan preferensi sidebar.", error);
  }
}

function toggleSidebarCollapse() {
  if (wizardSidebar?.getAttribute("data-collapsed") === "true") {
    expandSidebar();
  } else {
    collapseSidebar();
  }
}

function closeWizardSidebar({ returnFocus = false } = {}) {
  if (!wizardSidebar || !wizardSidebarToggle) return;

  const wasOpen = wizardSidebarToggle.getAttribute("aria-expanded") === "true";

  wizardSidebar.classList.add("hidden");
  wizardSidebar.classList.remove("flex");
  wizardSidebarToggle.setAttribute("aria-expanded", "false");

  if (wizardSidebarToggleIcon) {
    wizardSidebarToggleIcon.textContent = "▾";
  }

  if (returnFocus && wasOpen) {
    wizardSidebarToggle.focus();
  }
}

function openWizardSidebar() {
  if (!wizardSidebar || !wizardSidebarToggle) return;

  wizardSidebar.classList.remove("hidden");
  wizardSidebar.classList.add("flex");
  wizardSidebarToggle.setAttribute("aria-expanded", "true");

  if (wizardSidebarToggleIcon) {
    wizardSidebarToggleIcon.textContent = "▴";
  }

  wizardSidebar.focus({ preventScroll: true });
}

function toggleWizardSidebar() {
  if (wizardSidebarToggle?.getAttribute("aria-expanded") === "true") {
    closeWizardSidebar({ returnFocus: true });
  } else {
    openWizardSidebar();
  }
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    wizardSidebarToggle?.getAttribute("aria-expanded") === "true"
  ) {
    closeWizardSidebar({ returnFocus: true });
  }
});

document.addEventListener("click", (event) => {
  if (wizardSidebarToggle?.getAttribute("aria-expanded") !== "true") return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  const clickedInsideSidebar = wizardSidebar?.contains(target);
  const clickedToggle = wizardSidebarToggle?.contains(target);

  if (!clickedInsideSidebar && !clickedToggle) {
    closeWizardSidebar();
  }
});

function showStep(stepNumber, { moveFocus = true } = {}) {
  if (![1, 2, 3, 4].includes(stepNumber)) {
    return;
  }

  wizardState.currentStep = stepNumber;

  let activePanel = null;

  stepPanels.forEach((panel) => {
    const panelStep = Number(panel.dataset.stepPanel);
    const shouldShow = panelStep === stepNumber;

    panel.classList.toggle("hidden", !shouldShow);
    panel.setAttribute("aria-hidden", String(!shouldShow));

    if (shouldShow) {
      activePanel = panel;
    }
  });

  updateStepIndicator();
  updateWizardButtons();
  closeWizardSidebar();
  saveWizardProgress();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  if (moveFocus && activePanel instanceof HTMLElement) {
    activePanel.focus({ preventScroll: true });
  }
}

function goToNextStep() {
  if (!isCurrentStepValid()) {
    updateWizardButtons();
    return;
  }

  if (wizardState.currentStep < 4) {
    showStep(wizardState.currentStep + 1);
  }
}

function goToPreviousStep() {
  if (wizardState.currentStep > 1) {
    showStep(wizardState.currentStep - 1);
  }
}

continueButton?.addEventListener("click", goToNextStep);
backButton?.addEventListener("click", goToPreviousStep);
wizardSidebarToggle?.addEventListener("click", toggleWizardSidebar);
sidebarCollapseToggle?.addEventListener("click", toggleSidebarCollapse);
existingFormUrlInput?.addEventListener("input", updateWizardButtons);

try {
  const storedCollapsed = window.localStorage.getItem(
    SIDEBAR_COLLAPSE_STORAGE_KEY,
  );

  if (storedCollapsed === "true") {
    collapseSidebar();
  } else {
    expandSidebar();
  }
} catch (error) {
  console.warn("Tidak dapat membaca preferensi sidebar.", error);
}

const xlMediaQuery = window.matchMedia("(min-width: 1280px)");
xlMediaQuery.addEventListener("change", (event) => {
  if (!event.matches) {
    expandSidebar();
  }
});

attemptSilentGoogleReconnect();

const hasRestoredProgress = restoreWizardProgress();

if (!hasRestoredProgress) {
  showStep(1, { moveFocus: false });
}
