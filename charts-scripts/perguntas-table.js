/*
 * Script: perguntas-table.js
 *
 * Objetivo: Gerencia a criação, exibição e personalização de tabelas de perguntas
 * associadas a gráficos, permitindo que usuários editem seus estilos via um modal.
 *
 * Funcionamento:
 * 1. **Configurações Padrão:** Define estilos visuais base (cores, fontes, bordas) para as tabelas.
 * 2. **Renderização (`plot`):** Desenha a tabela HTML com base nos dados e opções fornecidas,
 * aplicando estilos e ajustando larguras de coluna.
 * 3. **Edição de Estilos:** Permite coletar e aplicar novos estilos (cores, fontes, paddings, etc.)
 * do formulário do modal para a tabela. Também oferece funcionalidade para resetar estilos.
 * 4. **Modal de Edição (`openEditModal`):**
 * - Abre um modal onde a tabela é pré-visualizada em tempo real enquanto o usuário edita as opções.
 * - Contém controles para ajustar diversos atributos visuais da tabela.
 * - Botões "Aplicar" e "Resetar" permitem salvar ou restaurar estilos para a tabela atual
 * ou para todas as tabelas do mesmo tipo, respectivamente.
 */


const PerguntasTable = (() => {

    const defaultSettings = {
        headColor: "#b0c4de",
        cellColor: "#f0f8ff",
        borderColor: "#ffffff",
        headFontSize: 12,
        cellFontSize: 11,
        borderSize: 2,
        headAlign: "center",
        cellAlign: "justify",
        bgColor: "#ffffff",
        headPadding: 6,
        cellPadding: 6,
        grupoColWidthPercent: 30
    };
    window.defaultPerguntasTableSettings = defaultSettings;

    const createCell = (parentRow, text, styles, isHeader = false) => {
        const cell = parentRow.insertCell();
        Object.assign(cell.style, styles);
        cell.textContent = text ?? '';
        return cell;
    };

    const plot = (dfPerg, containerId, options = {}, dataId, isModalPreview = false) => {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        if (!dfPerg || !dfPerg.data || !dfPerg.columns) {
            return;
        }

        container.innerHTML = "";
        const currentOptions = { ...defaultSettings, ...options };
        container.style.backgroundColor = currentOptions.bgColor;
        container.style.position = 'relative';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';
        table.style.fontSize = `${currentOptions.cellFontSize}px`;

        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();

        const baseCellStyle = {
            border: `${currentOptions.borderSize}px solid ${currentOptions.borderColor}`,
            overflow: 'hidden',
            wordBreak: 'break-word'
        };
        const headerCellStyle = {
            ...baseCellStyle,
            padding: `${currentOptions.headPadding}px`,
            backgroundColor: currentOptions.headColor,
            fontSize: `${currentOptions.headFontSize}px`,
            fontWeight: 'bold',
            textAlign: currentOptions.headAlign
        };
        const dataCellStyle = {
            ...baseCellStyle,
            padding: `${currentOptions.cellPadding}px`,
            backgroundColor: currentOptions.cellColor,
            fontSize: `${currentOptions.cellFontSize}px`,
            textAlign: currentOptions.cellAlign,
            verticalAlign: 'top'
        };

        dfPerg.columns.forEach((colName, colIndex) => {
            const cell = createCell(headerRow, colName, headerCellStyle, true);
            if (colIndex === 0) {
                cell.style.width = `${currentOptions.grupoColWidthPercent}%`;
            }
        });

        dfPerg.data.forEach(rowData => {
            const row = tbody.insertRow();
            rowData.forEach((cellData, colIndex) => {
                const cell = createCell(row, cellData, dataCellStyle);
                if (colIndex === 0) {
                    cell.style.width = `${currentOptions.grupoColWidthPercent}%`;
                }
            });
        });

        container.appendChild(table);

        if (dataId && !isModalPreview) {
            const chartKey = `perguntas_${dataId}`;
            window.charts = window.charts || {};
            window.charts[chartKey] = {
                type: 'perguntas-table',
                containerId,
                data: dfPerg,
                options: JSON.parse(JSON.stringify(currentOptions)),
                originalOptions: JSON.parse(JSON.stringify(currentOptions)),
                dataId: dataId
            };
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar Tabela';
            editBtn.className = 'edit-perguntas-btn edit-table-style-btn';
            Object.assign(editBtn.style, {});
            container.appendChild(editBtn);
        }
    };

    // --- Funções de Edição ---
    const buildModalHTML = settings => {
        const d = defaultSettings;
        const alignOpts = (sel, def) => buildOptions(['left', 'center', 'right', 'justify'], sel, def);

        return `
          <div class="graph-container" style="display: flex; align-items: flex-start; justify-content: center; min-height: 300px; padding: 10px; background-color: #f0f0f0;">
              <div id="modalPerguntasPreview" style="width: 95%; max-height: 595px; overflow-y: auto; overflow-x: hidden; background:${settings.bgColor ?? d.bgColor}; border: 1px solid #ccc; box-sizing: border-box;"></div>
          </div>
          <div class="settings-container">
            <h3>Editar Tabela de Perguntas</h3>
            <div class="basic-settings">
                ${buildInput('color', 'perg-head-color', settings.headColor ?? d.headColor, 'Cor Cabeçalho')}
                ${buildInput('color', 'perg-cell-color', settings.cellColor ?? d.cellColor, 'Cor Células')}
                ${buildInput('number', 'perg-head-font', settings.headFontSize ?? d.headFontSize, 'Tam. Fonte Cab.', { props: { min: "8" } })}
                ${buildInput('number', 'perg-cell-font', settings.cellFontSize ?? d.cellFontSize, 'Tam. Fonte Cel.', { props: { min: "8" } })}
                <button id="toggle-additional-perguntas-btn">Mais Configurações</button>
            </div>
            <div class="additional-perguntas-settings" style="display:none;">
                ${buildInput('number', 'perg-head-pad', settings.headPadding ?? d.headPadding, 'Altura Cabeçalho (px)', { props: { min: "0" } })}
                ${buildInput('number', 'perg-cell-pad', settings.cellPadding ?? d.cellPadding, 'Altura Células (px)', { props: { min: "0" } })}
                <div class="settings-group">
                    <label for="perg-grupo-width">Largura Coluna Grupo (%): <span id="perg-grupo-width-value">${settings.grupoColWidthPercent ?? d.grupoColWidthPercent}</span>%</label>
                    <input type="range" id="perg-grupo-width" min="10" max="70" step="1" value="${settings.grupoColWidthPercent ?? d.grupoColWidthPercent}">
                </div>
                ${buildInput('number', 'perg-border-size', settings.borderSize ?? d.borderSize, 'Tam. Borda (px)', { props: { min: "0" } })}
                ${buildInput('color', 'perg-border-color', settings.borderColor ?? d.borderColor, 'Cor Borda')}
                ${buildInput('select', 'perg-head-align', '', 'Alinh. Cab.', { optionHTML: alignOpts(settings.headAlign, d.headAlign) })}
                ${buildInput('select', 'perg-cell-align', '', 'Alinh. Cel.', { optionHTML: alignOpts(settings.cellAlign, d.cellAlign) })}
                <button id="toggle-additional-perguntas-btn-hide">Menos Configurações</button>
            </div>
            <div class="settings-buttons">
              <div class="btn-group"><button id="apply-perguntas-btn">Aplicar</button><select id="apply-perguntas-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <div class="btn-group"><button id="reset-perguntas-btn">Voltar ao Padrão</button><select id="reset-perguntas-scope"><option value="this">Neste</option><option value="all">Em Todos</option></select></div>
              <button id="close-perguntas-edit-btn">Cancelar</button>
            </div>
          </div>
        `;
    };

   const getFormValues = () => {
    const d = defaultSettings;
    return {
        headColor: getVal('perg-head-color') || d.headColor,
        cellColor: getVal('perg-cell-color') || d.cellColor,
        borderColor: getVal('perg-border-color') || d.borderColor,
        headFontSize: getIntVal('perg-head-font', d.headFontSize),
        cellFontSize: getIntVal('perg-cell-font', d.cellFontSize),
        borderSize: getIntVal('perg-border-size', d.borderSize),
        headAlign: getVal('perg-head-align') || d.headAlign,
        cellAlign: getVal('perg-cell-align') || d.cellAlign,
        headPadding: getIntVal('perg-head-pad', d.headPadding),
        cellPadding: getIntVal('perg-cell-pad', d.cellPadding),
        grupoColWidthPercent: getIntVal('perg-grupo-width', d.grupoColWidthPercent)
    };
};

const applySettings = (instance, newSettings) => {
    if (!instance || !instance.containerId || !instance.data) { /*...*/ return; }
    instance.options = JSON.parse(JSON.stringify(newSettings));
    instance.options.bgColor = instance.options.bgColor ?? defaultSettings.bgColor;
    plot(instance.data, instance.containerId, instance.options, instance.dataId, false);
};

const resetSettings = (instance) => {
    const globalDefaults = window.defaultPerguntasTableSettings || {};
    if (!instance || !instance.containerId || !instance.data) {
        console.error("resetSettings (PerguntasTable): Instância inválida.", instance);
        return;
    }
    instance.options = JSON.parse(JSON.stringify(globalDefaults));
    plot(instance.data, instance.containerId, instance.options, instance.dataId, false);
};

const updateModalForm = (settings) => {
    const d = defaultSettings;

    const headColorInput = getEl('perg-head-color');
    if (headColorInput) headColorInput.value = settings.headColor ?? d.headColor;
    const cellColorInput = getEl('perg-cell-color');
    if (cellColorInput) cellColorInput.value = settings.cellColor ?? d.cellColor;
    const borderColorInput = getEl('perg-border-color');
    if (borderColorInput) borderColorInput.value = settings.borderColor ?? d.borderColor;

    const headFontInput = getEl('perg-head-font');
    if (headFontInput) headFontInput.value = settings.headFontSize ?? d.headFontSize;
    const cellFontInput = getEl('perg-cell-font');
    if (cellFontInput) cellFontInput.value = settings.cellFontSize ?? d.cellFontSize;

    const headPadInput = getEl('perg-head-pad');
    if (headPadInput) headPadInput.value = settings.headPadding ?? d.headPadding;
    const cellPadInput = getEl('perg-cell-pad');
    if (cellPadInput) cellPadInput.value = settings.cellPadding ?? d.cellPadding;
    const borderSizeInput = getEl('perg-border-size');
    if (borderSizeInput) borderSizeInput.value = settings.borderSize ?? d.borderSize;

    const widthSlider = getEl('perg-grupo-width');
    const widthValueSpan = getEl('perg-grupo-width-value');
    const widthPercent = settings.grupoColWidthPercent ?? d.grupoColWidthPercent;
    if (widthSlider) widthSlider.value = widthPercent;
    if (widthValueSpan) widthValueSpan.textContent = widthPercent;

    const headAlignSelect = getEl('perg-head-align');
    if (headAlignSelect) headAlignSelect.value = settings.headAlign ?? d.headAlign;
    const cellAlignSelect = getEl('perg-cell-align');
    if (cellAlignSelect) cellAlignSelect.value = settings.cellAlign ?? d.cellAlign;

    console.log("Modal form updated with settings:", settings);
};

   const openEditModal = (dataId) => {
    const chartKey = `perguntas_${dataId}`;
    const instance = window.charts?.[chartKey];

    if (!instance || !instance.data || !instance.options) {
        console.error(`PerguntasTable.openEditModal: Instância ${chartKey} não encontrada ou incompleta (sem data/options).`);
        alert(`Erro: Não foi possível encontrar configurações para editar a tabela de perguntas ${dataId}.`);
        return;
    }

    let currentModalOptions = JSON.parse(JSON.stringify(instance.options));

    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'edit-modal modal-component small-modal';
    modal.innerHTML = buildModalHTML(currentModalOptions);
    overlay.appendChild(modal);

    const previewContainerId = "modalPerguntasPreview";

    const renderPreview = () => {
        const previewOptions = { ...currentModalOptions, bgColor: currentModalOptions.bgColor ?? defaultSettings.bgColor };
        plot(instance.data, previewContainerId, previewOptions, dataId, true);
    };

    renderPreview();

    const settingsContainer = modal.querySelector('.settings-container');

    settingsContainer.querySelectorAll('input[type="color"], input[type="number"], select').forEach(el => {
        const eventType = ['color', 'number'].includes(el.type) ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            currentModalOptions = { ...currentModalOptions, ...getFormValues() };
            renderPreview();
        });
    });

    const widthSlider = getEl('perg-grupo-width');
    const widthValueSpan = getEl('perg-grupo-width-value');
    if (widthSlider && widthValueSpan) {
        widthSlider.addEventListener('input', () => {
            const newValue = widthSlider.value;
            widthValueSpan.textContent = newValue;
            currentModalOptions = { ...currentModalOptions, ...getFormValues() };
            renderPreview();
        });
    }

    onClick('toggle-additional-perguntas-btn', () => {
        getEl('toggle-additional-perguntas-btn').style.display = 'none';
        modal.querySelector('.additional-perguntas-settings').style.display = 'block';
    });
    onClick('toggle-additional-perguntas-btn-hide', () => {
        getEl('toggle-additional-perguntas-btn').style.display = 'inline-block';
        modal.querySelector('.additional-perguntas-settings').style.display = 'none';
    });

    onClick('apply-perguntas-btn', () => {
        const finalSettings = getFormValues();
        const scope = getVal('apply-perguntas-scope');
        const applyAction = (inst) => applySettings(inst, finalSettings);

        applyScopedAction('perguntas_', instance, scope, applyAction);
        closeModal(overlay);
    });

    onClick('reset-perguntas-btn', () => {
        const scope = getVal('reset-perguntas-scope');
        const globalDefaults = window.defaultPerguntasTableSettings || {};

        applyScopedAction('perguntas_', instance, scope, resetSettings);

        currentModalOptions = JSON.parse(JSON.stringify(globalDefaults));

        updateModalForm(currentModalOptions);

        renderPreview();
    });

    onClick('close-perguntas-edit-btn', () => {
        closeModal(overlay);
    });
};

    return { plot, openEditModal };

})(); 