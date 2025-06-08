/*
 * pie-chart.js (v11 - Título H3)
 * Lógica para Gráficos de Pizza (Perfil).
 * v11: Remove título das opções do Chart.js e renderiza como H3 HTML.
 */

const PieChart = (() => {

    // --- Função Auxiliar de Contraste (sem mudanças) ---
    function getContrastYIQ(hexcolor){
        if (!hexcolor || hexcolor.length < 4) return '#000000'; hexcolor = hexcolor.replace("#", ""); let r, g, b; if (hexcolor.length === 3) { r = parseInt(hexcolor.substr(0,1)+hexcolor.substr(0,1), 16); g = parseInt(hexcolor.substr(1,1)+hexcolor.substr(1,1), 16); b = parseInt(hexcolor.substr(2,1)+hexcolor.substr(2,1), 16); } else if (hexcolor.length === 6) { r = parseInt(hexcolor.substr(0,2), 16); g = parseInt(hexcolor.substr(2,4), 16); b = parseInt(hexcolor.substr(4,6), 16); } else { return '#000000'; } const yiq = ((r*299)+(g*587)+(b*114))/1000; return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    // --- Configurações Padrão (Título removido) ---
    const defaults = () => ({
        pie_colors: ['#6c757d', '#aec6cf', '#9cb2cc', '#adb5bd', '#ced4da', '#dee2e6', '#e9ecef', '#f8f9fa', '#495057', '#343a40'],
        // titleColor: '#333333', // Não mais necessário aqui
        // titleFont: 12,        // Não mais necessário aqui
        // titlePadding: 10,     // Não mais necessário aqui
        legendPos: 'top',       // Legenda continua no topo
        legendFont: 10,
        textColor: '#555555',
        bgColor: '#ffffff',
        tooltipBgColor: 'rgba(0, 0, 0, 0.7)',
        tooltipFontColor: '#ffffff',
        datalabelFont: 11,
        datalabelThreshold: 5
    });


    // --- Função Principal de Plotagem (Título removido das opções) ---
    const plot = (pieData, options = {}, canvasId) => {
        const settings = { ...defaults(), ...options };
        // Título não é mais desestruturado aqui
        const { bgColor, legendPos, legendFont, textColor, pie_colors, tooltipBgColor, tooltipFontColor, datalabelFont, datalabelThreshold } = settings;

        // console.log(`PieChart.plot (${canvasId}): Plotando gráfico (título será HTML).`); // Log opcional

        if (!pieData || !Array.isArray(pieData) || pieData.length === 0) { /* ... (erro) ... */ return null; }
        const canvas = document.getElementById(canvasId);
        if (!canvas) { /* ... (erro) ... */ return null; }

        const labels = pieData.map(d => d.label || "Sem Rótulo");
        const dataValues = pieData.map(d => d.value || 0);
        const total = dataValues.reduce((a, b) => a + b, 0);
        const backgroundColors = dataValues.map((_, i) => pie_colors[i % pie_colors.length]);

        const chartOptionsNested = {
            responsive: true,
            maintainAspectRatio: false, // Mantém false para flexibilidade
            plugins: {
                // v11: Removida a configuração do plugin 'title'
                // title: { ... },
                legend: {
                    display: true, position: legendPos,
                    labels: { font: { size: legendFont }, color: textColor, boxWidth: 12, padding: 8 }
                },
                tooltip: { /* ... (sem mudanças tooltip) ... */
                    backgroundColor: tooltipBgColor, titleColor: tooltipFontColor, bodyColor: tooltipFontColor,
                    callbacks: { label: (context) => { let l = context.label||''; if(l)l+=': '; const v=context.parsed; const p=total>0?Math.round((v/total)*100):0; l+=`${v} (${p}%)`; return l; }}
                 },
                datalabels: { /* ... (sem mudanças datalabels desde v6) ... */
                    display: (context) => { const v = context.dataset.data[context.dataIndex]; const p = total > 0 ? (v / total) * 100 : 0; return p >= datalabelThreshold; },
                    formatter: (value, context) => { const p = total > 0 ? Math.round((value / total) * 100) : 0; return `${p}%`; },
                    color: (context) => { const bg = context.dataset.backgroundColor[context.dataIndex] || '#cccccc'; return getContrastYIQ(bg); },
                    font: { size: datalabelFont },
                    anchor: 'center', align: 'center', offset: 0
                }
            } // Fim plugins
        }; // Fim chartOptionsNested

        const existingChart = Chart.getChart(canvas);
        if (existingChart) { existingChart.destroy(); }

        try {
             if (!Chart.registry.plugins.get('datalabels')) { if(typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); } else { console.warn("Plugin ChartDataLabels não carregado."); } }

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
            /* ... (erro canvas) ... */
             const canvasEl = document.getElementById(canvasId); if(canvasEl) { const ctx=canvasEl.getContext('2d'); ctx.clearRect(0,0,canvasEl.width, canvasEl.height); ctx.fillStyle='red'; ctx.textAlign='center'; ctx.font='12px Arial'; ctx.fillText('Erro Gráfico', canvasEl.width/2, canvasEl.height/2); } return null;
        }
    }; // Fim plot

    // --- Função de Inicialização (v11 - Adiciona H3) ---
    const init = () => {
        // console.log("PieChart.init() v11 iniciado...");
        const squares = document.querySelectorAll('.square[data-type="grafico_de_pizza"]');

        squares.forEach((square) => {
            const dataId = square.getAttribute('data-id');
            square.innerHTML = ''; // Limpa placeholder
            if (!dataId) { return; }

            const dataItem = window.visualizacaoData?.[dataId];
            if (!dataItem || dataItem.type !== 'Pizza' || !Array.isArray(dataItem.pieData)) { console.warn(`Dados ausentes/inválidos para Pizza ${dataId}.`); square.innerHTML = `<p style="font-size: 10px; color: orange; text-align: center;">Dados ${dataId}</p>`; return; }

            // ***** v11: Cria e adiciona o título H3 *****
            const titleText = dataItem.title || `Perfil ${dataId}`; // Usa título do dataItem ou fallback
            if (titleText) {
                const titleElement = document.createElement('h3');
                titleElement.className = 'pie-chart-title'; // Classe para CSS
                titleElement.textContent = titleText;
                square.appendChild(titleElement); // Adiciona H3 *antes* do wrapper do gráfico
            }
            // ***** Fim Adição H3 *****

            // Cria wrapper e canvas (sem mudanças)
            const chartWrapper = document.createElement('div');
            // v11: Ajusta classe para flex-grow, permitindo que ele ocupe espaço restante
            chartWrapper.className = 'chart-wrapper pie-chart-wrapper';
            chartWrapper.style.position = 'relative';
            // chartWrapper.style.height = '100%'; // Removido height fixo, deixa flex tomar conta
            chartWrapper.style.width = '100%';
            chartWrapper.style.flexGrow = '1'; // Faz o wrapper crescer para preencher espaço

            const canvasId = `chartCanvas_pie_${dataId}`;
            const canvas = document.createElement('canvas');
            canvas.id = canvasId;
            canvas.style.display = 'block'; canvas.style.boxSizing = 'border-box';
            canvas.style.maxHeight = '100%'; // Limita altura do canvas
            canvas.style.maxWidth = '100%'; // Limita largura do canvas

            chartWrapper.appendChild(canvas);
            square.appendChild(chartWrapper); // Adiciona wrapper *depois* do H3

            // Passa opções sem o título para a função plot
            const initialChartOptions = { ...defaults() }; // Não precisa mais passar 'title' aqui
            const chart = plot(dataItem.pieData, initialChartOptions, canvasId);

            if (chart) {
                const chartKey = `pie_${dataId}`; if (!window.charts) window.charts = {};
                window.charts[chartKey] = chart; chart.dataId = dataId;
            } else {
                console.error(`Falha ao plotar gráfico de pizza ${dataId}.`);
                // Se plot falhou, remove o H3 para não ficar título sem gráfico
                 const existingTitle = square.querySelector('.pie-chart-title');
                 if (existingTitle) existingTitle.remove();
            }
        });
        // console.log("PieChart.init() v11 concluído.");
    }; // Fim init

    return { init };

})(); // Fim do IIFE PieChart