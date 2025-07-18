/*
 * Script: help-tooltips.js
 *
 * Objetivo: Gerenciar a exibição de balões de ajuda (tooltips) de forma dinâmica e centralizada na interface.
 *
 * Funcionamento:
 * 1. O script contém um objeto `helpTexts` que mapeia chaves de ajuda (ex: 'obterForms') para seus respectivos textos descritivos.
 * 2. Ele monitora eventos de 'mouseover' em toda a página, buscando por elementos HTML que tenham a classe '.help-icon'.
 * 3. Ao encontrar um, ele lê o atributo 'data-help-key' do ícone para identificar qual texto de ajuda deve ser exibido.
 * 4. Um elemento <div> (o tooltip) é criado dinamicamente, posicionado de forma inteligente próximo ao ícone para não sair da tela.
 * 5. O tooltip é removido automaticamente quando o mouse sai do ícone ('mouseout') ou quando o usuário clica em qualquer lugar da página, garantindo uma experiência limpa.
 */

(function() { 

    const helpTexts = {
        obterForms:"Modelos dos formulários (Microsoft Forms). Para obter sua própria cópia editável e aplicar o questionário: 1. Clique no link do grupo desejado. 2. Na página que abrir, clique em 'Duplicar este formulário'. 3. Entre com sua conta Microsoft. Não tem? Clique em 'Crie uma!' (gratuito) e siga os passos de criação de conta. 4. A cópia estará salva em seus Forms.",
        obterTabelaConsulta: "Clique em 'Tabela de Consulta Base.' para baixar um modelo (.xlsx) da 'Tabela de Consulta' ou para poder utilizar a tabela base.",
        arquivosSeparados: "Use esta opção se você possui a 'Tabela de Consulta' e os arquivos de respostas de cada grupo (Estudantes, Familiares, etc.) em arquivos Excel (.xlsx) ou CSV (.csv) separados. Pelo menos a Tabela de Consulta e um arquivo de respostas são necessários.",
        arquivoCompleto: "Use esta opção se você já salvou todas as informações e configurações anteriormente em um único arquivo. Isso restaurará o estado anterior, incluindo informações da escola e configurações de gráficos.",
        tabelaConsulta: "Esta tabela é o 'mapa' que conecta as perguntas dos formulários aos indicadores e gráficos corretos. Ela guia a organização dos dados.",

        baixarJson: "Salva todos os dados e configurações atuais em um único arquivo. Este arquivo pode ser carregado na página anterior (em 'Importar Todos os Dados de Uma Vez') para restaurar esta sessão rapidamente.",
        truncarRotulo: "Encurta automaticamente os textos se forem muito longos.",
        nPalavrasTruncar: "Define quantas palavras mostrar antes de encurtar o texto (requer 'Truncar Rótulos' ativado).",
        largMaxRotulo: "Define a largura máxima para o nome da categoria antes de quebrar a linha ou encurtar.",
        adjustScale: "Aplica um 'zoom' automático no gráfico se os resultados estiverem concentrados em valores baixos, facilitando a visualização das diferenças.",

        
    };

    let tooltipElement = null;

    function createTooltip(targetElement, helpKey) {
        removeTooltip();

        const text = helpTexts[helpKey];
        if (!text) {
            console.warn(`Help text not found for key: ${helpKey}`);
            return; 
        }

        tooltipElement = document.createElement('div');
        tooltipElement.className = 'help-tooltip'; 
        tooltipElement.textContent = text; 
        tooltipElement.style.position = 'absolute'; 
        tooltipElement.style.zIndex = '1001'; 

        document.body.appendChild(tooltipElement);

        positionTooltip(targetElement);
    }

    function positionTooltip(targetElement) {
        if (!tooltipElement) return;

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let top = targetRect.bottom + scrollY + 5; 
        let left = targetRect.left + scrollX + (targetRect.width / 2) - (tooltipRect.width / 2); 

        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10; 
        }
        if (left < 0) {
            left = 10; 
        }
         if (top + tooltipRect.height > window.innerHeight + scrollY) {
             top = targetRect.top + scrollY - tooltipRect.height - 5; 
         }

        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.opacity = '1'; 
    }

    function removeTooltip() {
        if (tooltipElement) {
            tooltipElement.remove();
            tooltipElement = null;
        }
    }

    document.body.addEventListener('mouseover', (event) => {
        const helpIcon = event.target.closest('.help-icon');
        if (helpIcon) {
            const helpKey = helpIcon.getAttribute('data-help-key');
            if (helpKey) {
                createTooltip(helpIcon, helpKey);
            }
        }
    });

    document.body.addEventListener('mouseout', (event) => {
        const helpIcon = event.target.closest('.help-icon');
        
         if (helpIcon) {
              removeTooltip(); 
         }
    });

    document.body.addEventListener('click', removeTooltip, true); 

    console.log("Help Tooltips script initialized.");

})();