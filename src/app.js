// formulario
const form = document.getElementById("formulario");
// acessibilidade
const statusEl = document.getElementById("status");
// hora
const horaRegistroEl = document.getElementById("horaRegistro");
// botão enviar imagem
const fotoArquivoEl = document.getElementById("fotoArquivo");
// botão abrir camera
const fotoCameraEl = document.getElementById("fotoCamera");
// div de visualização de imagem
const previewImagensEl = document.getElementById("previewImagens");
// botão de compartilhar
const btnShare = document.getElementById("btnShare");

// configuraçoes gerais
const tituloFont = 18;
const textoFont = 14;
const maxImagens = 4;

// inicia com div de imagem null
let imagensSelecionadas = [];
let previewUrls = [];

function fecharStatus(e) {
  e.style.display = "block";
  setTimeout(() => {
    e.style.display = "none";
  }, 4000);
}

// gerar horario e data
function formatDateTime(date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// função para atuallizar o relogio
function updateClock() {
  horaRegistroEl.value = formatDateTime(new Date());
}

// função para exibir aviso
function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type;
  fecharStatus(statusEl);
}

// formatar textos
function sanitizeFileName(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
}

// limpar previa da imagem
function clearImagePreview() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  imagensSelecionadas = [];
  previewImagensEl.innerHTML = "";
  previewImagensEl.classList.add("hidden");
}

function renderImagePreview() {
  previewImagensEl.innerHTML = "";

  if (!imagensSelecionadas.length) {
    previewImagensEl.classList.add("hidden");
    return;
  }

  imagensSelecionadas.forEach((_, index) => {
    const card = document.createElement("figure");
    card.className = "preview-card";
    const imageEl = document.createElement("img");
    imageEl.className = "preview-image";
    imageEl.src = previewUrls[index];
    imageEl.alt = `Pré-visualização da imagem ${index + 1}`;
    card.appendChild(imageEl);
    previewImagensEl.appendChild(card);
  });

  previewImagensEl.classList.remove("hidden");
}

// selecionar imagem
function addImages(fileList, sourceInput) {
  if (!fileList?.length) return;

  const files = Array.from(fileList);
  let invalidCount = 0;
  const validFiles = files.filter((file) => {
    if (!file.type.startsWith("image/")) {
      invalidCount += 1;
      return false;
    }
    return true;
  });

  const remainingSlots = maxImagens - imagensSelecionadas.length;
  const acceptedFiles = validFiles.slice(0, Math.max(remainingSlots, 0));

  acceptedFiles.forEach((file) => {
    imagensSelecionadas.push(file);
    previewUrls.push(URL.createObjectURL(file));
  });

  renderImagePreview();

  const droppedByLimit = validFiles.length - acceptedFiles.length;
  if (invalidCount || droppedByLimit) {
    showStatus(
      `Foram adicionadas ${acceptedFiles.length} imagem(ns). ` +
        `Ignoradas: ${invalidCount} inválida(s), ${Math.max(droppedByLimit, 0)} por limite de ${maxImagens}.`,
      "error",
    );
  } else {
    showStatus(
      `${imagensSelecionadas.length} imagem(ns) selecionada(s) de ${maxImagens}.`,
      "ok",
    );
  }

  sourceInput.value = "";
}

// converte arquivo em Base64
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject();
    reader.readAsDataURL(file);
  });
}

// gerar o pdf
async function gerarPDF() {
  if (!form.checkValidity()) {
    showStatus("Preencha todos os campos obrigatórios.", "error");
    form.reportValidity();
    return null;
  }

  const data = new FormData(form);

  const unidade = data.get("unidade")?.toString().trim() || "";
  const equipe = (data.get("equipe")?.toString().trim() || "").toUpperCase();
  const tipo = data.get("tipo")?.toString().trim() || "";
  const descricao = data.get("descricao")?.toString().trim() || "";
  const horaRegistro = horaRegistroEl.value;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textStartX = 14;
  const topMargin = 20;
  const bottomMargin = 20;
  const pageBottom = pageHeight - bottomMargin;
  const textMaxWidth = pageWidth - textStartX * 2;
  const lineHeightMm = () =>
    doc.getFontSize() * doc.getLineHeightFactor() * 0.352778;

  function ensurePageSpace(requiredHeight = 0) {
    if (y + requiredHeight > pageBottom) {
      doc.addPage();
      y = topMargin;
    }
  }

  function drawTextBlock(text, spacing = 3) {
    const lines = doc.splitTextToSize(text, textMaxWidth);
    const lineHeight = lineHeightMm();

    lines.forEach((line) => {
      ensurePageSpace(lineHeight);
      doc.text(line, textStartX, y);
      y += lineHeight;
    });

    y += spacing;
  }

  // titulo do PDF
  doc.setFont("helvetica", "bold");
  doc.setFontSize(tituloFont);
  doc.setTextColor(0, 0, 200);
  drawTextBlock(`Relatório de Obra Concluída ${unidade}`, 4);
  doc.setDrawColor(21, 21, 21);
  doc.setLineWidth(1.2);
  ensurePageSpace(8);
  doc.line(textStartX, y, 150, y);
  y += 8;

  // texto do PDF
  doc.setFont("helvetica", "normal");
  doc.setFontSize(textoFont);
  doc.setTextColor(0, 0, 0);

  drawTextBlock(`Unidade: ${unidade}`);
  drawTextBlock(`Equipe: ${equipe}`);
  drawTextBlock(`Tipo: ${tipo}`);
  drawTextBlock(`Descrição: ${descricao}`);
  drawTextBlock(`Hora do Registro: ${horaRegistro}`);
  drawTextBlock(`Imagens anexadas: ${imagensSelecionadas.length}`, 8);

  if (imagensSelecionadas.length) {
    const maxWidth = textMaxWidth;
    const maxHeight = 110;

    for (let index = 0; index < imagensSelecionadas.length; index += 1) {
      const imageFile = imagensSelecionadas[index];

      try {
        const imageData = await readFileAsDataURL(imageFile);
        const imageType = imageData.includes("image/png") ? "PNG" : "JPEG";
        const imageProps = doc.getImageProperties(imageData);

        const scale = Math.min(
          maxWidth / imageProps.width,
          maxHeight / imageProps.height,
        );

        const renderWidth = imageProps.width * scale;
        const renderHeight = imageProps.height * scale;

        ensurePageSpace(renderHeight + 8);
        doc.addImage(
          imageData,
          imageType,
          textStartX,
          y,
          renderWidth,
          renderHeight,
        );
        y += renderHeight + 8;
      } catch {
        showStatus(`Falha ao processar a imagem ${index + 1}.`, "error");
      }
    }
  }

  return { doc, unidade };
}

// compartilhamento
async function sharePdf(doc, unidade) {
  const pdfBlob = doc.output("blob");
  const safeName = sanitizeFileName(unidade);

  const pdfFile = new File([pdfBlob], `Relatorio_Obras_${safeName}.pdf`, {
    type: "application/pdf",
  });

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: "Relatório de Obra",
        text: "Segue o relatório em anexo.",
        files: [pdfFile],
      });

      showStatus("Compartilhado com sucesso.", "ok");
      return true;
    } catch {
      showStatus("Compartilhamento cancelado.", "error");
      return false;
    }
  }

  return false;
}

// eventos

fotoArquivoEl.addEventListener("change", (e) => {
  addImages(e.target.files, fotoArquivoEl);
});

fotoCameraEl.addEventListener("change", (e) => {
  addImages(e.target.files, fotoCameraEl);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const result = await gerarPDF();
  if (!result) return;

  const { doc, unidade } = result;

  doc.save(`Relatorio_Obras_${sanitizeFileName(unidade)}.pdf`);
  showStatus("PDF gerado e download iniciado.", "ok");
});

btnShare.addEventListener("click", async () => {
  const result = await gerarPDF();
  if (!result) return;

  const { doc, unidade } = result;

  const shared = await sharePdf(doc, unidade);

  if (!shared) {
    doc.save(`Relatorio_Obras_${sanitizeFileName(unidade)}.pdf`);
    showStatus(
      "Navegador não suporta compartilhamento. Download iniciado.",
      "ok",
    );
  }
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearImagePreview();
    showStatus("");
    updateClock();
  }, 0);
});

// inicia o relogio

updateClock();
setInterval(updateClock, 1000);
