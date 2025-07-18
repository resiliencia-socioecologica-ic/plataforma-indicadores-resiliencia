/*
 * Script: script.js
 *
 * Objetivo: Gerenciar o upload, a visualização, a edição e a validação de dados de tabelas
 * (CSV/XLSX) e de arquivos de configuração completos (JSON) na aplicação.
 * Ele também controla a interface do usuário para essas operações, incluindo modais
 * de edição e feedback de status dos arquivos.
 *
 * Funcionamento:
 * 1. Inicializa variáveis globais para armazenar dados de tabelas, nomes de arquivos,
 * erros de validação e configurações de gráficos carregadas.
 * 2. Gerencia a interface do usuário (UI) para upload de arquivos:
 * - Atualiza os nomes e status dos arquivos exibidos nos labels.
 * - Exibe ícones de sucesso, erro ou processamento para cada arquivo carregado.
 * 3. Controla a abertura e o fechamento de um modal centralizado para visualização e edição de tabelas.
 * 4. Processa o upload de arquivos:
 * - Valida a extensão dos arquivos (CSV/XLSX para tabelas, JSON para configurações completas).
 * - Lê e faz o parsing dos dados de arquivos CSV e XLSX, limpando linhas e colunas vazias.
 * - Processa arquivos JSON completos, que contêm todos os dados das tabelas, informações da escola e configurações de gráficos.
 * 5. Permite adicionar dinamicamente mais campos para upload de arquivos de respostas,
 * cada um com suas próprias opções de renomear, visualizar e remover.
 * 6. Oferece funcionalidades de edição para as tabelas exibidas no modal:
 * - Renderiza os dados em uma tabela HTML, permitindo edição de células.
 * - Habilita a remoção de linhas e colunas diretamente pela interface do modal.
 * 7. Implementa funções para salvar e cancelar as alterações feitas nas tabelas dentro do modal.
 * 8. Realiza validações críticas nos dados da "Tabela Consulta", focando na coluna "No do gráfico"
 * para garantir o formato correto dos identificadores.
 * 9. Executa uma validação abrangente de todos os dados carregados (informações da escola,
 * tabela de consulta e tabelas de respostas) antes de permitir a continuação para a
 * página de visualização dos gráficos. Esta validação inclui checagem de referências cruzadas
 * entre a tabela de consulta e as respostas.
 * 10. Fornece uma opção para carregar e usar uma "Tabela Consulta Base" pré-definida.
 */


// ------------------------ Variáveis Globais e Configurações Iniciais ------------------------ //

let fileErrors = { "file-upload-1": [] };
let currentFileUploadId = "";
let tableDataMap = {};
let originalTableDataMap = {};
let fileNameMap = {};
let fileExtensionMap = {};
let loadedChartConfigs = null;
let schoolInfoData = null;
let responseIndex = 3;

const defaultModalFooterHTML = `
    <button class="btn btn-secondary" onclick="cancelChanges()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveChanges()">Salvar Alterações</button>
`;

// ------------------------ Funções Auxiliares de UI ------------------------ //

/**
 * Atualiza o nome do arquivo exibido no label e define o status como 'loading'.
 * @param {string} fileUploadId - ID do input de arquivo.
 * @param {string|null} fileName - O nome do arquivo ou null para limpar.
 */
function displayFileInfo(fileUploadId, fileName) {
    const wrapperIdSuffix = fileUploadId.startsWith('file-upload-complete') ? 'complete' : fileUploadId.split('-').pop();
    const wrapper = document.getElementById(`wrapper-${wrapperIdSuffix}`);
    if (!wrapper) {
        return;
    }

    const fileNameSpan = wrapper.querySelector('.file-name');
    if (fileNameSpan) {
        const defaultText = fileUploadId === 'file-upload-complete' ? 'Nenhum arquivo selecionado (.json)' : 'Nenhum arquivo selecionado';
        fileNameSpan.textContent = fileName || defaultText;
        fileNameSpan.title = fileName || '';
    }

    const statusId = wrapper.querySelector('.upload-status')?.id;
    if (statusId) {
        const statusSpan = document.getElementById(statusId);
        if (statusSpan) {
            if (fileName) {
                statusSpan.className = 'upload-status loading';
                statusSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                statusSpan.title = 'Processando...';
            } else {
                statusSpan.className = 'upload-status';
                statusSpan.innerHTML = '';
                statusSpan.title = '';
            }
        }
    }
}

/**
 * Atualiza o ícone de status (sucesso, erro) após o processamento.
 * @param {string} fileUploadId - ID do input de arquivo associado.
 * @param {string} statusId - ID do elemento <span> onde o status será exibido.
 */
const updateStatusIcon = (fileUploadId, statusId) => {
    const statusSpan = document.getElementById(statusId);
    if (!statusSpan) return;

    const hasErrors = fileErrors[fileUploadId]?.length > 0;
    const isSuccess = !!tableDataMap[fileUploadId] || (fileUploadId === 'file-upload-complete' && !hasErrors);

    statusSpan.className = 'upload-status';
    statusSpan.innerHTML = '';

    if (hasErrors) {
        statusSpan.classList.add("error");
        statusSpan.innerHTML = '<i class="fas fa-times-circle"></i>';
        statusSpan.title = fileErrors[fileUploadId].join('\n');
    } else if (isSuccess) { 
        statusSpan.classList.add("success");
        statusSpan.innerHTML = '<i class="fas fa-check-circle"></i>';
        statusSpan.title = 'Arquivo válido';
    } else {
        statusSpan.title = '';
    }
};


function openModal() {
    const modal = document.getElementById("modal");
    const overlay = document.getElementById("modal-overlay");
    if(!modal || !overlay) return;

    overlay.style.display = "block";
    modal.style.display = "flex";
    void modal.offsetWidth;
    void overlay.offsetWidth;

    overlay.classList.add("show");
    modal.classList.add("show");
}

function closeModal() {
    const modal = document.getElementById("modal");
    const overlay = document.getElementById("modal-overlay");
     if(!modal || !overlay) return;

    modal.classList.remove("show");
    overlay.classList.remove("show");

    setTimeout(() => {
         modal.style.display = "none";
         overlay.style.display = "none";
         const modalFooter = document.getElementById("modal-footer-content");
         if (modalFooter) modalFooter.innerHTML = defaultModalFooterHTML;
         currentFileUploadId = ""; 
    }, 300); 
}

// ------------------------ Processamento e Validação de Arquivos ------------------------ //

function validarArquivo(event, extensoesValidas, statusId) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    const fileUploadId = fileInput.id;
    fileErrors[fileUploadId] = []; 

    displayFileInfo(fileUploadId, file ? file.name : null); 

    if (!file) {
        delete tableDataMap[fileUploadId]; delete originalTableDataMap[fileUploadId];
        delete fileNameMap[fileUploadId]; delete fileExtensionMap[fileUploadId];
        updateStatusIcon(fileUploadId, statusId); 
        return;
    }

    // Processamento JSON
    if (fileUploadId === "file-upload-complete") {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension === "json") {
            processCompleteJson(file, fileUploadId, statusId);
        } else {
            alert(`Erro: O arquivo completo deve ser do tipo .json!`);
            fileInput.value = ""; displayFileInfo(fileUploadId, null);
            fileErrors[fileUploadId] = ["Tipo de arquivo inválido (esperado .json)"];
            updateStatusIcon(fileUploadId, statusId);
        }
        return;
    }

    // Processamento CSV/XLSX
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (extensoesValidas.includes(fileExtension)) {
        const wrapperIdSuffix = fileUploadId.split('-').pop();
        const wrapper = document.getElementById(`wrapper-${wrapperIdSuffix}`);
        const renameInput = wrapper?.querySelector(".rename-input");
        let currentName = fileName; 
        if (renameInput?.value?.trim()) {
            currentName = renameInput.value.trim() + "." + fileExtension;
        } else if (fileUploadId === 'file-upload-1') {
             currentName = "TabelaConsulta." + fileExtension;
        }
        fileNameMap[fileUploadId] = currentName;
        fileExtensionMap[fileUploadId] = "." + fileExtension;

        openTableViewer(fileUploadId, parseInt(wrapperIdSuffix) - 1);

    } else {
        alert(`Erro: O arquivo deve ser ${extensoesValidas.join(" ou ")}!`);
        fileInput.value = ""; displayFileInfo(fileUploadId, null);
        fileErrors[fileUploadId].push("Extensão inválida");
        updateStatusIcon(fileUploadId, statusId);
    }
}

function processCompleteJson(file, fileUploadId, statusId) {
     const reader = new FileReader();
     reader.onload = (e) => { try { const jsonData = JSON.parse(e.target.result); if (!jsonData?.originalData?.TabelaConsulta || !jsonData.originalData.DemaisTabelas || !jsonData.chartConfigs) { throw new Error("Estrutura JSON inválida ou dados essenciais ausentes."); } const { TabelaConsulta, DemaisTabelas } = jsonData.originalData; const loadedSchoolInfo = jsonData.schoolInfo; const configs = jsonData.chartConfigs; tableDataMap = {}; originalTableDataMap = {}; fileNameMap = {}; fileErrors = { "file-upload-1": [] }; loadedChartConfigs = null; localStorage.removeItem("schoolInfo"); schoolInfoData = null; document.querySelectorAll('.upload-status:not(#status-complete)').forEach(s => { s.innerHTML=''; s.className='upload-status'; s.title=''; }); document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) .file-name').forEach(s => { s.textContent='Nenhum arquivo selecionado'; s.title=''; }); document.querySelectorAll('.rename-input').forEach(inp => { inp.value = (inp.closest('.file-input-wrapper')?.id === 'wrapper-2') ? 'Estudantes' : ''; }); document.getElementById('responses-container').innerHTML = ''; responseIndex = 3; if (!TabelaConsulta || !Array.isArray(TabelaConsulta) || TabelaConsulta.length === 0) throw new Error("TabelaConsulta ausente/vazia no JSON."); const consultaId = "file-upload-1"; const consultaStatusId = "status-1"; const cleanedConsulta = removeEmptyColumns(removeEmptyRows(TabelaConsulta)); tableDataMap[consultaId] = JSON.parse(JSON.stringify(cleanedConsulta)); originalTableDataMap[consultaId] = JSON.parse(JSON.stringify(cleanedConsulta)); fileNameMap[consultaId] = "TabelaConsulta (do JSON)"; fileExtensionMap[consultaId] = ""; fileErrors[consultaId] = []; displayFileInfo(consultaId, fileNameMap[consultaId]); validateNoDoGrafico(consultaId, true); updateStatusIcon(consultaId, consultaStatusId); let currentResponseInputIndex = 2; for (const nomeOriginalArquivo in DemaisTabelas) { if (!Object.hasOwnProperty.call(DemaisTabelas, nomeOriginalArquivo)) continue; const data = DemaisTabelas[nomeOriginalArquivo]; if (!data || !Array.isArray(data) || data.length === 0) { continue; } const responseId = `file-upload-${currentResponseInputIndex}`; const responseStatusId = `status-${currentResponseInputIndex}`; const wrapperId = `wrapper-${currentResponseInputIndex}`; let wrapper = document.getElementById(wrapperId); if (!wrapper && currentResponseInputIndex > 2) { document.getElementById("add-response-btn").click(); wrapper = document.getElementById(wrapperId); } else if (!wrapper && currentResponseInputIndex === 2) wrapper = document.getElementById('wrapper-2'); if (!wrapper) { fileErrors[responseId] = ["Falha na interface"]; continue; } const cleanedData = removeEmptyColumns(removeEmptyRows(data)); tableDataMap[responseId] = JSON.parse(JSON.stringify(cleanedData)); originalTableDataMap[responseId] = JSON.parse(JSON.stringify(cleanedData)); const baseName = nomeOriginalArquivo.replace(/\.(xlsx?|csv)$/i, ""); const extension = nomeOriginalArquivo.substring(nomeOriginalArquivo.lastIndexOf('.')) || ""; fileNameMap[responseId] = nomeOriginalArquivo; fileExtensionMap[responseId] = extension; fileErrors[responseId] = []; displayFileInfo(responseId, nomeOriginalArquivo); const renameInput = wrapper.querySelector(".rename-input"); if (renameInput) renameInput.value = baseName; updateStatusIcon(responseId, responseStatusId); currentResponseInputIndex++; } loadedChartConfigs = configs || {}; if (loadedSchoolInfo && typeof loadedSchoolInfo === 'object') { schoolInfoData = { name: loadedSchoolInfo.name || '', city: loadedSchoolInfo.city || '', state: loadedSchoolInfo.state || '', responsible: loadedSchoolInfo.responsible || '' }; try { localStorage.setItem("schoolInfo", JSON.stringify(schoolInfoData)); } catch (e) {} document.getElementById('school-name').value = schoolInfoData.name; document.getElementById('school-city').value = schoolInfoData.city; document.getElementById('school-state').value = schoolInfoData.state; document.getElementById('school-responsible').value = schoolInfoData.responsible; } attachViewButtonListener('view-1', 'file-upload-1', 0); let finalIdx = 2; for (const nome in DemaisTabelas) { if (Object.hasOwnProperty.call(DemaisTabelas, nome) && DemaisTabelas[nome]?.length > 0) { const vBtnId = `view-${finalIdx}`; if (document.getElementById(vBtnId)) { attachViewButtonListener(vBtnId, `file-upload-${finalIdx}`, finalIdx - 1); } finalIdx++; } } document.querySelectorAll('.file-input-wrapper .btn-view').forEach(btn => btn.disabled = false); fileErrors[fileUploadId] = []; updateStatusIcon(fileUploadId, statusId); alert("Arquivo completo carregado e processado com sucesso!"); document.querySelectorAll('input[type="file"]:not(#file-upload-complete)').forEach(inp => inp.disabled = true); document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) label.file-input-label').forEach(lbl => lbl.style.cursor = 'not-allowed'); document.querySelectorAll('.file-input-wrapper:not(#wrapper-complete) .rename-input').forEach(inp => inp.disabled = true); document.getElementById("add-response-btn").disabled = true; } catch (error) { alert(`Erro ao processar JSON: ${error.message}`); fileErrors[fileUploadId] = ["Erro ao processar JSON", error.message]; updateStatusIcon(fileUploadId, statusId); tableDataMap = {}; originalTableDataMap = {}; fileNameMap = {}; fileErrors = { "file-upload-1": [] }; loadedChartConfigs = null; schoolInfoData = null; localStorage.removeItem("schoolInfo"); document.querySelectorAll('input[type="file"], .rename-input, .btn-view, #add-response-btn').forEach(el => el.disabled = false); document.querySelectorAll('.file-input-wrapper label.file-input-label').forEach(lbl => lbl.style.cursor = 'pointer'); document.getElementById('responses-container').innerHTML = ''; responseIndex = 3; displayFileInfo('file-upload-1', null); updateStatusIcon('file-upload-1', 'status-1'); displayFileInfo('file-upload-2', null); updateStatusIcon('file-upload-2', 'status-2'); const renameResp2 = document.querySelector('#wrapper-2 .rename-input'); if(renameResp2) renameResp2.value = 'Estudantes'; document.getElementById('school-name').value = ''; document.getElementById('school-city').value = ''; document.getElementById('school-state').value = ''; document.getElementById('school-responsible').value = ''; } finally { const fileInputComplete = document.getElementById(fileUploadId); if(fileInputComplete) fileInputComplete.value = ""; if(fileErrors[fileUploadId]?.length > 0) displayFileInfo(fileUploadId, null); } };
     reader.readAsText(file);
}


// ------------------------ Adicionando Arquivos de Respostas Dinamicamente ------------------------ //

document.getElementById("add-response-btn").addEventListener("click", () => { const localIndex = responseIndex; const fileUploadId = `file-upload-${localIndex}`; const wrapperId = `wrapper-${localIndex}`; const statusId = `status-${localIndex}`; const viewBtnId = `view-${localIndex}`; const responsesContainer = document.getElementById('responses-container'); const wrapper = document.createElement('div'); wrapper.className = 'file-input-wrapper response-wrapper'; wrapper.id = wrapperId; wrapper.style.marginTop = '10px'; wrapper.innerHTML = ` <input id="${fileUploadId}" type="file" accept=".csv, .xlsx" data-target-wrapper="${wrapperId}" data-status-id="${statusId}" style="display: none;"> <label for="${fileUploadId}" class="file-input-label"> <i class="fas fa-file-alt"></i> <span class="file-name">Nenhum arquivo selecionado</span> </label> <input type="text" class="rename-input" placeholder="Nome do Grupo (ex: Familiares)"> <div class="file-actions"> <span class="upload-status" id="${statusId}"></span> <button class="btn-icon btn-view" id="${viewBtnId}" title="Visualizar/Editar Tabela"><i class="fas fa-eye"></i></button> <button class="btn-icon btn-remove-response" title="Remover este arquivo"><i class="fas fa-times"></i></button> </div> `; responsesContainer.appendChild(wrapper); document.getElementById(fileUploadId).addEventListener("change", (event) => validarArquivo(event, ["csv", "xlsx"], statusId)); attachViewButtonListener(viewBtnId, fileUploadId, localIndex - 1); wrapper.querySelector('.btn-remove-response').addEventListener('click', () => { if (confirm(`Remover o arquivo de resposta "${fileNameMap[fileUploadId] || `Grupo ${localIndex-1}`}"?`)) { delete tableDataMap[fileUploadId]; delete originalTableDataMap[fileUploadId]; delete fileNameMap[fileUploadId]; delete fileExtensionMap[fileUploadId]; delete fileErrors[fileUploadId]; wrapper.remove(); } }); const renameInput = wrapper.querySelector('.rename-input'); renameInput.addEventListener("input", () => { const baseName = renameInput.value.trim(); const extension = fileExtensionMap[fileUploadId] || ""; const fallback = `grupo_${localIndex - 1}`; fileNameMap[fileUploadId] = baseName ? `${baseName}${extension}` : `${fallback}${extension}`; if (currentFileUploadId === fileUploadId) document.getElementById("modal-title").textContent = fileNameMap[fileUploadId] || 'Visualizar Tabela'; }); fileNameMap[fileUploadId] = ""; fileExtensionMap[fileUploadId] = ""; responseIndex++; });

// ------------------------ Visualização e Edição de Tabela ------------------------ //

function attachViewButtonListener(buttonId, fileUploadId, index) { const viewButton = document.getElementById(buttonId); if (viewButton) { const newViewButton = viewButton.cloneNode(true); viewButton.parentNode.replaceChild(newViewButton, viewButton); newViewButton.addEventListener('click', (e) => { e.stopPropagation(); const fileInput = document.getElementById(fileUploadId); const hasData = !!tableDataMap[fileUploadId]; const fileSelected = fileInput?.files?.length > 0; if (hasData || fileSelected) { openTableViewer(fileUploadId, index); } else { alert('Nenhum arquivo carregado ou selecionado para visualizar.'); } }); } }
function openTableViewer(fileUploadId, index) { currentFileUploadId = fileUploadId; const fileInput = document.getElementById(fileUploadId); const file = fileInput?.files?.[0]; document.getElementById("modal-title").textContent = fileNameMap[fileUploadId] || `Tabela ${index + 1}`; document.getElementById("modal-footer-content").innerHTML = defaultModalFooterHTML; if (!file && tableDataMap[fileUploadId]) { renderTable(fileUploadId); if (fileUploadId === "file-upload-1") { setTimeout(() => validateNoDoGrafico(fileUploadId, false), 100); } openModal(); return; } if (file) { const reader = new FileReader(); reader.onload = (e) => { const fileContent = e.target.result; try { fileErrors[fileUploadId] = []; const fileExtension = file.name.split('.').pop().toLowerCase(); if (fileExtension === "csv") { parseCSV(fileContent, fileUploadId); } else if (fileExtension === "xlsx") { const workbook = XLSX.read(fileContent, { type: "binary" }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }); if(!jsonData || jsonData.length === 0) throw new Error("Planilha vazia ou inválida."); const cleanedData = removeEmptyColumns(removeEmptyRows(jsonData)); tableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData)); originalTableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData)); } else { throw new Error("Tipo de arquivo não suportado."); } renderTable(fileUploadId); if (fileUploadId === "file-upload-1") { setTimeout(() => validateNoDoGrafico(fileUploadId, false), 100); } const statusIdSuffix = fileUploadId.split('-').pop(); updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`); openModal(); if (fileInput) fileInput.value = ""; } catch (error) { alert(`Erro ao processar ${file.name}.\nDetalhes: ${error.message}`); fileErrors[fileUploadId].push("Erro no processamento", error.message); const statusIdSuffix = fileUploadId.split('-').pop(); updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`); delete tableDataMap[fileUploadId]; delete originalTableDataMap[fileUploadId]; if (fileInput) fileInput.value = ""; displayFileInfo(fileUploadId, null); } }; reader.onerror = (e) => { alert("Erro ao ler o arquivo selecionado."); fileErrors[fileUploadId].push("Erro de leitura"); const statusIdSuffix = fileUploadId.split('-').pop(); updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`); if (fileInput) fileInput.value = ""; displayFileInfo(fileUploadId, null); }; if (file.name.endsWith(".csv")) reader.readAsText(file); else reader.readAsBinaryString(file); } else { alert("Nenhum arquivo selecionado ou dados carregados para visualizar."); const statusIdSuffix = fileUploadId.split('-').pop(); updateStatusIcon(fileUploadId, `status-${statusIdSuffix}`); } }
const parseCSV = (csv, fileUploadId) => { const firstLine = csv.split('\n')[0]; const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','; let data; if (typeof Papa !== 'undefined') { const result = Papa.parse(csv, { skipEmptyLines: true, delimiter: delimiter, header: false }); if (result.errors.length > 0) { throw new Error(`Erro parse CSV: ${result.errors.map(e => `L${e.row}:${e.message}`).join('; ')}`); } if (!result.data || result.data.length === 0) throw new Error("Arquivo CSV vazio ou inválido."); data = result.data; } else { data = csv.trim().split("\n").map(row => row.split(delimiter)).filter(r => r.length > 1 || (r.length===1 && r[0].trim()!=="")); if (data.length === 0) throw new Error("Arquivo CSV vazio ou inválido."); } const cleanedData = removeEmptyColumns(removeEmptyRows(data)); tableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData)); originalTableDataMap[fileUploadId] = JSON.parse(JSON.stringify(cleanedData)); };
function renderTable(fileUploadId) { const data = tableDataMap[fileUploadId]; const tableElement = document.getElementById("table-content"); if (!tableElement) return; tableElement.innerHTML = ""; if (!data || data.length === 0) { tableElement.innerHTML = "<tr><td>Nenhum dado.</td></tr>"; return; } const thead = tableElement.createTHead(); const headerRow = thead.insertRow(); headerRow.insertCell(); if(Array.isArray(data[0])) { data[0].forEach((header, colIndex) => { const th = headerRow.insertCell(); th.classList.add('th-sticky'); const wrapper = document.createElement('div'); wrapper.className = 'th-content-wrapper'; const textSpan = document.createElement('span'); textSpan.className = 'th-text'; textSpan.textContent = header ?? `Coluna ${colIndex + 1}`; textSpan.title = header ?? ''; const removeColBtn = document.createElement("span"); removeColBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; removeColBtn.classList.add("remove-btn", "remove-col-btn"); removeColBtn.title = "Remover coluna"; removeColBtn.onclick = (e) => { e.stopPropagation(); removeColumn(fileUploadId, colIndex); }; wrapper.appendChild(textSpan); wrapper.appendChild(removeColBtn); th.appendChild(wrapper); }); } else { headerRow.insertCell().textContent="Erro Cabeçalho"; } const tbody = tableElement.createTBody(); for (let rowIndex = 1; rowIndex < data.length; rowIndex++) { const rowData = data[rowIndex]; if (!Array.isArray(rowData)) continue; const tr = tbody.insertRow(); const removeRowTd = tr.insertCell(); removeRowTd.classList.add('action-cell'); const removeRowBtn = document.createElement('button'); removeRowBtn.className = "btn-icon btn-delete-row"; removeRowBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; removeRowBtn.title = `Remover linha ${rowIndex + 1}`; removeRowBtn.onclick = (e) => { e.stopPropagation(); removeRow(fileUploadId, rowIndex); }; removeRowTd.appendChild(removeRowBtn); const headerCols = data[0]?.length ?? 0; for(let colIndex = 0; colIndex < headerCols; colIndex++) { const td = tr.insertCell(); const cell = rowData[colIndex]; const cellContent = (cell === null || typeof cell === 'undefined') ? "" : String(cell); td.textContent = cellContent; td.title = cellContent; td.onclick = () => editCell(fileUploadId, td, rowIndex, colIndex); } } }
const removeEmptyRows = (data) => { if (!Array.isArray(data)) return []; return data.filter(row => Array.isArray(row) && row.some(cell => cell !== null && typeof cell !== 'undefined' && String(cell).trim() !== "")); };
const removeEmptyColumns = (data) => { if (!data || data.length === 0 || !Array.isArray(data[0])) return data; const columnCount = data[0].length; const colIndicesToRemove = []; for (let c = 0; c < columnCount; c++) { if (data.every(row => !Array.isArray(row) || c >= row.length || row[c] === null || typeof row[c] === 'undefined' || String(row[c]).trim() === "")) { colIndicesToRemove.push(c); } } if (colIndicesToRemove.length === 0) return data; return data.map(row => Array.isArray(row) ? row.filter((_, c) => !colIndicesToRemove.includes(c)) : row); };
function editCell(fileUploadId, cell, rowIndex, colIndex) { if (cell.classList.contains('editing') || cell.querySelector("textarea")) return; cell.classList.add('editing'); const oldValue = cell.textContent; const input = document.createElement("textarea"); input.value = oldValue; input.style.width='100%'; input.style.height='auto'; input.style.minHeight='30px'; input.onblur = () => { const newValue = input.value; if (tableDataMap[fileUploadId]?.[rowIndex]) { while(tableDataMap[fileUploadId][rowIndex].length <= colIndex) tableDataMap[fileUploadId][rowIndex].push(null); tableDataMap[fileUploadId][rowIndex][colIndex] = newValue; } cell.textContent = newValue; cell.title = newValue; cell.classList.remove('editing'); if (fileUploadId === 'file-upload-1') { validateNoDoGrafico(fileUploadId, true); } }; input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); input.blur(); } else if (e.key === "Escape") { input.value = oldValue; input.blur(); } }; cell.innerHTML = ""; cell.appendChild(input); input.focus(); input.select(); }
const removeRow = (fileUploadId, rowIndex) => { const visualRowNumber = rowIndex + 1; const rowRef = tableDataMap[fileUploadId]?.[rowIndex]?.[0] || `Linha ${visualRowNumber}`; if (confirm(`Excluir linha ${visualRowNumber} (Ref: "${rowRef}")?`)) { if (tableDataMap[fileUploadId]?.[rowIndex]) { tableDataMap[fileUploadId].splice(rowIndex, 1); renderTable(fileUploadId); if (fileUploadId === 'file-upload-1') validateNoDoGrafico(fileUploadId, true); } } };
const removeColumn = (fileUploadId, colIndex) => { const headerText = tableDataMap[fileUploadId]?.[0]?.[colIndex] || `Coluna ${colIndex + 1}`; if (confirm(`Excluir coluna "${headerText}" (Índice ${colIndex})?`)) { if (tableDataMap[fileUploadId]) { tableDataMap[fileUploadId].forEach(row => { if (Array.isArray(row) && row.length > colIndex) row.splice(colIndex, 1); }); renderTable(fileUploadId); if (fileUploadId === 'file-upload-1') validateNoDoGrafico(fileUploadId, true); } } };

// ------------------------ Funções do Modal (Salvar, Cancelar, Fechar) ------------------------ //

function cancelChanges() { const currentId = currentFileUploadId; if (originalTableDataMap[currentId]) { tableDataMap[currentId] = JSON.parse(JSON.stringify(originalTableDataMap[currentId])); } else delete tableDataMap[currentId]; closeModal(); }
function saveChanges() { const activeElement = document.activeElement; if (activeElement?.tagName === 'TEXTAREA' && activeElement.closest('#table-content')) { activeElement.blur(); } setTimeout(() => { const currentId = currentFileUploadId; if (tableDataMap[currentId]) { originalTableDataMap[currentId] = JSON.parse(JSON.stringify(tableDataMap[currentId])); const statusIdSuffix = currentId.split('-').pop(); const statusId = `status-${statusIdSuffix}`; if (currentId === "file-upload-1") validateNoDoGrafico(currentId, true); updateStatusIcon(currentId, statusId); /* alert("Alterações salvas!"); */ } closeModal(); }, 150); }
document.getElementById('modal-overlay')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) cancelChanges(); });

// ------------------------ Validação Coluna "No do gráfico" (sem mudanças desde a v anterior) --- //

function validateNoDoGrafico(fileUploadId, suppressAlert = false) {
    if (fileUploadId !== "file-upload-1") return;
    fileErrors[fileUploadId] = (fileErrors[fileUploadId] || []).filter(e => !e.includes("No do gráfico") && !e.includes("Coluna 'No do gráfico' ausente") && !e.includes("Célula vazia em") && !e.includes("Formato inválido em") );
    const tableElement = document.getElementById("table-content"); const data = tableDataMap[fileUploadId];
    if (!data || data.length === 0) { fileErrors[fileUploadId].push("Tabela Consulta vazia"); updateStatusIcon(fileUploadId, 'status-1'); return; }
    if (!Array.isArray(data[0])) { fileErrors[fileUploadId].push("Cabeçalho Consulta inválido"); updateStatusIcon(fileUploadId, 'status-1'); return; }
    const headerRow = data[0].map(h => String(h ?? '').trim().toLowerCase()); const colIndexNoGrafico = headerRow.indexOf("no do gráfico");
    if (colIndexNoGrafico === -1) { const msg = "Coluna 'No do gráfico' ausente"; fileErrors[fileUploadId].push(msg); if (!suppressAlert) alert("Erro Crítico Consulta: " + msg); updateStatusIcon(fileUploadId, 'status-1'); return; }
    const standardRegex = /^\d+\.\d+\.\d+[a-zA-Z]?$/; const shortFormatRegex = /^\d+\.\d+[a-zA-Z]?$/; const profileIds = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8']; const invalidFormatRows = []; const emptyCellRows = []; const tbody = tableElement?.querySelector("tbody"); const tableRows = tbody?.rows;
    for (let i = 1; i < data.length; i++) { if (!data[i] || data[i].length <= colIndexNoGrafico) continue; let cellValue = String(data[i][colIndexNoGrafico] || "").trim(); data[i][colIndexNoGrafico] = cellValue; const targetCellElement = tableRows?.[i-1]?.cells[colIndexNoGrafico + 1]; if (targetCellElement) targetCellElement.style.border = ""; let isValid = false; if (!cellValue) { emptyCellRows.push(i + 1); } else if (standardRegex.test(cellValue)) { isValid = true; } else if (shortFormatRegex.test(cellValue)) { isValid = true; } else if (profileIds.includes(cellValue)) { isValid = true; } if (!isValid && cellValue) { invalidFormatRows.push(i + 1); if (targetCellElement) targetCellElement.style.border = "2px solid red"; } else if (!cellValue && targetCellElement) { if (targetCellElement) targetCellElement.style.border = "2px solid red"; } }
    let errorMessagesForAlert = [];
    if (emptyCellRows.length > 0) { const msg = `Célula vazia em "No do gráfico" (linhas: ${emptyCellRows.join(", ")})`; errorMessagesForAlert.push(msg); fileErrors[fileUploadId].push(msg); }
    if (invalidFormatRows.length > 0) { const msg = `Formato inválido em "No do gráfico" (linhas: ${invalidFormatRows.join(", ")}). Use d.d.d[a], d.d[a] ou 0.1-0.8.`; errorMessagesForAlert.push(msg); fileErrors[fileUploadId].push(msg); }
    if (!suppressAlert && errorMessagesForAlert.length > 0) { alert("Erro na Tabela de Consulta:\n\n- " + errorMessagesForAlert.join("\n- ")); }
    updateStatusIcon(fileUploadId, 'status-1');
}

// ------------------------ Validação Geral e Continuação (vFinal 2 - Valida Ambos Formatos, Sem Transformação) --- //

/* Extrai IDs [d.d.d[a]] OU [d.d[a]] do cabeçalho das respostas */
function extractIdentifiersFromResponseHeader(headerRow) {
    if (!Array.isArray(headerRow)) return [];
    const identifiers = new Set();
    const idRegex = /\[(\d+\.\d+(?:\.\d+)?[a-zA-Z]?)\]\s*$/;
    headerRow.forEach(header => {
        if (typeof header === 'string') {
            const match = header.trim().match(idRegex);
            if (match?.[1]) { identifiers.add(match[1]); }
        }
    });
    return Array.from(identifiers);
}

function validateBeforeContinue() {
    let errors = []; let warnings = [];

    // 1. Escola
    const schoolName=document.getElementById('school-name')?.value.trim(); const schoolCity=document.getElementById('school-city')?.value.trim(); const schoolState=document.getElementById('school-state')?.value.trim(); const schoolResponsible=document.getElementById('school-responsible')?.value.trim();
    if(!schoolName||!schoolCity||!schoolState||!schoolResponsible) errors.push("Preencha todas as Informações da Escola.");

    // 2. Consulta
    const consultaFileId="file-upload-1"; const consultaData=tableDataMap[consultaFileId]; const consultaFileName=fileNameMap[consultaFileId]||"Tabela Consulta";
    let consultaIdentifiers = new Set(); let noGraficoColIndex = -1;
    if(!consultaData||consultaData.length<=1){ errors.push(`${consultaFileName} não carregada ou vazia.`); }
    else { validateNoDoGrafico(consultaFileId, true); if (fileErrors[consultaFileId]?.length > 0) fileErrors[consultaFileId].forEach(e => errors.push(`Erro ${consultaFileName}: ${e}`));
        const header = consultaData[0].map(h => String(h??'').trim().toLowerCase()); noGraficoColIndex = header.indexOf("no do gráfico");
        if (noGraficoColIndex !== -1) { for (let i=1; i < consultaData.length; i++) { const id = String(consultaData[i]?.[noGraficoColIndex]||'').trim(); if(id) consultaIdentifiers.add(id); } if (consultaIdentifiers.size === 0) warnings.push(`${consultaFileName}: Coluna 'No do gráfico' sem IDs válidos preenchidos.`); }
        else if (!errors.some(e => e.includes("Coluna 'No do gráfico' ausente"))) { errors.push(`Erro Crítico ${consultaFileName}: Coluna 'No do gráfico' ausente.`); }
    }

    // 3. Respostas e Referência
    const responseIdentifiers = new Set(); 
    const responseIdentifierSources = new Map(); let respostaValidaCount = 0; const demaisTabelasParaSalvar = {};
    for (const key in tableDataMap) { if (key === consultaFileId || key === "file-upload-complete") continue; const respData = tableDataMap[key]; const respFileName = fileNameMap[key] || `Arquivo ${key}`; if (!respData || respData.length <= 1) { warnings.push(`Arquivo Respostas (${respFileName}) parece vazio.`); continue; } const internalErrors = (fileErrors[key] || []).filter(e => !e.includes("Referência")); if (internalErrors.length > 0) { errors.push(`Arquivo Respostas (${respFileName}) contém erros: ${internalErrors.join(", ")}`); continue; } const header = respData[0];
        const idsInFile = extractIdentifiersFromResponseHeader(header); 
        if (idsInFile.length === 0) warnings.push(`Arquivo Respostas (${respFileName}) sem colunas [ID] no cabeçalho (formato d.d[a] ou d.d.d[a]).`);
        idsInFile.forEach(id => { responseIdentifiers.add(id); if (!responseIdentifierSources.has(id)) responseIdentifierSources.set(id, []); if (!responseIdentifierSources.get(id).includes(respFileName)) responseIdentifierSources.get(id).push(respFileName); });
        respostaValidaCount++; demaisTabelasParaSalvar[respFileName] = respData;
    }
    if (respostaValidaCount === 0 && !errors.some(e => e.includes("Nenhum arquivo de respostas"))) errors.push("Nenhum arquivo de respostas válido carregado.");

    if (consultaIdentifiers.size > 0 && respostaValidaCount > 0) {
        const profileIds = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8'];

        // Consulta -> Respostas
        consultaIdentifiers.forEach(idConsulta => {
            if (profileIds.includes(idConsulta)) return; 
            if (!responseIdentifiers.has(idConsulta)) {
                errors.push(`Erro Ref: ID Consulta '${idConsulta}' não possui correspondência exata [${idConsulta}] nas Respostas.`);
            }
        });

        // Respostas -> Consulta
        responseIdentifiers.forEach(idResposta => {
            if (!consultaIdentifiers.has(idResposta)) {
                const sources = responseIdentifierSources.get(idResposta)?.join(', ') || '?';
                errors.push(`Erro Ref: Coluna Resposta '[${idResposta}]' (Arq: ${sources}) não encontrada na Consulta.`);
            }
        });
    }

    if (errors.length > 0) {
        alert(`Problemas encontrados:\n\n- ${errors.join("\n- ")}\n\n${warnings.length > 0 ? 'Avisos:\n- ' + warnings.join('\n- ') : ''}\n\nCorrija os problemas.`);
        return false;
    } else {
        if (warnings.length > 0 && !confirm(`Atenção:\n\n- ${warnings.join("\n- ")}\n\nDeseja continuar?`)) {
            return false;
        }

        const finalData = {
            "TabelaConsulta": consultaData, 
            "DemaisTabelas": demaisTabelasParaSalvar
         };

        try {
             localStorage.setItem("dadosCompletos", JSON.stringify(finalData));
             if (loadedChartConfigs) { localStorage.setItem("loadedChartConfigs", JSON.stringify(loadedChartConfigs)); }
             else { localStorage.removeItem("loadedChartConfigs"); }
             schoolInfoData = { name: schoolName, city: schoolCity, state: schoolState, responsible: schoolResponsible };
             localStorage.setItem("schoolInfo", JSON.stringify(schoolInfoData));
             console.log("Dados validados e salvos (sem transformação de ID)."); 
             window.location.href = "visualizacao.html";
             return true;
        } catch (error) {
             console.error("Erro ao salvar dados no localStorage:", error);
             alert("Erro ao salvar dados.");
             return false;
        }
     }
}


// ------------------------ Funções da Tabela de Consulta Base ------------------------ //

let consultaTableData = null;
function loadConsultaTable() { const btnObter = document.querySelector('.helper-links a[onclick*="loadConsultaTable"]'); const originalHTML = btnObter ? btnObter.innerHTML : '<i class="fas fa-table"></i> Obter Tabela Base'; if(btnObter) { btnObter.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...'; btnObter.style.pointerEvents = 'none'; } fetch('Planilhas/tabela_de_consulta_base.xlsx') .then(response => { if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`); return response.arrayBuffer(); }) .then(buffer => { const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; consultaTableData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }); openConsultaModal(); }) .catch(error => { alert(`Erro ao carregar consulta base: ${error.message}`); }) .finally(() => { if(btnObter) { btnObter.innerHTML = originalHTML; btnObter.style.pointerEvents = 'auto'; } }); }
function openConsultaModal() { if (!consultaTableData) { alert("Consulta base não carregada."); return; } const fileIdBase = "consulta-base-preview"; currentFileUploadId = fileIdBase; const cleanedData = removeEmptyColumns(removeEmptyRows(consultaTableData)); tableDataMap[fileIdBase] = JSON.parse(JSON.stringify(cleanedData)); originalTableDataMap[fileIdBase] = JSON.parse(JSON.stringify(cleanedData)); fileNameMap[fileIdBase] = "tabela_de_consulta_base.xlsx"; fileExtensionMap[fileIdBase] = ".xlsx"; document.getElementById("modal-title").textContent = "Pré-visualização: Tabela Consulta Base"; const footer = document.getElementById("modal-footer-content"); footer.innerHTML = ` <button class="btn btn-secondary" onclick="downloadConsultaTable()" title="Baixar original"><i class="fas fa-download"></i> Download</button> <button class="btn btn-secondary" onclick="cancelConsultaModal()">Cancelar</button> <button class="btn btn-success" onclick="useConsultaTable()" title="Usar esta tabela (editada)"><i class="fas fa-check"></i> Usar Tabela</button> `; renderTable(fileIdBase); openModal(); }
function downloadConsultaTable() { const link = document.createElement("a"); link.href = "Planilhas/tabela_de_consulta_base.xlsx"; link.download = "tabela_de_consulta_base.xlsx"; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
function useConsultaTable() { const fileIdBase = "consulta-base-preview"; const fileIdPrincipal = "file-upload-1"; const statusIdPrincipal = "status-1"; const data = tableDataMap[fileIdBase]; if (!data || data.length === 0) { alert("Tabela consulta base vazia."); return; } tableDataMap[fileIdPrincipal] = JSON.parse(JSON.stringify(data)); originalTableDataMap[fileIdPrincipal] = JSON.parse(JSON.stringify(data)); fileNameMap[fileIdPrincipal] = fileNameMap[fileIdBase] || "TabelaConsulta (Base)"; fileExtensionMap[fileIdPrincipal] = fileExtensionMap[fileIdBase] || ".xlsx"; fileErrors[fileIdPrincipal] = []; displayFileInfo(fileIdPrincipal, fileNameMap[fileIdPrincipal]); validateNoDoGrafico(fileIdPrincipal, true); updateStatusIcon(fileIdPrincipal, statusIdPrincipal); closeModal(); delete tableDataMap[fileIdBase]; delete originalTableDataMap[fileIdBase]; }
function cancelConsultaModal() { delete tableDataMap["consulta-base-preview"]; delete originalTableDataMap["consulta-base-preview"]; closeModal(); }

// ------------------------ Inicialização de Listeners ------------------------ //

document.addEventListener('DOMContentLoaded', () => { document.getElementById('file-upload-1')?.addEventListener('change', (e) => validarArquivo(e, ["csv", "xlsx"], "status-1")); document.getElementById('file-upload-2')?.addEventListener('change', (e) => validarArquivo(e, ["csv", "xlsx"], "status-2")); document.getElementById('file-upload-complete')?.addEventListener('change', (e) => validarArquivo(e, ["json"], "status-complete")); attachViewButtonListener('view-1', 'file-upload-1', 0); attachViewButtonListener('view-2', 'file-upload-2', 1); const renameInputResp1 = document.querySelector('#wrapper-2 .rename-input'); if (renameInputResp1) { renameInputResp1.addEventListener("input", () => { const fileId = 'file-upload-2'; const baseName = renameInputResp1.value.trim(); const ext = fileExtensionMap[fileId] || ""; const fallback = `Estudantes`; fileNameMap[fileId] = baseName ? `${baseName}${ext}` : `${fallback}${ext}`; if (currentFileUploadId === fileId) document.getElementById("modal-title").textContent = fileNameMap[fileId]; }); fileNameMap['file-upload-2'] = renameInputResp1.value.trim() || `Estudantes`; } fileNameMap['file-upload-1'] = "TabelaConsulta"; if (!schoolInfoData) { const storedInfo = localStorage.getItem("schoolInfo"); if (storedInfo) { try { schoolInfoData = JSON.parse(storedInfo); document.getElementById('school-name').value = schoolInfoData.name || ''; document.getElementById('school-city').value = schoolInfoData.city || ''; document.getElementById('school-state').value = schoolInfoData.state || ''; document.getElementById('school-responsible').value = schoolInfoData.responsible || ''; } catch (e) { localStorage.removeItem("schoolInfo"); } } } });