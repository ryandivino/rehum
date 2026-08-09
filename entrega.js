const SUPABASE_URL = 'https://wyvfyluboxfjtnmeyzto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dmZ5bHVib3hmanRubWV5enRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjMwNjUsImV4cCI6MjEwMTYzOTA2NX0.VRVelVeIArXT45O9yjm2YYW0hGm0eUmJZ5PQrzjb5Kw';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const params = new URLSearchParams(location.search);
const setorId = params.get('setor');

const loadingState = document.getElementById('loadingState');
const notFoundState = document.getElementById('notFoundState');
const identifyState = document.getElementById('identifyState');
const checklistState = document.getElementById('checklistState');

let currentSetor = null;
let currentColaboradores = [];
let currentCampanhaNome = '';

function showState(el){
  [loadingState, notFoundState, identifyState, checklistState].forEach(s => { s.style.display = 'none'; });
  el.style.display = 'flex';
}

async function init(){
  if(!setorId || !supabaseClient){
    showState(notFoundState);
    return;
  }

  const { data: setor, error } = await supabaseClient
    .from('setores')
    .select('*, campanhas(nome), colaboradores(*)')
    .eq('id', setorId)
    .single();

  if(error || !setor){
    showState(notFoundState);
    return;
  }

  currentSetor = setor;
  currentColaboradores = setor.colaboradores || [];
  currentCampanhaNome = setor.campanhas ? setor.campanhas.nome : '';

  if(setor.status === 'confirmado'){
    renderChecklist();
  } else {
    renderIdentify();
  }
}

function renderIdentify(){
  document.getElementById('identifyTitle').textContent = `${currentCampanhaNome} — ${currentSetor.nome_setor}`;
  showState(identifyState);
}

document.getElementById('confirmReceiptBtn').onclick = async () => {
  const nome = document.getElementById('responsavelInput').value.trim();
  const matricula = document.getElementById('responsavelMatriculaInput').value.trim();
  const statusEl = document.getElementById('identifyStatus');
  if(!nome || !matricula){
    statusEl.textContent = 'Informe seu nome e sua matrícula pra confirmar.';
    statusEl.className = 'tool-status error';
    return;
  }
  statusEl.textContent = 'Confirmando...';
  statusEl.className = 'tool-status';

  const { error } = await supabaseClient
    .from('setores')
    .update({
      responsavel_nome: nome,
      responsavel_matricula: matricula,
      confirmado_em: new Date().toISOString(),
      status: 'confirmado',
    })
    .eq('id', currentSetor.id);

  if(error){
    statusEl.textContent = 'Não foi possível confirmar. Tente novamente.';
    statusEl.className = 'tool-status error';
    return;
  }

  currentSetor.responsavel_nome = nome;
  currentSetor.responsavel_matricula = matricula;
  currentSetor.status = 'confirmado';
  renderChecklist();
};

function renderChecklist(){
  document.getElementById('checklistTitle').textContent = `${currentCampanhaNome} — ${currentSetor.nome_setor}`;
  document.getElementById('checklistMeta').textContent =
    `Recebido por ${currentSetor.responsavel_nome} (matrícula ${currentSetor.responsavel_matricula}). Marque quem já recebeu.`;

  const listEl = document.getElementById('colaboradorList');
  listEl.innerHTML = '';
  currentColaboradores.forEach(colab => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!colab.recebeu;
    checkbox.setAttribute('aria-label', `Marcar ${colab.nome} como recebido`);
    checkbox.onchange = async () => {
      const { error } = await supabaseClient
        .from('colaboradores')
        .update({
          recebeu: checkbox.checked,
          recebeu_em: checkbox.checked ? new Date().toISOString() : null,
        })
        .eq('id', colab.id);
      if(!error) colab.recebeu = checkbox.checked;
    };
    li.appendChild(checkbox);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = colab.matricula ? `${colab.nome} (${colab.matricula})` : colab.nome;
    li.appendChild(nameSpan);

    listEl.appendChild(li);
  });

  showState(checklistState);
}

function formatBrasilia(date){
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function loadImageElement(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('arquivo não encontrado ou inválido'));
    img.src = src;
  });
}

async function tryEmbedImage(pdfDoc, filename){
  try{
    const imgEl = await loadImageElement(filename);
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return await pdfDoc.embedPng(bytes);
  } catch(err){
    console.warn(`[ReHum] Não foi possível usar "${filename}" como logo: ${err.message}`);
    return null;
  }
}

document.getElementById('downloadComprovanteBtn').onclick = async () => {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([420, 600]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PRIMARY = rgb(0.263, 0.220, 0.792);
  const INK = rgb(0.09, 0.10, 0.13);
  const MUTED = rgb(0.42, 0.45, 0.50);
  const PANEL = rgb(0.969, 0.969, 0.984);
  const SUCCESS = rgb(0.071, 0.549, 0.290);
  const PENDING_BORDER = rgb(0.75, 0.76, 0.80);

  const marginX = 40;
  const pageWidth = 420;

  // Cabeçalho com espaço para os logos institucionais (Ceuma e RH).
  // A logo do ReHum não entra na impressão — ver crédito no rodapé.
  // Salve os arquivos logo-ceuma.png e logo-rh.png na mesma pasta do site pra eles aparecerem aqui.
  const logoSize = 32;
  const logoY = 600 - 24 - logoSize;
  const logoCeuma = await tryEmbedImage(pdfDoc, 'logo-ceuma.png');
  const logoRh = await tryEmbedImage(pdfDoc, 'logo-rh.png');

  [
    { img: logoCeuma, x: marginX },
    { img: logoRh, x: pageWidth - marginX - logoSize },
  ].forEach(({ img, x }) => {
    if(!img) return;
    const scale = logoSize / Math.max(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: x + (logoSize - w) / 2, y: logoY + (logoSize - h) / 2, width: w, height: h });
  });

  let y = logoY - 14;
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 2, color: PRIMARY });
  y -= 28;

  page.drawText('Comprovante de recebimento', { x: marginX, y, size: 17, font: bold, color: PRIMARY });
  y -= 26;

  // Bloco de informações, com barra de destaque à esquerda
  const infoStartY = y;
  const infoLines = [
    `Campanha: ${currentCampanhaNome}`,
    `Setor: ${currentSetor.nome_setor}`,
    `Recebido por: ${currentSetor.responsavel_nome} (matrícula ${currentSetor.responsavel_matricula})`,
    `Data de confirmação: ${currentSetor.confirmado_em ? formatBrasilia(new Date(currentSetor.confirmado_em)) + ' (horário de Brasília)' : ''}`,
  ];
  const infoHeight = infoLines.length * 18 + 16;
  page.drawRectangle({ x: marginX, y: infoStartY - infoHeight + 14, width: pageWidth - marginX * 2, height: infoHeight, color: PANEL });
  page.drawRectangle({ x: marginX, y: infoStartY - infoHeight + 14, width: 3, height: infoHeight, color: PRIMARY });

  y -= 6;
  infoLines.forEach(line => {
    page.drawText(line, { x: marginX + 14, y, size: 11, font, color: INK });
    y -= 18;
  });
  y -= 6;

  page.drawText(`Emitido em: ${formatBrasilia(new Date())} (horário de Brasília)`, { x: marginX, y, size: 9, font, color: MUTED });
  y -= 32;

  page.drawText('COLABORADORES', { x: marginX, y, size: 11, font: bold, color: PRIMARY });
  y -= 8;
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 0.75, color: PENDING_BORDER });
  y -= 18;

  currentColaboradores.forEach(c => {
    if(y < 50){
      page = pdfDoc.addPage([420, 600]);
      y = 550;
    }
    const dotColor = c.recebeu ? SUCCESS : PENDING_BORDER;
    page.drawCircle({ x: marginX + 3, y: y + 3.5, size: 3, color: dotColor });

    const label = c.matricula ? `${c.nome}  (${c.matricula})` : c.nome;
    page.drawText(label, { x: marginX + 14, y, size: 10.5, font, color: INK });

    const statusLabel = c.recebeu ? 'recebido' : 'pendente';
    const statusColor = c.recebeu ? SUCCESS : MUTED;
    page.drawText(statusLabel, { x: pageWidth - marginX - 44, y, size: 9, font: bold, color: statusColor });

    y -= 17;
  });

  y = Math.min(y, 40);
  page.drawLine({ start: { x: marginX, y: 34 }, end: { x: pageWidth - marginX, y: 34 }, thickness: 0.5, color: PENDING_BORDER });
  page.drawText('Gerado via ReHum.', { x: marginX, y: 20, size: 8, font: italic, color: MUTED });

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comprovante-${currentSetor.nome_setor}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

init();