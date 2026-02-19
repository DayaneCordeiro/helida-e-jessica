// =========================================================
// 1. DADOS DE CONFIGURAÇÃO (PERSONALIZAR)
// =========================================================

// ATENÇÃO: ESTA URL DEVE SER A MESMA DO SEU APPS SCRIPT (Usada para GET e POST)
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZ_648QeM6aU3OwEanHmNuBwhXhaswpc1Osr8GcqgzhMsSp-3Q765VZYt04kE9pwTL9Q/exec';

// A lista de convidados será carregada dinamicamente aqui
let LISTA_CONVIDADOS = [];

// =========================================================
// 2. LÓGICA DE CARREGAMENTO DE DADOS (GET)
// =========================================================

async function loadGuestList(inputElement, loadingTextElement) {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 1. MOSTRA O LOAD, DESABILITA INPUT E ESCONDE O TEXTO
    loadingOverlay.classList.remove('hidden');
    inputElement.disabled = true;
    loadingTextElement.style.display = 'none'; // ESCONDE O TEXTO

    console.log("Tentando carregar lista de convidados...");
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar lista: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            LISTA_CONVIDADOS = data;
        } 
        
    } catch (error) {
        console.error("Falha ao carregar lista de convidados:", error);
        alert("Erro fatal ao carregar lista de convidados. Por favor, recarregue a página.");
        
    } finally {
        // 2. ESCONDE O LOAD GERAL, HABILITA INPUT E GARANTE QUE O TEXTO SUMIU
        loadingOverlay.classList.add('hidden');
        inputElement.disabled = false;
        inputElement.focus();
    }
}


// =========================================================
// 3. LÓGICA DO AUTOCOMPLETAR CUSTOMIZADO (INALTERADO)
// =========================================================
function autocomplete(input, arr) {
    const resultsContainer = document.getElementById('autocomplete-results');

    input.addEventListener("input", function(e) {
        let val = this.value;
        resultsContainer.innerHTML = ""; 
        
        if (!val || val.length < 2) { 
            return false;
        }

        let count = 0;
        const maxSuggestions = 8; 

        for (let i = 0; i < arr.length; i++) {
            if (arr[i].toUpperCase().startsWith(val.toUpperCase()) && count < maxSuggestions) {
                
                const resultItem = document.createElement("DIV");
                resultItem.setAttribute('data-value', arr[i]);
                
                resultItem.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                resultItem.innerHTML += arr[i].substr(val.length);
                
                resultItem.addEventListener("click", function(e) {
                    input.value = this.getAttribute('data-value');
                    resultsContainer.innerHTML = "";
                    input.focus();
                });
                
                resultsContainer.appendChild(resultItem);
                count++;
            }
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target != input && e.target.closest('#autocomplete-results') === null) {
            resultsContainer.innerHTML = "";
        }
    });
}

// =========================================================
// 4. LÓGICA DE SUBMISSÃO DO FORMULÁRIO (RSVP) - POST
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
    const inputNome = document.getElementById('nome_completo');
    const loadingText = document.getElementById('loading-text'); // Elemento de texto do load
    
    // CARREGAMENTO INICIAL: Esconde o texto, mostra só o spinner
    await loadGuestList(inputNome, loadingText); 
    
    const loadingOverlay = document.getElementById('loading-overlay'); 
    
    // Elementos do Modal
    const modal = document.getElementById('success-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const closeSpan = document.querySelector('.close-button');

    // Funções para fechar o modal
    const closeModal = () => {
        modal.classList.remove('visible');
        modal.style.display = 'none';
    };

    closeSpan.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

    autocomplete(inputNome, LISTA_CONVIDADOS); 

    document.getElementById('form-rsvp').addEventListener('submit', function(event) {
        event.preventDefault(); 
    
        const form = this;
        const nomeErro = document.getElementById('nome-erro');
        const submitBtn = document.getElementById('submit-btn');
        const statusMessage = document.getElementById('message-status'); 
        
        let respostaSelecionada = null;
        
        const radios = document.querySelectorAll('input[name="status_rsvp"]');

        radios.forEach(radio => {
            if (radio.checked) {
                respostaSelecionada = radio.value; 
            }
        });
        
        // --- VALIDAÇÃO DA LISTA FECHADA ---
        const nomeSelecionado = inputNome.value.trim();
        
        if (!LISTA_CONVIDADOS.includes(nomeSelecionado)) {
            nomeErro.textContent = "Por favor, selecione seu nome EXATO da lista para continuar.";
            nomeErro.style.display = 'block';
            inputNome.focus();
            return; 
        } else {
            nomeErro.style.display = 'none';
        }
        
        // --- ENVIO DOS DADOS ---
        
        // MOSTRA O LOAD GERAL E HABILITA O TEXTO (PARA CONFIRMAR PRESENÇA)
        loadingOverlay.classList.remove('hidden');
        loadingText.style.display = 'block'; 
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        statusMessage.style.display = 'none'; 
    
        const formData = new FormData(form);
        const params = new URLSearchParams(formData);
    
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST', 
            body: params,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.json(); 
        })
        .then(data => {
            // ESCONDE O LOAD GERAL
            loadingOverlay.classList.add('hidden');
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Confirmação';
            
            const happyIconContainer = '<span class="icon-container"><span class="material-symbols-outlined modal-icon">sentiment_very_satisfied</span></span>';
            const sadIconContainer = '<span class="icon-container"><span class="material-symbols-outlined modal-icon">sentiment_dissatisfied</span></span>';
            const titleText = "Resposta enviada!";
    
            if (data.result === 'success') {
                
                modalTitle.innerHTML = '';
                
                if (respostaSelecionada === "Recusou") {
                    modalTitle.innerHTML = titleText + sadIconContainer; 
                    modalMessage.innerHTML = 'Que pena, obrigada por avisar!';
                } else {
                    modalTitle.innerHTML = titleText + happyIconContainer;
                    modalMessage.innerHTML = 'Confirmação enviada com sucesso. <br> Mal podemos esperar!';
                }
                
                modal.classList.add('visible');
                modal.style.display = 'flex';

                form.reset(); 
            } else {
                statusMessage.textContent = 'ERRO: Houve um problema no servidor. Tente novamente.';
                statusMessage.className = 'error';
                statusMessage.style.display = 'block';
                console.error('Erro no servidor do Apps Script:', data.message);
            }
        })
        .catch(error => {
            // ESCONDE O LOAD GERAL
            loadingOverlay.classList.add('hidden');
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Confirmação';
            statusMessage.textContent = 'ERRO DE CONEXÃO: Não foi possível enviar. Verifique sua conexão.';
            statusMessage.className = 'error';
            statusMessage.style.display = 'block';
            console.error('Erro de rede/fetch:', error);
        });
    });
});