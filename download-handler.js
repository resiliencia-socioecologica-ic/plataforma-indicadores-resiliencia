/*
 * download-handler.js (v2 + Seção Perfil PDF v2 + Capa e Introdução Customizadas - CORREÇÕES CAPA v3)
 * Lógica para os botões de download na sidebar.
 * Inclui gráficos de perfil no PNG e na seção inicial do PDF Completo.
 */

const DownloadHandler = (() => {

    // --- Referências ---
    let sidebar = null;
    let btnPdfAll = null;
    let btnPdfDim = null;
    let inputPdfDim = null;
    let btnPng = null;
    let btnJson = null;

    // --- Funções Auxiliares ---
    const triggerDownload = (blob, filename) => {
        if (!blob) {
            console.error("triggerDownload: Blob inválido para", filename);
            alert(`Erro ao criar ${filename}.`);
            return;
        }
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erro ao acionar download:", error);
            alert(`Falha ao iniciar o download de ${filename}.`);
        }
    };

    const getVisibleSquares = (dimensionNumber = null) => {
        const selector = dimensionNumber ?
            `.grid-container .square[data-dimension-number="${dimensionNumber}"]` :
            '.grid-container .square';
        const squaresNodeList = document.querySelectorAll(selector);
        const squaresArray = Array.from(squaresNodeList);
        return squaresArray
            .filter(el => window.getComputedStyle(el).display !== 'none')
            .sort((a, b) => {
                const idA = a.dataset.id || '';
                const idB = b.dataset.id || '';
                const partsA = idA.split('_');
                const partsB = idB.split('_');
                const numericPartA = partsA[0];
                const numericPartB = partsB[0];

                if (numericPartA !== numericPartB) {
                    const numPartsA = numericPartA.split('.').map(n => parseInt(n, 10));
                    const numPartsB = numericPartB.split('.').map(n => parseInt(n, 10));
                    for (let i = 0; i < Math.max(numPartsA.length, numPartsB.length); i++) {
                        let valA = numPartsA[i];
                        let valB = numPartsB[i];
                        if (isNaN(valA) || isNaN(valB)) {
                            const strNumA = String(numericPartA).split('.')[i] || '';
                            const strNumB = String(numericPartB).split('.')[i] || '';
                            if (isNaN(valA) && isNaN(valB)){
                                if (strNumA !== strNumB) return strNumA.localeCompare(strNumB);
                            } else return isNaN(valA) ? 1 : -1;
                        } else if (valA !== valB) {
                            return valA - valB;
                        }
                    }
                }
                const categoryA = partsA.slice(1).join('_') || '';
                const categoryB = partsB.slice(1).join('_') || '';
                if (categoryA !== categoryB) {
                    return categoryA.localeCompare(categoryB);
                }
                return 0;
            });
    };

    const prepareForCapture = (element) => {
        if (!element) return;
        element.classList.add('capture-full-content');
    };

    const cleanupAfterCapture = (element) => {
        if (!element) return;
        element.classList.remove('capture-full-content');
    };

    const createLoadingOverlay = (text) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.85); display: flex; justify-content: center; align-items: center; z-index: 10000; font-size: 1.5em; color: #333;';
        overlay.innerHTML = `<span style="padding: 20px 30px; background: #fff; border-radius: 5px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); text-align: center;">${text}</span>`;
        overlay.classList.add('capture-overlay');
        document.body.appendChild(overlay);
        return overlay;
    };

    // --- Lógica dos Downloads ---

    // 1. Download JSON Completo
    const downloadCompleteJson = () => {
        console.log("Iniciando download do JSON completo...");
        try {
            const dadosCompletos = JSON.parse(localStorage.getItem("dadosCompletos")) || {};
            const currentChartInstances = window.charts || {};
            const storedSchoolInfo = localStorage.getItem("schoolInfo");
            let schoolInfo = null;
            if (storedSchoolInfo) {
                try {
                    schoolInfo = JSON.parse(storedSchoolInfo);
                } catch (e) {
                    console.error("Erro ao fazer parse das informações da escola do localStorage:", e);
                }
            }

            const dataToSave = {
                originalData: {
                    TabelaConsulta: dadosCompletos.TabelaConsulta || [],
                    DemaisTabelas: dadosCompletos.DemaisTabelas || {}
                },
                schoolInfo: schoolInfo || {},
                chartConfigs: {}
            };

            for (const key in currentChartInstances) {
                if (Object.hasOwnProperty.call(currentChartInstances, key)) {
                    const instance = currentChartInstances[key];
                    let configToSave = null;

                    if (instance instanceof Chart && instance.currentOptions) {
                        try {
                            configToSave = JSON.parse(JSON.stringify(instance.currentOptions));
                        } catch (e) {
                            console.warn(`Erro ao serializar currentOptions para ${key}. Tentando fallback...`, e);
                            try {
                                configToSave = JSON.parse(JSON.stringify(instance.config.options || {}));
                                configToSave.error_fallback = "Usando config.options";
                            } catch (e2) {
                                console.error(`Erro no fallback para ${key}:`, e2);
                                configToSave = { error: "Falha ao serializar opções do gráfico" };
                            }
                        }
                    } else if (instance.options && instance.type && instance.type.includes('table')) {
                        try {
                            configToSave = JSON.parse(JSON.stringify(instance.options));
                            if (instance.type === 'response-table' && instance.data) {
                                configToSave._currentData = JSON.parse(JSON.stringify(instance.data));
                            }
                        } catch (e) {
                            console.warn(`Erro ao serializar tabela ${key}:`, e);
                            configToSave = { error: "Falha ao serializar opções da tabela" };
                        }
                    }

                    if (configToSave) {
                        dataToSave.chartConfigs[key] = configToSave;
                    }
                }
            }
            const jsonString = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            triggerDownload(blob, 'visualizacao_completa_config.json');
        } catch (error) {
            console.error("Erro ao gerar o arquivo JSON completo:", error);
            alert("Erro ao gerar o arquivo JSON.");
        }
    };

    // 2. Download PNGs
    const downloadPngs = async () => {
        console.log("Iniciando download de PNGs (incluindo perfil)...");
        if (typeof html2canvas === 'undefined') {
            alert("Erro: A biblioteca html2canvas não está carregada.");
            return;
        }

        const profileSquares = Array.from(document.querySelectorAll('#profile-charts-container .square'))
            .filter(el => window.getComputedStyle(el).display !== 'none');
        const regularSquares = getVisibleSquares();

        profileSquares.sort((a, b) => (a.dataset.id || '').localeCompare(b.dataset.id || ''));

        const squares = [...profileSquares, ...regularSquares];

        if (squares.length === 0) {
            alert("Nenhuma visualização visível para gerar PNGs.");
            return;
        }
        alert(`Preparando ${squares.length} imagem(ns) PNG... Isso pode levar alguns instantes.`);
        const loadingOverlay = createLoadingOverlay('Gerando Imagens PNG...');

        try {
            for (const square of squares) {
                const dataId = square.dataset.id || `imagem_${squares.indexOf(square) + 1}`;
                const filename = `grafico_${dataId}.png`;
                prepareForCapture(square);
                try {
                    const canvas = await html2canvas(square, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    triggerDownload(blob, filename);
                } catch (err) {
                    console.error(`Erro ao gerar PNG para o elemento ${dataId}:`, err);
                    alert(`Falha ao gerar a imagem para ${dataId}.`);
                } finally {
                    cleanupAfterCapture(square);
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            console.log("Downloads de PNGs concluídos.");
            alert("Geração de imagens PNG concluída.");
        } catch (error) {
            console.error("Erro geral durante a geração de PNGs:", error);
            alert("Ocorreu um erro geral ao tentar gerar as imagens PNG.");
        } finally {
            if (loadingOverlay && loadingOverlay.parentNode) {
                document.body.removeChild(loadingOverlay);
            }
        }
    };

    // 3. Download PDF
    const downloadPdf = async (dimensionNumber = null) => {
        const context = dimensionNumber ? `Dimensão ${dimensionNumber}` : "Todas as Dimensões";
        console.log(`Iniciando geração do PDF para: ${context}...`);

        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            alert("Erro: Bibliotecas jsPDF ou html2canvas não carregadas.");
            return;
        }

        const profileSquaresAll = Array.from(document.querySelectorAll('#profile-charts-container .square[data-type="grafico_de_pizza"]'));
        const regularSquares = getVisibleSquares(dimensionNumber);


        const totalItemsToProcess = profileSquaresAll.length + regularSquares.length;
        alert(`Gerando PDF com capa, introdução e ${totalItemsToProcess} item(ns) (${context})... Isso pode levar alguns instantes.`);
        const loadingOverlay = createLoadingOverlay(`Gerando PDF (${context})...`);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageMargin = 15;
        const pageWidthUnaltered = pdf.internal.pageSize.getWidth();
        const pageWidth = pageWidthUnaltered - (pageMargin * 2);
        const pageHeight = pdf.internal.pageSize.getHeight();
        let currentY = pageMargin;
        let currentPageNum = 1;

        // --- Constantes de Fonte e Espaçamento ---
        const FONT_TITLE_CAPA = 16;
        const FONT_SUBTITLE_CAPA = 14;
        const FONT_LABEL_CAPA = 11;
        const FONT_TEXT_CAPA = 10;
        const FONT_FOOTER_CAPA = 8;

        const FONT_TITLE_INTRO = 14;
        const FONT_SUBTITLE_INTRO = 12;
        const FONT_BODY_INTRO = 10;
        const FONT_RODAPE_ESPECIFICO_INTRO = 8;
        const FONT_PAGE_NUMBER = 9;
        const FONT_REFERENCE_TITLE = 14;
        const FONT_REFERENCE_ITEM = 9;

        const LINE_HEIGHT_FACTOR_NORMAL = 1.3;
        const LINE_HEIGHT_FACTOR_COMPACT = 1.15;

        const PARAGRAPH_SPACING = 5;
        const LIST_ITEM_SPACING = 3;
        const SECTION_SPACING = 8;
        const CAPA_TITLE_SUBTITLE_SPACING = 15;
        const CAPA_INFO_BLOCK_SPACING = 20;
        const CAPA_INFO_LINE_SPACING = 7;
        const CAPA_AFTER_INFO_SPACING = 10;

        const COLOR_BLACK = [0, 0, 0];
        const COLOR_GREY = [80, 80, 80];
        const COLOR_DARK_GREY = [50, 50, 50];

        const PARAGRAPH_INDENT = "    ";

        // --- Textos Estáticos para Descrições ---
        const dimensionDescriptions = {
            "1": "Esta dimensão tem como objetivo compreender se as práticas escolares incentivam a proteção dos ecossistemas e a diversificação dos elementos da paisagem. Tais características são primordiais em sistemas socioecológicos resilientes visto que, por oferecem alternativas para lidar com a mudança, ajudam o sistema a sustentar sua identidade, funções e estruturas após distúrbios (BERGAMINI et al., 2013; PANPAKDEE; LIMNIRANKUL, 2018).",
            "2": "Fomentar a biodiversidade agrícola ajuda a garantir uma diversidade de alimentos no caso de eventos extremos e aumenta as oportunidades de comercialização de produtos, aprovisionando a economia local. Além disso, a biodiversidade agrícola propicia a experimentação, a reorganização e a inovação nas comunidades, colabora com sua autonomia e fortalece a segurança e a soberania alimentar (FOLKE et al., 2005; PANPAKDEE; LIMNIRANKUL, 2018; UNU-IAS et al., 2014). Assim, a dimensão tem o objetivo de apreender se as práticas escolares afetam a produção agrícola das comunidades de forma a fortalecer sua resiliência socioecológica.",
            "3": "O conhecimento, a aprendizagem e a inovação são recursos para desenvolver a resiliência socioecológica. A capacidade de aprender sobre as relações ecológicas e sociais que compõem um sistema colaboram para sua auto-organização, adaptação e transformação diante de distúrbios. Para aprender a conviver com mudanças e lidar com imprevistos e incertezas, algumas habilidades se fazem relevantes tais como abertura para o novo, flexibilidade, empenho contínuo por adquirir conhecimento e entusiasmo para experimentar intervenções para lidar com a situação (MERÇON, 2016; PANPAKDEE; LIMNIRANKUL, 2018; UNU-IAS et al., 2014).\nA dimensão tem o objetivo de compreender o efeito das práticas escolares na (auto)aprendizagem, na construção e trocas de conhecimento, na inovação e no saber lidar com mudanças e incertezas.",
            "4": "A dimensão tem o objetivo de averiguar se, e de que maneira, as práticas escolares influenciam a auto-organização, a governança, a equidade social e o bem-estar da comunidade.\nA disponibilidade de infraestrutura eficiente e funcional e a garantia da equidade social são essenciais para atender às necessidades e anseios das comunidades e, assim, para sua resiliência. A desigualdade e a marginalização de determinados grupos e de seus conhecimentos e habilidades podem prejudicar sua capacidade de colaborar com o fortalecimento da comunidade (UNU-IAS et al., 2014).\nA capacidade da comunidade de se auto-organizar para encontrar soluções de enfrentamento a desafios, melhorar as relações sociais e consolidar conexões também são aspectos relevantes para a resiliência socioecológica. Por fim, o bem-estar da comunidade e a conservação da biodiversidade podem ser aprimorados com o engajamento – inclusivo, diverso e horizontal – de seus integrantes na governança do território, em espaços de tomada de decisão e de desenvolvimento de políticas públicas (BURGOS; MERTENS, 2022; KRASNY; ROTH, 2011; MENDONZA, 2016; MERÇON, 2016; PANPAKDEE; LIMNIRANKUL, 2018; UNU-IAS et al., 2014)."
        };
        const indicatorDescriptions = {
            "1.1": "Para que as pessoas possam promover a resiliência de um sistema socioecológico quanto à diversidade da paisagem e proteção de ecossistemas, é importante que possam identificar as características e os diferentes elementos que o compõem, sua heterogeneidade e multifuncionalidade, assim como seu estado de conservação.\nO indicador ajuda a identificar se as práticas escolares contribuem para o aprimoramento de habilidades de reconhecimento da paisagem.",
            "1.2": "A proteção e a restauração dos ecossistemas são essenciais para manutenção de suas funções e para abrandar os impactos no caso de eventos extremos, como enchentes e secas. Além disso, a valorização do local em que se vive, o reconhecimento de sua importância e a preservação de elementos da paisagem são significativos para o fortalecimento da resiliência socioecológica. A escola pode fomentar a formação de indivíduos que não apenas interpretam o nível de proteção de uma paisagem, como também colaboram para isso.\nO objetivo do indicador é compreender a visão da comunidade escolar em relação à própria capacidade de verificar a proteção de elementos dos ecossistemas, a importância dada a isso e o papel da escola na formação de tais percepções.",
            "1.3": "Compreender a interação e a interdependência dos elementos da paisagem, a complexidade dos sistemas socioecológicos e o impacto das ações antrópicas é fundamental na governança ambiental e para lidar com as incertezas em sistemas socioecológicos. Ainda, conhecer os problemas ambientais e as formas de mitigá-los são aspectos essenciais para a resiliência de comunidades.\nO objetivo do indicador é identificar se as práticas escolares auxiliam na percepção da complexidade das interações pessoas-paisagem, do impacto das ações antrópicas e de riscos ambientais, assim como no desenvolvimento de habilidades para proposição de soluções.",
            "2.1": "A conservação das variedades locais e os conhecimentos de manejo agrícola de uma comunidade são aspectos que aumentam sua autonomia e ajudam a lidar com distúrbios, bem como quando existe a necessidade de reorganização e renovação. Além das comunidades, a escola também é um espaço que pode prover aprendizados relacionados à produção agrícola.\nO indicador tem como objetivo averiguar se as práticas escolares fomentam a diversificação agrícola e motivam os estudantes a promoverem a agroecologia.",
            "2.2": "O engajamento dos jovens em práticas que aumentam a biodiversidade agrícola e o trabalho intergeracional que proporcione um aprendizado mútuo podem ajudar na valorização do campo, bem como na resiliência de comunidades rurais. Além disso, a proatividade da juventude em atividades do campo – familiares ou comunitárias – influencia na consolidação da comunidade rural.\nO objetivo do indicador é constatar a percepção da comunidade escolar em relação ao papel da escola na aproximação, no apoio e na permanência dos jovens no campo.",
            "2.3": "A diversidade de fontes de renda, canais de escoamento, acesso a mercados e feiras locais, além de conhecimentos e habilidades que propiciem a adaptação de culturas cultivadas, são aspectos que favorecem a estabilidade financeira e a autonomia das comunidades em situações de distúrbios.\nO objetivo do indicador é identificar o papel da escola na geração de renda e diversificação de oportunidades econômicas dos estudantes e de seus familiares.",
            "3.1": "Na educação para resiliência socioecológica, é importante o acesso a diferentes fontes de informação e tipos de conhecimentos (por exemplo, científicos e tradicionais). A interação intergeracional também é de grande valia por ajudar os jovens a compreenderem a relação da diversidade cultural com a diversidade ecológica e estimular confiança e conexão entre os membros da comunidade. As escolas podem contribuir para isso ao inserir diferentes conteúdos no currículo ou encorajar que os estudantes aprendam e troquem conhecimento com outras pessoas da comunidade.\nO indicador tem como objetivo verificar a visão da comunidade escolar quanto à contribuição da escola na promoção de diferentes fontes de conhecimento e trocas intergeracionais.",
            "3.2": "A aprendizagem para resiliência socioecológica envolve processos que induzem mudanças de comportamento a longo prazo, o que pode ser propiciado pela combinação de conhecimento, prática, trabalho em equipe e reflexão. O acesso a diversas estratégias de aprendizagem pode impulsionar o desenvolvimento de habilidades e autonomia para seguir aprendendo ao longo da vida.\nO indicador visa verificar se as abordagens escolares fomentam a autonomia para construção de conhecimento e mudanças de comportamento nos estudantes. Também busca constatar se o que é vivenciado na escola é aplicado em outros contextos.",
            "3.3": "A inovação incremental refere-se à melhoria e otimização do que já existe para maior crescimento e estabilidade. Exemplos disso são mudanças na agricultura, no manejo da biodiversidade e nas práticas de conservação, como diversificação de sistemas de cultivo, produção orgânica, reintrodução de espécies nativas e reflorestamento.\nO objetivo do indicador é identificar a abertura e a motivação dos estudantes e familiares para fazer mudanças que promovam a resiliência socioecológica de suas comunidades e qual a influência da escola em relação a isso.",
            "3.4": "Capacidade de identificação de riscos e suas causas, reconhecimento de que mudanças são inevitáveis, resolução de problemas, tomada de decisão, concepção de soluções criativas, adaptação, auto-organização e autoconfiança são algumas habilidades que estimulam a resiliência em situações de imprevistos e incertezas. Além disso, cooperação, confiança mútua e trabalho em grupo são essenciais para lidar com momentos desafiadores. O acúmulo de experiências com processos reflexivos ajuda no desenvolvimento de tais habilidades e para mudanças de comportamento a longo prazo.\nO indicador tem o objetivo de qualificar, a partir das considerações da comunidade escolar, se a escola fomenta o aprimoramento de habilidades que ajudem a lidar com incertezas e imprevistos.",
            "4.1": "O estabelecimento de redes de apoio e cooperação proporciona troca de materiais, conhecimentos, habilidades e experiências, o que pode contribuir em momentos em que é necessário reorganização e renovação. As redes também favorecem a articulação, o estabelecimento de confiança e a solidariedade entre pessoas e comunidades, além de fortalecer a participação comunitária e as ações coletivas.\nO indicador visa identificar o amadurecimento de habilidades de formação e articulação em rede fomentado por práticas escolares, assim como verificar o reflexo de tais aprendizados em ambientes fora da escola.",
            "4.2": "A eficácia das comunidades na resposta aos riscos e distúrbios e na resolução de problemas é potencializada quanto mais elas forem engajadas nas próprias questões, com articulação para lidar com as demandas locais e tomar suas decisões. Contribui para isso a identificação de problemas e definição de soluções coletivamente, cooperação, envolvimento em temas comunitários e a favor do bem comum, auto-organização, autonomia, fortalecimento de laços sociais, diálogo e solidariedade.\nO indicador busca compreender como a escola estimula proatividade, estabilização de vínculos sociais, coletividade, resolução de conflitos, comunicação e engajamento comunitário. O indicador visa ainda mapear a percepção da comunidade escolar quanto ao trabalho da escola em assuntos como economia solidária, autogestão e relação da agroecologia com vida comunitária.",
            "4.3": "Consciência crítica e mudança de paradigmas são aspectos que influenciam como um sistema se restabelece após um distúrbio. Isso se relaciona com atitudes como reflexão sobre os regimes de governança vigentes, proposição de outros modos de organização e engajamento para promover mudanças mais profundas na sociedade.\nO objetivo do indicador é conhecer a visão da comunidade escolar em relação à importância do entendimento da complexidade de fatores que afetam e são afetados pela sociedade e identificar se a escola estimula o amadurecimento da reflexão crítica em relação ao mundo e o engajamento em questões sociais.",
            "4.4": "É importante que as comunidades tenham autonomia e se auto-organizem para suprir suas necessidades. Para isso, é relevante o estabelecimento da governança social e ambiental local e o reconhecimento dos direitos e deveres em relação ao território que habitam, além da garantia de relações de equidade entre seus integrantes quanto à tomada de decisão e ao acesso à educação e demais oportunidades e recursos.\nO indicador visa identificar o envolvimento dos estudantes na promoção do bem-estar das comunidades e como percebem a influência da escola para isso, além de captar suas percepções referentes à governança ambiental de seus territórios e à promoção da equidade nos diferentes processos da comunidade."
        };
        const practicesSchoolDescription = "O mapeamento das práticas escolares visa indicar quais mais contribuem na formação dos estudantes para o fortalecimento da resiliência socioecológica em suas comunidades e o que pode ser aprimorado, além de identificar possibilidades de novas práticas a serem adotadas.";


        // --- Funções Auxiliares ---
        const addPageNumberToCurrentPage = () => {
            const oldFontSize = pdf.getFontSize();
            const oldFont = pdf.getFont();
            const oldColor = pdf.getTextColor();
            pdf.setFontSize(FONT_PAGE_NUMBER);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(COLOR_GREY[0], COLOR_GREY[1], COLOR_GREY[2]);
            pdf.text(`Página ${currentPageNum}`, pageWidthUnaltered / 2, pageHeight - (pageMargin / 2) + 2, { align: 'center' });
            pdf.setFontSize(oldFontSize);
            if (oldFont && oldFont.fontName) pdf.setFont(oldFont.fontName, oldFont.fontStyle); else pdf.setFont(undefined, 'normal');
            pdf.setTextColor(oldColor);
        };

        const addNewPageAndNumber = () => {
            addPageNumberToCurrentPage();
            pdf.addPage();
            currentPageNum++;
            currentY = pageMargin;
            console.log(`  -> Nova página PDF adicionada (${currentPageNum}).`);
        };

        const calculateTextHeight = (text, maxWidth, fontSize, lineHeightFactor) => {
            const oldSize = pdf.getFontSize();
            pdf.setFontSize(fontSize);
            const lines = pdf.splitTextToSize(text, maxWidth); 
            const dimensions = pdf.getTextDimensions(lines.join('\n'), {fontSize: fontSize, lineHeightFactor: lineHeightFactor, maxWidth: maxWidth});
            pdf.setFontSize(oldSize);
            return dimensions.h;
        };
        
        const addFormattedText = (text, x, y, options) => {
            const {
                maxWidth = pageWidth,
                fontSize = FONT_BODY_INTRO,
                fontStyle = 'normal',
                color = COLOR_BLACK,
                align = 'left', 
                lineHeightFactor = LINE_HEIGHT_FACTOR_NORMAL,
                spaceAfter = 0,
                advanceY = true,
                isListItem = false,
                isParagraph = false,
                isReferenceItem = false 
            } = options;

            let actualAlign = align;
            let textToRender = String(text == null ? "" : text);

            if (isParagraph && !isReferenceItem) { 
                actualAlign = 'justify';
                textToRender = PARAGRAPH_INDENT + textToRender;
            } else if (isReferenceItem) {
                actualAlign = 'justify'; 
            }

            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, fontStyle);
            pdf.setTextColor(color[0], color[1], color[2]);
            const textBlockHeight = calculateTextHeight(textToRender, maxWidth, fontSize, lineHeightFactor);
            let actualX = x;
            if (align === 'center') { 
                actualX = pageWidthUnaltered / 2;
            } else if (align === 'right') {
                actualX = x + maxWidth;
            }
            const heightToCheck = textBlockHeight + (isListItem ? 0 : (advanceY ? spaceAfter : 0));
            if (y + heightToCheck + 2 > pageHeight - pageMargin && !(y === pageMargin && y + heightToCheck + 2 <= pageHeight - pageMargin )) {
                addNewPageAndNumber();
                y = currentY;
            }
            pdf.text(textToRender, actualX, y, {
                align: actualAlign, 
                lineHeightFactor: lineHeightFactor,
                maxWidth: maxWidth 
            });
            if (advanceY) {
                currentY = y + textBlockHeight + spaceAfter;
                return currentY;
            }
            return y + textBlockHeight + spaceAfter;
        };

        // --- Nova Capa ---
        try {
            console.log("Gerando Capa...");
            let schoolInfo = { name: '[nome escola]', city: '[município]', state: '[estado]', responsible: '[nome do responsável]' };
            const storedSchoolInfo = localStorage.getItem("schoolInfo");
            if (storedSchoolInfo) { try { schoolInfo = JSON.parse(storedSchoolInfo); } catch (e) { /* usa defaults */ } }
            const currentYear = new Date().getFullYear();
            currentY = pageMargin + 15;
            currentY = addFormattedText("INDICADORES DE APRENDIZAGEM PARA RESILIÊNCIA SOCIOECOLÓGICA DE COMUNIDADES RURAIS", pageMargin, currentY, { fontSize: FONT_TITLE_CAPA, fontStyle: 'bold', color: COLOR_DARK_GREY, align: 'center', maxWidth: pageWidth, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, spaceAfter: CAPA_TITLE_SUBTITLE_SPACING });
            currentY = addFormattedText("RELATÓRIO DE RESULTADOS", pageMargin, currentY, { fontSize: FONT_SUBTITLE_CAPA, fontStyle: 'bold', color: COLOR_DARK_GREY, align: 'center', maxWidth: pageWidth, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, spaceAfter: CAPA_INFO_BLOCK_SPACING });
            const schoolInfoData = [
                { label: "INSTITUIÇÃO:", value: schoolInfo.name || '[nome escola]' }, { label: "LOCAL:", value: `${schoolInfo.city || '[município]'} / ${schoolInfo.state || '[estado]'}` }, { label: "RESPONSÁVEL PELA APLICAÇÃO:", value: schoolInfo.responsible || '[nome do responsável]' }, { label: "ANO DE APLICAÇÃO DOS INDICADORES:", value: String(currentYear) }
            ];
            for (const item of schoolInfoData) {
                const labelText = String(item.label || ""); const valueText = String(item.value || "");
                pdf.setFontSize(FONT_LABEL_CAPA); pdf.setFont(undefined, 'bold'); const labelWidth = pdf.getStringUnitWidth(labelText) * FONT_LABEL_CAPA / pdf.internal.scaleFactor;
                const combinedForCentering = labelText + " " + valueText; const textBlockWidthForCentering = pdf.getStringUnitWidth(combinedForCentering) * FONT_LABEL_CAPA / pdf.internal.scaleFactor;
                const startX = (pageWidthUnaltered - textBlockWidthForCentering) / 2;
                const combinedLineHeight = calculateTextHeight(labelText + " " + valueText, pageWidth, FONT_LABEL_CAPA, LINE_HEIGHT_FACTOR_COMPACT);
                if (currentY + combinedLineHeight + CAPA_INFO_LINE_SPACING + 2 > pageHeight - pageMargin) { addNewPageAndNumber(); }
                pdf.setFontSize(FONT_LABEL_CAPA).setFont(undefined, 'bold').setTextColor(COLOR_DARK_GREY[0], COLOR_DARK_GREY[1], COLOR_DARK_GREY[2]);
                pdf.text(labelText, startX, currentY, { lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT });
                pdf.setFontSize(FONT_LABEL_CAPA).setFont(undefined, 'normal').setTextColor(COLOR_BLACK[0], COLOR_BLACK[1], COLOR_BLACK[2]);
                pdf.text(valueText, startX + labelWidth + (pdf.getStringUnitWidth(" ") * FONT_LABEL_CAPA / pdf.internal.scaleFactor), currentY, { lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT });
                currentY += combinedLineHeight + CAPA_INFO_LINE_SPACING;
            }
            currentY += CAPA_AFTER_INFO_SPACING - CAPA_INFO_LINE_SPACING;
            currentY = addFormattedText("Este relatório apresenta os resultados da aplicação do sistema de indicadores sobre aprendizagem para resiliência socioecológica de comunidades rurais com a comunidade escolar da instituição de ensino participante.", pageMargin, currentY, { fontSize: FONT_TEXT_CAPA, spaceAfter: PARAGRAPH_SPACING, align: 'justify' });
            currentY = addFormattedText("Tópicos abordados no relatório:", pageMargin, currentY, { fontSize: FONT_TEXT_CAPA, spaceAfter: LIST_ITEM_SPACING });
            const topics = [ "1. Conceitos relevantes;", "2. Objetivos do sistema de indicadores;", "3. Sugestão para análise dos resultados e encaminhamentos;", "4. Resultados da aplicação dos indicadores na instituição participante, com descrição de cada dimensão e indicador;", "5. Referências." ];
            for (let i = 0; i < topics.length; i++) { const topic = String(topics[i] || ""); currentY = addFormattedText(topic, pageMargin + 5, currentY, { fontSize: FONT_TEXT_CAPA, maxWidth: pageWidth - 10, spaceAfter: LIST_ITEM_SPACING + (i === topics.length -1 ? PARAGRAPH_SPACING : 0), isListItem: true }); }
            const materialTextPart1 = "O material aqui disponível foi gerado em:";
            const materialLink = "https://resiliencia-socioecologica-ic.github.io/plataforma-indicadores-resiliencia/";
            const materialTextPart2 = "Produzido por Gabriel Mazetto(I) (bolsista PIBIC/CNPq/INPE), Maria Paula Pires de Oliveira(I), Denise Helena Lombardo Ferreira(II) e Minella Alves Martins(II), com apoio da Coordenação de Aperfeiçoamento de Pessoal de Nível Superior - Brasil (CAPES) – Código de Financiamento 001.";
            
            const indentAmount = pdf.getStringUnitWidth(PARAGRAPH_INDENT) * FONT_FOOTER_CAPA / pdf.internal.scaleFactor;


            // Adiciona a primeira parte do texto do material com indentação
            currentY = addFormattedText(materialTextPart1, pageMargin, currentY, { 
                fontSize: FONT_TEXT_CAPA, // Usando FONT_FOOTER_CAPA
                lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, 
                spaceAfter: 1, // Espaço mínimo antes do link
                isParagraph: true
            });
            
            // Adiciona o link na linha seguinte, alinhado com a indentação da primeira parte
            currentY = addFormattedText(materialLink, pageMargin, currentY, { 
                fontSize: FONT_TEXT_CAPA, 
                lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, 
                spaceAfter: 1, // Espaço mínimo antes da parte 2
            });

            // Adiciona a segunda parte do texto do material com indentação
            currentY = addFormattedText(materialTextPart2, pageMargin, currentY, { 
                fontSize: FONT_TEXT_CAPA, 
                lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, 
                spaceAfter: PARAGRAPH_SPACING -1,
                isParagraph: true

            });
            currentY = addFormattedText("O conteúdo textual deste relatório é proveniente de Oliveira (2023) e Oliveira, Valdanha Neto e Figueiredo (2024).", pageMargin, currentY, { fontSize: FONT_TEXT_CAPA, spaceAfter: SECTION_SPACING, isParagraph: true });
            if (currentPageNum === 1) {
                const nota1 = "(I) Pontifícia Universidade Católica de Campinas (PUC-Campinas)"; const nota2 = "(II) Instituto Nacional de Pesquisas Espaciais (INPE)";
                const espacoEntreNotasRodape = 1.5; const margemInferiorDesejadaParaBlocoRodape = 5;
                const alturaNota1 = calculateTextHeight(nota1, pageWidth, FONT_FOOTER_CAPA, LINE_HEIGHT_FACTOR_COMPACT); const alturaNota2 = calculateTextHeight(nota2, pageWidth, FONT_FOOTER_CAPA, LINE_HEIGHT_FACTOR_COMPACT);
                const alturaTotalBlocoNotas = alturaNota1 + espacoEntreNotasRodape + alturaNota2; let yPosicaoIdealInicioBlocoNotas = pageHeight - pageMargin - alturaTotalBlocoNotas - margemInferiorDesejadaParaBlocoRodape;
                if (currentY < yPosicaoIdealInicioBlocoNotas) { currentY = yPosicaoIdealInicioBlocoNotas; }
                currentY = addFormattedText(nota1, pageMargin, currentY, { fontSize: FONT_FOOTER_CAPA, color: COLOR_GREY, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, spaceAfter: espacoEntreNotasRodape });
                currentY = addFormattedText(nota2, pageMargin, currentY, { fontSize: FONT_FOOTER_CAPA, color: COLOR_GREY, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, spaceAfter: 0 });
            }
        } catch (coverError) { console.error("Erro ao gerar a capa do PDF:", coverError); currentY = addFormattedText("Erro ao gerar a capa.", pageMargin, currentY, { fontSize: FONT_TEXT_CAPA, fontStyle: 'bold', color: [255,0,0], align: 'center', spaceAfter: PARAGRAPH_SPACING });}


        // --- Introdução ---
        addNewPageAndNumber();
        let didAddIntroSection = true;
        console.log("Gerando Introdução - Conceitos Relevantes...");
        currentY = addFormattedText("CONCEITOS RELEVANTES¹", pageMargin, currentY, { fontSize: FONT_TITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, align:'center', spaceAfter: SECTION_SPACING });
        currentY = addFormattedText("Sistemas socioecológicos", pageMargin, currentY, { fontSize: FONT_SUBTITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, spaceAfter: LIST_ITEM_SPACING });
        currentY = addFormattedText("O conceito de sistema socioecológico tem sido utilizado para integrar processos e componentes socioeconômicos e biofísicos para compreender, por exemplo, contextos em que múltiplos grupos interagem, se fatores biofísicos afetam e são afetados por atividades sociais e econômicas e se aspectos de escalas locais, nacionais e internacionais, como políticas públicas, cultura e poder, influenciam sua dinâmica (BUSCHBACHER, 2014).", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Resiliência socioecológica", pageMargin, currentY, { fontSize: FONT_SUBTITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, spaceAfter: LIST_ITEM_SPACING });
        currentY = addFormattedText("Não existe um consenso referente ao significado de resiliência socioecológica, dada à variedade de interpretações referentes ao termo ‘resiliência'. Aqui, entende-se como a capacidade do sistema socioecológico de aprender, se reorganizar, mudar e se adaptar para responder a perturbações e lidar com incertezas, ao mesmo tempo em que mantém suas características de estrutura e de função e as relações fundamentais que caracterizam seu regime de existência.", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Indicadores", pageMargin, currentY, { fontSize: FONT_SUBTITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, spaceAfter: LIST_ITEM_SPACING });
        currentY = addFormattedText("Indicadores são ferramentas de medição e avaliação que contribuem no monitoramento de situações e processos identificando o que deve ser mudado ou potencializado até que se alcance o resultado pretendido (MINAYO, 2009). Embora indicadores, como quaisquer instrumentos, possam refletir a realidade de forma incompleta, eles auxiliam a visualizar um determinado contexto, diminuem incertezas e fornecem informações significativas que auxiliam processos de tomada de decisão (HANAI; ESPÍNDOLA, 2012; MINAYO, 2009).", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING * 2, isParagraph: true });
        const footnoteText1_intro = "¹ Para aprofundamento sobre os conceitos, consultar Oliveira (2023).";
        const footnoteHeight1_intro = calculateTextHeight(footnoteText1_intro, pageWidth, FONT_RODAPE_ESPECIFICO_INTRO, LINE_HEIGHT_FACTOR_COMPACT);
        const footnoteYPos1_intro = pageHeight - pageMargin - footnoteHeight1_intro - 3;
        if (currentY < footnoteYPos1_intro) { addFormattedText(footnoteText1_intro, pageMargin, footnoteYPos1_intro, {fontSize: FONT_RODAPE_ESPECIFICO_INTRO, color: COLOR_GREY, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, advanceY: false}); } else { currentY = addFormattedText(footnoteText1_intro, pageMargin, currentY, {fontSize: FONT_RODAPE_ESPECIFICO_INTRO, color: COLOR_GREY, lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT, spaceAfter: PARAGRAPH_SPACING}); }
        addNewPageAndNumber();
        console.log("Gerando Introdução - Objetivos e Sugestão...");
        currentY = addFormattedText("OBJETIVOS DO SISTEMA DE INDICADORES", pageMargin, currentY, { fontSize: FONT_TITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, align:'center', spaceAfter: SECTION_SPACING });
        currentY = addFormattedText("Estes indicadores possibilitam conhecer a percepção da comunidade escolar em relação ao papel das práticas adotadas na instituição de ensino para o desenvolvimento de conhecimentos e habilidades que ajudem a fortalecer a resiliência socioecológica de comunidades rurais. Dessa maneira, os indicadores podem ser utilizados para visualizar possíveis efeitos na vida dos estudantes e em suas comunidades, assim como identificar pontos fortes e frágeis e criar estratégias de melhorias.", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Desse modo, este sistema de indicadores tem como objetivos:", pageMargin, currentY, { spaceAfter: LIST_ITEM_SPACING, isParagraph: false });
        const objetivos = [ "• Facilitar a coleta sistemática de dados para avaliar as práticas da escola;", "• Auxiliar a compreensão e o acompanhamento dos resultados;", "• Fornecer subsídios para tomada de decisão e amparar a gestão escolar." ];
        for (const obj of objetivos) { currentY = addFormattedText(obj, pageMargin + 5, currentY, { maxWidth: pageWidth - 5, spaceAfter: LIST_ITEM_SPACING, isListItem: true }); }
        currentY += PARAGRAPH_SPACING;
        currentY = addFormattedText("Assim, os indicadores não se propõem a aferir concretamente mudanças comportamentais, mas a auxiliar a gestão escolar com um levantamento de dados que mapeiam como as práticas da escola ajudam na promoção da aprendizagem para resiliência socioecológica e o ponto de vista da comunidade escolar quanto aos resultados dessas ações.", pageMargin, currentY, { spaceAfter: SECTION_SPACING + PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("SUGESTÃO PARA ANÁLISE DOS RESULTADOS E ENCAMINHAMENTOS", pageMargin, currentY, { fontSize: FONT_TITLE_INTRO, fontStyle: 'bold', color: COLOR_DARK_GREY, align:'center', spaceAfter: SECTION_SPACING });
        currentY = addFormattedText("A compreensão das percepções pode ser facilitada ao escutar o que um grupo de pessoas avalia sobre o resultado dos indicadores. Aqui, esta avaliação em grupo pode ser realizada por meio da análise conjunta dos resultados dos indicadores com membros da comunidade escolar, de forma a validar e complementar os resultados e aprofundar o diagnóstico, conferindo maior consistência e confiabilidade às conclusões a respeito dos dados coletados. Para isso, sugerimos o seguinte procedimento como estratégia de análise e utilização dos dados coletados com a aplicação dos indicadores:", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Oficina de análise conjunta dos indicadores", pageMargin, currentY, { fontStyle: 'bold', spaceAfter: LIST_ITEM_SPACING });
        let sugestoes = [ "1. Juntar diferentes membros da comunidade escolar (como estudantes, equipe escolar e, se possível, familiares e ex-estudantes) e organizá-los em grupos;", "2. Cada grupo fica responsável por analisar o conjunto de gráficos de um indicador, conjunto de indicadores, ou de uma dimensão, a depender do número de grupos e tempo disponível.\nÉ importante que, em cada grupo, alguém faça o registro da memória dos principais pontos discutidos. Algumas perguntas que podem ser utilizadas como geradoras da análise em grupo:", "   • O que mais chama atenção?", "   • O que os quatro grupos participantes da aplicação dos indicadores (estudantes, ex-estudantes, familiares e equipe escolar) têm de pontos mais convergentes e discrepantes?", "   • Se houve muita discrepância, quais podem ser os motivos?", "   • Onde os resultados estão com notas mais baixas (por exemplo, mais respostas de “pouco” ou “nada”), quais podem ser os motivos? O que pode ser feito para que tenhamos mais respostas como “bastante”?", "   • Em relação ao que estamos indo muito bem, quais podem ser os motivos? Podemos fazer algo para potencializar isso?", "3. Os grupos se reúnem e compartilham, de forma breve, os resultados dos indicadores que analisaram e os principais pontos discutidos no grupo, assim como suas sugestões para melhoria contínua dos resultados;", "4. Ao final, podem fazer um levantamento das principais sugestões apontadas e quais são prioridade." ];
        const firstSuggestion = sugestoes[0]; const firstSuggestionHeight = calculateTextHeight(firstSuggestion, pageWidth, FONT_BODY_INTRO, LINE_HEIGHT_FACTOR_NORMAL);
        if (currentY + firstSuggestionHeight + LIST_ITEM_SPACING > pageHeight - pageMargin) { addNewPageAndNumber(); }
        for (const sug of sugestoes) { const indent = sug.trim().startsWith("•") ? 10 : (sug.match(/^\d\./) ? 5 : 0); const isMultiPart = sug.includes("\n") || sug.trim().startsWith("• Em"); currentY = addFormattedText(sug, pageMargin + indent, currentY, { maxWidth: pageWidth - indent, spaceAfter: isMultiPart ? PARAGRAPH_SPACING : LIST_ITEM_SPACING, isListItem: true }); }
        currentY += SECTION_SPACING;
        const elaboracaoTitle = "Elaboração de plano de ação"; const elaboracaoFirstPara = "A partir do que foi discutido e registrado, é interessante que um grupo de pessoas sistematize os pontos principais, os aprendizados, as sugestões de melhoria e, a partir daí, elabore um breve plano de ação para os meses seguintes. Por exemplo:";
        const elaboracaoTitleHeight = calculateTextHeight(elaboracaoTitle, pageWidth, FONT_BODY_INTRO, LINE_HEIGHT_FACTOR_NORMAL);
        const firstParaLines = pdf.splitTextToSize(PARAGRAPH_INDENT + elaboracaoFirstPara, pageWidth); const firstParaMinHeight = calculateTextHeight(firstParaLines.slice(0, 2).join('\n'), pageWidth, FONT_BODY_INTRO, LINE_HEIGHT_FACTOR_NORMAL);
        if (currentY + elaboracaoTitleHeight + PARAGRAPH_SPACING + firstParaMinHeight + 5 > pageHeight - pageMargin) { addNewPageAndNumber(); }
        currentY = addFormattedText(elaboracaoTitle, pageMargin, currentY, { fontStyle: 'bold', spaceAfter: PARAGRAPH_SPACING });
        currentY = addFormattedText(elaboracaoFirstPara, pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        const tableHeadersCombined = ["Ponto a ser melhorado", "O que fazer", "Responsáveis", "Prazo"];
        const tableDataCombined = [ ["XXXXX", "aaaaa", "ccccc", "dd/mm/aa"], ["yyyyy", "bbbb", "ddddd", "dd/mm/aa"] ];
        const tableColWidthsCombined = [pageWidth * 0.30, pageWidth * 0.30, pageWidth * 0.20, pageWidth * 0.20];
        const cellPadding = 2; const headerCellHeight = 10; const dataCellMinHeight = 10; const tableFontSize = FONT_BODY_INTRO - 1;
        let tableY = currentY;
        const drawTableHeader = (currentTableY) => { let currentX = pageMargin; pdf.setFontSize(tableFontSize).setFont(undefined, 'bold'); for (let i = 0; i < tableHeadersCombined.length; i++) { pdf.rect(currentX, currentTableY, tableColWidthsCombined[i], headerCellHeight, 'S'); const textLines = pdf.splitTextToSize(tableHeadersCombined[i], tableColWidthsCombined[i] - (2 * cellPadding)); const textActualHeight = calculateTextHeight(textLines.join('\n'), tableColWidthsCombined[i] - (2 * cellPadding), tableFontSize, LINE_HEIGHT_FACTOR_COMPACT); const textYOffset = (headerCellHeight - textActualHeight) / 2; pdf.text(textLines, currentX + cellPadding, currentTableY + textYOffset + (tableFontSize * 0.352778 * 0.7), { maxWidth: tableColWidthsCombined[i] - (2 * cellPadding), align: 'left', lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT }); currentX += tableColWidthsCombined[i]; } return currentTableY + headerCellHeight; };
        if (tableY + headerCellHeight + 5 > pageHeight - pageMargin) { addNewPageAndNumber(); tableY = currentY; }
        tableY = drawTableHeader(tableY);
        pdf.setFontSize(tableFontSize).setFont(undefined, 'normal');
        for (const row of tableDataCombined) { let maxRowHeight = dataCellMinHeight; for (let i = 0; i < row.length; i++) { const cellText = String(row[i]); const lines = pdf.splitTextToSize(cellText, tableColWidthsCombined[i] - (2 * cellPadding)); const h = calculateTextHeight(lines.join('\n'), tableColWidthsCombined[i] - (2 * cellPadding), tableFontSize, LINE_HEIGHT_FACTOR_COMPACT) + (2 * cellPadding); if (h > maxRowHeight) maxRowHeight = h; } maxRowHeight = Math.max(maxRowHeight, dataCellMinHeight); if (tableY + maxRowHeight + 5 > pageHeight - pageMargin) { addNewPageAndNumber(); tableY = currentY; tableY = drawTableHeader(tableY); pdf.setFontSize(tableFontSize).setFont(undefined, 'normal'); } let currentX = pageMargin; for (let i = 0; i < row.length; i++) { pdf.rect(currentX, tableY, tableColWidthsCombined[i], maxRowHeight, 'S'); const lines = pdf.splitTextToSize(String(row[i]), tableColWidthsCombined[i] - (2 * cellPadding)); const textActualHeight = calculateTextHeight(lines.join('\n'), tableColWidthsCombined[i] - (2 * cellPadding), tableFontSize, LINE_HEIGHT_FACTOR_COMPACT); const textYOffset = (maxRowHeight - textActualHeight) / 2; pdf.text(lines, currentX + cellPadding, tableY + textYOffset + (tableFontSize * 0.352778 * 0.7), { maxWidth: tableColWidthsCombined[i] - (2 * cellPadding), align: 'left', lineHeightFactor: LINE_HEIGHT_FACTOR_COMPACT }); currentX += tableColWidthsCombined[i]; } tableY += maxRowHeight; }
        currentY = tableY + PARAGRAPH_SPACING;
        currentY = addFormattedText("Se possível, pode ser interessante que este grupo tenha outros membros da comunidade escolar, além da equipe pedagógica.", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Por fim, a aplicação periódica dos indicadores é importante para acompanhamento dos resultados ao longo dos anos e eventual atualização do plano de ação para suprir lacunas e potencializar pontos fortes.", pageMargin, currentY, { spaceAfter: PARAGRAPH_SPACING, isParagraph: true });
        currentY = addFormattedText("Para ajudar no aprimoramento contínuo deste sistema de indicadores, faça uma avaliação clicando aqui.", pageMargin, currentY, { spaceAfter: LIST_ITEM_SPACING, isParagraph: false });
        //const contatoItems = [ "- Dúvidas sobre os indicadores, procedimento de análise, ou outras, se houver;", "- Como foi a experiência, por exemplo, como avaliam a utilidade desse sistema de indicadores, a facilidade de aplicação e análise, o uso da plataforma para geração de gráficos e relatório, ou outros pontos que considerarem pertinentes;", "- Sugestões para continuarmos melhorando e para que os indicadores e a plataforma sejam adequados para a utilização nas escolas." ];
        //for (const item of contatoItems) { currentY = addFormattedText(item, pageMargin + 5, currentY, { maxWidth: pageWidth - 5, spaceAfter: LIST_ITEM_SPACING, isListItem: true }); }


        // ***** INÍCIO: SEÇÃO RESULTADO DA APLICAÇÃO E PERFIL DOS PARTICIPANTES *****
        // ... (COMO ANTES)
        if (currentY > pageMargin + 5) {
            addNewPageAndNumber();
        }
        console.log("Adicionando seção 'Resultado da Aplicação dos Indicadores'");

        const resultadoTitle = "RESULTADO DA APLICAÇÃO DOS INDICADORES";
        const resultadoParagraph = "A seguir são apresentados os resultados da aplicação dos indicadores na instituição participante, com descrição de cada dimensão e indicador - conteúdo textual proveniente de Oliveira, Valdanha Neto, Figueiredo (2024).";

        currentY = addFormattedText(resultadoTitle, pageMargin, currentY, {
            fontSize: FONT_TITLE_INTRO,
            fontStyle: 'bold',
            color: COLOR_DARK_GREY,
            align: 'center',
            spaceAfter: SECTION_SPACING
        });
        currentY = addFormattedText(resultadoParagraph, pageMargin, currentY, {
            fontSize: FONT_BODY_INTRO,
            spaceAfter: SECTION_SPACING,
            isParagraph: true
        });

        let didAddProfileSection = false;
        if (profileSquaresAll.length > 0) {
            didAddProfileSection = true;

            const profileDataByGroup = {};
            profileSquaresAll.forEach(square => {
                const dataId = square.dataset.id;
                const dataItem = window.visualizacaoData?.[dataId];
                if (dataItem?.groupName && dataItem.originalId && dataItem.originalId.startsWith('0.')) {
                    const groupName = dataItem.groupName;
                    if (!profileDataByGroup[groupName]) profileDataByGroup[groupName] = {};
                    const profileTypeIndex = parseInt(dataItem.originalId.split('.')[1], 10);
                    if (profileTypeIndex % 2 !== 0) {
                         profileDataByGroup[groupName].anoSquare = square;
                    } else {
                         profileDataByGroup[groupName].localidadeSquare = square;
                    }
                }
            });

            const desiredGroupOrder = ["Estudantes", "Ex-estudantes", "Familiares", "Equipe escolar"];
            const sortedGroups = desiredGroupOrder.filter(groupName => profileDataByGroup[groupName])
                                .concat(
                                    Object.keys(profileDataByGroup)
                                        .filter(groupName => !desiredGroupOrder.includes(groupName))
                                        .sort()
                                );

            const chartGap = 8;
            const availableWidthForTwoChartsInRow = pageWidth - chartGap;
            const chartWidth = availableWidthForTwoChartsInRow / 2;
            const leftChartX = pageMargin;
            const rightChartX = pageMargin + chartWidth + chartGap;
            const groupTitleFontSizeProfile = FONT_SUBTITLE_INTRO;
            const groupTitleMarginBottomProfile = LIST_ITEM_SPACING;
            const estimatedProfileChartHeight = chartWidth * 1.0;
            const groupBottomMargin = SECTION_SPACING / 2;

            let groupsProcessedOnCurrentPage = 0;

            const perfilTitleText = "PERFIL DOS PARTICIPANTES";
            const perfilTitleHeight = calculateTextHeight(perfilTitleText, pageWidth, FONT_TITLE_INTRO, LINE_HEIGHT_FACTOR_COMPACT);
            let firstGroupEstHeight = 0;
            if(sortedGroups.length > 0){
                const firstGroupName = sortedGroups[0];
                firstGroupEstHeight = calculateTextHeight(firstGroupName, pageWidth, groupTitleFontSizeProfile, LINE_HEIGHT_FACTOR_COMPACT) + groupTitleMarginBottomProfile + estimatedProfileChartHeight + groupBottomMargin;
            }
            if (currentY + perfilTitleHeight + SECTION_SPACING + firstGroupEstHeight > pageHeight - pageMargin && currentY !== pageMargin) {
                addNewPageAndNumber();
            }
            currentY = addFormattedText(perfilTitleText, pageMargin, currentY, {
                fontSize: FONT_TITLE_INTRO,
                fontStyle: 'bold',
                color: COLOR_DARK_GREY,
                align: 'center',
                spaceAfter: SECTION_SPACING
            });

            for (let i = 0; i < sortedGroups.length; i++) {
                const groupName = sortedGroups[i];
                const groupData = profileDataByGroup[groupName];
                const anoSquare = groupData.anoSquare;
                const localidadeSquare = groupData.localidadeSquare;

                if (!anoSquare && !localidadeSquare && !(anoSquare || localidadeSquare)) continue;

                const groupTitleHeight = calculateTextHeight(groupName, pageWidth, groupTitleFontSizeProfile, LINE_HEIGHT_FACTOR_COMPACT) + groupTitleMarginBottomProfile;
                const neededHeightForThisGroupItself = groupTitleHeight + estimatedProfileChartHeight + groupBottomMargin;

                if (groupsProcessedOnCurrentPage >= 2 || (currentY + neededHeightForThisGroupItself > pageHeight - pageMargin && currentY !== pageMargin) ) {
                    addNewPageAndNumber();
                    groupsProcessedOnCurrentPage = 0;
                }

                currentY = addFormattedText(groupName, pageMargin, currentY, {
                    fontSize: groupTitleFontSizeProfile,
                    fontStyle: 'bold',
                    color: COLOR_BLACK,
                    align: 'left',
                    spaceAfter: groupTitleMarginBottomProfile
                });

                let yPosForChartPair = currentY;
                let chartPairMaxY = yPosForChartPair;

                const addProfileImage = async (squareElement, xPos) => {
                    if (!squareElement) return;
                    prepareForCapture(squareElement);
                    try {
                        const canvas = await html2canvas(squareElement, { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                        const imgData = canvas.toDataURL('image/jpeg', 0.85);
                        const imgProps = pdf.getImageProperties(imgData);
                        const imgRatio = imgProps.height / imgProps.width;
                        const imgHeightPDF = chartWidth * imgRatio;
                        pdf.addImage(imgData, 'JPEG', xPos, yPosForChartPair, chartWidth, imgHeightPDF);
                        chartPairMaxY = Math.max(chartPairMaxY, yPosForChartPair + imgHeightPDF);
                    } catch (err) {
                        console.error(`Erro ao adicionar imagem de perfil para ${squareElement.dataset.id}:`, err);
                    } finally {
                        cleanupAfterCapture(squareElement);
                    }
                };

                if (anoSquare) await addProfileImage(anoSquare, leftChartX);
                if (localidadeSquare) await addProfileImage(localidadeSquare, rightChartX);

                currentY = chartPairMaxY + groupBottomMargin;
                groupsProcessedOnCurrentPage++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }


        // --- Adiciona Conteúdo Regular (Gráficos de Dimensão/Indicador) ---
        let _currentDimensionNumberWritten = '';
        let _currentIndicatorIdWritten = '';

        const addRegularContentTitlesAndDescriptions = (itemData, isNewPageForImage = false) => {
            const itemDimNumber = String(itemData.dimensionNumber);
            const itemDimName = itemData.dimensionName || `Dimensão ${itemDimNumber}`;
            const itemDimDescText = dimensionDescriptions[itemDimNumber];

            const itemIndNumber = String(itemData.indicatorNumber);
            const itemIndFullId = itemIndNumber ? `${itemDimNumber}.${itemIndNumber}` : null;
            const itemIndName = itemData.indicatorName || (itemIndNumber ? `Indicador ${itemIndFullId}` : "Indicador Desconhecido");
            const itemIndDescText = itemIndFullId ? indicatorDescriptions[itemIndFullId] : null;

            const titleFontSizeRegular = FONT_TITLE_INTRO;
            const subtitleFontSizeRegular = FONT_SUBTITLE_INTRO;
            const descFontSizeRegular = FONT_BODY_INTRO;
            const titleMarginBottomRegular = LIST_ITEM_SPACING;
            const descMarginBottomRegular = PARAGRAPH_SPACING;

            let dimChanged = (itemDimNumber && itemDimNumber !== 'none' && _currentDimensionNumberWritten !== itemDimNumber);
            let indChanged = (itemIndFullId && (_currentIndicatorIdWritten !== itemIndFullId || dimChanged)); // Indicador também muda se a dimensão mudou

            if (isNewPageForImage) { // Se estamos no topo de uma nova página FORÇADA pela imagem anterior
                dimChanged = true; // Força a reescrita da dimensão atual (e por consequência do indicador)
                indChanged = true;
                _currentDimensionNumberWritten = ''; // Reseta para garantir que a comparação funcione
                _currentIndicatorIdWritten = '';   // Reseta para garantir que a comparação funcione
            }


            if (dimChanged) {
                const dimTitleHeight = calculateTextHeight(itemDimName, pageWidth, titleFontSizeRegular, LINE_HEIGHT_FACTOR_COMPACT);
                let dimDescHeight = itemDimDescText ? calculateTextHeight(PARAGRAPH_INDENT + itemDimDescText, pageWidth, descFontSizeRegular, LINE_HEIGHT_FACTOR_NORMAL) : 0;
                
                if (currentY + dimTitleHeight + titleMarginBottomRegular + dimDescHeight + (itemDimDescText ? descMarginBottomRegular : 0) + 2 > pageHeight - pageMargin && currentY !== pageMargin) {
                    addNewPageAndNumber();
                }
                currentY = addFormattedText(itemDimName, pageMargin, currentY, { fontSize: titleFontSizeRegular, fontStyle:'bold', color: COLOR_DARK_GREY, align: 'center', spaceAfter: titleMarginBottomRegular });
                if (itemDimDescText) {
                    currentY = addFormattedText(itemDimDescText, pageMargin, currentY, { fontSize: descFontSizeRegular, spaceAfter: descMarginBottomRegular, isParagraph: true });
                }
                _currentDimensionNumberWritten = itemDimNumber;
                _currentIndicatorIdWritten = ''; // Resetar indicador quando a dimensão muda
            }

            // Se a dimensão mudou, o indicador também precisa ser reescrito (se existir)
            // Ou se o próprio indicador mudou dentro da mesma dimensão.
            if (indChanged && itemIndFullId) {
                const indTitleHeight = calculateTextHeight(itemIndName, pageWidth, subtitleFontSizeRegular, LINE_HEIGHT_FACTOR_COMPACT);
                let indDescHeight = itemIndDescText ? calculateTextHeight(PARAGRAPH_INDENT + itemIndDescText, pageWidth, descFontSizeRegular, LINE_HEIGHT_FACTOR_NORMAL) : 0;

                if (currentY + indTitleHeight + titleMarginBottomRegular + indDescHeight + (itemIndDescText ? descMarginBottomRegular : 0) + 2 > pageHeight - pageMargin && currentY !== pageMargin) {
                    addNewPageAndNumber();
                    // Se a página quebrou para o indicador, precisamos reescrever a dimensão atual ANTES do indicador
                    if (_currentDimensionNumberWritten === itemDimNumber) { // Só reescreve a dimensão se ela for a correta
                         _currentDimensionNumberWritten = ''; // Força re-escrita da dimensão
                         addRegularContentTitlesAndDescriptions(itemData); // Chama recursivamente, a dimensão e este indicador serão escritos
                         return; // Sai para evitar duplicidade do indicador
                    }
                }
                currentY = addFormattedText(itemIndName, pageMargin, currentY, { fontSize: subtitleFontSizeRegular, fontStyle:'bold', color: COLOR_DARK_GREY, align: 'left', spaceAfter: titleMarginBottomRegular });
                 if (itemIndDescText) {
                    currentY = addFormattedText(itemIndDescText, pageMargin, currentY, { fontSize: descFontSizeRegular, spaceAfter: descMarginBottomRegular, isParagraph: true });
                }
                _currentIndicatorIdWritten = itemIndFullId;
            }
        };
        
        const estimatedImageHeight = (pageHeight - (pageMargin *2)) * 0.55; // Ajuste este valor conforme necessário

        if (regularSquares.length > 0) {
            console.log(`Adicionando ${regularSquares.length} visualizações regulares...`);
            if ( (didAddProfileSection || didAddIntroSection) && currentY > pageMargin + 5) {
                 addNewPageAndNumber();
            } else if (currentPageNum === 1 && currentY > pageMargin + 5 && !didAddProfileSection && !didAddIntroSection) {
                addNewPageAndNumber();
            }
            _currentDimensionNumberWritten = '';
            _currentIndicatorIdWritten = '';

            try {
                for (let i = 0; i < regularSquares.length; i++) {
                    const square = regularSquares[i];
                    const dataId = square.dataset.id;
                    const itemData = window.visualizacaoData?.[dataId];
                    if (!itemData) { console.warn("ItemData não encontrado para o square com dataId:", dataId); continue; }
                    if (dimensionNumber && String(itemData.dimensionNumber) !== String(dimensionNumber)) { continue; }

                    // Adiciona Títulos e Descrições ANTES de qualquer imagem ou quebra de página para imagem
                    addRegularContentTitlesAndDescriptions(itemData);

                    const spaceNeededForImage = estimatedImageHeight;
                    if (currentY + spaceNeededForImage + 5 > pageHeight - pageMargin && currentY !== pageMargin) {
                        addNewPageAndNumber();
                        // Após a quebra de página para a IMAGEM, reescreve os títulos/descrições do item ATUAL.
                        addRegularContentTitlesAndDescriptions(itemData, true); // true para forçar reescrita na nova página
                    }

                    prepareForCapture(square);
                    let imgHeightPDF = 0; let imgWidthPDF = pageWidth;
                    try {
                        const canvas = await html2canvas(square, { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                        const imgData = canvas.toDataURL('image/jpeg', 0.75);
                        const imgProps = pdf.getImageProperties(imgData);
                        const imgRatio = imgProps.height / imgProps.width;
                        imgHeightPDF = imgWidthPDF * imgRatio;

                        const spaceLeftOnPage = pageHeight - pageMargin - currentY;
                        if (imgHeightPDF > spaceLeftOnPage -5) {
                            imgHeightPDF = Math.max(10, spaceLeftOnPage - 5);
                            imgWidthPDF = imgHeightPDF / imgRatio;
                            imgWidthPDF = Math.min(pageWidth, imgWidthPDF);
                        }
                        const imageX = (pageWidthUnaltered - imgWidthPDF) / 2;
                        pdf.addImage(imgData, 'JPEG', imageX, currentY, imgWidthPDF, imgHeightPDF);
                        currentY += imgHeightPDF; // Atualiza currentY após adicionar a imagem
                    } catch (err) {
                        console.error(`Erro addImage Regular ${dataId}:`, err);
                        if(currentY + 20 > pageHeight - pageMargin && currentY > pageMargin) addNewPageAndNumber();
                        currentY = addFormattedText(`Erro ao renderizar gráfico ${dataId}`, pageMargin, currentY, {fontSize:10, color:[255,0,0], spaceAfter: PARAGRAPH_SPACING});
                    } finally {
                        cleanupAfterCapture(square);
                    }

                    // Quebra de página APÓS CADA GRÁFICO (exceto o último do documento inteiro)
                    if (i < regularSquares.length - 1) {
                        addNewPageAndNumber();
                        // As variáveis _currentDimensionNumberWritten e _currentIndicatorIdWritten
                        // manterão seu estado para a próxima iteração,
                        // permitindo que addRegularContentTitlesAndDescriptions decida se reescreve.
                    } else {
                        // Após o último gráfico, adiciona um pequeno espaço antes de potencialmente ir para Referências
                        currentY += PARAGRAPH_SPACING;
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (errorReg) { console.error("Erro loop regular PDF:", errorReg); alert("Erro ao adicionar gráficos regulares ao PDF.")}
        }


        // --- Seção de Referências ---
        if (currentY > pageMargin + 5 || regularSquares.length > 0 || profileSquaresAll.length > 0 || didAddIntroSection) {
            addNewPageAndNumber();
        }
        console.log("Adicionando seção de Referências...");
        currentY = addFormattedText("REFERÊNCIAS", pageMargin, currentY, {
            fontSize: FONT_REFERENCE_TITLE,
            fontStyle: 'bold',
            color: COLOR_DARK_GREY,
            align: 'center',
            spaceAfter: SECTION_SPACING
        });

        const references = [
            "ATHAYDE, S.; BERNASCONI, P.; BARTELS, W.; SELUCHINESK, R. D. R.; BUSCHBACHER, R. Avaliação da resiliência socioecológica como ferramenta para a gestão da fronteira amazônica: experiências e reflexões. Sustentabilidade em Debate. Brasília, v. 7, n. 2, p. 14-19, mai/ago 2016. Disponível em: https://uftcd.org/wp-content/uploads/2017/10/ACLI_Resilience_Book.pdf. Acesso em: 12 mai. 2025.",
            "BERGAMINI, N.; BLASIAK, R.; EYZAGUIRRE, P.; ICHIKAWA, K.; MIJATOVIC, D.; NAKAO, F.; SUBRAMANIAN, S. M. UNU-IAS Policy Report: Indicators of Resilience in Socio-ecological Production Landscapes (SEPLs). Yokohama: United Nations University Institute of Advanced Studies (UNU-IAS). 2013.",
            "BUSCHBACHER, R. A teoria da resiliência e os sistemas socioecológicos: como se preparar para um futuro imprevisível? Boletim Regional, Urbano e Ambiental, n. 9, p. 11-14, jan.-jun. 2014. Disponível em: https://repositorio.ipea.gov.br/bitstream/11058/5561/1/BRU_n09_teoria.pdf. Acesso em: 12 mai. 2025.",
            "BURGOS, A.; MERTENS, F. Redes de governança colaborativa: explorando o sucesso da governança na conservação em larga escala. Ambiente & Sociedade, v. 25, 2022.",
            "FOLKE, C.; HAHN, T.; OLSSON, P.; NORBERG, J. Adaptive governance of social–ecological systems. Annual Review of Environment and Resources, v. 30, p. 441–73, 2005.",
            "HANAI, F. Y.; ESPÍNDOLA, E. L. G. Indicadores de sustentabilidade para desenvolvimento turístico. In: PHILIPPI JR., A.; MALHEIROS, T. F. (ed.) Indicadores de sustentabilidade e gestão ambiental. Barueri: Manole, 2012. p. 295-326.",
            "KRASNY, M. E.; LUNDHOLM, C.; PLUMMER, R. Introduction. In: KRASNY, M. E.; LUNDHOLM, C.; PLUMMER, R. Resilience in social-ecological systems: the role of learning and education. New York: Routledge, 2011. p. 1-12.",
            "KRASNY, M. E.; ROTH, W. Environmental education for social-ecological system resilience: a perspective from activity theory. In. KRASNY, M. E.; LUNDHOLM, C.; PLUMMER, R. Resilience in social-ecological systems: the role of learning and education. New York: Routledge, 2011.",
            "MENDONZA, M. M. The case of youth community-based organisations in informal settle-ments of freetown, Sierra Leone. Dissertação (MSc Environment and Sustainable Development) – University College London, Londres, 2016.",
            "MERÇON, J. Construyendo nuevos posibles a partir de la articulación entre resiliencia, aprendizaje social y sistema escolar. Educação, v. 39, n. 1, p. 105-112, jan./abr. 2016.",
            "MINAYO, M. C. S. Construção de indicadores qualitativos para avaliação de mudanças. Revista Brasileira de Educação Médica, v. 33, suppl. 1, p. 83-91, 2009. Disponível em: https://www.scielo.br/j/rbem/a/36mvLQPqTjRTp8kLXbs3b5Q/?lang=pt. Acesso em: 12 mai. 2025.",
            "OLIVEIRA, M. P. P. Aprendizagem para resiliência socioecológica de comunidades rurais: sistema de indicadores a partir de uma escola do campo. 2023. Tese (Doutorado em Ciências Ambientais) – Universidade Federal de São Carlos, São Carlos, 2022. Disponível em: https://repositorio.ufscar.br/handle/20.500.14289/17284. Acesso em: 11 mai. 2025.",
            "OLIVEIRA, M. P. P., VALDANHA NETO, D., FIGUEIREDO, R. A. (Re)construção da resiliência socioecológica a partir da educação escolar: uma proposta de sistema de indicadores. Ambiente & Sociedade. São Paulo. Vol. 27. 2024. Disponível em: https://www.scielo.br/j/asoc/a/h6YyhQdthyKHrmSXL96mQKS/?lang=pt. Acesso em: 11 mai. 2025.",
            "PANPAKDEE, C.; LIMNIRANKUL, B. Indicators for assessing social-ecological resilience: A case study of organic rice production in northern Thailand. Kasetsart Journal of Social Sciences, v.39, p. 414-421, 2018.",
            "PELLING, M.; SHARPE, J.; PEARSON, L.; ABELING, T.; SWARTLING, Å. G.; FORRESTER, J.; DEEMING, H. Social Learning and Resilience Building in the emBRACE framework. Relatório. CRED, Louvaina, Bruxelas. 2015.",
            "UNU-IAS; BIOVERSITY INTERNATIONAL; IGES; UNDP. Toolkit for the Indicators of Resilience in Socio-ecological Production Landscapes and Seascapes (SEPLS). 2014."
        ];

        for (const ref of references) {
            currentY = addFormattedText(ref, pageMargin, currentY, {
                fontSize: FONT_REFERENCE_ITEM,
                spaceAfter: LIST_ITEM_SPACING, // Usando LIST_ITEM_SPACING
                isReferenceItem: true
            });
        }


        // --- Finaliza e Salva PDF ---
        try {
            addPageNumberToCurrentPage();
            const filename = dimensionNumber ? `indicadores_relatorio_D${dimensionNumber}.pdf` : `indicadores_relatorio_completo.pdf`;
            pdf.save(filename);
            console.log(`PDF ${filename} gerado.`);
            alert("Geração do PDF concluída.");
        } catch (saveError) {
            console.error("Erro ao salvar PDF:", saveError);
            alert("Erro ao salvar o arquivo PDF.")
        } finally {
            if (loadingOverlay && loadingOverlay.parentNode) {
                document.body.removeChild(loadingOverlay);
            }
        }
    }; // Fim downloadPdf


    // --- Inicialização ---
    const init = () => {
        sidebar = document.getElementById('download-sidebar');
        btnPdfAll = document.getElementById('download-pdf-all-btn');
        btnPdfDim = document.getElementById('download-pdf-dim-btn');
        inputPdfDim = document.getElementById('download-dimension-input');
        btnPng = document.getElementById('download-png-btn');
        btnJson = document.getElementById('download-json-btn');

        if (!sidebar || !btnJson || !btnPng || !btnPdfAll || !btnPdfDim || !inputPdfDim) {
            console.error("DownloadHandler: Elementos da UI para download não foram encontrados no DOM.");
            return;
        }
        console.log("DownloadHandler: Inicializando listeners para os botões de download...");
        btnJson.addEventListener('click', downloadCompleteJson);
        btnPng.addEventListener('click', downloadPngs);
        btnPdfAll.addEventListener('click', () => downloadPdf(null));
        btnPdfDim.addEventListener('click', () => {
            const dimensionValue = inputPdfDim?.value;
            const dimensionNum = parseInt(dimensionValue, 10);
            if (dimensionValue && !isNaN(dimensionNum) && dimensionNum > 0) {
                downloadPdf(dimensionNum);
            } else {
                alert("Por favor, digite um número de dimensão válido.");
                inputPdfDim?.focus();
            }
        });
    };

    return { init };

})();