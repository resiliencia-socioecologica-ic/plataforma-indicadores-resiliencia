/*
 * main-init.js (Preparado para TeiaPair e Pizza Perfil v2)
 * Ponto de entrada principal para inicialização das visualizações.
 * 1. Espera o DOM carregar.
 * 2. Verifica se window.visualizacaoData está pronto (aguarda se necessário).
 * 3. Ordena os IDs dos gráficos (incluindo TeiaPair e Pizza Perfil).
 * 4. **MODIFICADO**: Separa processamento de Pizza Perfil dos demais itens.
 * 5. Extrai dimensões únicas dos dados *não-perfil*.
 * 6. Cria botões de filtro para cada dimensão e um botão "Todas".
 * 7. Itera sobre os IDs ordenados:
 *    - Cria squares de Pizza Perfil no container dedicado (sem filtro/subtítulo).
 *    - Insere subtítulos de Indicador *apenas para itens não-perfil*.
 *    - Cria squares normais (Barra, Teia, etc.) no grid principal com atributos de filtro.
 * 8. Oculta seção de perfil se vazia.
 * 9. Adiciona event listener aos botões de filtro.
 * 10. Chama as funções .init() dos módulos de gráfico/tabela (incluindo PieChart).
 * 11. Configura listeners globais.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("main-init.js: DOMContentLoaded disparado.");

    // Função auxiliar para comparar IDs (sem mudanças)
    function compareIds(idA, idB) { const strIdA = String(idA); const strIdB = String(idB); const partsA = strIdA.split('_'); const partsB = strIdB.split('_'); const numericPartA = partsA[0]; const numericPartB = partsB[0]; if (numericPartA !== numericPartB) { const numPartsA = numericPartA.split('.').map(n => parseInt(n, 10)); const numPartsB = numericPartB.split('.').map(n => parseInt(n, 10)); for (let i = 0; i < Math.max(numPartsA.length, numPartsB.length); i++) { let valA = numPartsA[i]; let valB = numPartsB[i]; if (isNaN(valA) || isNaN(valB)) { const strNumA = String(numericPartA).split('.')[i] || ''; const strNumB = String(numericPartB).split('.')[i] || ''; if (isNaN(valA) && isNaN(valB)){ if (strNumA !== strNumB) return strNumA.localeCompare(strNumB); } else return isNaN(valA) ? 1 : -1; } else if (valA !== valB) { return valA - valB; } } } const categoryA = partsA.slice(1).join('_') || ''; const categoryB = partsB.slice(1).join('_') || ''; if (categoryA !== categoryB) { return categoryA.localeCompare(categoryB); } return 0; }

    // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
    let descricoesData = null; // Para armazenar os dados do JSON

    async function carregarDescricoes() {
        try {
            const response = await fetch('descricoes_indicadores.json'); // CERTIFIQUE-SE QUE ESTE CAMINHO ESTÁ CORRETO
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            descricoesData = await response.json();
            console.log("main-init.js: descricoes_indicadores.json carregado com sucesso.");
        } catch (error) {
            console.error("main-init.js: Erro ao carregar descricoes_indicadores.json:", error);
            // Fallback para objeto vazio para evitar quebras no resto do script
            descricoesData = { descricoesDimensoes: {}, descricoesIndicadores: {} };
        }
    }
    // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>


    // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
    async function initializeVisualizations() { // Adicionado 'async'
    // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>
        console.log("main-init.js: Iniciando criação...");

        // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
        if (!descricoesData) { // Carrega se ainda não o fez
            await carregarDescricoes();
        }
        // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>

        // --- Seleção dos Elementos Essenciais ---
        const mainGridContainer = document.querySelector('.grid-container');
        const profileChartsContainer = document.getElementById('profile-charts-container');
        const profileSectionTitle = document.getElementById('profile-section-title');
        const filterButtonsContainer = document.getElementById('dimension-filters');
        const dimensionTitleDisplay = document.getElementById('dimension-title');

        // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
        // Elemento para descrição da dimensão (cria se não existir)
        let dimensionDescriptionDisplay = document.getElementById('dimension-description-display-text');
        if (!dimensionDescriptionDisplay && dimensionTitleDisplay && dimensionTitleDisplay.parentNode) {
            dimensionDescriptionDisplay = document.createElement('div');
            dimensionDescriptionDisplay.id = 'dimension-description-display-text';
            dimensionDescriptionDisplay.className = 'dimension-description-text'; // Classe para estilização
            // Insere a descrição APÓS o título da dimensão
            dimensionTitleDisplay.parentNode.insertBefore(dimensionDescriptionDisplay, dimensionTitleDisplay.nextSibling);
        } else if (!dimensionDescriptionDisplay) {
             console.warn("main-init.js: dimensionTitleDisplay não encontrado para inserir descrição da dimensão, ou dimensionDescriptionDisplay já existe com outro ID.");
        }
        // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>


        // --- Verificação da Existência dos Elementos ---
        if (!mainGridContainer || !profileChartsContainer || !profileSectionTitle || !filterButtonsContainer || !dimensionTitleDisplay) {
            console.error("Erro crítico: Elementos essenciais não encontrados (grid, profile container/title, filters, dim title).");
            document.body?.insertAdjacentHTML('afterbegin', '<p style="color: red; background: yellow; padding: 10px; text-align: center;">Erro: Falha ao carregar elementos da página.</p>');
            return;
        }

        // --- Limpeza Inicial ---
        mainGridContainer.innerHTML = '';
        profileChartsContainer.innerHTML = '';
        filterButtonsContainer.innerHTML = '';
        dimensionTitleDisplay.textContent = 'Carregando...';
        // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
        if (dimensionDescriptionDisplay) dimensionDescriptionDisplay.innerHTML = ''; // Limpa descrição da dimensão
        // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>


        // --- Mapeamento de Tipos e Obtenção dos Dados ---
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
            // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
            if(dimensionDescriptionDisplay) dimensionDescriptionDisplay.style.display = 'none';
            // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>
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
                    // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                    const indicatorKeyForJson = `${itemDimensionNumber}.${itemIndicatorNumber}`; // Usar esta chave para o JSON
                    const itemIndicatorFullName = dataItem.indicatorName || `Indicador ${indicatorKeyForJson}`; // Usar nome completo no título
                    // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>

                    if (indicatorKeyForJson !== currentIndicatorFullId) {
                        const subtitleElement = document.createElement('h3');
                        subtitleElement.className = 'indicator-subtitle';
                        subtitleElement.textContent = itemIndicatorFullName; // Usar o nome completo
                        subtitleElement.setAttribute('data-indicator-full-id', indicatorKeyForJson);
                        subtitleElement.setAttribute('data-dimension-number', itemDimensionNumber);
                        targetContainer.appendChild(subtitleElement);
                        currentIndicatorFullId = indicatorKeyForJson;

                        // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                        // Adicionar descrição do indicador
                        if (descricoesData && descricoesData.descricoesIndicadores && descricoesData.descricoesIndicadores[indicatorKeyForJson]) {
                            const indicadorDescElement = document.createElement('p');
                            indicadorDescElement.className = 'indicator-description-text'; // Classe para estilização
                            indicadorDescElement.textContent = descricoesData.descricoesIndicadores[indicatorKeyForJson];
                            // Adicionar atributos para filtragem
                            indicadorDescElement.setAttribute('data-indicator-full-id', indicatorKeyForJson);
                            indicadorDescElement.setAttribute('data-dimension-number', itemDimensionNumber);
                            targetContainer.appendChild(indicadorDescElement);
                        }
                        // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>
                    }
                }

                const square = document.createElement('div');
                square.classList.add('square');
                square.setAttribute('data-type', dataType);
                square.setAttribute('data-id', id);
                square.setAttribute('data-dimension-number', dataItem.dimensionNumber ? String(dataItem.dimensionNumber).trim() : 'none');
                if (dataItem.dimensionNumber && dataItem.indicatorNumber) {
                    // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                    square.setAttribute('data-indicator-full-id', `${String(dataItem.dimensionNumber).trim()}.${String(dataItem.indicatorNumber).trim()}`);
                    // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>
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

                // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                // Atualizar descrição da dimensão
                if (dimensionDescriptionDisplay) { // Verifica se o elemento existe
                    if (selectedDimension !== 'all' && descricoesData && descricoesData.descricoesDimensoes && descricoesData.descricoesDimensoes[selectedDimension]) {
                        dimensionDescriptionDisplay.textContent = descricoesData.descricoesDimensoes[selectedDimension];
                        dimensionDescriptionDisplay.style.display = 'block';
                    } else {
                        dimensionDescriptionDisplay.textContent = '';
                        dimensionDescriptionDisplay.style.display = 'none';
                    }
                }
                // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>

                const squaresInMainGrid = mainGridContainer.querySelectorAll('.square');
                const subtitlesInMainGrid = mainGridContainer.querySelectorAll('.indicator-subtitle');
                // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                // Selecionar também as descrições dos indicadores para filtrar
                const indicatorDescriptionsInMainGrid = mainGridContainer.querySelectorAll('.indicator-description-text');
                // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>
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
                // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
                // Filtrar descrições dos indicadores
                indicatorDescriptionsInMainGrid.forEach(desc => {
                    const d = desc.dataset.dimensionNumber; // Assume que este atributo está presente
                    desc.style.display = (selectedDimension === 'all' || d === selectedDimension) ? 'block' : 'none';
                });
                // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>

                console.log(`Filtro aplicado: Dimensão '${selectedDimension}'. ${visibleSquareCount} squares normais visíveis.`);
             }
        });

        dimensionTitleDisplay.textContent = 'Todas as Dimensões';
        // <<< MODIFICAÇÃO/ADIÇÃO INÍCIO >>>
        // Limpar descrição da dimensão inicialmente ao carregar "Todas as Dimensões"
        if (dimensionDescriptionDisplay) {
            dimensionDescriptionDisplay.textContent = '';
            dimensionDescriptionDisplay.style.display = 'none';
        }
        // <<< MODIFICAÇÃO/ADIÇÃO FIM >>>

        console.log("main-init.js: Chamando inicializadores dos módulos...");
        if (typeof PieChart !== 'undefined' && PieChart.init) PieChart.init(); else console.error("Módulo PieChart não carregado ou não possui init().");
        if (typeof BarChart !== 'undefined' && BarChart.init) BarChart.init(); else console.error("Módulo BarChart não carregado ou não possui init().");
        if (typeof RadarChart !== 'undefined' && RadarChart.init) RadarChart.init(); else console.error("Módulo RadarChart não carregado ou não possui init().");
        if (typeof ResponseTable !== 'undefined' && ResponseTable.init) ResponseTable.init(); else console.error("Módulo ResponseTable não carregado ou não possui init().");
        console.log("main-init.js: Inicialização dos módulos solicitada.");

    }


    if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
        console.log("main-init.js: Dados prontos. Iniciando.");
        initializeVisualizations(); // Chama a função (agora async)
    } else {
        console.log("main-init.js: Aguardando 'visualizacaoDataReady'.");
        const handleDataReady = () => {
            console.log("main-init.js: Evento 'visualizacaoDataReady' recebido.");
            if (window.visualizacaoData && Object.keys(window.visualizacaoData).length > 0) {
                console.log("main-init.js: Iniciando após evento.");
                initializeVisualizations();  // Chama a função (agora async)
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
                    initializeVisualizations();  // Chama a função (agora async)
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