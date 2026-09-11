const appState = {
  selectedFile: null,
  destinationMode: null,
  currentStep: 1,
  questions: [],
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

function validateQuestions(questions) {
  const errors = [];

  questions.forEach((question, index) => {
    const rowNumber = index + 2;

    if (!question.question.trim()) {
      errors.push(`Baris ${rowNumber}: pertanyaan kosong.`);
      return;
    }

    if (question.type === "multiple_choice") {
      if (question.options.length < 2) {
        errors.push(
          `Baris ${rowNumber}: pilihan ganda harus memiliki minimal 2 opsi.`,
        );
      }

      if (appState.formSettings.isQuiz && !question.answer) {
        errors.push(
          `Baris ${rowNumber}: jawaban wajib diisi saat mode quiz aktif.`,
        );
      }

      if (question.answer) {
        const answerExists = question.options.some(
          (option) =>
            option.toLowerCase().trim() ===
            question.answer.toLowerCase().trim(),
        );

        if (!answerExists) {
          errors.push(
            `Baris ${rowNumber}: jawaban "${question.answer}" tidak cocok dengan pilihan.`,
          );
        }
      }
    }
  });

  return errors;
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

      updateGoogleConnectionUI();

      setStatus("Berhasil terhubung ke Google.", "success");

      console.log("Google OAuth berhasil.");
    },
  });

  tokenClient.requestAccessToken({
    prompt: "consent",
  });
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

    const validationErrors = validateQuestions(questions);

    if (validationErrors.length > 0) {
      throw new Error(
        "File memiliki masalah:\n\n" + validationErrors.join("\n"),
      );
    }

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
  const match = String(value || "").match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : String(value || "").trim();
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

    if (question.type === "multiple_choice") {
      item.questionItem.question.choiceQuestion = {
        type: "RADIO",
        options: question.options.map((value) => ({ value })),
      };
      if (settings.isQuiz && question.answer) {
        const answerIndex = question.options.findIndex(
          (option) => option.toLowerCase() === question.answer.toLowerCase(),
        );
        if (answerIndex >= 0) {
          item.questionItem.question.grading = {
            pointValue: 1,
            correctAnswers: {
              answers: [{ value: question.options[answerIndex] }],
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

async function createGoogleForm() {
  const settings = collectFormSettings();
  if (!appState.google.connected)
    throw new Error("Hubungkan akun Google terlebih dahulu.");
  if (!settings.title) throw new Error("Judul Google Form belum diisi.");

  const created = await googleFormsRequest(
    "https://forms.googleapis.com/v1/forms",
    {
      method: "POST",
      body: JSON.stringify({
        info: { title: settings.title, documentTitle: settings.title },
      }),
    },
  );

  await googleFormsRequest(
    `https://forms.googleapis.com/v1/forms/${created.formId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests: buildBatchRequests() }),
    },
  );

  return {
    formId: created.formId,
    title: settings.title,
    url: `https://docs.google.com/forms/d/${created.formId}/edit`,
  };
}

async function appendToExistingGoogleForm() {
  const settings = collectFormSettings();
  const formId = extractFormId(settings.existingFormUrl);
  if (!formId) throw new Error("Link Google Form belum valid.");

  const requests = buildBatchRequests().filter(
    (request) => !request.updateFormInfo && !request.updateSettings,
  );
  await googleFormsRequest(
    `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests }),
    },
  );

  return {
    formId,
    title: settings.title || "Google Form",
    url: `https://docs.google.com/forms/d/${formId}/edit`,
  };
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
  const button = document.querySelector("#create-google-form-button");
  if (button) {
    button.disabled = true;
    button.textContent = "Sedang memproses...";
  }

  try {
    const result =
      appState.destinationMode === "new"
        ? await createGoogleForm()
        : await appendToExistingGoogleForm();

    showCreatedFormResult(result);
    setStatus("Google Form berhasil diproses.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Google Form gagal diproses.", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Buat Google Form sekarang";
    }
  }
}

continueButton?.addEventListener("click", () => {
  if (!appState.questions.length) {
    setStatus("Upload file soal terlebih dahulu.", "error");
    return;
  }
  if (!appState.destinationMode) {
    setStatus("Pilih tujuan Google Form terlebih dahulu.", "error");
    return;
  }

  const settings = collectFormSettings();
  if (!settings.title && appState.destinationMode === "new") {
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
  document.querySelector("#create-form-section")?.classList.remove("hidden");
  setStatus(
    "Pengaturan form siap. Hubungkan Google lalu proses form.",
    "success",
  );
  console.log("Final app state:", appState);
});

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

updateSteps(1);
updateContinueButton();
updateGoogleConnectionUI();
