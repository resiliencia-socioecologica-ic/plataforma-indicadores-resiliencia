/*
 * Script: pie-chart.js
 *
 * Objetivo: Cria e gerencia gráficos de pizza para perfis, focando na exibição
 * da distribuição percentual dos dados.
 *
 * Funcionamento:
 * 1. **Configurações:** Define padrões de cores, legendas e rótulos de dados para os gráficos.
 * 2. **Plotagem:** Desenha o gráfico de pizza usando Chart.js no canvas especificado.
 * - Calcula percentuais e ajusta a cor do texto para contraste.
 * - **Observação:** O título do gráfico é renderizado como um elemento H3 HTML separado,
 * não como parte das opções do Chart.js.
 * 3. **Inicialização (`init`):**
 * - Percorre todos os "squares" na página designados para gráficos de pizza.
 * - Para cada "square", cria um título H3 e um canvas.
 * - Plota o gráfico de pizza, usando dados e configurações, e armazena a instância.
 */

const PieChart = (() => {

    function getContrastYIQ(hexcolor) {
        if (!hexcolor || hexcolor.length < 4) return '#000000';
        hexcolor = hexcolor.replace("#", "");
        let r, g, b;
        if (hexcolor.length === 3) {
            r = parseInt(hexcolor.substr(0, 1) + hexcolor.substr(0, 1), 16);
            g = parseInt(hexcolor.substr(1, 1) + hexcolor.substr(1, 1), 16);
            b = parseInt(hexcolor.substr(2, 1) + hexcolor.substr(2, 1), 16);
        } else if (hexcolor.length === 6) {
            r = parseInt(hexcolor.substr(0, 2), 16);
            g = parseInt(hexcolor.substr(2, 4), 16);
            b = parseInt(hexcolor.substr(4, 6), 16);
        } else {
            return '#000000';
        }
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    const defaults = () => ({
        pie_colors: ['#6c757d', '#aec6cf', '#9cb2cc', '#adb5bd', '#ced4da', '#dee2e6', '#e9ecef', '#f8f9fa', '#495057', '#343a40'],
        legendPos: 'top',
        legendFont: 10,
        textColor: '#555555',
        bgColor: '#ffffff',
        tooltipBgColor: 'rgba(0, 0, 0, 0.7)',
        tooltipFontColor: '#ffffff',
        datalabelFont: 11,
        datalabelThreshold: 5
    });

    const plot = (pieData, options = {}, canvasId) => {
        const settings = { ...defaults(), ...options };
        const { bgColor, legendPos, legendFont, textColor, pie_colors, tooltipBgColor, tooltipFontColor, datalabelFont, datalabelThreshold } = settings;

        if (!pieData || !Array.isArray(pieData) || pieData.length === 0) {
            return null;
        }
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return null;
        }

        const labels = pieData.map(d => d.label || "Sem Rótulo");
        const dataValues = pieData.map(d => d.value || 0);
        const total = dataValues.reduce((a, b) => a + b, 0);
        const backgroundColors = dataValues.map((_, i) => pie_colors[i % pie_colors.length]);

        const chartOptionsNested = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: legendPos,
                    labels: { font: { size: legendFont }, color: textColor, boxWidth: 12, padding: 8 }
                },
                tooltip: {
                    backgroundColor: tooltipBgColor,
                    titleColor: tooltipFontColor,
                    bodyColor: tooltipFontColor,
                    callbacks: {
                        label: (context) => {
                            let l = context.label || '';
                            if (l) l += ': ';
                            const v = context.parsed;
                            const p = total > 0 ? Math.round((v / total) * 100) : 0;
                            l += `${v} (${p}%)`;
                            return l;
                        }
                    }
                },
                datalabels: {
                    display: (context) => {
                        const v = context.dataset.data[context.dataIndex];
                        const p = total > 0 ? (v / total) * 100 : 0;
                        return p >= datalabelThreshold;
                    },
                    formatter: (value, context) => {
                        const p = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${p}%`;
                    },
                    color: (context) => {
                        const bg = context.dataset.backgroundColor[context.dataIndex] || '#cccccc';
                        return getContrastYIQ(bg);
                    },
                    font: { size: datalabelFont },
                    anchor: 'center',
                    align: 'center',
                    offset: 0
                }
            }
        };

        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        try {
            if (!Chart.registry.plugins.get('datalabels')) {
                if (typeof ChartDataLabels !== 'undefined') {
                    Chart.register(ChartDataLabels);
                } else {
                    console.warn("Plugin ChartDataLabels não carregado.");
                }
            }

            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: dataValues, backgroundColor: backgroundColors, borderColor: bgColor, borderWidth: 1 }]
                },
                options: chartOptionsNested
            });

            chart.canvas.style.backgroundColor = bgColor;
            return chart;
        } catch (error) {
            console.error(`Erro ao criar Chart.js para ${canvasId}:`, error);
            const canvasEl = document.getElementById(canvasId);
            if (canvasEl) {
                const ctx = canvasEl.getContext('2d');
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                ctx.fillStyle = 'red';
                ctx.textAlign = 'center';
                ctx.font = '12px Arial';
                ctx.fillText('Erro Gráfico', canvasEl.width / 2, canvasEl.height / 2);
            }
            return null;
        }
    };

    const init = () => {
        const squares = document.querySelectorAll('.square[data-type="grafico_de_pizza"]');

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = '';
            if (!dataId) {
                return;
            }

            const dataItem = window.visualizacaoData?.[dataId];
            if (!dataItem || dataItem.type !== 'Pizza' || !Array.isArray(dataItem.pieData)) {
                console.warn(`Dados ausentes/inválidos para Pizza ${dataId}.`);
                square.innerHTML = `<p style="font-size: 10px; color: orange; text-align: center;">Dados ${dataId}</p>`;
                return;
            }

            const titleText = dataItem.title || `Perfil ${dataId}`;
            if (titleText) {
                const titleElement = document.createElement('h3');
                titleElement.className = 'pie-chart-title';
                titleElement.textContent = titleText;
                square.appendChild(titleElement);
            }

            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper pie-chart-wrapper';
            chartWrapper.style.position = 'relative';
            chartWrapper.style.width = '100%';
            chartWrapper.style.flexGrow = '1';

            const canvasId = `chartCanvas_pie_${dataId}`;
            const canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvas.style.display = 'block';
            canvas.style.boxSizing = 'border-box';
            canvas.style.maxHeight = '100%';
            canvas.style.maxWidth = '100%';

            chartWrapper.appendChild(canvas);
            square.appendChild(chartWrapper);

            const initialChartOptions = { ...defaults() };
            const chart = plot(dataItem.pieData, initialChartOptions, canvasId);

            if (chart) {
                const chartKey = `pie_${dataId}`;
                if (!window.charts) window.charts = {};
                window.charts[chartKey] = chart;
                chart.dataId = dataId;
            } else {
                console.error(`Falha ao plotar gráfico de pizza ${dataId}.`);
                const existingTitle = square.querySelector('.pie-chart-title');
                if (existingTitle) existingTitle.remove();
            }
        });
    };

    return { init };

})();