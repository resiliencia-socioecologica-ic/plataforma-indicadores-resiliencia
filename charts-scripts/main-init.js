/*
 * Script: main-init.js
 *
 * Objetivo: Coordenar a inicialização e renderização de todas as visualizações
 * de dados na página, incluindo gráficos, tabelas e filtros, após o carregamento
 * dos dados necessários. Este script lida com a organização dos elementos na interface
 * e a interação inicial do usuário.
 *
 * Funcionamento:
 * 1. Aguarda o carregamento completo do DOM (Document Object Model).
 * 2. Carrega as descrições dos indicadores e dimensões de um arquivo JSON externo, se ainda não estiverem disponíveis.
 * 3. Identifica e limpa os principais containers HTML onde as visualizações serão inseridas.
 * 4. Cria um elemento para exibir a descrição da dimensão, posicionando-o abaixo do título da dimensão.
 * 5. Mapeia os diferentes tipos de gráficos/quadros para suas classes CSS correspondentes.
 * 6. Itera sobre os dados de visualização disponíveis (`window.visualizacaoData`), que contêm as informações sobre cada gráfico/tabela a ser gerado.
 * - Ordena os IDs dos itens de visualização para garantir uma apresentação lógica.
 * - Cria "squares" (contêineres visuais) para cada item, categorizando-os entre gráficos de perfil (Pizza) e outros tipos (Barra, Teia, etc.).
 * - Insere títulos e descrições para indicadores e dimensões, baseando-se nos dados carregados e nas descrições do JSON externo.
 * 7. Gerencia a visibilidade da seção de gráficos de perfil, ocultando-a se não houver dados de perfil.
 * 8. Cria botões de filtro para cada dimensão única encontrada nos dados, além de um botão para exibir "Todas as Dimensões".
 * 9. Adiciona um listener de evento aos botões de filtro, que atualiza o título e a descrição da dimensão e filtra as visualizações exibidas no grid principal.
 * 10. Popula uma tabela de resumo de informações com dados da escola e contagem de respondentes por grupo.
 * 11. Invoca a função `init()` de cada módulo de visualização (ex: `PieChart.init()`, `BarChart.init()`, `RadarChart.init()`, `ResponseTable.init()`, `PerguntasTable.init()`) para que cada um renderize seus respectivos gráficos ou tabelas dentro dos "squares" criados.
 * 12. Configura listeners de eventos adicionais para interações do usuário, como:
 * - Abertura de modais de edição para gráficos e tabelas de respostas.
 * - Recolhimento/expansão de seções de perguntas/respostas.
 * - Fechamento de modais de edição clicando no overlay.
 * - Controle de abertura e fechamento da barra lateral de download.
 * 13. Inclui uma lógica para aguardar a disponibilidade dos dados de visualização (`window.visualizacaoData`) antes de iniciar o processo de renderização, com um fallback de timeout para evitar travamentos.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("main-init.js: DOMContentLoaded disparado.");

    function compareIds(idA, idB) { const strIdA = String(idA); const strIdB = String(idB); const partsA = strIdA.split('_'); const partsB = strIdB.split('_'); const numericPartA = partsA[0]; const numericPartB = partsB[0]; if (numericPartA !== numericPartB) { const numPartsA = numericPartA.split('.').map(n => parseInt(n, 10)); const numPartsB = numericPartB.split('.').map(n => parseInt(n, 10)); for (let i = 0; i < Math.max(numPartsA.length, numPartsB.length); i++) { let valA = numPartsA[i]; let valB = numPartsB[i]; if (isNaN(valA) || isNaN(valB)) { const strNumA = String(numericPartA).split('.')[i] || ''; const strNumB = String(numericPartB).split('.')[i] || ''; if (isNaN(valA) && isNaN(valB)){ if (strNumA !== strNumB) return strNumA.localeCompare(strNumB); } else return isNaN(valA) ? 1 : -1; } else if (valA !== valB) { return valA - valB; } } } const categoryA = partsA.slice(1).join('_') || ''; const categoryB = partsB.slice(1).join('_') || ''; if (categoryA !== categoryB) { return categoryA.localeCompare(categoryB); } return 0; }

    let descricoesData = null; 

    async function carregarDescricoes() {
        try {
            const response = await fetch('descricoes_indicadores.json'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            descricoesData = await response.json();
            console.log("main-init.js: descricoes_indicadores.json carregado com sucesso.");
        } catch (error) {
            console.error("main-init.js: Erro ao carregar descricoes_indicadores.json:", error);
            descricoesData = { descricoesDimensoes: {}, descricoesIndicadores: {} };
        }
    }


    async function initializeVisualizations() {
    console.log("main-init.js: Iniciando criação...");

    if (!descricoesData) {
        await carregarDescricoes();
    }

    const mainGridContainer = document.querySelector('.grid-container');
    const profileChartsContainer = document.getElementById('profile-charts-container');
    const profileSectionTitle = document.getElementById('profile-section-title');
    const filterButtonsContainer = document.getElementById('dimension-filters');
    const dimensionTitleDisplay = document.getElementById('dimension-title');

    let dimensionDescriptionDisplay = document.getElementById('dimension-description-display-text');
    if (!dimensionDescriptionDisplay && dimensionTitleDisplay && dimensionTitleDisplay.parentNode) {
        dimensionDescriptionDisplay = document.createElement('div');
        dimensionDescriptionDisplay.id = 'dimension-description-display-text';
        dimensionDescriptionDisplay.className = 'dimension-description-text';
        dimensionTitleDisplay.parentNode.insertBefore(dimensionDescriptionDisplay, dimensionTitleDisplay.nextSibling);
    } else if (!dimensionDescriptionDisplay) {
        console.warn("main-init.js: dimensionTitleDisplay não encontrado para inserir descrição da dimensão, ou dimensionDescriptionDisplay já existe com outro ID.");
    }

    if (!mainGridContainer || !profileChartsContainer || !profileSectionTitle || !filterButtonsContainer || !dimensionTitleDisplay) {
        console.error("Erro crítico: Elementos essenciais não encontrados (grid, profile container/title, filters, dim title).");
        document.body?.insertAdjacentHTML('afterbegin', '<p style="color: red; background: yellow; padding: 10px; text-align: center;">Erro: Falha ao carregar elementos da página.</p>');
        return;
    }

    mainGridContainer.innerHTML = '';
    profileChartsContainer.innerHTML = '';
    filterButtonsContainer.innerHTML = '';
    dimensionTitleDisplay.textContent = 'Carregando...';
    if (dimensionDescriptionDisplay) dimensionDescriptionDisplay.innerHTML = '';

    const typeMapping = {
        'Pizza': 'grafico_de_pizza',
        'Barra': 'grafico_de_barras',
        'Teia': 'grafico_de_teia',
        'Quadro de respostas abertas': 'quadro_de_respostas',
        'TeiaPair': 'teia_pair_special'
    };

    const visualizacaoData = window.visualizacaoData || {};
    let idsParaInicializar = Object.keys(visualizacaoData);

    idsParaInicializar.sort(compareIds);

    if (idsParaInicializar.length === 0) {
        console.warn("window.visualizacaoData vazio.");
        mainGridContainer.innerHTML = '<p>Nenhum dado de visualização encontrado.</p>';
        profileSectionTitle.style.display = 'none';
        profileChartsContainer.style.display = 'none';
        dimensionTitleDisplay.textContent = 'Nenhuma Dimensão Encontrada';
        if(dimensionDescriptionDisplay) dimensionDescriptionDisplay.style.display = 'none';
        return;
    }
        const dimensionsMap = new Map();
        let currentIndicatorFullId = null;
        let profileChartsCreatedCount = 0;

        idsParaInicializar.forEach(id => {
            const dataItem = visualizacaoData[id];
            if (!dataItem || !dataItem.type) { console.warn(`Dados inválidos para ID ${id}.`); return; }

            const dataType = typeMapping[dataItem.type] || 'tipo_desconhecido';
            if (dataType === 'tipo_desconhecido') { console.warn(`Tipo "${dataItem.type}" ID "${id}" não mapeado.`); return; }

            if (dataItem.type === 'Pizza') {
                const targetContainer = profileChartsContainer;
                const square = document.createElement('div');
                square.classList.add('square', 'profile-pie-square');
                square.setAttribute('data-type', dataType);
                square.setAttribute('data-id', id);
                square.innerHTML = `<div class="loading-placeholder">Carregando ${id}...</div>`;
                targetContainer.appendChild(square);
                profileChartsCreatedCount++;
            } else {
                const targetContainer = mainGridContainer;

                if (dataItem?.dimensionNumber && String(dataItem.dimensionNumber).trim() !== "") {
                    const dimNumStr = String(dataItem.dimensionNumber).trim();
                    if (!dimensionsMap.has(dimNumStr)) { dimensionsMap.set(dimNumStr, dataItem.dimensionName || `Dimensão ${dimNumStr}`); }
                }

                if (dataItem.dimensionNumber && dataItem.indicatorNumber) {
                    const itemDimensionNumber = String(dataItem.dimensionNumber).trim();
                    const itemIndicatorNumber = String(dataItem.indicatorNumber).trim();
                    const indicatorKeyForJson = `${itemDimensionNumber}.${itemIndicatorNumber}`;
                    const itemIndicatorFullName = dataItem.indicatorName || `Indicador ${indicatorKeyForJson}`; 

                    if (indicatorKeyForJson !== currentIndicatorFullId) {
                        const subtitleElement = document.createElement('h3');
                        subtitleElement.className = 'indicator-subtitle';
                        subtitleElement.textContent = itemIndicatorFullName; 
                        subtitleElement.setAttribute('data-indicator-full-id', indicatorKeyForJson);
                        subtitleElement.setAttribute('data-dimension-number', itemDimensionNumber);
                        targetContainer.appendChild(subtitleElement);
                        currentIndicatorFullId = indicatorKeyForJson;

                        if (descricoesData && descricoesData.descricoesIndicadores && descricoesData.descricoesIndicadores[indicatorKeyForJson]) {
                            const indicadorDescElement = document.createElement('p');
                            indicadorDescElement.className = 'indicator-description-text'; 
                            indicadorDescElement.textContent = descricoesData.descricoesIndicadores[indicatorKeyForJson];
                            indicadorDescElement.setAttribute('data-indicator-full-id', indicatorKeyForJson);
                            indicadorDescElement.setAttribute('data-dimension-number', itemDimensionNumber);
                            targetContainer.appendChild(indicadorDescElement);
                        }
                    }
                }

                const square = document.createElement('div');
                square.classList.add('square');
                square.setAttribute('data-type', dataType);
                square.setAttribute('data-id', id);
                square.setAttribute('data-dimension-number', dataItem.dimensionNumber ? String(dataItem.dimensionNumber).trim() : 'none');
                if (dataItem.dimensionNumber && dataItem.indicatorNumber) {
                    square.setAttribute('data-indicator-full-id', `${String(dataItem.dimensionNumber).trim()}.${String(dataItem.indicatorNumber).trim()}`);
                }
                if (dataType === 'teia_pair_special') { square.classList.add('special-teia-double-height'); }
                square.innerHTML = `<div class="loading-placeholder">Carregando ${id}...</div>`;
                targetContainer.appendChild(square);
            }
        });

        console.log(`main-init.js: ${profileChartsCreatedCount} squares de perfil criados.`);
        console.log(`main-init.js: ${mainGridContainer.querySelectorAll('.square').length} squares normais criados.`);
        console.log(`main-init.js: ${mainGridContainer.querySelectorAll('.indicator-subtitle').length} subtítulos de indicador criados.`);

        if (profileChartsCreatedCount === 0) {
            profileSectionTitle.style.display = 'none';
            profileChartsContainer.style.display = 'none';
        } else {
            profileSectionTitle.style.display = 'block';
            profileChartsContainer.style.display = 'grid';
        }

        const sortedDimensions = [...dimensionsMap.entries()].sort((a, b) => { const numA=parseInt(a[0],10); const numB=parseInt(b[0],10); if(isNaN(numA)&&isNaN(numB)) return 0; if(isNaN(numA)) return 1; if(isNaN(numB)) return -1; return numA-numB; });
        const allButton = document.createElement('button'); allButton.className = 'filter-btn active'; allButton.textContent = 'Todas as Dimensões'; allButton.dataset.dimension = 'all'; filterButtonsContainer.appendChild(allButton);
        sortedDimensions.forEach(([dimNumber, dimName]) => { const dimButton = document.createElement('button'); dimButton.className = 'filter-btn'; dimButton.textContent = `Dimensão ${dimNumber}`; dimButton.dataset.dimension = dimNumber; dimButton.title = dimName; filterButtonsContainer.appendChild(dimButton); });
        console.log(`main-init.js: ${filterButtonsContainer.children.length} botões de filtro criados.`);

        const infoTableContainer = document.getElementById('info-summary-table-container');
        if (infoTableContainer) { infoTableContainer.innerHTML = ''; let schoolInfo = { name: 'N/A', city: 'N/A', state: 'N/A', responsible: 'N/A' }; const storedSchoolInfo = localStorage.getItem("schoolInfo"); if (storedSchoolInfo) { try { const parsedInfo = JSON.parse(storedSchoolInfo); schoolInfo.name=parsedInfo.name||schoolInfo.name; schoolInfo.city=parsedInfo.city||schoolInfo.city; schoolInfo.state=parsedInfo.state||schoolInfo.state; schoolInfo.responsible=parsedInfo.responsible||schoolInfo.responsible; } catch (e) { /*console.error("Erro parse schoolInfo:", e);*/ } } const respondentCounts = {}; const dadosCompletosLocal = JSON.parse(localStorage.getItem("dadosCompletos")); if (dadosCompletosLocal?.DemaisTabelas) { for (const [fileName, table] of Object.entries(dadosCompletosLocal.DemaisTabelas)) { const groupName = fileName.replace(/\.(xlsx?|csv)$/i, ""); const count = (table || []).slice(1).filter(row => row?.some(cell => cell != null && String(cell).trim() !== '')).length; respondentCounts[groupName] = count; } } const table = document.createElement('table'); table.id = 'info-summary-table'; const tbody = table.createTBody(); const addRow = (label, value) => { const row = tbody.insertRow(); const th = document.createElement('th'); th.textContent = label; const td = document.createElement('td'); td.textContent = value; row.appendChild(th); row.appendChild(td); }; const schoolHeaderRow = tbody.insertRow(); schoolHeaderRow.className = 'info-header'; const schoolHeaderCell = schoolHeaderRow.insertCell(); schoolHeaderCell.colSpan = 2; schoolHeaderCell.textContent = 'Informações da Escola'; addRow('Escola:', schoolInfo.name); addRow('Local:', `${schoolInfo.city} / ${schoolInfo.state}`); addRow('Responsável:', schoolInfo.responsible); if (Object.keys(respondentCounts).length > 0) { const countHeaderRow = tbody.insertRow(); countHeaderRow.className = 'counts-header'; const countHeaderCell = countHeaderRow.insertCell(); countHeaderCell.colSpan = 2; countHeaderCell.textContent = 'Total de Respondentes por Grupo'; for (const [group, count] of Object.entries(respondentCounts)) { addRow(group + ':', count); } } infoTableContainer.appendChild(table); }

        filterButtonsContainer.addEventListener('click', (event) => {
             const clickedButton = event.target.closest('.filter-btn');
             if (clickedButton) {
                const selectedDimension = clickedButton.dataset.dimension;
                filterButtonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                clickedButton.classList.add('active');
                dimensionTitleDisplay.textContent = selectedDimension === 'all' ? 'Todas as Dimensões' : (dimensionsMap.get(selectedDimension) || `Dimensão ${selectedDimension}`);

                if (dimensionDescriptionDisplay) {
                    if (selectedDimension !== 'all' && descricoesData && descricoesData.descricoesDimensoes && descricoesData.descricoesDimensoes[selectedDimension]) {
                        dimensionDescriptionDisplay.textContent = descricoesData.descricoesDimensoes[selectedDimension];
                        dimensionDescriptionDisplay.style.display = 'block';
                    } else {
                        dimensionDescriptionDisplay.textContent = '';
                        dimensionDescriptionDisplay.style.display = 'none';
                    }
                }

                const squaresInMainGrid = mainGridContainer.querySelectorAll('.square');
                const subtitlesInMainGrid = mainGridContainer.querySelectorAll('.indicator-subtitle');
              
                const indicatorDescriptionsInMainGrid = mainGridContainer.querySelectorAll('.indicator-description-text');
                let visibleSquareCount = 0;

                squaresInMainGrid.forEach(square => {
                    const d = square.dataset.dimensionNumber;
                    square.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'flex' : 'none';
                    if (square.style.display !== 'none') visibleSquareCount++;
                });
                subtitlesInMainGrid.forEach(subtitle => {
                    const d = subtitle.dataset.dimensionNumber;
                    subtitle.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'block' : 'none';
                });
               
                indicatorDescriptionsInMainGrid.forEach(desc => {
                    const d = desc.dataset.dimensionNumber; 
                    desc.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'block' : 'none';
                });

                console.log(`Filtro aplicado: Dimensão '${selectedDimension}'. ${visibleSquareCount} squares normais visíveis.`);
             }
        });

        dimensionTitleDisplay.textContent = 'Todas as Dimensões';
        if (dimensionDescriptionDisplay) {
            dimensionDescriptionDisplay.textContent = '';
            dimensionDescriptionDisplay.style.display = 'none';
        }

        console.log("main-init.js: Chamando inicializadores dos módulos...");
        if (typeof PieChart !== 'undefined' && PieChart.init) PieChart.init(); else console.error("Módulo PieChart não carregado ou não possui init().");
        if (typeof BarChart !== 'undefined' && BarChart.init) BarChart.init(); else console.error("Módulo BarChart não carregado ou não possui init().");
        if (typeof RadarChart !== 'undefined' && RadarChart.init) RadarChart.init(); else console.error("Módulo RadarChart não carregado ou não possui init().");
        if (typeof ResponseTable !== 'undefined' && ResponseTable.init) ResponseTable.init(); else console.error("Módulo ResponseTable não carregado ou não possui init().");
        console.log("main-init.js: Inicialização dos módulos solicitada.");

    }


    if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
        console.log("main-init.js: Dados prontos. Iniciando.");
        initializeVisualizations(); 
    } else {
        console.log("main-init.js: Aguardando 'visualizacaoDataReady'.");
        const handleDataReady = () => {
            console.log("main-init.js: Evento 'visualizacaoDataReady' recebido.");
            if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
                console.log("main-init.js: Iniciando após evento.");
                initializeVisualizations();  
            } else {
                console.error("Erro: 'visualizacaoDataReady' disparado, mas dados inválidos.");
                const gridContainer = document.querySelector('.grid-container');
                const dimensionTitleDisplay = document.getElementById('dimension-title');
                if (gridContainer) gridContainer.innerHTML = '<p>Falha ao carregar dados.</p>';
                if (dimensionTitleDisplay) dimensionTitleDisplay.textContent = 'Erro dados';
            }
        };
        document.addEventListener('visualizacaoDataReady', handleDataReady, { once: true });
        setTimeout(() => {
            document.removeEventListener('visualizacaoDataReady', handleDataReady);
            const hasFilterButtons = document.querySelector('#dimension-filters .filter-btn');
            if (!hasFilterButtons) {
                if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
                    console.log("main-init.js: Iniciando no timeout.");
                    initializeVisualizations();  
                } else {
                    console.error("Erro: Timeout esperando dados.");
                    const gridContainer = document.querySelector('.grid-container');
                    const dimensionTitleDisplay = document.getElementById('dimension-title');
                    if (gridContainer) gridContainer.innerHTML = '<p>Falha ao carregar dados (timeout).</p>';
                    if (dimensionTitleDisplay) dimensionTitleDisplay.textContent = 'Erro dados (timeout)';
                }
            }
        }, 5000);
    }


    document.body.addEventListener('click', (e) => { const editBtn = e.target.closest('.edit-chart-btn'); const editPerguntasBtn = e.target.closest('.edit-perguntas-btn'); if (!editBtn && !editPerguntasBtn) return; const buttonClicked = editBtn || editPerguntasBtn; const square = buttonClicked.closest('.square'); if (!square) return; const dataIdFromSquare = square.getAttribute('data-id'); if (!dataIdFromSquare) return; const dataType = square.getAttribute('data-type'); if (editPerguntasBtn) { let idParaPerguntasTable = dataIdFromSquare; if (dataType === 'teia_pair_special') { const parts = dataIdFromSquare.split('_'); if (parts.length > 1) { const baseIdDetected = parts[0]; if (baseIdDetected) idParaPerguntasTable = baseIdDetected; } } if (typeof PerguntasTable !== 'undefined' && PerguntasTable.openEditModal) { if (!window.defaultPerguntasTableSettings) { console.error("defaultPerguntasTableSettings não encontrado."); return; } PerguntasTable.openEditModal(idParaPerguntasTable); } else { console.error("PerguntasTable.openEditModal não disponível.");} } else if (editBtn) { if (!dataType) return; switch (dataType) { case 'grafico_de_barras': if (typeof BarChart !== 'undefined' && BarChart.openEditModal) BarChart.openEditModal(dataIdFromSquare); else console.error("BarChart.openEditModal não encontrado."); break; case 'grafico_de_teia': case 'teia_pair_special': if (typeof RadarChart !== 'undefined' && RadarChart.openEditModal) RadarChart.openEditModal(dataIdFromSquare); else console.error("RadarChart.openEditModal não encontrado."); break; case 'quadro_de_respostas': if (typeof ResponseTable !== 'undefined' && ResponseTable.openEditModal) ResponseTable.openEditModal(dataIdFromSquare); else console.error("ResponseTable.openEditModal não encontrado."); break; case 'grafico_de_pizza': console.log("Edição não disponível para Gráfico de Pizza (Perfil)."); break; default: console.warn("Tipo não reconhecido para edição:", dataType); } } });
    document.body.addEventListener('click', (e) => { const collapseBtn = e.target.closest('.collapse-perguntas-btn'); if (!collapseBtn) return; const square = collapseBtn.closest('.square'); if (!square) return; const tableWrapper = square.querySelector('.perguntas-table-wrapper'); if (tableWrapper) { tableWrapper.classList.toggle('collapsed'); collapseBtn.classList.toggle('collapsed'); } });
    document.body.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('modal-component')) { if (typeof closeModal === 'function') { closeModal(e.target); } } });

    const openBtn = document.getElementById('open-download-sidebar-btn'); const closeBtn = document.getElementById('close-download-sidebar-btn'); const sidebar = document.getElementById('download-sidebar');
    if (openBtn && closeBtn && sidebar) { openBtn.addEventListener('click', () => { sidebar.classList.add('open'); openBtn.classList.add('hidden'); }); closeBtn.addEventListener('click', () => { sidebar.classList.remove('open'); openBtn.classList.remove('hidden'); }); document.body.addEventListener('click', (event) => { if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && event.target !== openBtn) { sidebar.classList.remove('open'); openBtn.classList.remove('hidden'); } }, true); }
    if (typeof DownloadHandler !== 'undefined' && DownloadHandler.init) { DownloadHandler.init(); }

});