/*
 * Script: shared-utils.js
 *
 * Objetivo: Fornecer um conjunto centralizado de variáveis globais, configurações padrão,
 * funções utilitárias e plugins Chart.js que são compartilhados e reutilizados
 * em diferentes módulos da aplicação de visualização de dados. Isso promove
 * consistência, reduz duplicação de código e simplifica a manutenção.
 *
 * Funcionamento:
 * 1. **Variáveis Globais e Configurações Padrão:**
 * - Inicializa `window.visualizacaoData` para armazenar os dados de gráficos e tabelas.
 * - Define configurações padrão para diferentes tipos de gráficos (Barra, Teia) e tabelas
 * de respostas, incluindo títulos, tamanhos, fontes, cores e posições de legenda.
 * - Cria um registro global (`window.charts`) para armazenar instâncias de gráficos/tabelas criados.
 *
 * 2. **Funções Utilitárias (DOM & Valores):**
 * - Funções auxiliares para interagir com o DOM, como obter elementos por ID (`getEl`),
 * valores de inputs (`getVal`, `getIntVal`, `getFloatVal`, `isChecked`),
 * acessar propriedades de objetos de forma segura (`safeGet`),
 * e anexar listeners de eventos (`on`, `onClick`).
 *
 * 3. **Funções Utilitárias (Cores):**
 * - Funções para manipular cores, como clarear uma cor hexadecimal (`clarearCor`)
 * e converter cores RGB para hexadecimal (`rgbToHex`).
 *
 * 4. **Funções Utilitárias (Modal e Construção de HTML):**
 * - Funções para criar e gerenciar overlays de modal (`createOverlay`, `closeModal`).
 * - Funções de ajuda para construir elementos HTML dinamicamente (`createEl`, `buildOptions`, `buildInput`).
 *
 * 5. **Funções Utilitárias (Aplicação de Ações):**
 * - `applyScopedAction`: Uma função genérica para aplicar ações (ex: salvar configurações, resetar)
 * a uma instância de gráfico/tabela específica (`this`) ou a todas as instâncias de um
 * determinado tipo (`all`).
 *
 * 6. **Plugins Chart.js Compartilhados:**
 * - `titleAutoWrapPlugin`: Um plugin Chart.js que quebra automaticamente o texto do título
 * do gráfico em múltiplas linhas para que caiba dentro da largura disponível do canvas,
 * melhorando a legibilidade de títulos longos.
 * - `percentPlugin`: Um plugin Chart.js para gráficos de barras empilhadas que exibe
 * percentagens diretamente sobre os dois maiores segmentos de cada barra,
 * tornando a visualização dos dados mais clara.
 *
 * 7. **Registro de Plugins:**
 * - Inclui a lógica para registrar e desregistrar esses plugins no Chart.js de forma segura,
 * garantindo que sejam aplicados corretamente e evitando erros de registro duplicado.
 */


window.visualizacaoData = window.visualizacaoData || {};

window.defaultBarSettings = {
    title: "Distribuição por Grupo",
    pad_title: 20,
    figsize: [400, 300],
    fontsize: [16, 10, 10, 10],
    color_title: '#28282B',
    percent_text_color: '#000000',
    legendPos: 'right',
    bar_colorsMap: {
        "Bastante": "#4169e1",
        "Médio": "#4682b4",
        "Pouco": "#6495ed",
        "Nada": "#add8e6"
    },
    bar_colors: ['#4169e1', '#4682b4', '#6495ed', '#add8e6'],
    bgColor: "#ffffff",
    textColor: '#000000'
};

window.defaultTeiaSettings = {
    title: "Gráfico de Teia Padrão",
    pad_title: 20,
    figsize: [400, 400],
    fontsize: [16, 10, 10],
    color_title: '#28282B',
    linesColor: ['#B3CDE3', '#D9D9D9', '#F6C5D9', '#CAB2D6'],
    gridLinesColor: '#cccccc',
    bgColor: "#ffffff",
    lineWidth: 2,
    pointRadius: 3,
    pointBorderColor: '#ffffff',
    textColor: '#000000',
    legendPos: 'top',
    enablePointLabelTruncation: true,
    pointLabelTruncateWords: 3,
    pointLabelMaxWidthPixels: 80,
};

window.defaultTableSettings = {
    title: "Quadro de Respostas",
    titleFontSize: 16,
    titleColor: "#000000",
    headColor: "#b0c4de",
    cellColor: "#f0f8ff",
    bgColor: "#ffffff",
    headFontSize: 14,
    cellFontSize: 12,
    borderSize: 1,
    borderColor: "#000000",
    headAlign: "center",
    cellAlign: "justify"
};

window.charts = window.charts || {};

const getEl = (id) => document.getElementById(id);
const getVal = (id) => getEl(id)?.value;
const getIntVal = (id, defaultVal) => {
    const value = getVal(id);
    if (value === null || value === undefined) {
        return defaultVal;
    }
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) ? parsed : defaultVal;
};
const getFloatVal = (id, defaultVal) => parseFloat(getVal(id)) || defaultVal;
const isChecked = (id) => getEl(id)?.checked;
const safeGet = (obj, path, defaultValue) => path.split('.').reduce((o, k) => (o && o[k] !== undefined && o[k] !== null) ? o[k] : undefined, obj) ?? defaultValue;
const on = (id, evt, callback) => getEl(id)?.addEventListener(evt, e => callback(e.target.value, e.target));
const onClick = (id, callback) => getEl(id)?.addEventListener('click', callback);

const clarearCor = (corHex, fator) => {
    corHex = corHex.startsWith('#') ? corHex.slice(1) : corHex;
    if (corHex.length !== 6) return '#cccccc';
    let [r, g, b] = [0, 2, 4].map(i => parseInt(corHex.slice(i, i + 2), 16));
    [r, g, b] = [r, g, b].map(x => Math.min(255, Math.floor(x + (255 - x) * fator)));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const rgbToHex = (rgbString) => {
    if (!rgbString || typeof rgbString !== 'string') return '#ffffff';

    const result = rgbString.match(/\d+/g);
    if (!result || result.length < 3) {
        if (/^#[0-9A-F]{6}$/i.test(rgbString)) {
            return rgbString;
        }
        console.warn(`Formato de cor inválido para conversão: ${rgbString}. Usando #ffffff.`);
        return '#ffffff';
    }

    const r = parseInt(result[0], 10);
    const g = parseInt(result[1], 10);
    const b = parseInt(result[2], 10);

    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

 function wrapText(ctx, text, maxWidth) {
    if (!text || typeof text !== 'string') return [];
    const words = text.trim().split(' ');
    let lines = [];
    if (words.length === 0) return [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

const titleAutoWrapPlugin = {
    id: 'titleAutoWrap',
    beforeUpdate(chart, args, options) {
        const title = chart.options.plugins?.title;
        const chartId = chart.canvas?.id || 'unknown-chart';

        const intendedText = title?._intendedText;

        if (!title || !title.display || typeof intendedText !== 'string' || !intendedText.trim()) {
            if (title && title.display && (!intendedText || !intendedText.trim())) {
                const currentText = title.text;
                if (!Array.isArray(currentText) || currentText.length > 0) {
                    chart.options.plugins.title.text = [];
                }
            }
            return;
        }

        const textToWrap = intendedText;

        let maxWidth;
        const canvasWidth = chart.width;
        const padding = 40;
        if (canvasWidth > padding) {
            maxWidth = Math.max(canvasWidth - padding, 50);
        } else {
            maxWidth = Math.max(canvasWidth * 0.9, 30);
        }
        if (maxWidth <= 0) {
            return;
        }

        const fontConfig = title.font || {};
        const fontSize = fontConfig.size || Chart.defaults.font.size || 12;
        const fontStyle = fontConfig.style || Chart.defaults.font.style || 'normal';
        const fontWeight = fontConfig.weight || Chart.defaults.font.weight || 'normal';
        const fontFamily = fontConfig.family || Chart.defaults.font.family || 'sans-serif';

        const ctx = chart.ctx;
        if (!ctx) {
            console.warn(`[${chartId}] titleAutoWrap: Contexto não disponível.`);
            return;
        }
        const originalFont = ctx.font;
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const wrappedLines = wrapText(ctx, textToWrap, maxWidth);
        ctx.font = originalFont;

        const currentDisplayValue = title.text;
        const currentDisplayLines = Array.isArray(currentDisplayValue) ? currentDisplayValue : [String(currentDisplayValue)];

        if (JSON.stringify(currentDisplayLines) !== JSON.stringify(wrappedLines)) {
            chart.options.plugins.title.text = wrappedLines;
        }
    }
};

try {
    if (Chart.registry.plugins.get('titleAutoWrap')) {
        Chart.unregister(titleAutoWrapPlugin);
    }
    Chart.register(titleAutoWrapPlugin);
} catch (e) {
    if (typeof Chart !== 'undefined' && !e.message.includes('is already registered')) {
        console.error("Erro ao registrar plugin 'titleAutoWrap':", e);
    } else if (typeof Chart === 'undefined') {
        console.warn("Chart.js não carregado. Plugin 'titleAutoWrap' não registrado.");
    }
}

const createOverlay = () => {
    let overlay = document.querySelector('.modal-overlay.modal-component');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay modal-component';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = "";
    overlay.style.display = 'block';
    return overlay;
};

const closeModal = (overlay) => {
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
};

const createEl = (tag, { classes = [], attributes = {}, text = '', html = '' } = {}) => {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes.filter(Boolean));
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) el.setAttribute(key, value);
    });
    if (text) el.textContent = text;
    if (html) el.innerHTML = html;
    return el;
};

const buildOptions = (optionsArray, selectedValue, defaultValue) => {
    const effectiveValue = selectedValue ?? defaultValue;
    return optionsArray.map(opt =>
        `<option value="${opt}" ${effectiveValue === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
    ).join('');
};

const buildInput = (type, id, value, label, options = {}) => {
    const props = Object.entries(options.props || {}).map(([k, v]) => `${k}="${v}"`).join(' ');

    const checkedProp = (type === 'checkbox' && value) ? 'checked' : '';
    const valProp = (type !== 'checkbox' && type !== 'select' && value !== null && value !== undefined) ? `value="${value}"` : '';

    let inputHtml;
    if (type === 'select') {
        inputHtml = `<select id="${id}" ${props}>${options.optionHTML || ''}</select>`;
    } else {
        inputHtml = `<input type="${type}" id="${id}" ${valProp} ${props} ${checkedProp}>`;
    }

    const labelFor = `for="${id}"`;
    return `<div class="settings-group"><label ${labelFor}>${label}:</label>${inputHtml}</div>`;
};

const applyScopedAction = (chartTypePrefix, targetInstance, scope, actionFn) => {
    const applyFn = instance => actionFn(instance);

    if (scope === 'this') {
        if (targetInstance) {
            applyFn(targetInstance);
        } else {
            console.warn(`applyScopedAction: Target instance for prefix ${chartTypePrefix} not provided or invalid.`);
        }
    } else if (scope === 'all') {
        Object.keys(window.charts || {})
            .filter(key => key.startsWith(chartTypePrefix))
            .forEach(key => {
                const instance = window.charts[key];
                if (instance) {
                    applyFn(instance);
                } else {
                    console.warn(`applyScopedAction: Instance ${key} not found during 'all' scope application.`);
                }
            });
    } else {
        console.error(`applyScopedAction: Invalid scope "${scope}". Use 'this' or 'all'.`);
    }
};

const percentPlugin = {
    id: 'percentPlugin',
    afterDatasetsDraw: chart => {
        const { ctx, options, data: { labels } } = chart;
        const pctColor = options.percent_text_color ?? options.plugins?.percent_text_color ?? defaultBarSettings.percent_text_color ?? 'black';
        const pctFont = options.percentFontSize ?? options.plugins?.percentFontSize ?? safeGet(options, 'fontsize.1', 10);

        if (chart.config.type !== 'bar' || !safeGet(chart.options, 'scales.x.stacked')) {
            return;
        }

        labels.forEach((_, idx) => {
            const total = chart.data.datasets.reduce((sum, dataset) => {
                const meta = chart.getDatasetMeta(dataset.index);
                if (!meta.hidden && dataset.data[idx] !== undefined && dataset.data[idx] !== null) {
                    return sum + Math.abs(parseFloat(dataset.data[idx]) || 0);
                }
                return sum;
            }, 0);

            if (total <= 0) return;

            const segments = chart.data.datasets
                .map((ds, i) => ({ value: ds.data[idx], datasetIndex: i, label: ds.label, hidden: chart.getDatasetMeta(i).hidden }))
                .filter(seg => !seg.hidden && seg.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 2);

            segments.forEach(seg => {
                const bar = chart.getDatasetMeta(seg.datasetIndex)?.data[idx];
                if (bar) {
                    const { x: centerX, base, y: barY } = bar;
                    const barHeight = Math.abs(base - barY);
                    if (barHeight > 10 && seg.value > 5) {
                        const centerY = (barY + base) / 2;
                        ctx.save();
                        ctx.fillStyle = pctColor;
                        ctx.font = `${pctFont}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`${Math.round(seg.value)}%`, centerX, centerY);
                        ctx.restore();
                    }
                }
            });
        });
    }
};

if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('percentPlugin')) {
    Chart.register(percentPlugin);
} else if (typeof Chart === 'undefined') {
    console.warn("Chart.js não carregado. Plugin 'percentPlugin' não registrado.");
}