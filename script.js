/*
 * script.js (vFinal com Critérios 50%/50%, Cálculo Teia, CORREÇÃO PERGUNTAS v4 e Pizza Perfil v2)
 * Processes data from localStorage (TabelaConsulta, DemaisTabelas, savedChartConfigs)
 * Generates window.visualizacaoData for chart initialization.
 * v2: Adapta para IDs de Perfil 0.1-0.8, gerando Pizzas com títulos individuais
 *     e excluindo-os dos filtros de dimensão.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Processing data for visualization (vPerfil-0.x)...");

    // --- Carrega Dados Essenciais ---
    const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos"));
    const savedConfigsString = localStorage.getItem('loadedChartConfigs');
    let savedChartConfigs = {};
    if (savedConfigsString) { try { savedChartConfigs = JSON.parse(savedConfigsString); /* console.log(`Loaded ${Object.keys(savedChartConfigs).length} saved configurations.`); */ } catch (e) { console.error("Error parsing savedChartConfigs:", e); } }
    // else { console.log("No saved chart configurations found."); } // Log reduzido
    if (!dadosCompletos?.TabelaConsulta?.length || !dadosCompletos.DemaisTabelas) { alert("Erro: Dados essenciais não encontrados no localStorage."); return; }
    // Usa a Tabela de Consulta ORIGINAL (com formatos mistos d.d ou d.d.d)
    const { TabelaConsulta: tabelaConsultaComFormatosMistos, DemaisTabelas: demaisTabelas } = dadosCompletos;
    console.log(`Data loaded. Consulta rows: ${tabelaConsultaComFormatosMistos.length}. Response tables: ${Object.keys(demaisTabelas).length}`);

    // --- Helper Functions ---
    const isValidResponse = (value) => value != null && String(value).trim() !== '';
    const verificarCategoria = (categoria) => { // Teia Normal - Sem mudanças
        const catString = String(categoria ?? '').trim(); if (!catString) return []; const partes = catString.split(/,\s*(?![^()]*\))/); const novasCategorias = []; if (partes.length > 0) { const primeiraParte = partes[0].trim(); if (primeiraParte) novasCategorias.push(primeiraParte); } for (let i = 1; i < partes.length; i++) { const parte = partes[i].trim(); if (parte && (novasCategorias.length === 0 || /^[A-ZÀ-ÖØ-Ý]/.test(parte))) { novasCategorias.push(parte); } else if (novasCategorias.length > 0 && parte) { novasCategorias[novasCategorias.length - 1] += `, ${parte}`; novasCategorias[novasCategorias.length - 1] = novasCategorias[novasCategorias.length - 1].trim(); } } return novasCategorias.filter(cat => cat);
    };
    const analyzeSpecialTeiaFormat = (rawResponsesArray) => { // Teia Especial - Sem mudanças
        let totalValidResponses = 0; let responsesMeetingPartCriterion = 0; const aggregatedCounts = {}; const foundCategories = new Set(); const specialPartRegex = /^(.*?)\s+\(([^)]+)\)$/; const MIN_PART_PERCENTAGE = 0.5; const segmentRegex = /,\s*(?=[A-ZÀ-ÖØ-Ý].*?\s+\([^)]+\)$)/;
        for (const rawResponse of rawResponsesArray) { if (!isValidResponse(rawResponse)) continue; totalValidResponses++; const responseString = String(rawResponse).trim(); const parts = responseString.split(segmentRegex).map(p => p.trim()).filter(p => p !== ''); const totalParts = parts.length; if (totalParts === 0) continue; let partsMatchingFormat = 0;
            for (const part of parts) { const match = part.match(specialPartRegex); if (match) { partsMatchingFormat++; const responseText = match[1].trim(); const category = match[2].trim(); if (!aggregatedCounts[category]) aggregatedCounts[category] = {}; if (!aggregatedCounts[category][responseText]) aggregatedCounts[category][responseText] = 0; aggregatedCounts[category][responseText]++; foundCategories.add(category); } /* else { console.warn(`   -> Parte segmentada não bateu: "${part}"`); } */ }
            if (partsMatchingFormat > 0 && (partsMatchingFormat / totalParts) >= MIN_PART_PERCENTAGE) responsesMeetingPartCriterion++; /* else if (partsMatchingFormat === 0 && totalParts > 0) console.warn(`   -> Nenhuma parte válida: "${responseString.substring(0,50)}..."`); */
        } return { totalValidResponses, responsesMeetingPartCriterion, aggregatedCounts, foundCategories };
    };
    const identificarTipoDeGrafico = (todasRespostas) => { // Identificação inicial - Sem mudanças
         const respostasValidas = todasRespostas.filter(isValidResponse).map(r => String(r).trim()); const totalRespostasConsideradas = todasRespostas.length; if (totalRespostasConsideradas > 0 && (totalRespostasConsideradas - respostasValidas.length) / totalRespostasConsideradas > 0.6) return 'Quadro de respostas abertas'; if (!respostasValidas.length) return 'Quadro de respostas abertas'; const ehTeia = respostasValidas.some(r => verificarCategoria(r).length > 1 || /\(.+\)/.test(r)); if (ehTeia) return 'Teia'; const frequencyMap = new Map(); respostasValidas.forEach(resp => { frequencyMap.set(resp, (frequencyMap.get(resp) || 0) + 1); }); let foundUniqueLongAnswer = false; for (const [resp, count] of frequencyMap.entries()) { const wordCount = resp.split(/\s+/).filter(Boolean).length; if (count === 1 && wordCount > 6) { foundUniqueLongAnswer = true; break; } } if (foundUniqueLongAnswer) return 'Quadro de respostas abertas'; const uniqueValidCount = frequencyMap.size; return uniqueValidCount <= 6 ? 'Barra' : 'Quadro de respostas abertas';
    };

    /** MODIFICADO: Extrai ID [d.d.d[a]] OU [d.d[a]] do cabeçalho */
    const getColumnIndicesAndHeaders = (table, identificador) => {
        const header = table?.[0]; if (!header) return [];
        // Regex mais flexível para o ID no cabeçalho (d.d ou d.d.d, com letra opcional)
        // Escapa o identificador para o caso de conter caracteres especiais de regex (como '.')
        const escapedIdentificador = identificador.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexIdMatch = new RegExp(`\\s*\\[${escapedIdentificador}\\]\\s*$`);
        // Regex para remover QUALQUER ID no final (seja d.d ou d.d.d)
        const regexIdRemoveGeneral = /\s*\[\s*\d+\.\d+(?:\.\d+)?[a-zA-Z]?\s*\]\s*$/;
        const regexPrefix = /^\s*\d+[a-zA-Z]?\.?\s*/; // Remove prefixo tipo "1. " ou "1a. "

        return header.reduce((results, colName, j) => {
            if (typeof colName === 'string') {
                const trimmedColName = colName.trim();
                // Verifica se a coluna TERMINA com o ID específico
                if (regexIdMatch.test(trimmedColName)) {
                    // Limpa: remove QUALQUER ID no final e o prefixo
                    let cleanHeaderText = trimmedColName.replace(regexIdRemoveGeneral, '').trim();
                    cleanHeaderText = cleanHeaderText.replace(regexPrefix, '').trim();
                    results.push({ index: j, headerText: cleanHeaderText });
                }
            }
            return results;
        }, []);
    };

    // --- Part 1: Update Consultation Table with Chart Types ---
    // USA a tabela original com formatos mistos para determinar o tipo
    const getUpdatedTabelaConsulta = () => {
         const headerConsulta = tabelaConsultaComFormatosMistos[0];
         const indexNoGrafico = headerConsulta?.indexOf("No do gráfico");
         if (indexNoGrafico == null || indexNoGrafico === -1) { console.error("'No do gráfico' column not found."); return null; }
         const novoHeader = [...headerConsulta.slice(0, indexNoGrafico + 1), "Tipo do gráfico", ...headerConsulta.slice(indexNoGrafico + 1)];
         const novaTabelaConsulta = [novoHeader];

         for (let i = 1; i < tabelaConsultaComFormatosMistos.length; i++) {
             const rowOriginal = tabelaConsultaComFormatosMistos[i];
             const identificadorOriginal = rowOriginal?.[indexNoGrafico]; // Pode ser d.d ou d.d.d ou 0.x
             if (!identificadorOriginal) continue;

             const todasRespostas = [];
             // A busca nas respostas usa o identificador ORIGINAL
             for (const [, table] of Object.entries(demaisTabelas)) {
                 if (!table || table.length < 2) continue;
                 // getColumnIndicesAndHeaders procura por [idOriginal]
                 const colunasInfo = getColumnIndicesAndHeaders(table, identificadorOriginal);
                 if (colunasInfo.length > 0) {
                     for (const colInfo of colunasInfo) {
                         const resp = table.slice(1).map(row => (row && row.length > colInfo.index) ? row[colInfo.index] : undefined);
                         todasRespostas.push(...resp);
                     }
                 }
             }
             const tipoGrafico = identificarTipoDeGrafico(todasRespostas);
             // Adiciona a linha original + tipo à nova tabela
             const novaLinha = [...rowOriginal.slice(0, indexNoGrafico + 1), tipoGrafico, ...rowOriginal.slice(indexNoGrafico + 1)];
             novaTabelaConsulta.push(novaLinha);
         }
         return novaTabelaConsulta;
    };
    // Mantém a tabela original com tipos determinados
    const tabelaConsultaAtualizada = getUpdatedTabelaConsulta();
    if (!tabelaConsultaAtualizada) { alert("Erro fatal ao processar Tabela de Consulta."); return; }

    // --- Separa Configurações Salvas por Tipo (sem mudanças) ---
    const separateConfigsByType = (allConfigs) => { const configBar={}, configTeia={}, configRespostas={}, configPerguntas={}; for(const k in allConfigs){if(Object.hasOwnProperty.call(allConfigs,k)){const c=allConfigs[k]; if(k.startsWith('bar_'))configBar[k.substring(4)]=c; else if(k.startsWith('radar_'))configTeia[k.substring(6)]=c; else if(k.startsWith('table_'))configRespostas[k.substring(6)]=c; else if(k.startsWith('perguntas_'))configPerguntas[k.substring(10)]=c;}} return {configBar, configTeia, configRespostas, configPerguntas}; };
    const { configBar, configTeia, configRespostas, configPerguntas } = separateConfigsByType(savedChartConfigs);
    window.configBar=configBar; window.configTeia=configTeia; window.configRespostas=configRespostas; window.configPerguntas=configPerguntas;

    // --- Helper TeiaPair (sem mudanças) ---
    const prepareChartDataFromCounts = (categoryCountsData, groupSizesMap, chartTitle) => { if (!categoryCountsData || Object.keys(categoryCountsData).length === 0) return null; const groupNames = Object.keys(categoryCountsData).sort(); const allResponsesInCat = new Set(); groupNames.forEach(group => { Object.keys(categoryCountsData[group] || {}).forEach(resp => allResponsesInCat.add(resp)); }); const uniqueResponses = [...allResponsesInCat].sort(); if (uniqueResponses.length === 0) return null; const percentageData = groupNames.map(group => { const totalRespondents = groupSizesMap[group]; const responseCountsForGroup = categoryCountsData[group] || {}; return uniqueResponses.map(resp => { const count = responseCountsForGroup[resp] || 0; const percentage = (totalRespondents && totalRespondents > 0) ? Math.round((count / totalRespondents) * 100) : 0; if (percentage > 100) { return 100; } return percentage; }); }); const dfDados = { index: groupNames, columns: uniqueResponses, data: percentageData }; return { dfDados, title: chartTitle, groupSizes: groupSizesMap }; };

    // --- Part 2: Generate Final visualizacaoData JSON ---
    const nomeColunaTitulo = "Título do gráfico";
    const nomeColunaDimensao = "Dimensão";
    const nomeColunaIndicador = "Indicador";
    const ordemCategoriasBarra = ['Bastante', 'Médio', 'Pouco', 'Nada', 'Outros'];
    // v2: Novos IDs de Perfil
    const profileIds = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8'];

    const gerarVisualizacaoData = (consultaAtualizada, tabelasDados) => {
        const visualizacaoDataFinal = {};
        const intermediateSpecialTeiaData = {};
        const processedSpecialIds = new Set();
        const novoHeader = consultaAtualizada[0]; // Header da tabela JÁ com a coluna "Tipo do gráfico"

        // Mapeia nome do arquivo para tamanho do grupo
        const grupoSizesMap = Object.entries(tabelasDados).reduce((map, [fileName, table]) => {
            const grupo = fileName.replace(/\.(xlsx?|csv)$/i, "");
            map[grupo] = (table || []).slice(1).filter(row => row?.some(cell => isValidResponse(cell))).length;
            return map;
        }, {});

        const findIndex = (colName) => novoHeader.indexOf(colName);
        const indiceNoGrafico = findIndex("No do gráfico");
        const indiceTipoGrafico = findIndex("Tipo do gráfico"); // Usa a coluna adicionada
        const indiceTitulo = findIndex(nomeColunaTitulo);
        const indiceDimensao = findIndex(nomeColunaDimensao);
        const indiceIndicador = findIndex(nomeColunaIndicador);

        // --- Loop Principal pela Tabela de Consulta Atualizada ---
        for (let i = 1; i < consultaAtualizada.length; i++) {
            const linhaConsulta = consultaAtualizada[i]; if (!linhaConsulta) continue;

            const getVal = (index, clean = true) => {
                if (index === -1 || index >= linhaConsulta.length || linhaConsulta[index] == null) return null;
                const val = String(linhaConsulta[index]);
                return clean ? val.trim().replace(/\n/g, ' ') : val;
            };

            const identificador = getVal(indiceNoGrafico, false); // ID original (0.x, d.d ou d.d.d)
            const tipoGraficoDeterminado = getVal(indiceTipoGrafico, false); // Tipo da coluna adicionada
            if (!identificador) continue; // Pula se não houver identificador

            // --- Verifica se é um ID de Perfil (0.x) ---
            const isProfileId = profileIds.includes(identificador);

            // --- Prepara dados base do item (usado por ambos os fluxos) ---
            const idParts = typeof identificador === 'string' ? identificador.split('.') : [];
            const numeroDimensao = idParts[0] || null;
            const numeroIndicador = idParts[1] || null;
            const tituloOriginalConsulta = getVal(indiceTitulo) || `ID ${identificador}`; // Título da linha

            // *******************************************************************
            // ******** BLOCO DE TRATAMENTO PARA IDs DE PERFIL (0.x) ********
            // *******************************************************************
            if (isProfileId) {
                // console.log(`--- Processing Profile ID: ${identificador} ---`);

                // Itera sobre cada ARQUIVO DE RESPOSTA
                for (const [fileName, table] of Object.entries(tabelasDados)) {
                    const grupoBaseReal = fileName.replace(/\.(xlsx?|csv)$/i, "");
                    // Procura a coluna correspondente ao ID 0.x no arquivo atual
                    const colunasDadosInfo = getColumnIndicesAndHeaders(table, identificador);

                    if (colunasDadosInfo.length === 1) {
                        const colInfo = colunasDadosInfo[0];
                        // Usa o título da TABELA DE CONSULTA para este ID (0.x)
                        const perguntaOuTitulo = tituloOriginalConsulta;

                        const rawDataThisFile = [];
                        if (table?.length > 1 && colInfo.index < table[0].length) {
                            for (let r = 1; r < table.length; r++) {
                                if (table[r]) rawDataThisFile.push(table[r][colInfo.index]);
                            }
                        }
                        const respostasValidasFile = rawDataThisFile.filter(isValidResponse).map(r => String(r).trim());

                        if (respostasValidasFile.length > 0) {
                            const frequencyMap = new Map();
                            respostasValidasFile.forEach(resp => { frequencyMap.set(resp, (frequencyMap.get(resp) || 0) + 1); });
                            const pieData = [];
                            frequencyMap.forEach((value, label) => { pieData.push({ label: label || "Vazio", value }); });
                            pieData.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

                            const pieItemId = `${identificador}_${grupoBaseReal.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            const pieItem = {
                                id: pieItemId,
                                type: "Pizza", // Força o tipo Pizza
                                title: `${grupoBaseReal} - ${perguntaOuTitulo}`, // Usa título da consulta + grupo
                                dimensionNumber: numeroDimensao, // Será '0'
                                dimensionName: `Perfil`, // Nome genérico para dimensão perfil
                                indicatorNumber: numeroIndicador, // Será '1' a '8'
                                indicatorName: tituloOriginalConsulta, // Nome do indicador é o título da consulta
                                originalId: identificador,
                                groupName: grupoBaseReal,
                                groupSize: grupoSizesMap[grupoBaseReal] || 0,
                                pieData: pieData,
                                dfPerg: { columns: ['Grupo', 'Pergunta'], data: [[grupoBaseReal, perguntaOuTitulo]] }
                            };
                            visualizacaoDataFinal[pieItemId] = pieItem;
                            // console.log(`   -> Created Pie Chart item: ${pieItemId}`);
                        } // else { console.log(`   -> No valid responses for ${identificador} in ${fileName}`); }
                    } // else if (colunasDadosInfo.length > 1) { console.warn(`   -> Multiple columns for Profile ID ${identificador} in ${fileName}.`); }
                } // Fim loop tabelasDados para perfil
                continue; // PULA para o próximo ID da consulta
            }
            // ***********************************************************
            // ******** FIM DO BLOCO DE TRATAMENTO PERFIL (0.x) ********
            // ***********************************************************


            // --- Lógica para ITENS NORMAIS (Barra, Teia, Quadro, TeiaPair) ---
            // Só executa se NÃO for um ID de perfil

             // Estrutura base para itens normais
            const currentItemData = {
                id: identificador, // Usa o ID original da consulta (pode ser d.d ou d.d.d)
                type: tipoGraficoDeterminado, // Usa o tipo determinado pela análise das respostas
                title: tituloOriginalConsulta, // Usa o título da consulta
                dimensionNumber: numeroDimensao,
                dimensionName: getVal(indiceDimensao) || `Dim. ${numeroDimensao || '?'}`,
                indicatorNumber: numeroIndicador, // Pode ser null se for formato d.d
                indicatorName: getVal(indiceIndicador) || `Ind. ${numeroIndicador || '?'}`,
                dfPerg: { columns: ['Grupo', 'Pergunta'], data: [] },
                groupSizes: {},
                subGroupToBaseGroup: {}
             };


            // Coleta dados brutos e perguntas (lógica original adaptada para ID da consulta)
            const rawDataPorSubGrupo = {}; const subGruposConsiderados = new Set();
            const perguntasColetadas = new Map();

            for (const [fileName, table] of Object.entries(tabelasDados)) {
                const grupoBaseReal = fileName.replace(/\.(xlsx?|csv)$/i, "");
                // Procura colunas usando o ID ORIGINAL da consulta (d.d ou d.d.d)
                const colunasDadosInfo = getColumnIndicesAndHeaders(table, identificador);

                if (colunasDadosInfo.length > 0) {
                    if (tipoGraficoDeterminado === 'Barra' && colunasDadosInfo.length > 1) {
                         colunasDadosInfo.forEach((colInfo, k) => { const marker = String.fromCharCode(97 + k); const subGrupoNomeReal = `${grupoBaseReal} (${marker})`; const perguntaTextoLimpa = colInfo.headerText; if (isValidResponse(perguntaTextoLimpa) && !perguntasColetadas.has(subGrupoNomeReal)) { currentItemData.dfPerg.data.push([subGrupoNomeReal, `(${marker}) ${perguntaTextoLimpa}`]); perguntasColetadas.set(subGrupoNomeReal, true); } subGruposConsiderados.add(subGrupoNomeReal); currentItemData.subGroupToBaseGroup[subGrupoNomeReal] = grupoBaseReal; if (table?.length > 1 && colInfo.index < table[0].length) { if (!rawDataPorSubGrupo[subGrupoNomeReal]) rawDataPorSubGrupo[subGrupoNomeReal] = []; for (let r = 1; r < table.length; r++) { if (table[r]) rawDataPorSubGrupo[subGrupoNomeReal].push(table[r][colInfo.index]); } } else { rawDataPorSubGrupo[subGrupoNomeReal] = []; } });
                    } else {
                         const grupoNomeFinalReal = grupoBaseReal; const colInfo = colunasDadosInfo[0]; const perguntaTextoLimpa = colInfo.headerText; if (isValidResponse(perguntaTextoLimpa) && !perguntasColetadas.has(grupoNomeFinalReal)) { currentItemData.dfPerg.data.push([grupoNomeFinalReal, perguntaTextoLimpa]); perguntasColetadas.set(grupoNomeFinalReal, true); } subGruposConsiderados.add(grupoNomeFinalReal); currentItemData.subGroupToBaseGroup[grupoNomeFinalReal] = grupoBaseReal; if (table?.length > 1 && colInfo.index < table[0].length) { if (!rawDataPorSubGrupo[grupoNomeFinalReal]) rawDataPorSubGrupo[grupoNomeFinalReal] = []; for (let r = 1; r < table.length; r++) { if (table[r]) rawDataPorSubGrupo[grupoNomeFinalReal].push(table[r][colInfo.index]); } } else { rawDataPorSubGrupo[grupoNomeFinalReal] = []; }
                    }
                }
            }

            // Atribui groupSizes
            subGruposConsiderados.forEach(subGrupoReal => { const baseGroupReal = currentItemData.subGroupToBaseGroup[subGrupoReal] || subGrupoReal; if (baseGroupReal && grupoSizesMap.hasOwnProperty(baseGroupReal)) { currentItemData.groupSizes[baseGroupReal] = grupoSizesMap[baseGroupReal]; if (subGrupoReal !== baseGroupReal) currentItemData.groupSizes[subGrupoReal] = grupoSizesMap[baseGroupReal]; } else { currentItemData.groupSizes[subGrupoReal] = 0; if (baseGroupReal && subGrupoReal !== baseGroupReal) currentItemData.groupSizes[baseGroupReal] = 0; } });
            const subGruposReaisParaProcessar = [...subGruposConsiderados];

            // Processamento Teia Especial (sem mudanças na lógica interna)
            let isSpecialTeiaDetected = false;
            if (tipoGraficoDeterminado === 'Teia') { let overallTotalValidResponses = 0; let overallResponsesMeetingCriterion = 0; const overallAggregatedCounts = {}; const overallFoundCategories = new Set(); const MIN_RESPONSE_PERCENTAGE = 0.5; for (const subGrupoReal of subGruposReaisParaProcessar) { const baseGroupReal = currentItemData.subGroupToBaseGroup[subGrupoReal] || subGrupoReal; const rawResponses = rawDataPorSubGrupo[subGrupoReal] || []; const analysisResult = analyzeSpecialTeiaFormat(rawResponses); overallTotalValidResponses += analysisResult.totalValidResponses; overallResponsesMeetingCriterion += analysisResult.responsesMeetingPartCriterion; analysisResult.foundCategories.forEach(cat => overallFoundCategories.add(cat)); for (const category in analysisResult.aggregatedCounts) { if (!overallAggregatedCounts[category]) overallAggregatedCounts[category] = {}; if (!overallAggregatedCounts[category][baseGroupReal]) overallAggregatedCounts[category][baseGroupReal] = {}; const responseCounts = analysisResult.aggregatedCounts[category]; for (const responseText in responseCounts) { if (!overallAggregatedCounts[category][baseGroupReal][responseText]) overallAggregatedCounts[category][baseGroupReal][responseText] = 0; overallAggregatedCounts[category][baseGroupReal][responseText] += responseCounts[responseText]; } } } const overallPercentage = (overallTotalValidResponses > 0) ? (overallResponsesMeetingCriterion / overallTotalValidResponses) : 0.0; if (overallPercentage >= MIN_RESPONSE_PERCENTAGE && overallFoundCategories.size > 0) { isSpecialTeiaDetected = true; currentItemData.isSpecial = true; currentItemData.categorizedCounts = overallAggregatedCounts; currentItemData.foundCategories = [...overallFoundCategories].sort(); const baseId = identificador.endsWith('b') ? identificador.slice(0, -1) : identificador; const partKey = identificador.endsWith('b') ? 'b' : 'a'; if (!intermediateSpecialTeiaData[baseId]) intermediateSpecialTeiaData[baseId] = { a: null, b: null }; intermediateSpecialTeiaData[baseId][partKey] = currentItemData; processedSpecialIds.add(identificador); } }

            // Processa tipos NORMAIS
            if (!isSpecialTeiaDetected && !processedSpecialIds.has(identificador)) {
                const potentialBaseId = identificador.endsWith('b') ? identificador.slice(0, -1) : null;
                const isPartOfSpecialPair = potentialBaseId && intermediateSpecialTeiaData[potentialBaseId]?.a?.isSpecial;
                if (!isPartOfSpecialPair) {
                    switch (tipoGraficoDeterminado) {
                        case 'Barra': { const respVal = {}; subGruposReaisParaProcessar.forEach(sg => { respVal[sg] = (rawDataPorSubGrupo[sg] || []).filter(isValidResponse).map(r => String(r).trim()); }); const allRespFlat = Object.values(respVal).flat(); const catSet = new Set(allRespFlat); const catsUnicas = [...catSet].sort((a, b) => { const iA=ordemCategoriasBarra.indexOf(a); const iB=ordemCategoriasBarra.indexOf(b); if(iA!==-1 && iB!==-1) return iA-iB; if(iA!==-1)return -1; if(iB!==-1)return 1; return a.localeCompare(b); }); currentItemData.dfDados = { index: [], columns: catsUnicas, data: [] }; subGruposReaisParaProcessar.forEach(sgReal => { const hasQ = currentItemData.dfPerg.data.some(p => p[0] === sgReal); if ((respVal[sgReal]?.length > 0) || hasQ) { currentItemData.dfDados.index.push(sgReal); const respSG = respVal[sgReal] || []; currentItemData.dfDados.data.push(catsUnicas.map(cat => respSG.filter(r => r === cat).length)); } }); break; }
                        case 'Teia': { const respValBaseReal = {}; subGruposReaisParaProcessar.forEach(sgReal => { const bgReal = currentItemData.subGroupToBaseGroup[sgReal] || sgReal; if (!respValBaseReal[bgReal]) respValBaseReal[bgReal] = []; const respSG = (rawDataPorSubGrupo[sgReal] || []).filter(isValidResponse).map(r=>String(r).trim()); respValBaseReal[bgReal].push(...respSG); }); const totaisCatBase = {}; Object.values(respValBaseReal).flat().forEach(respStr => { verificarCategoria(respStr).forEach(cat => { totaisCatBase[cat] = (totaisCatBase[cat] || 0) + 1; }); }); const catsUnicasT = Object.keys(totaisCatBase).sort((a,b) => (totaisCatBase[b]||0) - (totaisCatBase[a]||0) || a.localeCompare(b)); currentItemData.dfDados = { index: [], columns: catsUnicasT, data: [] }; const currentGroupSizes = currentItemData.groupSizes; Object.keys(respValBaseReal).forEach(bgReal => { const hasQ = currentItemData.dfPerg.data.some(p => p[0] === bgReal); if ((respValBaseReal[bgReal]?.length > 0) || hasQ) { currentItemData.dfDados.index.push(bgReal); const totalRespondents = currentGroupSizes[bgReal]; currentItemData.dfDados.data.push(catsUnicasT.map(c => { const countInCategory = (respValBaseReal[bgReal]||[]).filter(rs => verificarCategoria(rs).includes(c)).length; const percentage = (totalRespondents && totalRespondents > 0) ? Math.round((countInCategory / totalRespondents) * 100) : 0; if (percentage > 100) { return 100; } return percentage; })); } }); break; }
                        case 'Quadro de respostas abertas': { currentItemData.dfRespostas = {}; subGruposReaisParaProcessar.forEach(sgReal => { const respSG = (rawDataPorSubGrupo[sgReal] || []).filter(isValidResponse).map(r => String(r).trim()); const hasQ = currentItemData.dfPerg.data.some(p => p[0] === sgReal); if (respSG.length > 0 || hasQ) { currentItemData.dfRespostas[sgReal] = respSG; } }); break; }
                        default: { currentItemData.type = 'NaoTratado'; currentItemData.dfRespostas = {}; subGruposReaisParaProcessar.forEach(sg => { currentItemData.dfRespostas[sg] = (rawDataPorSubGrupo[sg] || []).filter(isValidResponse).map(r => String(r).trim()); }); }
                    }
                    const hasChartData = currentItemData.dfDados?.index?.length > 0; const hasResponseData = currentItemData.dfRespostas && Object.keys(currentItemData.dfRespostas).length > 0; const hasQuestions = currentItemData.dfPerg?.data?.length > 0;
                    if (hasQuestions || hasChartData || hasResponseData) { visualizacaoDataFinal[identificador] = currentItemData; }
                }
            }
        } // --- Fim Loop Principal pela Consulta ---

        // --- Pós-Processamento TeiaPair (sem mudanças na lógica interna) ---
        for (const baseId in intermediateSpecialTeiaData) { const pairData = intermediateSpecialTeiaData[baseId]; const dataItemA = pairData.a; const dataItemB = pairData.b; if (!dataItemA || !dataItemA.isSpecial) { console.error(`Error TeiaPair: Data 'a' for ${baseId} invalid.`); continue; } const allCategories = new Set([...(dataItemA.foundCategories || [])]); if (dataItemB?.foundCategories) { dataItemB.foundCategories.forEach(cat => allCategories.add(cat)); } const finalCategories = [...allCategories].sort(); if (finalCategories.length === 0) { continue; } finalCategories.forEach(category => { const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '_'); const newItemId = `${baseId}_${sanitizedCategory}`; const chartDataA = prepareChartDataFromCounts( dataItemA.categorizedCounts?.[category], dataItemA.groupSizes, `${dataItemA.title || baseId + '(a)'} - ${category}` ); let chartDataB = null; if (dataItemB?.categorizedCounts?.[category]) { chartDataB = prepareChartDataFromCounts( dataItemB.categorizedCounts[category], dataItemB.groupSizes, `${dataItemB.title || baseId + '(b)'} - ${category}` ); } let combinedPergData = JSON.parse(JSON.stringify(dataItemA.dfPerg || { columns: ['Grupo', 'Pergunta'], data: [] })); if (dataItemB?.dfPerg?.data?.length > 0) { const existingPergKeys = new Set(combinedPergData.data.map(r => `${r[0]}_${r[1]}`)); dataItemB.dfPerg.data.forEach(rowB => { const keyB = `${rowB[0]}_${rowB[1]}`; if (!existingPergKeys.has(keyB)) combinedPergData.data.push(rowB); }); } const newItem = { id: newItemId, type: "TeiaPair", title: category, dimensionNumber: dataItemA.dimensionNumber, dimensionName: dataItemA.dimensionName, indicatorNumber: dataItemA.indicatorNumber, indicatorName: dataItemA.indicatorName, categoryName: category, originalIds: { a: dataItemA.id, b: dataItemB?.id || null }, groupSizes: { ...dataItemA.groupSizes, ...(dataItemB?.groupSizes || {}) }, dfPerg: combinedPergData, chartDataA: chartDataA, chartDataB: chartDataB }; if (newItem.chartDataA || newItem.chartDataB || newItem.dfPerg?.data?.length > 0) { visualizacaoDataFinal[newItemId] = newItem; } }); }

        console.log(`Final visualizacaoData generated with ${Object.keys(visualizacaoDataFinal).length} items.`);
        return visualizacaoDataFinal;
    }; // Fim gerarVisualizacaoData


    const openTutorialLink = document.getElementById('open-tutorial-modal');
    const tutorialModal = document.getElementById('tutorial-modal');
    const closeTutorialButton = document.getElementById('close-tutorial-modal');
    const videoPlayer = document.getElementById('tutorial-video-player');
    const videoTitleElement = document.getElementById('tutorial-video-title');
    const prevVideoButton = document.getElementById('prev-tutorial-video');
    const nextVideoButton = document.getElementById('next-tutorial-video');

    const tutorialVideos = [
        { title: "Tutorial: Gráficos de Barras", src: "videos_tutoriais/barras.mp4" },
        { title: "Tutorial: Quadros de Respostas", src: "videos_tutoriais/quadro.mp4" },
        { title: "Tutorial: Gráficos de Teia (Radar)", src: "videos_tutoriais/teia.mp4" },
        { title: "Tutorial: Tabelas de Perguntas", src: "videos_tutoriais/perguntas.mp4" }
    ];
    let currentVideoIndex = 0;
    let isTransitioning = false; // Flag para evitar cliques múltiplos durante a transição

    function updateVideoPlayer(isNext) {
        const navigationFooter = document.querySelector('.tutorial-video-navigation'); // Pega o rodapé
        if (tutorialVideos.length > 0 && !isTransitioning) {
            isTransitioning = true;
            const videoData = tutorialVideos[currentVideoIndex];
            videoTitleElement.textContent = videoData.title;

            videoPlayer.classList.add('video-transitioning');
            videoPlayer.pause();

            setTimeout(() => {
                videoPlayer.src = videoData.src;
                videoPlayer.load();
                videoPlayer.play().catch(error => console.log("Autoplay foi prevenido:", error));
                videoPlayer.classList.remove('video-transitioning');
                isTransitioning = false;
            }, 300);

            // Lógica para mostrar/esconder botões E ajustar o alinhamento do footer
            navigationFooter.classList.remove('next-only', 'prev-only'); // Limpa classes anteriores

            if (currentVideoIndex === 0) {
                prevVideoButton.style.display = 'none';
                nextVideoButton.style.display = 'inline-flex';
                navigationFooter.classList.add('next-only'); // Só o próximo visível, alinha à direita
            } else if (currentVideoIndex === tutorialVideos.length - 1) {
                prevVideoButton.style.display = 'inline-flex';
                nextVideoButton.style.display = 'none';
                navigationFooter.classList.add('prev-only'); // Só o anterior visível, alinha à esquerda
            } else {
                prevVideoButton.style.display = 'inline-flex';
                nextVideoButton.style.display = 'inline-flex';
                // Nenhuma classe extra, usa o space-between padrão
            }
        }
    }

    function showTutorialModal() {
        if (tutorialVideos.length > 0) {
            currentVideoIndex = 0; // Sempre começa do primeiro vídeo ao abrir
            updateVideoPlayer(); // Carrega o primeiro vídeo
            tutorialModal.style.display = 'flex';
        } else {
            alert("Nenhum vídeo tutorial disponível.");
        }
    }

    function closeTutorials() {
        videoPlayer.pause();
        tutorialModal.style.display = 'none';
    }

    if (openTutorialLink) {
        openTutorialLink.addEventListener('click', function(event) {
            event.preventDefault();
            showTutorialModal();
        });
    }

    if (closeTutorialButton) {
        closeTutorialButton.addEventListener('click', closeTutorials);
    }

    if (prevVideoButton) {
        prevVideoButton.addEventListener('click', function() {
            if (currentVideoIndex > 0 && !isTransitioning) {
                currentVideoIndex--;
                updateVideoPlayer(false); // false para indicar que é "anterior"
            }
        });
    }

    if (nextVideoButton) {
        nextVideoButton.addEventListener('click', function() {
            if (currentVideoIndex < tutorialVideos.length - 1 && !isTransitioning) {
                currentVideoIndex++;
                updateVideoPlayer(true); // true para indicar que é "próximo"
            }
        });
    }

    if (tutorialModal) {
        tutorialModal.addEventListener('click', function(event) {
            if (event.target === tutorialModal) {
                closeTutorials();
            }
        });
    }

    // --- Final Assignment and Event Dispatch ---
    window.visualizacaoData = gerarVisualizacaoData(tabelaConsultaAtualizada, demaisTabelas);
    window.tabelaConsultaAtualizada = tabelaConsultaAtualizada;
    document.dispatchEvent(new CustomEvent('visualizacaoDataReady'));
    console.log("Data processing complete. 'visualizacaoDataReady' event dispatched.");

}); // Fim DOMContentLoaded