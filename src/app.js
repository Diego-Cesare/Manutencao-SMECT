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
const previewImagemEl = document.getElementById("previewImagem");
// botão de compartilhar
const btnShare = document.getElementById("btnShare");

// configuraçoes gerais
const tituloFont = 18;
const textoFont = 14;
// espassamento das linhas do texto
let y = 40;

// inicia com div de imagem null
let imagemSelecionada = null;
let previewUrl = "";

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
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  previewImagemEl.src = "";
  previewImagemEl.classList.add("hidden");
  imagemSelecionada = null;
}

// selecionar imagem
function setImage(file, sourceInput) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showStatus("Selecione um arquivo de imagem válido.", "error");
    sourceInput.value = "";
    return;
  }

  clearImagePreview();

  imagemSelecionada = file;
  previewUrl = URL.createObjectURL(file);

  previewImagemEl.src = previewUrl;
  previewImagemEl.classList.remove("hidden");

  if (sourceInput === fotoArquivoEl) {
    fotoCameraEl.value = "";
  } else {
    fotoArquivoEl.value = "";
  }
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

  // titulo do PDF
  doc.setFont("helvetica", "bold");
  doc.setFontSize(tituloFont);
  doc.setTextColor(0, 0, 200);
  doc.text(`Relatório de Obra Concluída ${unidade}`, 14, 20);
  doc.setDrawColor(21, 21, 21);
  doc.setLineWidth(1.2);
  doc.line(14, 23, 150, 23);

  // texto do PDF
  doc.setFont("helvetica", "normal");
  doc.setFontSize(textoFont);
  doc.setTextColor(0, 0, 0);

  doc.text(`Unidade: ${unidade}`, 14, y);
  y += 10;
  doc.text(`Equipe: ${equipe}`, 14, y);
  y += 10;
  doc.text(`Tipo: ${tipo}`, 14, y);
  y += 10;

  // conta os caracters da entrada da descrição
  // para somar com y e nao sobrepor a linha seguinte
  const descNum = document.getElementById("descricao").value;
  const descLinNum = doc.splitTextToSize(descNum, 180);
  let numLin = descLinNum.length;
  let quebraDeLinha = numLin * (doc.getLineHeight() * 0.352778);
  doc.text(`Descrição: ${descricao}`, 14, y);
  y += quebraDeLinha + 5;

  doc.text(`Hora do Registro: ${horaRegistro}`, 14, y);
  y += 10;

  doc.text(`Imagem anexada: ${imagemSelecionada ? "Sim" : "Não"}`, 14, y);
  y += 15;

  if (imagemSelecionada) {
    try {
      const imageData = await readFileAsDataURL(imagemSelecionada);
      const imageType = imageData.includes("image/png") ? "PNG" : "JPEG";
      const imageProps = doc.getImageProperties(imageData);

      const maxWidth = 180;
      const maxHeight = 150;

      const scale = Math.min(
        maxWidth / imageProps.width,
        maxHeight / imageProps.height,
      );

      const renderWidth = imageProps.width * scale;
      const renderHeight = imageProps.height * scale;

      if (y + renderHeight > 280) {
        doc.addPage();
        y = 20;
      }

      doc.addImage(imageData, imageType, 14, y, renderWidth, renderHeight);
    } catch {
      showStatus("Falha ao processar a imagem.", "error");
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
  setImage(e.target.files?.[0], fotoArquivoEl);
});

fotoCameraEl.addEventListener("change", (e) => {
  setImage(e.target.files?.[0], fotoCameraEl);
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
