(function() {
    'use strict';

    // ============================================================================
    // DETECCIÓN DE DISPOSITIVO (criterio robusto: UA mobile + touch fallback)
    // Debe ser IDÉNTICO al de corte.js para mantener sincronía de estados.
    // ============================================================================
    function isMobileDevice() {
        // 1. UA mobile: indicador principal (más fiable en navegadores móviles reales)
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)) {
            return true;
        }
        // 2. Fallback: tablet/iPad moderno sin mouse/trackpad (touch + sin puntero fino)
        const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
        if (!hasTouch) return false;
        const hasFine = window.matchMedia && window.matchMedia('(any-pointer: fine)').matches;
        return !hasFine;
    }

    // En PC: no inyectar nada. El usuario usa teclado físico.
    if (!isMobileDevice()) return;

    // Guard contra doble inyección
    if (document.getElementById('tecladoFlotante')) return;

    // ============================================================================
    // INYECCIÓN DE CSS
    // ============================================================================
    const style = document.createElement('style');
    style.innerHTML = `
        #tecladoFlotante {
            position: fixed;
            background-color: #FFFFFF;
            border: 1px solid #E5EAF0;
            box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.12), 0 4px 12px -4px rgba(0, 0, 0, 0.05);
            padding: 10px;
            z-index: 20000;
            font-family: 'Geist', sans-serif;
            box-sizing: border-box;
            display: block;
            border-radius: 16px;
        }
        .dark #tecladoFlotante {
            background-color: #1E293B;
            border-color: #334155;
            box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.3);
        }
        #tecladoFlotante * { box-sizing: border-box; }

        #tecladoFlotante.teclado-oculto {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        #tecladoFlotante.pos-bottom-center { bottom: 12px; left: 50%; transform: translateX(-50%); width: calc(100% - 24px); max-width: 390px; }
        #tecladoFlotante.pos-bottom-left   { bottom: 16px; left: 16px; width: calc(100% - 32px); max-width: 375px; }
        #tecladoFlotante.pos-bottom-right  { bottom: 16px; right: 16px; width: calc(100% - 32px); max-width: 375px; }
        #tecladoFlotante.pos-top-center    { top: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 24px); max-width: 390px; }
        #tecladoFlotante.pos-center        { top: 50%; left: 50%; transform: translate(-50%, -50%); width: calc(100% - 32px); max-width: 375px; }

        /* Menú de posiciones: aparece SIEMPRE fuera del teclado (nunca encima de las teclas) */
        .menu-posiciones {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 10px;
            background: #FFFFFF;
            border: 1px solid #E5EAF0;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            padding: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            z-index: 20010;
        }
        .dark .menu-posiciones {
            background: #1E293B;
            border-color: #334155;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .menu-posiciones.menu-oculto { display: none !important; }
        .menu-fila { display: flex; gap: 4px; align-items: center; }
        .menu-posiciones button {
            width: 30px;
            height: 30px;
            border: none;
            background-color: #F5F7FA;
            color: #172033;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .dark .menu-posiciones button { background-color: #0F172A; color: #F8FAFC; }

        /* Si el teclado está arriba, el menú aparece debajo del teclado */
        #tecladoFlotante.pos-top-center .menu-posiciones {
            bottom: auto;
            top: calc(100% + 8px);
        }

        .teclado-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-width: 100%; margin: 0 auto; }
        .teclado-grid button {
            height: 50px;
            font-size: 18px;
            border: 1px solid #E5EAF0;
            border-radius: 12px;
            background-color: #F5F7FA;
            color: #172033;
            cursor: pointer;
            touch-action: manipulation;
            display: flex;
            justify-content: center;
            align-items: center;
            user-select: none;
            font-weight: 600;
        }
        .dark .teclado-grid button { background-color: #0F172A; border-color: #334155; color: #F8FAFC; }
        .btn-funcion { background-color: #FFFFFF !important; color: #64748B !important; font-size: 15px !important; font-weight: 500 !important; border-color: transparent !important; }
        .dark .btn-funcion { background-color: #1E293B !important; color: #94A3B8 !important; }
        .btn-ok { background-color: #0D9488 !important; border-color: #0D9488 !important; color: #FFFFFF !important; font-weight: 600; font-size: 16px !important; }
        .text-blue { color: #0D9488 !important; }
        .dark .text-blue { color: #2DD4BF !important; }
        .btn-drag { background-color: #FFFFFF !important; color: #64748B !important; border-color: transparent !important; }
        .dark .btn-drag { background-color: #1E293B !important; color: #94A3B8 !important; }
        .btn-drag svg { width: 18px; height: 18px; stroke: currentColor; }
    `;
    document.head.appendChild(style);

    // ============================================================================
    // INYECCIÓN DE HTML (sin wrapper <div> innecesario)
    // ============================================================================
    document.body.insertAdjacentHTML('beforeend', `
        <div id="tecladoFlotante" class="teclado-oculto pos-bottom-center">
            <div id="menuPosiciones" class="menu-posiciones menu-oculto">
                <button type="button" data-pos="top-center" title="Arriba">▲</button>
                <div class="menu-fila">
                    <button type="button" data-pos="bottom-left" title="Izquierda">◀</button>
                    <button type="button" data-pos="center" title="Centro">●</button>
                    <button type="button" data-pos="bottom-right" title="Derecha">▶</button>
                </div>
                <button type="button" data-pos="bottom-center" title="Abajo">▼</button>
            </div>
            <div class="teclado-grid">
                <button type="button" data-key="7">7</button>
                <button type="button" data-key="8">8</button>
                <button type="button" data-key="9">9</button>
                <button type="button" data-key="backspace" class="btn-funcion">⌫</button>
                <button type="button" data-key="4">4</button>
                <button type="button" data-key="5">5</button>
                <button type="button" data-key="6">6</button>
                <button type="button" data-key="prev" class="btn-funcion text-blue">Ant.</button>
                <button type="button" data-key="1">1</button>
                <button type="button" data-key="2">2</button>
                <button type="button" data-key="3">3</button>
                <button type="button" data-key="next" class="btn-funcion text-blue">Sig.</button>
                <button type="button" id="dragHandle" class="btn-drag" title="Cambiar posición">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="5 9 2 12 5 15"></polyline>
                        <polyline points="9 5 12 2 15 5"></polyline>
                        <polyline points="15 19 12 22 9 19"></polyline>
                        <polyline points="19 9 22 12 19 15"></polyline>
                        <line x1="2" x2="22" y1="12" y2="12"></line>
                        <line x1="12" x2="12" y1="2" y2="22"></line>
                    </svg>
                </button>
                <button type="button" data-key="0">0</button>
                <button type="button" data-key="." class="btn-funcion">.</button>
                <button type="button" data-key="enter" class="btn-ok">OK</button>
            </div>
        </div>
    `);

    // ============================================================================
    // NAVEGACIÓN VERTICAL (grid 3 columnas × 10 filas — SIN CAMBIOS)
    // ============================================================================
    const GRID_COLS = 3;
    const GRID_ROWS = 10;

    function getNextInputVertical(currentInput, direction) {
        const col = currentInput.getAttribute('data-col');
        const row = parseInt(currentInput.getAttribute('data-row'), 10);

        if (col && !isNaN(row)) {
            let targetCol = parseInt(col, 10);
            let targetRow = row + direction;

            let targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);

            if (!targetInput) {
                if (direction > 0) {
                    targetCol++;
                    targetRow = 1;
                    targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);
                    if (!targetInput && targetCol > GRID_COLS) {
                        targetCol = 1;
                        targetRow = 1;
                        targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);
                    }
                } else {
                    targetCol--;
                    targetRow = GRID_ROWS;
                    targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);
                    while (!targetInput && targetCol >= 1) {
                        targetRow--;
                        if (targetRow < 1) {
                            targetCol--;
                            targetRow = GRID_ROWS;
                        }
                        targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);
                    }
                    if (!targetInput) {
                        targetCol = GRID_COLS;
                        targetRow = GRID_ROWS;
                        targetInput = document.querySelector(`input[data-col="${targetCol}"][data-row="${targetRow}"]`);
                    }
                }
            }
            if (targetInput) return targetInput;
        }

        // Fallback para inputs sin data-col/data-row
        const inputs = Array.from(document.querySelectorAll('[data-teclado]'));
        const currentIndex = inputs.indexOf(currentInput);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + direction + inputs.length) % inputs.length;
            return inputs[nextIndex];
        }
        return currentInput;
    }

    // ============================================================================
    // INICIALIZACIÓN DEL TECLADO
    // ============================================================================
    function initTeclado() {
        let activeInput = null;
        let currentPos = localStorage.getItem('teclado_pos') || null;

        // Debounce: solo una ejecución por ráfaga de tecleo
        let debounceTimer = null;
        let debounceInput = null;
        const DEBOUNCE_MS = 180;

        const teclado = document.getElementById('tecladoFlotante');
        const menuPosiciones = document.getElementById('menuPosiciones');
        const dragHandle = document.getElementById('dragHandle');
        const botonesPos = menuPosiciones.querySelectorAll('button[data-pos]');
        const botones = teclado.querySelectorAll('button[data-key]');

        function applyPosition(pos) {
            teclado.classList.remove('pos-bottom-center', 'pos-bottom-left', 'pos-bottom-right', 'pos-top-center', 'pos-center');
            teclado.classList.add(pos);
        }

        function resolvePosition() {
            if (currentPos) return currentPos;
            return window.innerWidth > window.innerHeight ? 'pos-bottom-right' : 'pos-bottom-center';
        }

        function dispararActualizaciones() {
            if (!activeInput) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceInput = activeInput;
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                const input = debounceInput;
                debounceInput = null;
                if (input) input.dispatchEvent(new Event('input', { bubbles: true }));
            }, DEBOUNCE_MS);
        }

        function flushDebounce() {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            if (debounceInput) {
                const input = debounceInput;
                debounceInput = null;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        window.addEventListener('beforeunload', flushDebounce);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushDebounce();
        });

        // ---- FOCUS: mostrar teclado al tocar un [data-teclado] ----
        document.addEventListener('pointerdown', (e) => {
            const targetInput = e.target.closest('[data-teclado]');
            if (targetInput) {
                activeInput = targetInput;
                teclado.classList.remove('teclado-oculto');
                applyPosition(resolvePosition());
            } else if (!e.target.closest('#tecladoFlotante')) {
                flushDebounce();
                teclado.classList.add('teclado-oculto');
                menuPosiciones.classList.add('menu-oculto');
                activeInput = null;
            }
        });

        // ---- MENÚ DE POSICIONES ----
        dragHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuPosiciones.classList.toggle('menu-oculto');
        });

        botonesPos.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nuevaPos = 'pos-' + btn.getAttribute('data-pos');
                currentPos = nuevaPos;
                localStorage.setItem('teclado_pos', currentPos);
                applyPosition(currentPos);
                menuPosiciones.classList.add('menu-oculto');
            });
        });

        // ---- BACKSPACE (con long-press y sin fugas de timer) ----
        function attachBackspaceHandler(boton) {
            let pressTimer = null;
            let isLongPress = false;

            boton.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                if (!activeInput) return;
                try { boton.setPointerCapture(event.pointerId); } catch (_) { /* noop */ }

                isLongPress = false;
                pressTimer = setTimeout(() => {
                    pressTimer = null;
                    isLongPress = true;
                    if (activeInput) {
                        activeInput.value = '';
                        dispararActualizaciones();
                    }
                }, 450);
            });

            boton.addEventListener('pointerup', (event) => {
                event.preventDefault();
                if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                if (!activeInput) return;
                if (isLongPress) {
                    isLongPress = false;
                    return;
                }
                const valorActual = activeInput.value || '';
                activeInput.value = valorActual.slice(0, -1);
                dispararActualizaciones();
            });

            boton.addEventListener('pointercancel', () => {
                if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                isLongPress = false;
            });
        }

        // ---- TECLAS NUMÉRICAS / . / OK / ANT. / SIG. ----
        function attachKeyHandler(boton, key) {
            boton.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                if (!activeInput) return;

                const valorActual = activeInput.value || '';
                const isCurrencyInput = activeInput.classList.contains('currency-input');

                if (key === 'enter') {
                    flushDebounce();
                    if (isCurrencyInput && typeof window.formatInputField === 'function') {
                        window.formatInputField(activeInput);
                    }
                    teclado.classList.add('teclado-oculto');
                    menuPosiciones.classList.add('menu-oculto');
                    activeInput.blur();
                    activeInput = null;
                    return;
                }

                if (key === 'next' || key === 'prev') {
                    flushDebounce();
                    if (isCurrencyInput && activeInput.value !== '' && typeof window.formatInputField === 'function') {
                        window.formatInputField(activeInput);
                    }
                    activeInput.blur();

                    const direction = (key === 'next') ? 1 : -1;
                    const targetInput = getNextInputVertical(activeInput, direction);

                    if (targetInput) {
                        activeInput = targetInput;
                        const targetIsCurrency = targetInput.classList.contains('currency-input');
                        const targetVal = targetInput.value || '';
                        if (targetIsCurrency && (targetVal.includes('$') || targetVal.includes(','))) {
                            targetInput.value = targetVal.replace(/[^0-9.]/g, '');
                        }
                        targetInput.focus();
                    }
                    return;
                }

                if (key === '.') {
                    if (!valorActual.includes('.')) {
                        if (valorActual === '') {
                            activeInput.value = '0.';
                        } else {
                            activeInput.value = valorActual + '.';
                        }
                    }
                } else {
                    if (isCurrencyInput) {
                        let digits = valorActual.replace(/[^0-9.]/g, '');
                        if (digits === '0') digits = '';
                        digits += key;
                        activeInput.value = digits;
                    } else {
                        if (valorActual === '0') {
                            activeInput.value = key;
                        } else {
                            activeInput.value = valorActual + key;
                        }
                    }
                }

                dispararActualizaciones();
            });
        }

        botones.forEach(boton => {
            const key = boton.getAttribute('data-key');
            if (key === 'backspace') {
                attachBackspaceHandler(boton);
            } else {
                attachKeyHandler(boton, key);
            }
        });
    }

    // ============================================================================
    // ARRANQUE
    // ============================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTeclado);
    } else {
        initTeclado();
    }
})();