// ---------- Cliente Supabase (backend compartilhado — pronto pros módulos de Lembrancinhas e Admissão) ----------
const SUPABASE_URL = 'https://wyvfyluboxfjtnmeyzto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dmZ5bHVib3hmanRubWV5enRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjMwNjUsImV4cCI6MjEwMTYzOTA2NX0.VRVelVeIArXT45O9yjm2YYW0hGm0eUmJZ5PQrzjb5Kw';

let supabaseClient = null;
if(window.supabase){
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ---------- Login do RH (Supabase Auth) ----------
// Senha padrão dada pra contas novas. Troque esse valor livremente quando quiser.
const DEFAULT_PASSWORD = 'rehum2026';

const loginGateEl = document.getElementById('loginGate');
const appLayoutEl = document.getElementById('appLayout');
const loginFormCard = document.getElementById('loginFormCard');
const newPasswordCard = document.getElementById('newPasswordCard');
const loginEmailEl = document.getElementById('loginEmail');
const loginPasswordEl = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginErrorEl = document.getElementById('loginError');
const newPasswordInput = document.getElementById('newPasswordInput');
const newPasswordConfirmInput = document.getElementById('newPasswordConfirmInput');
const newPasswordSubmitBtn = document.getElementById('newPasswordSubmitBtn');
const newPasswordError = document.getElementById('newPasswordError');
const logoutBtn = document.getElementById('logoutBtn');

function showApp(){
  loginGateEl.style.display = 'none';
  appLayoutEl.style.display = 'flex';
  try{ sessionStorage.removeItem('rehum_must_change_password'); }catch(e){}
  if(typeof loadCampaigns === 'function') loadCampaigns();
  if(typeof loadAdmissions === 'function') loadAdmissions();
  if(typeof loadHomeStats === 'function') loadHomeStats();
}

function showLoginForm(){
  loginGateEl.style.display = 'flex';
  loginFormCard.style.display = 'block';
  newPasswordCard.style.display = 'none';
}

function showNewPasswordForm(){
  loginGateEl.style.display = 'flex';
  loginFormCard.style.display = 'none';
  newPasswordCard.style.display = 'block';
  try{ sessionStorage.setItem('rehum_must_change_password', '1'); }catch(e){}
}

function showLogin(message){
  appLayoutEl.style.display = 'none';
  showLoginForm();
  if(message){
    loginErrorEl.textContent = message;
    loginErrorEl.style.display = 'block';
  } else {
    loginErrorEl.style.display = 'none';
  }
}

async function attemptLogin(){
  const email = loginEmailEl.value.trim();
  const password = loginPasswordEl.value;
  if(!email || !password) return;
  if(!supabaseClient){
    showLogin('Conexão com o banco não disponível.');
    return;
  }
  loginSubmitBtn.disabled = true;
  loginErrorEl.style.display = 'none';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginSubmitBtn.disabled = false;
  if(error){
    loginErrorEl.textContent = 'E-mail ou senha incorretos.';
    loginErrorEl.style.display = 'block';
    return;
  }

  if(password === DEFAULT_PASSWORD){
    showNewPasswordForm();
  } else {
    showApp();
  }
}

loginSubmitBtn.onclick = attemptLogin;
loginPasswordEl.addEventListener('keydown', e => { if(e.key === 'Enter') attemptLogin(); });
loginEmailEl.addEventListener('keydown', e => { if(e.key === 'Enter') attemptLogin(); });

newPasswordSubmitBtn.onclick = async () => {
  const novaSenha = newPasswordInput.value;
  const confirmacao = newPasswordConfirmInput.value;
  newPasswordError.style.display = 'none';

  if(!novaSenha || novaSenha.length < 6){
    newPasswordError.textContent = 'A nova senha precisa ter pelo menos 6 caracteres.';
    newPasswordError.style.display = 'block';
    return;
  }
  if(novaSenha === DEFAULT_PASSWORD){
    newPasswordError.textContent = 'Escolha uma senha diferente da senha padrão.';
    newPasswordError.style.display = 'block';
    return;
  }
  if(novaSenha !== confirmacao){
    newPasswordError.textContent = 'As senhas não coincidem.';
    newPasswordError.style.display = 'block';
    return;
  }

  newPasswordSubmitBtn.disabled = true;
  const { error } = await supabaseClient.auth.updateUser({ password: novaSenha });
  newPasswordSubmitBtn.disabled = false;

  if(error){
    newPasswordError.textContent = 'Não foi possível salvar a nova senha. Tente novamente.';
    newPasswordError.style.display = 'block';
    return;
  }

  newPasswordInput.value = '';
  newPasswordConfirmInput.value = '';
  showApp();
};

if(logoutBtn){
  logoutBtn.onclick = async () => {
    if(supabaseClient) await supabaseClient.auth.signOut();
    loginEmailEl.value = '';
    loginPasswordEl.value = '';
    showLogin();
  };
}

(async function checkAuth(){
  if(!supabaseClient){
    showLogin('Conexão com o banco não disponível.');
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  if(data && data.session){
    let stillMustChange = false;
    try{ stillMustChange = sessionStorage.getItem('rehum_must_change_password') === '1'; }catch(e){}
    if(stillMustChange){
      showNewPasswordForm();
    } else {
      showApp();
    }
  } else {
    showLogin();
  }
})();

// ---------- Navegação entre views ----------
const viewEls = {
  home: document.getElementById('viewHome'),
  docs: document.getElementById('viewDocs'),
  gifts: document.getElementById('viewGifts'),
  admission: document.getElementById('viewAdmission'),
};
const navItems = document.querySelectorAll('.sidebar-nav-item');
const sidebarEl = document.getElementById('sidebar');
const sidebarBackdropEl = document.getElementById('sidebarBackdrop');
const hamburgerBtn = document.getElementById('hamburgerBtn');

function showView(view){
  Object.entries(viewEls).forEach(([key, el]) => {
    el.style.display = (key === view) ? 'block' : 'none';
  });
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === view));
  closeSidebarDrawer();
}

navItems.forEach(item => {
  item.addEventListener('click', () => showView(item.dataset.view));
});

document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.goto));
});

function openSidebarDrawer(){
  sidebarEl.classList.add('open');
  sidebarBackdropEl.classList.add('visible');
}
function closeSidebarDrawer(){
  sidebarEl.classList.remove('open');
  sidebarBackdropEl.classList.remove('visible');
}
hamburgerBtn.onclick = () => openSidebarDrawer();
sidebarBackdropEl.onclick = () => closeSidebarDrawer();

const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
function toggleSidebarExpanded(){
  sidebarEl.classList.toggle('expanded');
  try{
    localStorage.setItem('rehum_sidebar_expanded', sidebarEl.classList.contains('expanded') ? '1' : '0');
  }catch(e){}
}
sidebarToggleBtn.onclick = () => toggleSidebarExpanded();

(function restoreSidebarState(){
  try{
    if(localStorage.getItem('rehum_sidebar_expanded') === '1'){
      sidebarEl.classList.add('expanded');
    }
  }catch(e){}
})();

function downloadBytes(bytes, filename, mime){
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function trimTransparentEdges(canvas){
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  let minX = width, minY = height, maxX = -1, maxY = -1;
  const alphaThreshold = 10;

  for(let y = 0; y < height; y++){
    for(let x = 0; x < width; x++){
      const alpha = data[(y * width + x) * 4 + 3];
      if(alpha > alphaThreshold){
        if(x < minX) minX = x;
        if(x > maxX) maxX = x;
        if(y < minY) minY = y;
        if(y > maxY) maxY = y;
      }
    }
  }

  if(maxX < 0 || (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1)){
    return canvas; // nada pra recortar (imagem vazia, ou já sem margem)
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;
  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  trimmedCanvas.getContext('2d').drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return trimmedCanvas;
}

async function tryEmbedImage(pdfDoc, filename){
  try{
    const imgEl = await loadImageElement(filename);
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);
    const trimmedCanvas = trimTransparentEdges(canvas);
    const dataUrl = trimmedCanvas.toDataURL('image/png');
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

async function downloadComprovanteEntrega(campanhaNome, setor){
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

  page.drawText('Comprovante de entrega', { x: marginX, y, size: 17, font: bold, color: PRIMARY });
  y -= 26;

  const confirmado = setor.status === 'confirmado';
  const infoStartY = y;
  const infoLines = [
    `Campanha: ${campanhaNome}`,
    `Setor: ${setor.nome_setor}`,
    `Status: ${confirmado ? 'Confirmado' : 'Aguardando confirmação'}`,
  ];
  if(confirmado){
    infoLines.push(`Recebido por: ${setor.responsavel_nome || ''}${setor.responsavel_matricula ? ' (matrícula ' + setor.responsavel_matricula + ')' : ''}`);
    infoLines.push(`Data de confirmação: ${setor.confirmado_em ? formatBrasilia(new Date(setor.confirmado_em)) + ' (horário de Brasília)' : ''}`);
  }
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

  (setor.colaboradores || []).forEach(c => {
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
  page.drawText('Documento gerado via ReHum', { x: marginX, y: 20, size: 8, font: italic, color: MUTED });

  const bytes = await pdfDoc.save();
  downloadBytes(bytes, `comprovante-entrega-${setor.nome_setor}.pdf`, 'application/pdf');
}

// ---------- Alternância entre cards de ferramenta (Documentos) ----------
const toolCards = document.querySelectorAll('.tool-card[data-tool]');
const toolAreas = document.querySelectorAll('.tool-area');

toolCards.forEach(card => {
  card.addEventListener('click', () => {
    toolCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const targetId = card.dataset.tool + 'ToolArea';
    toolAreas.forEach(area => {
      area.style.display = (area.id === targetId) ? 'flex' : 'none';
    });
  });
});

// ---------- Ferramenta: Juntar PDFs ----------
let mergeFiles = [];
let mergeIdCounter = 0;

const mergeDropzone = document.getElementById('mergeDropzone');
const mergeFileInput = document.getElementById('mergeFileInput');
const mergeBrowseBtn = document.getElementById('mergeBrowseBtn');
const mergeFileListEl = document.getElementById('mergeFileList');
const mergeRunBtn = document.getElementById('mergeRunBtn');
const mergeStatusEl = document.getElementById('mergeStatus');

mergeBrowseBtn.onclick = () => mergeFileInput.click();
mergeFileInput.addEventListener('change', e => addMergeFiles(e.target.files));

mergeDropzone.addEventListener('dragover', e => { e.preventDefault(); mergeDropzone.classList.add('dragover'); });
mergeDropzone.addEventListener('dragleave', () => mergeDropzone.classList.remove('dragover'));
mergeDropzone.addEventListener('drop', e => {
  e.preventDefault();
  mergeDropzone.classList.remove('dragover');
  addMergeFiles(e.dataTransfer.files);
});

function addMergeFiles(fileList){
  Array.from(fileList).forEach(file => {
    if(file.type !== 'application/pdf') return;
    mergeFiles.push({ id: 'f' + (mergeIdCounter++), file });
  });
  renderMergeFileList();
}

function renderMergeFileList(){
  mergeFileListEl.innerHTML = '';
  mergeFiles.forEach((item, index) => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = item.file.name;
    li.appendChild(nameSpan);

    const upBtn = document.createElement('button');
    upBtn.setAttribute('aria-label', 'Mover para cima');
    upBtn.textContent = '↑';
    upBtn.onclick = () => moveMergeFile(index, -1);
    li.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.setAttribute('aria-label', 'Mover para baixo');
    downBtn.textContent = '↓';
    downBtn.onclick = () => moveMergeFile(index, 1);
    li.appendChild(downBtn);

    const removeBtn = document.createElement('button');
    removeBtn.setAttribute('aria-label', 'Remover');
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => removeMergeFile(index);
    li.appendChild(removeBtn);

    mergeFileListEl.appendChild(li);
  });
  mergeRunBtn.disabled = mergeFiles.length < 2;
  mergeStatusEl.textContent = '';
  mergeStatusEl.className = 'tool-status';
}

function moveMergeFile(index, direction){
  const newIndex = index + direction;
  if(newIndex < 0 || newIndex >= mergeFiles.length) return;
  const temp = mergeFiles[index];
  mergeFiles[index] = mergeFiles[newIndex];
  mergeFiles[newIndex] = temp;
  renderMergeFileList();
}

function removeMergeFile(index){
  mergeFiles.splice(index, 1);
  renderMergeFileList();
}

mergeRunBtn.onclick = async () => {
  if(mergeFiles.length < 2) return;
  mergeRunBtn.disabled = true;
  mergeStatusEl.textContent = 'Juntando arquivos...';
  mergeStatusEl.className = 'tool-status';

  try{
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    for(const item of mergeFiles){
      const bytes = await item.file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }
    const mergedBytes = await mergedPdf.save();
    downloadBytes(mergedBytes, 'documento-unificado.pdf', 'application/pdf');
    mergeStatusEl.textContent = 'PDF gerado e baixado com sucesso.';
    mergeStatusEl.className = 'tool-status success';
  } catch(err){
    mergeStatusEl.textContent = 'Não foi possível juntar os arquivos. Verifique se todos são PDFs válidos.';
    mergeStatusEl.className = 'tool-status error';
  }
  mergeRunBtn.disabled = mergeFiles.length < 2;
};

// ---------- Ferramenta: Reordenar / excluir páginas (aceita múltiplos arquivos) ----------
let reorderSources = {}; // { sourceId: bytes }
let reorderSourceIdCounter = 0;
let reorderPages = []; // { id, sourceId, originalIndex, thumbnail }
let reorderPageIdCounter = 0;

const reorderDropzone = document.getElementById('reorderDropzone');
const reorderFileInput = document.getElementById('reorderFileInput');
const reorderBrowseBtn = document.getElementById('reorderBrowseBtn');
const reorderPageListEl = document.getElementById('reorderPageList');
const reorderRunBtn = document.getElementById('reorderRunBtn');
const reorderStatusEl = document.getElementById('reorderStatus');

reorderBrowseBtn.onclick = () => reorderFileInput.click();
reorderFileInput.addEventListener('change', e => {
  if(e.target.files.length) addReorderFiles(e.target.files);
});

reorderDropzone.addEventListener('dragover', e => { e.preventDefault(); reorderDropzone.classList.add('dragover'); });
reorderDropzone.addEventListener('dragleave', () => reorderDropzone.classList.remove('dragover'));
reorderDropzone.addEventListener('drop', e => {
  e.preventDefault();
  reorderDropzone.classList.remove('dragover');
  if(e.dataTransfer.files.length) addReorderFiles(e.dataTransfer.files);
});

if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

async function addReorderFiles(fileList){
  const files = Array.from(fileList).filter(f => f.type === 'application/pdf');
  if(files.length === 0) return;

  reorderRunBtn.disabled = true;
  reorderStatusEl.textContent = 'Lendo arquivo(s)...';
  reorderStatusEl.className = 'tool-status';

  for(const file of files){
    try{
      const bytes = await file.arrayBuffer();
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.load(bytes);
      const pageCount = pdf.getPageCount();

      const sourceId = 'src' + (reorderSourceIdCounter++);
      reorderSources[sourceId] = bytes;

      const novasPaginas = Array.from({ length: pageCount }, (_, i) => ({
        id: 'rp' + (reorderPageIdCounter++),
        sourceId,
        originalIndex: i,
        thumbnail: null,
      }));
      reorderPages = reorderPages.concat(novasPaginas);

      renderReorderPageList();
      reorderStatusEl.textContent = `${pageCount} página(s) adicionada(s) de "${file.name}". Arraste para reordenar ou adicione mais arquivos.`;
      reorderStatusEl.className = 'tool-status';

      renderReorderThumbnails(sourceId, bytes.slice(0));
    } catch(err){
      reorderStatusEl.textContent = `Não foi possível ler "${file.name}". Verifique se é um PDF válido.`;
      reorderStatusEl.className = 'tool-status error';
    }
  }
}

async function renderReorderThumbnails(sourceId, bytesCopy){
  if(!window.pdfjsLib) return;
  try{
    const pdfjsDoc = await pdfjsLib.getDocument({ data: bytesCopy }).promise;
    const paginasDesseArquivo = reorderPages.filter(p => p.sourceId === sourceId);
    for(const page of paginasDesseArquivo){
      try{
        const pdfjsPage = await pdfjsDoc.getPage(page.originalIndex + 1);
        const viewport = pdfjsPage.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfjsPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl = canvas.toDataURL();
        page.thumbnail = dataUrl;
        updateReorderThumbnailInDom(page.id, dataUrl);
      } catch(pageErr){ /* mantém o placeholder numerado para essa página */ }
    }
  } catch(docErr){ /* pdf.js indisponível — ferramenta continua funcional sem preview visual */ }
}

function updateReorderThumbnailInDom(pageId, dataUrl){
  const card = reorderPageListEl.querySelector(`[data-id="${pageId}"]`);
  if(!card) return;
  const thumbWrap = card.querySelector('.page-thumb');
  thumbWrap.classList.remove('thumb-loading');
  thumbWrap.innerHTML = '';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = '';
  thumbWrap.appendChild(img);
}

function renderReorderPageList(){
  reorderPageListEl.innerHTML = '';
  reorderPages.forEach((page, index) => {
    const li = document.createElement('li');
    li.className = 'page-card';
    li.draggable = true;
    li.dataset.id = page.id;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'page-thumb' + (page.thumbnail ? '' : ' thumb-loading');
    if(page.thumbnail){
      const img = document.createElement('img');
      img.src = page.thumbnail;
      img.alt = '';
      thumbWrap.appendChild(img);
    }
    li.appendChild(thumbWrap);

    const label = document.createElement('span');
    label.className = 'page-num';
    label.textContent = `Pág. ${index + 1}`;
    li.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'page-remove';
    removeBtn.setAttribute('aria-label', 'Excluir página');
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => { e.stopPropagation(); removeReorderPageById(page.id); };
    li.appendChild(removeBtn);

    li.addEventListener('dragstart', (e) => {
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', page.id);
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      reorderPageListEl.querySelectorAll('.page-card.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      reorderPageById(draggedId, page.id);
    });

    reorderPageListEl.appendChild(li);
  });
  reorderRunBtn.disabled = reorderPages.length === 0;
}

function reorderPageById(draggedId, targetId){
  if(draggedId === targetId) return;
  const fromIndex = reorderPages.findIndex(p => p.id === draggedId);
  const toIndex = reorderPages.findIndex(p => p.id === targetId);
  if(fromIndex === -1 || toIndex === -1) return;
  const [moved] = reorderPages.splice(fromIndex, 1);
  reorderPages.splice(toIndex, 0, moved);
  renderReorderPageList();
}

function removeReorderPageById(id){
  reorderPages = reorderPages.filter(p => p.id !== id);
  renderReorderPageList();
}

reorderRunBtn.onclick = async () => {
  if(reorderPages.length === 0) return;
  reorderRunBtn.disabled = true;
  reorderStatusEl.textContent = 'Gerando novo PDF...';
  reorderStatusEl.className = 'tool-status';

  try{
    const { PDFDocument } = PDFLib;
    const newPdf = await PDFDocument.create();

    // Carrega cada arquivo-fonte só uma vez, mesmo que várias páginas venham dele
    const loadedSources = {};
    for(const sourceId of Object.keys(reorderSources)){
      loadedSources[sourceId] = await PDFDocument.load(reorderSources[sourceId]);
    }

    for(const page of reorderPages){
      const sourcePdf = loadedSources[page.sourceId];
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.originalIndex]);
      newPdf.addPage(copiedPage);
    }

    const newBytes = await newPdf.save();
    downloadBytes(newBytes, 'documento-editado.pdf', 'application/pdf');
    reorderStatusEl.textContent = 'PDF gerado e baixado com sucesso.';
    reorderStatusEl.className = 'tool-status success';
  } catch(err){
    reorderStatusEl.textContent = 'Não foi possível gerar o novo PDF.';
    reorderStatusEl.className = 'tool-status error';
  }
  reorderRunBtn.disabled = reorderPages.length === 0;
};

// ---------- Ferramenta: Dividir / extrair páginas ----------
let splitSourceBytes = null;
let splitPages = [];

const splitDropzone = document.getElementById('splitDropzone');
const splitFileInput = document.getElementById('splitFileInput');
const splitBrowseBtn = document.getElementById('splitBrowseBtn');
const splitActionsEl = document.getElementById('splitActions');
const splitPageListEl = document.getElementById('splitPageList');
const splitRunBtn = document.getElementById('splitRunBtn');
const splitStatusEl = document.getElementById('splitStatus');
const splitSelectAllBtn = document.getElementById('splitSelectAllBtn');
const splitClearBtn = document.getElementById('splitClearBtn');

splitBrowseBtn.onclick = () => splitFileInput.click();
splitFileInput.addEventListener('change', e => {
  if(e.target.files.length) loadSplitFile(e.target.files[0]);
});

splitDropzone.addEventListener('dragover', e => { e.preventDefault(); splitDropzone.classList.add('dragover'); });
splitDropzone.addEventListener('dragleave', () => splitDropzone.classList.remove('dragover'));
splitDropzone.addEventListener('drop', e => {
  e.preventDefault();
  splitDropzone.classList.remove('dragover');
  if(e.dataTransfer.files.length) loadSplitFile(e.dataTransfer.files[0]);
});

async function loadSplitFile(file){
  if(file.type !== 'application/pdf') return;
  splitStatusEl.textContent = 'Lendo o arquivo...';
  splitStatusEl.className = 'tool-status';
  splitRunBtn.disabled = true;

  try{
    const bytes = await file.arrayBuffer();
    const { PDFDocument } = PDFLib;
    const pdf = await PDFDocument.load(bytes);
    const pageCount = pdf.getPageCount();

    splitSourceBytes = bytes;
    splitPages = Array.from({ length: pageCount }, (_, i) => ({
      originalIndex: i,
      selected: false,
    }));

    splitActionsEl.style.display = 'flex';
    renderSplitPageList();
    splitStatusEl.textContent = `${pageCount} página(s) carregada(s) de "${file.name}". Selecione as que quer extrair.`;
    splitStatusEl.className = 'tool-status';
  } catch(err){
    splitStatusEl.textContent = 'Não foi possível ler esse arquivo. Verifique se é um PDF válido.';
    splitStatusEl.className = 'tool-status error';
  }
}

function renderSplitPageList(){
  splitPageListEl.innerHTML = '';
  splitPages.forEach((page, index) => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = page.selected;
    checkbox.setAttribute('aria-label', `Selecionar página ${index + 1}`);
    checkbox.onchange = () => {
      splitPages[index].selected = checkbox.checked;
      updateSplitRunState();
    };
    li.appendChild(checkbox);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = `Página ${index + 1}`;
    li.appendChild(nameSpan);

    splitPageListEl.appendChild(li);
  });
  updateSplitRunState();
}

function updateSplitRunState(){
  splitRunBtn.disabled = !splitPages.some(p => p.selected);
}

splitSelectAllBtn.onclick = () => {
  splitPages.forEach(p => p.selected = true);
  renderSplitPageList();
};
splitClearBtn.onclick = () => {
  splitPages.forEach(p => p.selected = false);
  renderSplitPageList();
};

splitRunBtn.onclick = async () => {
  const indices = splitPages.filter(p => p.selected).map(p => p.originalIndex);
  if(!splitSourceBytes || indices.length === 0) return;
  splitRunBtn.disabled = true;
  splitStatusEl.textContent = 'Extraindo páginas...';
  splitStatusEl.className = 'tool-status';

  try{
    const { PDFDocument } = PDFLib;
    const sourcePdf = await PDFDocument.load(splitSourceBytes);
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(sourcePdf, indices);
    pages.forEach(p => newPdf.addPage(p));
    const newBytes = await newPdf.save();
    downloadBytes(newBytes, 'paginas-extraidas.pdf', 'application/pdf');
    splitStatusEl.textContent = 'PDF gerado e baixado com sucesso.';
    splitStatusEl.className = 'tool-status success';
  } catch(err){
    splitStatusEl.textContent = 'Não foi possível extrair as páginas selecionadas.';
    splitStatusEl.className = 'tool-status error';
  }
  updateSplitRunState();
};

// ---------- Entregas: criação de campanha ----------
const newCampaignBtn = document.getElementById('newCampaignBtn');
const campaignFormWrap = document.getElementById('campaignFormWrap');
const campaignNameInput = document.getElementById('campaignNameInput');
const campaignDropzone = document.getElementById('campaignDropzone');
const campaignFileInput = document.getElementById('campaignFileInput');
const campaignBrowseBtn = document.getElementById('campaignBrowseBtn');
const campaignPreviewEl = document.getElementById('campaignPreview');
const campaignPrazoInput = document.getElementById('campaignPrazoInput');
const campaignCancelBtn = document.getElementById('campaignCancelBtn');
const campaignCreateBtn = document.getElementById('campaignCreateBtn');
const campaignStatusEl = document.getElementById('campaignStatus');
const campaignListEl = document.getElementById('campaignList');

let parsedRows = []; // { matricula, nome, setor }

newCampaignBtn.onclick = () => {
  campaignFormWrap.style.display = 'flex';
  newCampaignBtn.style.display = 'none';
};
campaignCancelBtn.onclick = () => {
  campaignFormWrap.style.display = 'none';
  newCampaignBtn.style.display = 'inline-flex';
  resetCampaignForm();
};

function resetCampaignForm(){
  campaignNameInput.value = '';
  campaignPrazoInput.value = '';
  parsedRows = [];
  campaignPreviewEl.innerHTML = '';
  campaignCreateBtn.disabled = true;
  campaignStatusEl.textContent = '';
  campaignStatusEl.className = 'tool-status';
}

campaignBrowseBtn.onclick = () => campaignFileInput.click();
campaignFileInput.addEventListener('change', e => {
  if(e.target.files.length) parseSpreadsheet(e.target.files[0]);
});
campaignDropzone.addEventListener('dragover', e => { e.preventDefault(); campaignDropzone.classList.add('dragover'); });
campaignDropzone.addEventListener('dragleave', () => campaignDropzone.classList.remove('dragover'));
campaignDropzone.addEventListener('drop', e => {
  e.preventDefault();
  campaignDropzone.classList.remove('dragover');
  if(e.dataTransfer.files.length) parseSpreadsheet(e.dataTransfer.files[0]);
});

function findColumnKey(keys, target){
  return keys.find(k => k.toLowerCase().trim() === target) || null;
}

function parseSpreadsheet(file){
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      parsedRows = rows.map(row => {
        const keys = Object.keys(row);
        const matriculaKey = findColumnKey(keys, 'matricula') || findColumnKey(keys, 'matrícula');
        const nomeKey = findColumnKey(keys, 'nome') || keys[1] || keys[0];
        const setorKey = findColumnKey(keys, 'setor') || keys[2] || keys[1];
        return {
          matricula: String((matriculaKey ? row[matriculaKey] : '') || '').trim(),
          nome: String((nomeKey ? row[nomeKey] : '') || '').trim(),
          setor: String((setorKey ? row[setorKey] : '') || '').trim(),
        };
      }).filter(r => r.nome && r.setor);

      renderCampaignPreview();
    } catch(err){
      campaignStatusEl.textContent = 'Não foi possível ler essa planilha. Verifique se tem colunas "matrícula", "nome" e "setor".';
      campaignStatusEl.className = 'tool-status error';
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderCampaignPreview(){
  if(parsedRows.length === 0){
    campaignPreviewEl.innerHTML = '';
    campaignCreateBtn.disabled = true;
    return;
  }
  const bySetor = {};
  parsedRows.forEach(r => { bySetor[r.setor] = (bySetor[r.setor] || 0) + 1; });
  const setores = Object.keys(bySetor);

  campaignPreviewEl.innerHTML = '';
  const summary = document.createElement('p');
  summary.className = 'tool-status';
  summary.textContent = `${parsedRows.length} colaborador(es) encontrados em ${setores.length} setor(es):`;
  campaignPreviewEl.appendChild(summary);

  const ul = document.createElement('ul');
  ul.className = 'file-list';
  setores.forEach(s => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = s;
    li.appendChild(nameSpan);
    const countSpan = document.createElement('span');
    countSpan.textContent = bySetor[s];
    li.appendChild(countSpan);
    ul.appendChild(li);
  });
  campaignPreviewEl.appendChild(ul);

  campaignCreateBtn.disabled = !campaignNameInput.value.trim();
}

campaignNameInput.addEventListener('input', () => {
  campaignCreateBtn.disabled = parsedRows.length === 0 || !campaignNameInput.value.trim();
});

async function createSetorWithColaboradores(campanhaId, nomeSetor, colaboradores){
  // colaboradores: [{ nome, matricula }]
  const { data: setor, error: setorErr } = await supabaseClient
    .from('setores')
    .insert({ campanha_id: campanhaId, nome_setor: nomeSetor })
    .select()
    .single();
  if(setorErr) throw setorErr;

  const payload = colaboradores.map(c => ({
    setor_id: setor.id,
    nome: c.nome,
    matricula: c.matricula || null,
  }));
  const { error: colabErr } = await supabaseClient.from('colaboradores').insert(payload);
  if(colabErr) throw colabErr;

  return setor;
}

campaignCreateBtn.onclick = async () => {
  if(!supabaseClient){
    campaignStatusEl.textContent = 'Conexão com o banco não disponível.';
    campaignStatusEl.className = 'tool-status error';
    return;
  }
  const nome = campaignNameInput.value.trim();
  if(!nome || parsedRows.length === 0) return;

  const prazoHoras = campaignPrazoInput.value.trim() ? Number(campaignPrazoInput.value) : null;

  campaignCreateBtn.disabled = true;
  campaignStatusEl.textContent = 'Criando campanha...';
  campaignStatusEl.className = 'tool-status';

  try{
    const { data: campanha, error: campErr } = await supabaseClient
      .from('campanhas')
      .insert({ nome, prazo_horas: prazoHoras })
      .select()
      .single();
    if(campErr) throw campErr;

    const bySetor = {};
    parsedRows.forEach(r => {
      if(!bySetor[r.setor]) bySetor[r.setor] = [];
      bySetor[r.setor].push({ nome: r.nome, matricula: r.matricula });
    });

    for(const [nomeSetor, colaboradores] of Object.entries(bySetor)){
      await createSetorWithColaboradores(campanha.id, nomeSetor, colaboradores);
    }

    campaignStatusEl.textContent = 'Campanha criada com sucesso!';
    campaignStatusEl.className = 'tool-status success';
    campaignFormWrap.style.display = 'none';
    newCampaignBtn.style.display = 'inline-flex';
    resetCampaignForm();
    loadCampaigns();
  } catch(err){
    campaignStatusEl.textContent = 'Não foi possível criar a campanha. Tente novamente.';
    campaignStatusEl.className = 'tool-status error';
    campaignCreateBtn.disabled = false;
  }
};

// ---------- Listagem de campanhas ----------
async function loadCampaigns(){
  if(!supabaseClient){
    campaignListEl.innerHTML = '<p class="empty-sub">Conexão com o banco não disponível.</p>';
    return;
  }
  const { data: campanhas, error } = await supabaseClient
    .from('campanhas')
    .select('*, setores(*, colaboradores(*))')
    .order('criado_em', { ascending: false });

  if(error){
    campaignListEl.innerHTML = '<p class="tool-status error">Não foi possível carregar as campanhas.</p>';
    return;
  }
  renderCampaignList(campanhas);
}

function renderCampaignList(campanhas){
  campaignListEl.innerHTML = '';
  if(!campanhas || campanhas.length === 0){
    campaignListEl.innerHTML = '<p class="empty-sub">Nenhuma campanha criada ainda.</p>';
    return;
  }
  campanhas.forEach(campanha => {
    const card = document.createElement('div');
    card.className = 'campaign-card';

    const header = document.createElement('div');
    header.className = 'campaign-card-header';

    const titleWrap = document.createElement('div');
    titleWrap.style.display = 'flex';
    titleWrap.style.alignItems = 'center';
    titleWrap.style.flex = '1';
    const strong = document.createElement('strong');
    strong.textContent = campanha.nome;
    titleWrap.appendChild(strong);
    header.appendChild(titleWrap);

    const actions = document.createElement('div');
    actions.className = 'campaign-card-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.onclick = () => startRenameCampaign(campanha, titleWrap, strong, editBtn);
    actions.appendChild(editBtn);

    const addSetorBtn = document.createElement('button');
    addSetorBtn.textContent = '+ Setor';
    addSetorBtn.onclick = () => showManualSetorModal(campanha.id);
    actions.appendChild(addSetorBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger-action';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.onclick = () => deleteCampaign(campanha.id, campanha.nome);
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    card.appendChild(header);

    const setorList = document.createElement('div');
    setorList.className = 'setor-list';
    (campanha.setores || []).forEach(setor => {
      const total = (setor.colaboradores || []).length;
      const recebidos = (setor.colaboradores || []).filter(c => c.recebeu).length;
      const confirmado = setor.status === 'confirmado';

      const row = document.createElement('div');
      row.className = 'setor-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'setor-name';
      nameSpan.textContent = setor.nome_setor;
      row.appendChild(nameSpan);

      const badge = document.createElement('span');
      badge.className = 'setor-badge ' + (confirmado ? 'status-confirmado' : 'status-pendente');
      badge.textContent = confirmado ? 'Confirmado' : 'Aguardando confirmação';
      row.appendChild(badge);

      const progress = document.createElement('span');
      progress.className = 'setor-progress';
      progress.textContent = `${recebidos}/${total} entregues`;
      row.appendChild(progress);

      const qrBtn = document.createElement('button');
      qrBtn.className = 'link-btn';
      qrBtn.textContent = 'Ver QR Code';
      qrBtn.onclick = () => showQrModal(setor.id, `${campanha.nome} · ${setor.nome_setor}`, setor.status === 'confirmado');
      row.appendChild(qrBtn);

      const comprovanteBtn = document.createElement('button');
      comprovanteBtn.className = 'link-btn';
      comprovanteBtn.textContent = 'Comprovante de entrega';
      comprovanteBtn.onclick = () => downloadComprovanteEntrega(campanha.nome, setor);
      row.appendChild(comprovanteBtn);

      setorList.appendChild(row);
    });
    card.appendChild(setorList);
    campaignListEl.appendChild(card);
  });
}

function startRenameCampaign(campanha, titleWrap, strong, editBtn){
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'campaign-rename-input';
  input.value = campanha.nome;
  titleWrap.replaceChild(input, strong);
  editBtn.textContent = 'Salvar';
  input.focus();

  const save = async () => {
    const novoNome = input.value.trim();
    editBtn.onclick = () => startRenameCampaign(campanha, titleWrap, strong, editBtn);
    editBtn.textContent = 'Editar';
    if(!novoNome || novoNome === campanha.nome){
      titleWrap.replaceChild(strong, input);
      return;
    }
    strong.textContent = novoNome;
    titleWrap.replaceChild(strong, input);
    if(supabaseClient){
      await supabaseClient.from('campanhas').update({ nome: novoNome }).eq('id', campanha.id);
    }
    loadCampaigns();
  };
  editBtn.onclick = save;
  input.addEventListener('keydown', e => { if(e.key === 'Enter') save(); });
}

async function deleteCampaign(campanhaId, nome){
  if(!confirm(`Excluir a campanha "${nome}"? Isso remove todos os setores e colaboradores dela. Essa ação não pode ser desfeita.`)) return;
  if(!supabaseClient) return;
  await supabaseClient.from('campanhas').delete().eq('id', campanhaId);
  loadCampaigns();
}

// ---------- Adicionar setor manualmente ----------
const manualSetorModalWrap = document.getElementById('manualSetorModalWrap');
const manualSetorClose = document.getElementById('manualSetorClose');
const manualSetorNameInput = document.getElementById('manualSetorNameInput');
const manualSetorTextarea = document.getElementById('manualSetorTextarea');
const manualSetorSaveBtn = document.getElementById('manualSetorSaveBtn');
const manualSetorStatus = document.getElementById('manualSetorStatus');

let manualSetorCampanhaId = null;

function showManualSetorModal(campanhaId){
  manualSetorCampanhaId = campanhaId;
  manualSetorNameInput.value = '';
  manualSetorTextarea.value = '';
  manualSetorStatus.textContent = '';
  manualSetorStatus.className = 'tool-status';
  manualSetorModalWrap.style.display = 'flex';
}
function closeManualSetorModal(){
  manualSetorModalWrap.style.display = 'none';
}
manualSetorClose.onclick = closeManualSetorModal;
manualSetorModalWrap.addEventListener('click', (e) => {
  if(e.target === manualSetorModalWrap) closeManualSetorModal();
});

manualSetorSaveBtn.onclick = async () => {
  const nomeSetor = manualSetorNameInput.value.trim();
  const linhas = manualSetorTextarea.value.split('\n').map(l => l.trim()).filter(Boolean);

  if(!nomeSetor || linhas.length === 0){
    manualSetorStatus.textContent = 'Informe o nome do setor e pelo menos um colaborador.';
    manualSetorStatus.className = 'tool-status error';
    return;
  }
  if(!supabaseClient){
    manualSetorStatus.textContent = 'Conexão com o banco não disponível.';
    manualSetorStatus.className = 'tool-status error';
    return;
  }

  const colaboradores = linhas.map(linha => {
    const partes = linha.split(',').map(p => p.trim());
    if(partes.length >= 2){
      return { matricula: partes[0], nome: partes.slice(1).join(', ') };
    }
    return { matricula: '', nome: partes[0] };
  }).filter(c => c.nome);

  manualSetorSaveBtn.disabled = true;
  manualSetorStatus.textContent = 'Salvando...';
  manualSetorStatus.className = 'tool-status';

  try{
    await createSetorWithColaboradores(manualSetorCampanhaId, nomeSetor, colaboradores);
    manualSetorStatus.textContent = 'Setor adicionado com sucesso!';
    manualSetorStatus.className = 'tool-status success';
    closeManualSetorModal();
    loadCampaigns();
  } catch(err){
    manualSetorStatus.textContent = 'Não foi possível adicionar o setor. Tente novamente.';
    manualSetorStatus.className = 'tool-status error';
  }
  manualSetorSaveBtn.disabled = false;
};

// ---------- Modal de QR Code ----------
const qrModalWrap = document.getElementById('qrModalWrap');
const qrModalTitle = document.getElementById('qrModalTitle');
const qrModalCanvasWrap = document.getElementById('qrModalCanvas');
const qrModalLink = document.getElementById('qrModalLink');
const qrModalClose = document.getElementById('qrModalClose');
const qrModalDownload = document.getElementById('qrModalDownload');
const qrModalCopyLink = document.getElementById('qrModalCopyLink');
const qrModalWhatsapp = document.getElementById('qrModalWhatsapp');

let currentQrUrl = '';
let currentQrLabel = '';
let currentQrConfirmado = false;

function closeQrModal(){
  qrModalWrap.style.display = 'none';
}
qrModalClose.onclick = closeQrModal;
qrModalWrap.addEventListener('click', (e) => {
  if(e.target === qrModalWrap) closeQrModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    closeQrModal();
    closeManualSetorModal();
  }
});

function showQrModal(setorId, title, jaConfirmado){
  const basePath = location.pathname.replace(/index\.html$/, '');
  const url = `${location.origin}${basePath}entrega.html?setor=${setorId}`;
  currentQrUrl = url;
  currentQrLabel = title;
  currentQrConfirmado = !!jaConfirmado;
  qrModalTitle.textContent = title;
  qrModalLink.textContent = url;
  qrModalCanvasWrap.innerHTML = '';

  try{
    if(window.QRCode){
      new QRCode(qrModalCanvasWrap, { text: url, width: 220, height: 220 });
    } else {
      qrModalCanvasWrap.innerHTML = '<p class="tool-status error">Não foi possível carregar o gerador de QR Code. Use o link abaixo.</p>';
    }
  } catch(err){
    qrModalCanvasWrap.innerHTML = '<p class="tool-status error">Não foi possível gerar o QR Code. Use o link abaixo.</p>';
  }

  qrModalWrap.style.display = 'flex';
}

qrModalDownload.onclick = () => {
  const canvas = qrModalCanvasWrap.querySelector('canvas');
  const img = qrModalCanvasWrap.querySelector('img');
  let dataUrl = null;
  try{
    if(canvas) dataUrl = canvas.toDataURL('image/png');
    else if(img) dataUrl = img.src;
  } catch(err){ dataUrl = null; }

  if(!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `qrcode-${qrModalTitle.textContent.replace(/\s+/g, '-')}.png`;
  a.click();
};

qrModalCopyLink.onclick = () => {
  if(!currentQrUrl) return;
  const original = qrModalCopyLink.textContent;
  const done = () => { qrModalCopyLink.textContent = 'Link copiado!'; setTimeout(() => { qrModalCopyLink.textContent = original; }, 1500); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(currentQrUrl).then(done).catch(done);
  } else {
    done();
  }
};

qrModalWhatsapp.onclick = () => {
  if(!currentQrUrl) return;
  const mensagem = currentQrConfirmado
    ? `Olá! Segue a lista de colaboradores de "${currentQrLabel}" pra você continuar a entrega e marcar quem já recebeu: ${currentQrUrl}`
    : `Olá! Você precisa confirmar o recebimento deste lote: "${currentQrLabel}". Acesse o link: ${currentQrUrl}`;
  const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
};

// ---------- Atualização em tempo real ----------
if(supabaseClient){
  try{
    supabaseClient
      .channel('entregas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setores' }, () => loadCampaigns())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => loadCampaigns())
      .subscribe();
  } catch(err){ /* tempo real é um extra; a lista ainda funciona via carregamento manual */ }
}

loadCampaigns();

// ---------- Admissão: checklist de documentos ----------
const ADMISSION_TEMPLATE = [
  { ordem: 0, secao: null, descricao: 'Aceite de Proposta de Trabalho' },
  { ordem: 1, secao: null, descricao: 'Formulário de Pré-Admissão devidamente preenchido' },
  { ordem: 2, secao: null, descricao: 'Foto 3x4' },
  { ordem: 3, secao: null, descricao: 'Identidade (RG)' },
  { ordem: 4, secao: null, descricao: 'CPF' },
  { ordem: 5, secao: null, descricao: 'Título de Eleitor ou Comprovante da última votação ou Nada Consta com a Justiça Eleitoral' },
  { ordem: 6, secao: null, descricao: 'Cartão do SUS (Titular e Dependente)' },
  { ordem: 7, secao: null, descricao: 'Reservista' },
  { ordem: 8, secao: null, descricao: 'Registro Profissional (emitido pelo Conselho de Classe)' },
  { ordem: 9, secao: null, descricao: 'Comprovante de Residência atualizado (Conta de água ou Telefone)' },
  { ordem: 10, secao: null, descricao: 'Currículo Atualizado' },
  { ordem: 11, secao: null, descricao: 'Declaração de Conclusão do Ensino Médio ou Diplomas, ou Declaração de cursando o nível superior' },
  { ordem: 12, secao: null, descricao: 'Certificado de Curso (Técnico, Vigilante, Aux. Segurança)' },
  { ordem: 13, secao: null, descricao: 'Cópia atualizada do cadastro de PIS/PASEP (não obrigatório para estagiário)' },
  { ordem: 14, secao: null, descricao: 'Carteira de Trabalho: cópia da página da foto e dados pessoais' },
  { ordem: 15, secao: null, descricao: 'Dados bancários emitido pelo Banco Santander (conforme documento entregue pelo RH)' },
  { ordem: 16, secao: null, descricao: 'Qualificação Cadastral E-Social em lote (emitido pelo RH)' },
  { ordem: 17, secao: null, descricao: 'Cartão de Vacina Atualizado (Tétano, Febre Amarela, Hepatite B e Covid-19)' },
  { ordem: 18, secao: 'Se casado', descricao: 'Certidão de Casamento ou Declaração de União Estável' },
  { ordem: 19, secao: 'Se casado', descricao: 'Cópia do RG do cônjuge' },
  { ordem: 20, secao: 'Com filhos', descricao: 'Certidão de Nascimento dos filhos menores de 14 anos ou inválidos de qualquer idade' },
  { ordem: 21, secao: 'Com filhos', descricao: 'CPF dos filhos (obrigatório para filhos a partir de 1 ano de idade)' },
  { ordem: 22, secao: 'Com filhos', descricao: 'Cartão de Vacina dos filhos menores de 14 anos, atualizado até a data de admissão (não obrigatório para estagiário)' },
  { ordem: 23, secao: 'Com filhos', descricao: 'Comprovante de matrícula e frequência escolar para os filhos de 7 a 14 anos' },
  { ordem: 24, secao: 'Se estrangeiro', descricao: 'Número de inscrição no Registro Nacional de Estrangeiros, órgão, UF e data de expedição' },
  { ordem: 25, secao: 'Se estrangeiro', descricao: 'Passaporte' },
];

const newAdmissionBtn = document.getElementById('newAdmissionBtn');
const admissionFormWrap = document.getElementById('admissionFormWrap');
const admissionNameInput = document.getElementById('admissionNameInput');
const admissionCancelBtn = document.getElementById('admissionCancelBtn');
const admissionCreateBtn = document.getElementById('admissionCreateBtn');
const admissionStatusEl = document.getElementById('admissionStatus');
const admissionListEl = document.getElementById('admissionList');
const admissionListScroll = document.getElementById('admissionListScroll');
const admissionDetailScroll = document.getElementById('admissionDetailScroll');
const admissionDetailTitle = document.getElementById('admissionDetailTitle');
const admissionChecklistEl = document.getElementById('admissionChecklist');
const admissionBackBtn = document.getElementById('admissionBackBtn');
const admissionDownloadBtn = document.getElementById('admissionDownloadBtn');

let currentAdmissao = null;
let currentAdmissaoItens = [];

newAdmissionBtn.onclick = () => {
  admissionFormWrap.style.display = 'flex';
  newAdmissionBtn.style.display = 'none';
};
admissionCancelBtn.onclick = () => {
  admissionFormWrap.style.display = 'none';
  newAdmissionBtn.style.display = 'inline-flex';
  admissionNameInput.value = '';
  admissionStatusEl.textContent = '';
  admissionStatusEl.className = 'tool-status';
};
admissionNameInput.addEventListener('input', () => {
  admissionCreateBtn.disabled = !admissionNameInput.value.trim();
});

admissionCreateBtn.onclick = async () => {
  const nome = admissionNameInput.value.trim();
  if(!nome || !supabaseClient) return;

  admissionCreateBtn.disabled = true;
  admissionStatusEl.textContent = 'Criando checklist...';
  admissionStatusEl.className = 'tool-status';

  try{
    const { data: admissao, error: admErr } = await supabaseClient
      .from('admissoes')
      .insert({ colaborador_nome: nome })
      .select()
      .single();
    if(admErr) throw admErr;

    const itensPayload = ADMISSION_TEMPLATE.map(item => ({
      admissao_id: admissao.id,
      ordem: item.ordem,
      secao: item.secao,
      descricao: item.descricao,
    }));
    const { error: itensErr } = await supabaseClient.from('admissao_itens').insert(itensPayload);
    if(itensErr) throw itensErr;

    admissionFormWrap.style.display = 'none';
    newAdmissionBtn.style.display = 'inline-flex';
    admissionNameInput.value = '';
    admissionStatusEl.textContent = '';
    admissionStatusEl.className = 'tool-status';
    loadAdmissions();
  } catch(err){
    admissionStatusEl.textContent = 'Não foi possível criar a checklist. Tente novamente.';
    admissionStatusEl.className = 'tool-status error';
  }
  admissionCreateBtn.disabled = false;
};

async function loadAdmissions(){
  if(!supabaseClient){
    admissionListEl.innerHTML = '<p class="empty-sub">Conexão com o banco não disponível.</p>';
    return;
  }
  const { data: admissoes, error } = await supabaseClient
    .from('admissoes')
    .select('*, admissao_itens(*)')
    .order('criado_em', { ascending: false });

  if(error){
    admissionListEl.innerHTML = '<p class="tool-status error">Não foi possível carregar as checklists.</p>';
    return;
  }
  renderAdmissionList(admissoes);
}

function renderAdmissionList(admissoes){
  admissionListEl.innerHTML = '';
  if(!admissoes || admissoes.length === 0){
    admissionListEl.innerHTML = '<p class="empty-sub">Nenhuma checklist criada ainda.</p>';
    return;
  }
  admissoes.forEach(admissao => {
    const itens = admissao.admissao_itens || [];
    const aplicaveis = itens.filter(i => !i.nao_aplica).length;
    const recebidos = itens.filter(i => i.recebido).length;

    const card = document.createElement('div');
    card.className = 'campaign-card';

    const header = document.createElement('div');
    header.className = 'campaign-card-header';

    const strong = document.createElement('strong');
    strong.textContent = admissao.colaborador_nome;
    header.appendChild(strong);

    const actions = document.createElement('div');
    actions.className = 'campaign-card-actions';

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Abrir checklist';
    openBtn.onclick = () => openAdmissionDetail(admissao);
    actions.appendChild(openBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger-action';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.onclick = () => deleteAdmission(admissao.id, admissao.colaborador_nome);
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    card.appendChild(header);

    const progress = document.createElement('p');
    progress.className = 'checklist-progress';
    progress.textContent = `${recebidos}/${aplicaveis} documentos recebidos`;
    card.appendChild(progress);

    admissionListEl.appendChild(card);
  });
}

async function deleteAdmission(admissaoId, nome){
  if(!confirm(`Excluir a checklist de "${nome}"? Essa ação não pode ser desfeita.`)) return;
  if(!supabaseClient) return;
  await supabaseClient.from('admissoes').delete().eq('id', admissaoId);
  loadAdmissions();
}

function openAdmissionDetail(admissao){
  currentAdmissao = admissao;
  currentAdmissaoItens = (admissao.admissao_itens || []).slice().sort((a, b) => a.ordem - b.ordem);

  admissionDetailTitle.textContent = admissao.colaborador_nome;

  renderAdmissionChecklist();

  admissionListScroll.style.display = 'none';
  admissionDetailScroll.style.display = 'block';
}

admissionBackBtn.onclick = () => {
  admissionDetailScroll.style.display = 'none';
  admissionListScroll.style.display = 'block';
  loadAdmissions();
};

function renderAdmissionChecklist(){
  admissionChecklistEl.innerHTML = '';
  let lastSecao = undefined;

  currentAdmissaoItens.forEach(item => {
    if(item.secao !== lastSecao){
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'checklist-section-title';
      sectionTitle.textContent = item.secao || 'Documentos gerais';
      admissionChecklistEl.appendChild(sectionTitle);
      lastSecao = item.secao;
    }

    const row = document.createElement('div');
    row.className = 'checklist-item' + (item.nao_aplica ? ' checklist-item-na' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!item.recebido;
    checkbox.disabled = !!item.nao_aplica;
    checkbox.onchange = async () => {
      item.recebido = checkbox.checked;
      if(supabaseClient){
        await supabaseClient
          .from('admissao_itens')
          .update({
            recebido: checkbox.checked,
            recebido_em: checkbox.checked ? new Date().toISOString() : null,
          })
          .eq('id', item.id);
      }
    };
    row.appendChild(checkbox);

    const label = document.createElement('span');
    label.className = 'checklist-item-label';
    label.textContent = item.descricao;
    row.appendChild(label);

    const naBtn = document.createElement('button');
    naBtn.className = 'checklist-na-btn';
    naBtn.textContent = item.nao_aplica ? 'Reativar' : 'N/A';
    naBtn.title = item.nao_aplica ? 'Esse documento volta a ser necessário' : 'Marcar como não aplicável a essa admissão';
    naBtn.onclick = async () => {
      item.nao_aplica = !item.nao_aplica;
      if(item.nao_aplica){
        item.recebido = false;
        item.recebido_em = null;
      }
      renderAdmissionChecklist();
      if(supabaseClient){
        await supabaseClient
          .from('admissao_itens')
          .update({
            nao_aplica: item.nao_aplica,
            recebido: item.nao_aplica ? false : item.recebido,
            recebido_em: item.nao_aplica ? null : item.recebido_em,
          })
          .eq('id', item.id);
      }
    };
    row.appendChild(naBtn);

    admissionChecklistEl.appendChild(row);
  });
}

admissionDownloadBtn.onclick = async () => {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PRIMARY = rgb(0.263, 0.220, 0.792);
  const INK = rgb(0.09, 0.10, 0.13);
  const MUTED = rgb(0.42, 0.45, 0.50);
  const PANEL = rgb(0.969, 0.969, 0.984);
  const SUCCESS = rgb(0.071, 0.549, 0.290);
  const PENDING_BORDER = rgb(0.75, 0.76, 0.80);

  const marginX = 50;

  // Cabeçalho com espaço para os logos institucionais (Ceuma e RH).
  // A logo do ReHum não entra na impressão — ver crédito no rodapé.
  const logoSize = 34;
  const logoY = pageHeight - 30 - logoSize;
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

  let y = logoY - 16;
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 2, color: PRIMARY });
  y -= 30;

  page.drawText('Checklist de admissão', { x: marginX, y, size: 18, font: bold, color: PRIMARY });
  y -= 28;

  const aplicaveis = currentAdmissaoItens.filter(i => !i.nao_aplica).length;
  const recebidos = currentAdmissaoItens.filter(i => i.recebido).length;
  const naoAplicaveis = currentAdmissaoItens.length - aplicaveis;

  const infoLines = [
    `Colaborador: ${currentAdmissao.colaborador_nome}`,
    `Documentos recebidos: ${recebidos}/${aplicaveis}`,
  ];
  if(naoAplicaveis > 0){
    infoLines.push(`Documentos não aplicáveis a essa admissão: ${naoAplicaveis}`);
  }
  const infoHeight = infoLines.length * 19 + 16;
  const infoStartY = y;
  page.drawRectangle({ x: marginX, y: infoStartY - infoHeight + 15, width: pageWidth - marginX * 2, height: infoHeight, color: PANEL });
  page.drawRectangle({ x: marginX, y: infoStartY - infoHeight + 15, width: 3, height: infoHeight, color: PRIMARY });

  y -= 6;
  infoLines.forEach(line => {
    page.drawText(line, { x: marginX + 14, y, size: 12, font, color: INK });
    y -= 19;
  });
  y -= 6;

  page.drawText(`Emitido em: ${formatBrasilia(new Date())} (horário de Brasília)`, { x: marginX, y, size: 9.5, font, color: MUTED });
  y -= 30;

  let lastSecao = undefined;
  const maxCharsPerLine = 98;
  const bottomLimit = 70;

  currentAdmissaoItens.forEach(item => {
    if(y < bottomLimit){
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 60;
    }
    if(item.secao !== lastSecao){
      y -= 4;
      page.drawText((item.secao || 'DOCUMENTOS GERAIS').toUpperCase(), { x: marginX, y, size: 10.5, font: bold, color: PRIMARY });
      y -= 13;
      lastSecao = item.secao;
    }

    const NEUTRAL = rgb(0.85, 0.85, 0.88);
    const dotColor = item.nao_aplica ? NEUTRAL : (item.recebido ? SUCCESS : PENDING_BORDER);
    page.drawCircle({ x: marginX + 3, y: y + 3.2, size: 3, color: dotColor });

    const textoItem = item.nao_aplica ? `${item.descricao} (não aplicável)` : item.descricao;
    const textColor = item.nao_aplica ? MUTED : INK;

    const words = textoItem.split(' ');
    let linha = '';
    const linhas = [];
    words.forEach(w => {
      if((linha + ' ' + w).trim().length > maxCharsPerLine){
        linhas.push(linha.trim());
        linha = w;
      } else {
        linha = (linha + ' ' + w).trim();
      }
    });
    if(linha) linhas.push(linha);

    linhas.forEach(l => {
      if(y < bottomLimit){
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 60;
      }
      page.drawText(l, { x: marginX + 14, y, size: 9.5, font, color: textColor });
      y -= 12.5;
    });
    y -= 2;
  });

  y = Math.min(y, 44);
  page.drawLine({ start: { x: marginX, y: 38 }, end: { x: pageWidth - marginX, y: 38 }, thickness: 0.5, color: PENDING_BORDER });
  page.drawText('Documento gerado via ReHum', { x: marginX, y: 22, size: 8.5, font: italic, color: MUTED });

  const bytes = await pdfDoc.save();
  downloadBytes(bytes, `checklist-admissao-${currentAdmissao.colaborador_nome.replace(/\s+/g, '-')}.pdf`, 'application/pdf');
};

if(supabaseClient){
  try{
    supabaseClient
      .channel('admissoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissao_itens' }, () => {
        if(admissionDetailScroll.style.display === 'none') loadAdmissions();
      })
      .subscribe();
  } catch(err){ /* tempo real é um extra */ }
}

loadAdmissions();

// ---------- Painel de indicadores (tela Início) ----------
async function loadHomeStats(){
  const statsGridEl = document.getElementById('statsGrid');
  if(!statsGridEl) return;
  if(!supabaseClient){
    statsGridEl.innerHTML = '';
    return;
  }

  const { data: admissoes } = await supabaseClient.from('admissoes').select('*, admissao_itens(*)');
  const lista = admissoes || [];

  const admissoesEmAndamento = lista.filter(a => {
    const itens = a.admissao_itens || [];
    return itens.length > 0 && itens.some(i => !i.recebido && !i.nao_aplica);
  }).length;
  const admissoesConcluidas = lista.length - admissoesEmAndamento;

  const stats = [
    { label: 'Admissões em andamento', value: admissoesEmAndamento, alert: admissoesEmAndamento > 0 },
    { label: 'Admissões concluídas', value: admissoesConcluidas, alert: false },
  ];

  statsGridEl.innerHTML = '';
  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card' + (s.alert ? ' stat-alert' : '');
    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = s.value;
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = s.label;
    card.appendChild(value);
    card.appendChild(label);
    statsGridEl.appendChild(card);
  });
}