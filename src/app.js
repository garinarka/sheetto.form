const appState = {
  selectedFile: null,
  destinationMode: null,
  currentStep: 1,
};

const fileInput = document.querySelector("#question-file");
const fileName = document.querySelector("#file-name");
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
    appState.selectedFile !== null && appState.destinationMode !== null;

  continueButton.disabled = !isReady;

  if (isReady) {
    statusMessage.textContent = "Semua sudah siap. Kamu bisa melanjutkan.";
  } else if (!appState.selectedFile) {
    statusMessage.textContent = "Pilih file soal terlebih dahulu.";
  } else {
    statusMessage.textContent = "Pilih tujuan formulir untuk melanjutkan.";
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

  appState.selectedFile = selectedFile;

  fileName.textContent = `File dipilih: ${selectedFile.name}`;

  fileName.classList.remove("hidden");

  updateContinueButton();
});

destinationOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectDestination(option.dataset.destination);
  });
});

continueButton.addEventListener("click", () => {
  if (!appState.selectedFile || !appState.destinationMode) {
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
