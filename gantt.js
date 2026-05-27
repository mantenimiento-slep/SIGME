// Módulo de Carta Gantt para SIGME 2.0

let zoomLevel = 1;
let ganttData = [];
let itoFiltro = null;

// Días feriados de Chile 2026
const feriados2026 = [
    '2026-01-01', // Año Nuevo
    '2026-04-03', // Viernes Santo
    '2026-04-04', // Sábado Santo
    '2026-05-01', // Día del Trabajo
    '2026-05-21', // Glorias Navales
    '2026-06-29', // San Pedro y San Pablo
    '2026-07-16', // Virgen del Carmen
    '2026-08-15', // Asunción de la Virgen
    '2026-09-18', // Independencia Nacional
    '2026-09-19', // Glorias del Ejército
    '2026-10-12', // Encuentro de Dos Mundos
    '2026-10-31', // Día de las Iglesias Evangélicas
    '2026-11-01', // Día de Todos los Santos
    '2026-12-08', // Inmaculada Concepción
    '2026-12-25', // Navidad
];

// Rango naranjo: 22 junio al 3 julio 2026
const rangoNaranjoInicio = new Date(2026, 5, 22); // 22 junio 2026
const rangoNaranjoFin = new Date(2026, 6, 3);     // 3 julio 2026

// Función para verificar si una fecha es feriado
function esFeriado(fecha) {
    const fechaStr = fecha.getFullYear() + '-' + 
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
        String(fecha.getDate()).padStart(2, '0');
    return feriados2026.includes(fechaStr);
}

// Función para verificar si una fecha está en el rango naranjo
function esRangoNaranjo(fecha) {
    return fecha >= rangoNaranjoInicio && fecha <= rangoNaranjoFin;
}

// Función para parsear fecha en múltiples formatos
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    
    fechaStr = fechaStr.trim();
    
    // Formato DD.MM.YY o DD.MM.YYYY
    const partesPunto = fechaStr.split('.');
    if (partesPunto.length === 3) {
        const dia = parseInt(partesPunto[0], 10);
        const mes = parseInt(partesPunto[1], 10) - 1;
        let año = parseInt(partesPunto[2], 10);
        
        if (año < 100) {
            año += 2000;
        }
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
            return new Date(año, mes, dia);
        }
    }
    
    // Formato D-M-YY o DD-MM-YYYY (con guiones)
    const partesGuion = fechaStr.split('-');
    if (partesGuion.length === 3) {
        const dia = parseInt(partesGuion[0], 10);
        const mes = parseInt(partesGuion[1], 10) - 1;
        let año = parseInt(partesGuion[2], 10);
        
        if (año < 100) {
            año += 2000;
        }
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
            return new Date(año, mes, dia);
        }
    }
    
    // Formato DD/MM/YY o DD/MM/YYYY
    const partesBarra = fechaStr.split('/');
    if (partesBarra.length === 3) {
        const dia = parseInt(partesBarra[0], 10);
        const mes = parseInt(partesBarra[1], 10) - 1;
        let año = parseInt(partesBarra[2], 10);
        
        if (año < 100) {
            año += 2000;
        }
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
            return new Date(año, mes, dia);
        }
    }
    
    console.warn('No se pudo parsear fecha:', fechaStr);
    return null;
}

// Código del día de la semana (L, M, W, J, V, S, D)
function codigoDia(fecha) {
    const codigos = ['D', 'L', 'M', 'W', 'J', 'V', 'S']; // Domingo=0, Lunes=1...
    return codigos[fecha.getDay()];
}

// Calcular días hábiles entre dos fechas
function diasHabiles(fechaInicio, fechaFin) {
    let inicio = new Date(fechaInicio);
    let fin = new Date(fechaFin);
    let dias = 0;
    
    while (inicio <= fin) {
        const dia = inicio.getDay();
        if (dia !== 0 && dia !== 6) {
            dias++;
        }
        inicio.setDate(inicio.getDate() + 1);
    }
    
    return dias;
}

// Función para asignar niveles a las barras (evitar superposición)
function asignarNiveles(ots, fechaInicioPeriodo, totalDias) {
    const niveles = [];
    const barras = ots.map((ot, index) => {
        const inicio = parsearFecha(ot.fechaInicio);
        const fin = parsearFecha(ot.fechaFin);
        if (!inicio || !fin) return null;
        
        const inicioOffset = (inicio - fechaInicioPeriodo) / (1000 * 60 * 60 * 24);
        const duracion = Math.max((fin - inicio) / (1000 * 60 * 60 * 24) + 1, 1);
        const leftPercent = (inicioOffset / totalDias) * 100;
        const widthPercent = (duracion / totalDias) * 100;
        
        return {
            ot: ot,
            index: index,
            inicio: inicio,
            fin: fin,
            leftPercent: Math.max(0, leftPercent),
            widthPercent: Math.max(0.2, widthPercent),
            nivel: 0
        };
    }).filter(b => b !== null);
    
    // Ordenar por fecha de inicio
    barras.sort((a, b) => a.inicio - b.inicio);
    
    // Asignar niveles
    barras.forEach((barra, i) => {
        let nivelAsignado = 0;
        let encontrado = false;
        
        while (!encontrado) {
            encontrado = true;
            for (let j = 0; j < i; j++) {
                if (barras[j].nivel === nivelAsignado) {
                    // Verificar si se superponen
                    const finAnterior = barras[j].fin;
                    if (barra.inicio <= finAnterior) {
                        encontrado = false;
                        nivelAsignado++;
                        break;
                    }
                }
            }
        }
        
        barra.nivel = nivelAsignado;
        niveles.push(nivelAsignado);
    });
    
    const maxNivel = Math.max(...niveles, 0);
    
    return barras.map(b => ({
        ...b,
        topPosition: b.nivel * 34 + 4,
        alturaFila: (maxNivel + 1) * 34 + 8
    }));
}

function inicializarGantt() {
    ganttData = todasLasOTs.filter(ot => ot.fechaInicio && ot.fechaFin);
    renderizarGantt();
}

function renderizarGantt() {
    const ganttChart = document.getElementById('ganttChart');
    
    if (!ganttChart) return;
    
    if (ganttData.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>No hay OTs con fechas definidas</p></div>';
        return;
    }
    
    // Período: 6 semanas atrás + 8 semanas adelante
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - 42);
    
    const fechaFin = new Date(hoy);
    fechaFin.setDate(fechaFin.getDate() + 56);
    
    // Aplicar filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const recintoSearch = document.getElementById('filterRecinto')?.value.toLowerCase() || '';
    
    let otsFiltradas = ganttData.filter(ot => {
        const inicio = parsearFecha(ot.fechaInicio);
        const fin = parsearFecha(ot.fechaFin);
        
        if (!inicio || !fin) return false;
        
        const linea = ot.lineaTrabajo || '';
        const esLinea1o2 = linea === 'Línea 1' || linea === 'Línea 2';
        if (!esLinea1o2) return false;
        
        const enPeriodo = fin >= fechaInicio && inicio <= fechaFin;
        if (!enPeriodo) return false;
        
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLineaFiltro = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchRecinto = !recintoSearch || ot.nombreRecinto.toLowerCase().includes(recintoSearch);
        
        return matchSearch && matchLineaFiltro && matchEstado && matchRecinto;
    });
    
    if (otsFiltradas.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-search"></i><p>No se encontraron OTs en el período (Líneas 1 y 2)</p><p style="font-size:0.8rem;margin-top:8px;">Período: ' + formatearFecha(fechaInicio) + ' → ' + formatearFecha(fechaFin) + '</p></div>';
        return;
    }
    
    // Ordenar por línea y recinto
    otsFiltradas.sort((a, b) => {
        if (a.lineaTrabajo !== b.lineaTrabajo) return a.lineaTrabajo.localeCompare(b.lineaTrabajo);
        return a.nombreRecinto.localeCompare(b.nombreRecinto);
    });
    
    // Generar columnas de días
    const columnas = [];
    let fechaActual = new Date(fechaInicio);
    while (fechaActual <= fechaFin) {
        columnas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + zoomLevel);
    }
    
    const totalDias = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
    
    // Agrupar por línea de trabajo
    const grupos = {};
    otsFiltradas.forEach(ot => {
        const linea = ot.lineaTrabajo || 'Sin línea';
        if (!grupos[linea]) {
            grupos[linea] = [];
        }
        grupos[linea].push(ot);
    });
    
    // Construir HTML
    let html = '<div style="overflow-x: auto; position: relative;" id="ganttScrollContainer">';
    html += `<div style="padding: 8px; background: #e8f5e9; font-size: 0.85rem; margin-bottom: 8px; border-radius: 4px;">
        📅 Período: <strong>${formatearFecha(fechaInicio)}</strong> al <strong>${formatearFecha(fechaFin)}</strong> | 
        Líneas 1 y 2 | ${otsFiltradas.length} OT encontradas
    </div>`;
    
    html += '<table class="gantt-table"><thead><tr><th class="col-recinto" style="width: 250px;">Línea de Trabajo</th>';
    
    // Headers de meses
    const meses = {};
    columnas.forEach(fecha => {
        const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
        if (!meses[key]) {
            meses[key] = { fecha: new Date(fecha), dias: 0 };
        }
        meses[key].dias++;
    });
    
    Object.values(meses).forEach(mes => {
        const nombreMes = mes.fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        html += `<th colspan="${mes.dias}" style="background: #e3f2fd; text-align: center; padding: 6px;">${nombreMes}</th>`;
    });
    
    html += '</tr><tr><th class="col-recinto" style="width: 250px;">Establecimientos</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const esHoy = fecha.toDateString() === hoy.toDateString();
        const esFeriadoFlag = esFeriado(fecha);
        const esNaranjo = esRangoNaranjo(fecha);
        
        let estilo = '';
        if (esNaranjo) {
            estilo = 'background: #ff9800; color: white; font-weight: bold;';
        } else if (esFeriadoFlag) {
            estilo = 'background: #f44336; color: white; font-weight: bold;';
        } else if (esHoy) {
            estilo = 'background: #fff176; font-weight: bold;';
        } else if (esFinde) {
            estilo = 'background: #f5f5f5; color: #999;';
        }
        
        html += `<th style="${estilo} padding: 4px; text-align: center; font-size: 0.75rem;">${fecha.getDate()}<br><small>${['Do','Lu','Ma','Mi','Ju','Vi','Sá'][fecha.getDay()]}</small></th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Filas por línea de trabajo
    Object.entries(grupos).forEach(([linea, ots]) => {
        const totalRecintos = new Set(ots.map(ot => ot.nombreRecinto)).size;
        
        // Asignar niveles para evitar superposición
        const barrasConNiveles = asignarNiveles(ots, fechaInicio, totalDias);
        const alturaFila = Math.max(barrasConNiveles[0]?.alturaFila || 60, 60);
        
        html += `<tr class="linea-row">
            <td class="col-recinto" style="background: #e8eaf6; font-weight: 600; color: #1a237e; border-bottom: 2px solid #3f51b5; padding: 10px; vertical-align: top;">
                <div style="font-size: 1rem; margin-bottom: 4px;"><i class="fas fa-layer-group"></i> ${linea}</div>
                <div style="font-size: 0.75rem; color: #5c6bc0;">${ots.length} OT | ${totalRecintos} EE</div>
            </td>
            <td colspan="${columnas.length}" style="position: relative; padding: 8px 4px; background: #fafbff; vertical-align: top;">
                <div style="position: relative; width: 100%; min-height: ${alturaFila}px;">`;
        
        // Barras por OT con niveles
        barrasConNiveles.forEach((barra) => {
            const ot = barra.ot;
            const inicio = barra.inicio;
            const fin = barra.fin;
            
            const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
            
            const colores = {
                'programada': '#42a5f5',
                'en-proceso': '#ffa726',
                'completada': '#66bb6a',
                'cancelada': '#ef5350',
                'recepcion-conforme': '#66bb6a',
                'sin-estado': '#bdbdbd'
            };
            
            const color = colores[estadoClass] || '#78909c';
            
            // Aplicar difuminado si hay filtro ITO activo
            let opacidad = 1;
            let sombra = '0 1px 3px rgba(0,0,0,0.2)';
            if (itoFiltro && ot.ito !== itoFiltro) {
                opacidad = 0.3;
                sombra = 'none';
            }
            
            const duracionHabiles = diasHabiles(inicio, fin);
            
            const presupuestoNum = parseFloat(String(ot.presupuesto).replace(/[^0-9.-]+/g, '')) || 0;
            const presupuestoFormateado = new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(presupuestoNum);
            
            // Formatear fechas para tooltip
            const codigoInicio = codigoDia(inicio);
            const codigoFin = codigoDia(fin);
            const fechaInicioStr = ot.fechaInicio;
            const fechaFinStr = ot.fechaFin;
            
            // Tooltip HTML mejorado
            const tooltipHTML = `<div style="font-family: 'Segoe UI', sans-serif; padding: 12px; min-width: 300px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="font-size: 1.1rem; color: #1a237e;">${ot.nombreRecinto}</strong>
                    <strong style="font-size: 1.1rem; color: #1565c0;">${ot.numeroOT}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                    <span><i class="fas fa-user"></i> ${ot.ito}</span>
                    <span style="font-weight: bold; color: #ED56A1; font-size: 1.2rem;">${duracionHabiles}d</span>
                </div>
                <div style="margin-bottom: 5px; font-size: 0.95rem;">
                    <strong>${codigoInicio}</strong> ${fechaInicioStr}
                </div>
                <div style="margin-bottom: 10px; font-size: 0.95rem;">
                    <strong>${codigoFin}</strong> ${fechaFinStr}
                </div>
                <div style="margin-bottom: 10px; padding: 8px; background: #f5f5f5; border-radius: 6px;">
                    <strong style="font-size: 0.9rem; color: #333;">TIPO INTERVENCIÓN</strong><br>
                    <span style="font-size: 0.9rem;">${ot.tipoIntervencion}</span>
                </div>
                <div style="text-align: right; font-weight: bold; font-size: 1.1rem; color: #2e7d32;">
                    Total: ${presupuestoFormateado}
                </div>
            </div>`;
            
            const tooltipEscaped = tooltipHTML.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
            
            // Texto de la barra: OT.XXX · Nombre (con salto de línea si es necesario)
            const nombreRecinto = ot.nombreRecinto;
            const numeroOT = ot.numeroOT;
            const textoBarra = `${numeroOT} · ${nombreRecinto}`;
            
            html += `<div class="gantt-bar-v2 gantt-tooltip-trigger" 
                style="left: ${barra.leftPercent}%; width: ${Math.max(barra.widthPercent, 0.3)}%; top: ${barra.topPosition}px; position: absolute; background: ${color}; opacity: ${opacidad}; box-shadow: ${sombra};"
                data-tooltip="${tooltipEscaped}"
                data-ito="${ot.ito}">
                <span style="font-size: 0.7rem; line-height: 1.2; white-space: normal; word-wrap: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${textoBarra}
                </span>
            </div>`;
        });
        
        html += `</div></td></tr>`;
        html += `<tr><td colspan="${columnas.length + 1}" style="padding: 0; height: 6px; background: #e0e0e0;"></td></tr>`;
    });
    
    html += '</tbody></table>';
    
    // Marcador de HOY fijo
    const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
    const hoyPercent = (hoyOffset / totalDias) * 100;
    html += `<div class="today-line" style="left: ${hoyPercent}%;">HOY</div>`;
    
    html += '</div>';
    
    ganttChart.innerHTML = html;
    
    // Centrar en HOY
    setTimeout(() => {
        const container = document.getElementById('ganttScrollContainer');
        if (container) {
            const hoyPosition = (hoyPercent / 100) * container.scrollWidth;
            container.scrollLeft = hoyPosition - (container.clientWidth / 3);
        }
    }, 100);
    
    // Inicializar tooltips y eventos de ITO
    inicializarTooltips();
    inicializarEventosITO();
}

function inicializarTooltips() {
    const existingTooltip = document.getElementById('gantt-custom-tooltip');
    if (existingTooltip) existingTooltip.remove();
    
    const tooltip = document.createElement('div');
    tooltip.id = 'gantt-custom-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        padding: 0;
        z-index: 10000;
        display: none;
        pointer-events: none;
        max-width: 380px;
    `;
    document.body.appendChild(tooltip);
    
    document.querySelectorAll('.gantt-tooltip-trigger').forEach(bar => {
        bar.addEventListener('mouseenter', function(e) {
            const tooltipHTML = this.getAttribute('data-tooltip');
            tooltip.innerHTML = tooltipHTML;
            tooltip.style.display = 'block';
            
            const rect = this.getBoundingClientRect();
            let left = rect.left + rect.width / 2;
            let top = rect.bottom + 10;
            
            if (left + 190 > window.innerWidth) left = window.innerWidth - 390;
            if (top + 250 > window.innerHeight) top = rect.top - 260;
            if (left < 10) left = 10;
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });
        
        bar.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
    });
}

// Inicializar eventos para filtro por ITO
function inicializarEventosITO() {
    document.querySelectorAll('.gantt-tooltip-trigger').forEach(bar => {
        bar.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            const ito = this.getAttribute('data-ito');
            if (ito) {
                if (itoFiltro === ito) {
                    itoFiltro = null; // Desseleccionar
                } else {
                    itoFiltro = ito; // Seleccionar ITO
                }
                renderizarGantt();
                actualizarIndicadorITO();
            }
        });
    });
}

function actualizarIndicadorITO() {
    let indicador = document.getElementById('ito-indicator');
    if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'ito-indicator';
        indicador.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a237e;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 999;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        `;
        indicador.onclick = function() {
            itoFiltro = null;
            renderizarGantt();
            this.style.display = 'none';
        };
        document.body.appendChild(indicador);
    }
    
    if (itoFiltro) {
        indicador.innerHTML = `👷 ITO: ${itoFiltro} &nbsp; ✕`;
        indicador.style.display = 'block';
    } else {
        indicador.style.display = 'none';
    }
}

function zoomGantt(direction) {
    zoomLevel = Math.max(1, Math.min(14, zoomLevel + direction));
    renderizarGantt();
}

function scrollGantt(direction) {
    const container = document.getElementById('ganttScrollContainer');
    if (!container) return;
    
    const scrollAmount = 400;
    
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        container.scrollLeft += scrollAmount;
    } else if (direction === 'today') {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaInicio = new Date(hoy);
        fechaInicio.setDate(fechaInicio.getDate() - 42);
        const fechaFin = new Date(hoy);
        fechaFin.setDate(fechaFin.getDate() + 56);
        
        const totalDias = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyPercent = (hoyOffset / totalDias) * 100;
        
        const hoyPosition = (hoyPercent / 100) * container.scrollWidth;
        container.scrollLeft = hoyPosition - (container.clientWidth / 3);
    }
}

function formatearFecha(fecha) {
    return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
