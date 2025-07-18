/*
 * Script: response-table.js
 *
 * Objetivo: Gerenciar a renderização e edição de "Quadros de Respostas", que são tabelas HTML
 * exibindo dados tabulares. O script permite personalizar a aparência da tabela e
 * gerenciar a adição/remoção de dados dentro do modal de edição.
 *
 * Funcionamento:
 * 1. **Módulo IIFE (Immediately Invoked Function Expression):** O código é encapsulado
 * em uma IIFE, criando um escopo privado e expondo apenas as funções `init`, `plot`
 * e `openEditModal` publicamente.
 *
 * 2. **Configurações Padrão:** Recupera as configurações padrão para tabelas
 * de `window.defaultTableSettings`, garantindo um ponto de partida consistente.
 *
 * 3. **Renderização da Tabela (`plot`):**
 * - Recebe dados, opções de estilo e o ID do contêiner HTML onde a tabela será plotada.
 * - Cria a estrutura HTML da tabela (cabeçalhos, células de dados) dinamicamente.
 * - Aplica os estilos (cores, fontes, bordas, alinhamento) definidos nas opções.
 * - Se `isModalPreview` for `true`, adiciona botões de "X" para permitir a remoção de linhas
 * diretamente na pré-visualização do modal.
 * - Exibe uma mensagem de "Sem dados" se os dados fornecidos forem inválidos ou vazios.
 *
 * 4. **Construção do Modal de Edição (`buildModalHTML`):**
 * - Gera o HTML completo para o modal de edição de tabelas, incluindo:
 * - Uma área de pré-visualização da tabela.
 * - Campos de input para todas as opções de estilo (título, cores, fontes, bordas, alinhamento).
 * - Botões para "Mais Configurações" / "Menos Configurações" para expandir/recolher opções.
 * - Botões de ação como "Aplicar", "Voltar ao Padrão" e "Cancelar", com opções de escopo
 * ("Neste" ou "Em Todos").
 *
 * 5. **Coleta de Valores do Formulário (`getFormValues`):**
 * - Extrai os valores atuais dos campos de input do modal, convertendo-os para os tipos corretos
 * (números, cores, strings) e aplicando valores padrão se necessário.
 *
 * 6. **Aplicação/Reset de Configurações (`applyOrResetToTable`):**
 * - Aplica um novo conjunto de opções (ou opções de reset) a uma instância de tabela
 * específica, atualizando suas propriedades e re-renderizando-a.
 *
 * 7. **Abertura do Modal de Edição (`openEditModal`):**
 * - É a função principal chamada para iniciar o processo de edição de uma tabela específica.
 * - Recupera a referência da tabela global (`window.charts`) com seus dados e opções atuais.
 * - Cria o overlay e o conteúdo do modal usando `buildModalHTML`.
 * - Inicializa a pré-visualização da tabela no modal com os dados e opções atuais.
 * - **Gerencia a Edição de Dados no Modal:** Adiciona um listener para os botões "X"
 * na pré-visualização, permitindo que o usuário remova linhas de respostas ou grupos inteiros.
 * As alterações são aplicadas a uma cópia temporária dos dados (`currentModalData`) no modal.
 * - **Gerencia a Edição de Estilos no Modal:** Adiciona listeners a todos os inputs e selects
 * de configuração, atualizando `currentModalOptions` e a pré-visualização em tempo real.
 * - **Botões de Ação:**
 * - **Aplicar:** Salva as configurações de estilo e as alterações de dados feitas no modal
 * para a instância da tabela selecionada (ou para todas as tabelas, dependendo do escopo).
 * Preserva o título original para outros gráficos se o escopo for "Todos".
 * - **Voltar ao Padrão:** Restaura as opções de estilo da tabela para os valores padrão globais
 * e os dados para o seu estado original (antes de qualquer exclusão no modal), aplicando a
 * mudança ao gráfico atual ou a todos, conforme o escopo.
 * - **Cancelar:** Fecha o modal sem aplicar nenhuma alteração.
 *
 * 8. **Inicialização (`init`):**
 * - É a função chamada no carregamento da página para identificar todos os "squares" HTML
 * que devem conter "Quadros de Respostas" (baseado no atributo `data-type`).
 * - Para cada "square":
 * - Cria um contêiner para a tabela e um botão "Editar Quadro".
 * - Carrega as configurações de estilo salvas (`window.configRespostas`) ou usa os padrões.
 * - Determina os dados iniciais da tabela: prioriza dados modificados salvos (via `_currentData`
 * nas configurações salvas) ou, se não houver, usa os dados originais.
 * - Armazena uma referência completa da instância da tabela (`type`, `containerId`, `data`,
 * `originalData`, `options`, `dataId`) no objeto global `window.charts` para fácil acesso.
 * - Plota a tabela inicial no "square" usando os dados e opções carregados.
 */


const ResponseTable = (() => {

    const defaults = () => window.defaultTableSettings || {};

    const createCell = (parentRow, text, styles, isHeader = false, cellClass = null) => {
        const cell = parentRow.insertCell();
        cell.colSpan = 1;
        Object.assign(cell.style, styles);
        if (cellClass) {
            cell.classList.add(cellClass);
        }
        if (!isHeader && text !== null && text !== undefined) {
            cell.innerHTML = String(text).replace(/\n/g, '<br>');
        } else {
            cell.textContent = text ?? '';
        }
        return cell;
    };

    const plot = (data, options = {}, containerId, isModalPreview = false) => {
        const container = getEl(containerId);
        if (!container) {
            console.error("ResponseTable.plot: Container não encontrado:", containerId);
            const parentSquare = document.querySelector(`.square [id='${containerId}']`)?.closest('.square');
            if (parentSquare) parentSquare.innerHTML = `<p style="color: red;">Erro: Container ${containerId} não encontrado.</p>`;
            return;
        }

        if (data === null || data === undefined || typeof data !== 'object') {
            console.warn(`ResponseTable.plot: Dados inválidos ou ausentes para ${containerId}. Exibindo mensagem.`);
            container.innerHTML = '<p style="color: orange; text-align: center;">(Sem dados de respostas disponíveis)</p>';
            if (options.title) {
                const titleEl = document.createElement('h3');
                Object.assign(titleEl.style, { color: options.titleColor || '#000', fontSize: `${options.titleFontSize || 16}px`, textAlign: "center", marginBottom: '10px', fontWeight: 'bold' });
                titleEl.textContent = options.title;
                container.insertBefore(titleEl, container.firstChild);
            }
            return;
        }

        const settings = { ...defaults(), ...options };
        const {
            title, titleFontSize, titleColor, headColor, cellColor, bgColor,
            headFontSize, cellFontSize, borderSize, borderColor, headAlign, cellAlign
        } = settings;

        container.innerHTML = "";
        Object.assign(container.style, { backgroundColor: bgColor, padding: '10px', boxSizing: 'border-box' });

        if (title) {
            const titleEl = document.createElement('h3');
            Object.assign(titleEl.style, { color: titleColor, fontSize: `${titleFontSize}px`, textAlign: "center", marginBottom: '10px', fontWeight: 'bold' });
            titleEl.textContent = title;
            container.appendChild(titleEl);
        }

        const table = document.createElement('table');
        Object.assign(table.style, { width: "100%", borderCollapse: "collapse", border: `${borderSize}px solid ${borderColor}` });

        const baseCellStyle = { border: `${borderSize}px solid ${borderColor}`, padding: "6px" };
        const headerCellStyle = { ...baseCellStyle, backgroundColor: headColor, fontSize: `${headFontSize}px`, fontWeight: 'bold', textAlign: headAlign, padding: "8px" };
        const responseCellStyle = { ...baseCellStyle, backgroundColor: cellColor, fontSize: `${cellFontSize}px`, textAlign: cellAlign, verticalAlign: 'top' };
        const noResponseCellStyle = { ...responseCellStyle, textAlign: 'center', fontStyle: 'italic', color: '#666' };
        const deleteBtnCellStyle = { ...baseCellStyle, width: '30px', textAlign: 'center', padding: '0', backgroundColor: cellColor };

        const groups = Object.keys(data);
        if (groups.length === 0 && !isModalPreview) {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.colSpan = isModalPreview ? 2 : 1;
            cell.innerHTML = '<td colspan="1" style="text-align:center; font-style:italic; padding:10px;">Nenhum grupo com respostas para exibir.</td>';
        } else {
            if (isModalPreview) {
                const thead = table.createTHead();
                const hr = thead.insertRow();
                const th1 = hr.insertCell();
                th1.style.width = 'calc(100% - 30px)';
                const th2 = hr.insertCell();
                th2.style.width = '30px';
                hr.style.visibility = 'collapse';
            }

            const tbody = table.createTBody();
            groups.forEach(group => {
                const responses = data[group];
                const headerRow = tbody.insertRow();
                const headerCell = createCell(headerRow, group, headerCellStyle, true);
                if (isModalPreview) headerCell.colSpan = 2;

                if (Array.isArray(responses) && responses.length > 0) {
                    responses.forEach((response, index) => {
                        const responseRow = tbody.insertRow();
                        createCell(responseRow, response, responseCellStyle);
                        if (isModalPreview) {
                            const deleteCell = createCell(responseRow, '', deleteBtnCellStyle, false, 'delete-cell');
                            const deleteBtn = document.createElement('button');
                            deleteBtn.textContent = 'X';
                            deleteBtn.classList.add('delete-response-btn');
                            deleteBtn.setAttribute('data-group', group);
                            deleteBtn.setAttribute('data-index', index.toString());
                            Object.assign(deleteBtn.style, { color: 'red', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' });
                            deleteCell.appendChild(deleteBtn);
                        }
                    });
                } else {
                    const noResponseRow = tbody.insertRow();
                    const noResponseCell = createCell(noResponseRow, "(Sem respostas registradas)", noResponseCellStyle);
                    if (isModalPreview) {
                        const deletePlaceholderCell = createCell(noResponseRow, '', deleteBtnCellStyle, false, 'delete-cell');
                        const deletePlaceholderBtn = document.createElement('button');
                        deletePlaceholderBtn.textContent = 'X';
                        deletePlaceholderBtn.classList.add('delete-response-btn');
                        deletePlaceholderBtn.setAttribute('data-group', group);
                        deletePlaceholderBtn.setAttribute('data-is-placeholder', 'true');
                        Object.assign(deletePlaceholderBtn.style, { color: 'red', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' });
                        deletePlaceholderCell.appendChild(deletePlaceholderBtn);
                    }
                }
            });
        }
        container.appendChild(table);
    };

    const buildModalHTML = settings => {
    const d = defaults();
    const alignOpts = (sel, def) => buildOptions(['left', 'center', 'right', 'justify'], sel, def);

    return `
        <div class="graph-container" style="display: flex; align-items: flex-start; justify-content: center; min-height: 300px; padding: 10px; background-color: #f0f0f0;">
            <div id="modalTablePreview" style="width: 100%; max-height: 595px; overflow-y: auto; overflow-x: hidden; background:${settings.bgColor ?? d.bgColor ?? '#ffffff'}; border: 1px solid #ccc; box-sizing: border-box;"></div>
        </div>
        <div class="settings-container">
            <h3>Editar Quadro de Respostas</h3>
            <div class="basic-settings">
                ${buildInput('text', 'table-title', settings.title ?? d.title ?? '', 'Título')}
                ${buildInput('number', 'table-title-font', settings.titleFontSize ?? d.titleFontSize ?? 16, 'Tam. Fonte Título')}
                ${buildInput('color', 'table-title-color', settings.titleColor ?? d.titleColor ?? '#000000', 'Cor Título')}
                ${buildInput('color', 'table-head-color', settings.headColor ?? d.headColor ?? '#b0c4de', 'Cor Cabeçalho')}
                ${buildInput('color', 'table-cell-color', settings.cellColor ?? d.cellColor ?? '#f0f8ff', 'Cor Células')}
                ${buildInput('color', 'table-bg-color', settings.bgColor ?? d.bgColor ?? '#ffffff', 'Cor Fundo')}
                <button id="toggle-additional-table-btn">Mais Configurações</button>
            </div>
            <div class="additional-table-settings" style="display:none;">
                ${buildInput('number', 'table-head-font', settings.headFontSize ?? d.headFontSize ?? 14, 'Tam. Fonte Cabeçalho')}
                ${buildInput('number', 'table-cell-font', settings.cellFontSize ?? d.cellFontSize ?? 12, 'Tam. Fonte Respostas')}
                ${buildInput('number', 'table-border-size', settings.borderSize ?? d.borderSize ?? 1, 'Tam. Borda (px)', { props: { min: "0" } })}
                ${buildInput('color', 'table-border-color', settings.borderColor ?? d.borderColor ?? '#cccccc', 'Cor Borda')}
                ${buildInput('select', 'table-head-align', '', 'Alinh. Cabeçalho', { optionHTML: alignOpts(settings.headAlign, d.headAlign) })}
                ${buildInput('select', 'table-cell-align', '', 'Alinh. Respostas', { optionHTML: alignOpts(settings.cellAlign, d.cellAlign) })}
                <button id="toggle-additional-table-btn-hide">Menos Configurações</button>
            </div>
            <div class="settings-buttons">
                <div class="btn-group"><button id="apply-table-btn">Aplicar</button><select id="apply-table-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
                <div class="btn-group"><button id="reset-table-btn">Voltar ao Padrão</button><select id="reset-table-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
                <button id="close-table-edit-btn">Cancelar</button>
            </div>
        </div>
        `;
};

const getFormValues = () => {
    const d = defaults();
    return {
        title: getVal('table-title'),
        titleFontSize: getIntVal('table-title-font', d.titleFontSize),
        titleColor: getVal('table-title-color'),
        headColor: getVal('table-head-color'),
        cellColor: getVal('table-cell-color'),
        bgColor: getVal('table-bg-color'),
        headFontSize: getIntVal('table-head-font', d.headFontSize),
        cellFontSize: getIntVal('table-cell-font', d.cellFontSize),
        borderSize: getIntVal('table-border-size', d.borderSize),
        borderColor: getVal('table-border-color'),
        headAlign: getVal('table-head-align') || d.headAlign,
        cellAlign: getVal('table-cell-align') || d.cellAlign
    };
};

const applyOrResetToTable = (tableRef, newOpts) => {
    if (tableRef?.containerId && typeof tableRef.data !== 'undefined' && typeof plot === 'function') {
        tableRef.options = JSON.parse(JSON.stringify(newOpts));
        plot(tableRef.data, tableRef.options, tableRef.containerId, false);
    } else {
        console.error("Falha ao aplicar/resetar: referência de tabela inválida ou dados ausentes.", tableRef);
    }
};

const openEditModal = (dataId) => {
    console.log(`ResponseTable.openEditModal chamado para ID: ${dataId}`);
    const chartKey = `table_${dataId}`;
    const tableRef = window.charts?.[chartKey];

    if (!tableRef || typeof tableRef.data === 'undefined' || typeof tableRef.originalData === 'undefined' || !tableRef.options || !tableRef.containerId) {
        console.error("Referência da tabela inválida, incompleta ou não encontrada:", chartKey, tableRef);
        alert(`Erro: Não foi possível encontrar os dados ou configurações para editar a tabela ${dataId}.`);
        return;
    }

    const d = defaults();
    let currentModalOptions = { ...d, ...(tableRef.options || {}) };
    let currentModalData = JSON.parse(JSON.stringify(tableRef.data));

    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'edit-modal modal-component';
    modal.innerHTML = buildModalHTML(currentModalOptions);
    overlay.appendChild(modal);

    const previewContainerId = "modalTablePreview";
    const modalPreviewContainer = getEl(previewContainerId);

    const renderPreview = () => {
        plot(currentModalData, currentModalOptions, previewContainerId, true);
    };
    renderPreview();

    modalPreviewContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-response-btn');
        if (!deleteBtn) return;

        const group = deleteBtn.getAttribute('data-group');
        const indexStr = deleteBtn.getAttribute('data-index');
        const isPlaceholder = deleteBtn.getAttribute('data-is-placeholder') === 'true';

        if (!group || (!indexStr && !isPlaceholder)) {
            console.error('Botão de exclusão sem atributos data-group/data-index ou data-is-placeholder.');
            return;
        }

        if (currentModalData[group]) {
            if (isPlaceholder) {
                delete currentModalData[group];
                console.log(`Grupo placeholder "${group}" removido do estado do modal.`);
            } else {
                const index = parseInt(indexStr, 10);
                if (!isNaN(index) && currentModalData[group][index] !== undefined) {
                    currentModalData[group].splice(index, 1);
                    console.log(`Resposta índice ${index} do grupo "${group}" removida do estado do modal.`);
                    if (currentModalData[group].length === 0) {
                        delete currentModalData[group];
                        console.log(`Grupo "${group}" removido do estado do modal por ficar vazio.`);
                    }
                }
            }
            renderPreview();
        }
    });

    const updateOptionsAndPreview = () => {
            currentModalOptions = getFormValues();
            renderPreview();
        };
        modal.querySelectorAll('.settings-container input, .settings-container select').forEach(el => {
            const eventType = ['color', 'number', 'text', 'range'].includes(el.type) ? 'input' : 'change';
            el.addEventListener(eventType, updateOptionsAndPreview);
        });
        onClick('toggle-additional-table-btn', () => { getEl('toggle-additional-table-btn').style.display = 'none'; modal.querySelector('.additional-table-settings').style.display = 'block'; });
        onClick('toggle-additional-table-btn-hide', () => { getEl('toggle-additional-table-btn').style.display = 'block'; modal.querySelector('.additional-table-settings').style.display = 'none'; });

        onClick('apply-table-btn', () => {
            const finalOptions = getFormValues();
            const finalData = JSON.parse(JSON.stringify(currentModalData));
            const scope = getVal('apply-table-scope');
            const editedTableDataId = tableRef.dataId;

            const applyAction = (instance) => {
                let optionsToApply = JSON.parse(JSON.stringify(finalOptions));
                let dataToApply;

                if (instance.dataId === editedTableDataId) {
                    dataToApply = JSON.parse(JSON.stringify(finalData));
                    console.log(`Aplicando dados modificados e opções (incl. título '${optionsToApply.title}') a ${instance.dataId}`);
                } else {
                    dataToApply = JSON.parse(JSON.stringify(instance.data));
                    const originalInstanceTitle = instance.options?.title || window.visualizacaoData?.[instance.dataId]?.title || `Quadro ${instance.dataId}`;
                    optionsToApply.title = originalInstanceTitle;
                    console.log(`Aplicando opções (preservando título '${originalInstanceTitle}') a ${instance.dataId}`);
                }
                instance.options = optionsToApply;
                instance.data = dataToApply;
                plot(instance.data, instance.options, instance.containerId, false);
            };

            applyScopedAction('table_', tableRef, scope, applyAction);
            closeModal(overlay);
        });

        onClick('reset-table-btn', () => {
            const globalDefaults = defaults();
            if (!globalDefaults || Object.keys(globalDefaults).length === 0) {
                console.error("Defaults da tabela não encontrados para reset!");
                alert("Erro: Configurações padrão não encontradas para resetar.");
                return;
            }
            const resetOpts = JSON.parse(JSON.stringify(globalDefaults));

            const resetAction = (instance) => {
                instance.data = JSON.parse(JSON.stringify(instance.originalData));
                instance.options = JSON.parse(JSON.stringify(resetOpts));
                const originalTitle = window.visualizacaoData?.[instance.dataId]?.title || `Quadro ${instance.dataId}`;
                instance.options.title = originalTitle;

                plot(instance.data, instance.options, instance.containerId, false);
            };

            applyScopedAction('table_', tableRef, getVal('reset-table-scope'), resetAction);

            currentModalData = JSON.parse(JSON.stringify(tableRef.originalData));
            currentModalOptions = { ...resetOpts, title: tableRef.options.title };
            renderPreview();
        });

        onClick('close-table-edit-btn', () => closeModal(overlay));
    };

    const init = () => {
        console.log("ResponseTable.init() iniciado...");
        const squares = document.querySelectorAll('.square[data-type="quadro_de_respostas"]');
        console.log(`Encontrados ${squares.length} squares para Quadros de Resposta.`);

        const savedTableConfigs = window.configRespostas || {};

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = '<div class="loading-placeholder">Carregando quadro...</div>';

            if (!dataId) {
                console.error("Square com data-type='quadro_de_respostas' não possui data-id. Pulando.", square);
                square.innerHTML = '<p style="color: red;">Erro: ID do quadro ausente.</p>';
                return;
            }
            const dataItem = window.visualizacaoData?.[dataId];

            if (!dataItem || typeof dataItem.dfRespostas === 'undefined') {
                console.error(`Dados para Quadro de Respostas ID ${dataId} não encontrados ou inválidos em window.visualizacaoData.`, dataItem);
                square.innerHTML = `<p style="color: red;">Erro: Dados para ${dataId} não encontrados.</p>`;
                return;
            }

            const containerId = `tableContainer_${dataId}`;
            const container = document.createElement('div');
            container.id = containerId;
            Object.assign(container.style, { width: "100%", height: "calc(100% - 35px)", overflow: "auto", position: "relative", padding: "5px", boxSizing: 'border-box' });
            const editBtn = document.createElement('button');
            Object.assign(editBtn, { className: 'edit-chart-btn', textContent: 'Editar Quadro' });

            square.innerHTML = '';
            square.append(container, editBtn);
            square.addEventListener('mouseenter', () => editBtn.style.display = 'block');
            square.addEventListener('mouseleave', () => editBtn.style.display = 'none');

            const defaultOpts = JSON.parse(JSON.stringify(defaults()));
            const savedOptsRaw = savedTableConfigs[dataId] ? JSON.parse(JSON.stringify(savedTableConfigs[dataId])) : {};

            let initialData;
            if (savedOptsRaw && savedOptsRaw._currentData && typeof savedOptsRaw._currentData === 'object') {
                console.log(`Usando _currentData da configuração salva para a tabela ${dataId}.`);
                initialData = JSON.parse(JSON.stringify(savedOptsRaw._currentData));
                delete savedOptsRaw._currentData;
            } else {
                console.log(`Nenhum _currentData válido na configuração salva para a tabela ${dataId}. Usando dados originais.`);
                initialData = JSON.parse(JSON.stringify(dataItem.dfRespostas));
            }

            const originalDataForReset = JSON.parse(JSON.stringify(dataItem.dfRespostas));

            const initialOptions = {
                ...defaultOpts,
                ...savedOptsRaw,
                title: dataItem.title || savedOptsRaw.title || defaultOpts.title
            };
            console.log(`Configurações de estilo salvas encontradas para tabela ${dataId}:`, savedOptsRaw);
            console.log(`Opções iniciais para tabela ${dataId}:`, initialOptions);
            console.log(`Dados iniciais para tabela ${dataId} (salvos ou originais):`, initialData);

            const chartKey = `table_${dataId}`;
            window.charts[chartKey] = {
                type: 'response-table',
                containerId,
                data: initialData,
                originalData: originalDataForReset,
                options: initialOptions,
                dataId: dataId
            };
            console.log(`Referência armazenada para ${chartKey}`, window.charts[chartKey]);

            plot(window.charts[chartKey].data, initialOptions, containerId, false);
        });
        console.log("ResponseTable.init() concluído.");
    };

    return { init, plot, openEditModal };

})();