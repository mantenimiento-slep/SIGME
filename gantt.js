// Módulo de Carta Gantt para SIGME 2.0

let zoomLevel = 1;
let ganttData = [];

// Función para parsear fecha en múltiples formatos
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    
    fechaStr = fechaStr.trim();
    
    // Formato DD.MM.YYYY
    const partesPunto = fechaStr.split('.');
    if (partesPunto.length === 3) {
        const dia = parseInt(partesPunto[0], 10);
        const mes = parseInt(partesPunto[1], 10) - 1;
        const año = parseInt(partesPunto[2], 10);
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
            return new Date(año, mes, dia);
        }
    }
    
    // Formato D-M-YYYY o DD-MM-YYYY (con guiones)
    const partesGuion = fechaStr.split('-');
    if (partesGuion.length === 3) {
        const dia = parseInt(partesGuion[0], 10);
        const mes = parseInt(partesGuion[1], 10) - 1;
        const año = parseInt(partesGuion[2], 10);
        
        // Si el año tiene 2 dígitos, convertirlo a 4
        const añoCompleto = año < 100 ? 2000 + año : año;
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(añoCompleto)) {
            return new Date(añoCompleto, mes, dia);
        }
    }
    
    // Formato DD/MM/YYYY
    const partesBarra = fechaStr.split('/');
    if (partesBarra.length === 3) {
        const dia = parseInt(partesBarra[0], 10);
        const mes = parseInt(partesBarra[1], 10) - 1;
        const año = parseInt(partesBarra[2], 10);
        const añoCompleto = año < 100 ? 2000 + año : año;
        
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(añoCompleto)) {
            return new Date(añoCompleto, mes, dia);
        }
    }
    
    console.warn('No se pudo parsear fecha:', fechaStr);
    return null;
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

function inicializarGantt() {
    ganttData = todasLasOTs.filter(ot => ot.fechaInicio && ot.fechaFin);
    console.log('OTs con fechas:', ganttData.length);
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
    fechaInicio.setDate(fechaInicio.getDate() - 42); // 6 semanas atrás
    
    const fechaFin = new Date(hoy);
    fechaFin.setDate(fechaFin.getDate() + 56); // 8 semanas adelante
    
    console.log('Período:', formatearFecha(fechaInicio), '→', formatearFecha(fechaFin));
    console.log('Hoy:', formatearFecha(hoy));
    
    // Aplicar filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const tipoFiltro = document.getElementById('filterTipo').value;
    
    let otsFiltradas = ganttData.filter(ot => {
        const inicio = parsearFecha(ot.fechaInicio);
        const fin = parsearFecha(ot.fechaFin);
        
        if (!inicio || !fin) {
            console.log('OT sin fecha válida:', ot.numeroOT, ot.fechaInicio, ot.fechaFin);
            return false;
        }
        
        // Solo líneas 1 y 2 para prueba
        const linea = ot.lineaTrabajo || '';
        const esLinea1o2 = linea === 'Línea 1' || linea === 'Línea 2';
        if (!esLinea1o2) return false;
        
        // Verificar si está en el período
        const enPeriodo = fin >= fechaInicio && inicio <= fechaFin;
        
        if (!enPeriodo) {
            console.log('OT fuera de período:', ot.numeroOT, 
                'Inicio:', formatearFecha(inicio), 
                'Fin:', formatearFecha(fin),
                'Período:', formatearFecha(fechaInicio), '→', formatearFecha(fechaFin));
        }
        
        if (!enPeriodo) return false;
        
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLineaFiltro = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchTipo = !tipoFiltro || ot.tipoIntervencion === tipoFiltro;
        
        return matchSearch && matchLineaFiltro && matchEstado && matchTipo;
    });
    
    console.log('OTs filtradas:', otsFiltradas.length);
    
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
    
    html += '</tr><tr><th class="col-recinto" style="width: 250px;">Establecimientos / OT</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const esHoy = fecha.toDateString() === hoy.toDateString();
        let estilo = '';
        
        if (esHoy) {
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
        
        html += `<tr class="linea-row">
            <td class="col-recinto" style="background: #e8eaf6; font-weight: 600; color: #1a237e; border-bottom: 2px solid #3f51b5; padding: 10px; vertical-align: top;">
                <div style="font-size: 1rem; margin-bottom: 4px;"><i class="fas fa-layer-group"></i> ${linea}</div>
                <div style="font-size: 0.75rem; color: #5c6bc0;">${ots.length} OT | ${totalRecintos} EE</div>
            </td>
            <td colspan="${columnas.length}" style="position: relative; padding: 8px 4px; background: #fafbff; vertical-align: top;">
                <div style="position: relative; width: 100%; min-height: ${Math.max(ots.length * 38, 60)}px;">`;
        
        // Barras por OT
        ots.forEach((ot, index) => {
            const inicio = parsearFecha(ot.fechaInicio);
            const fin = parsearFecha(ot.fechaFin);
            
            if (!inicio || !fin) return;
            
            // Ajustar al rango visible
            const inicioVisible = inicio < fechaInicio ? fechaInicio : inicio;
            const finVisible = fin > fechaFin ? fechaFin : fin;
            
            const inicioOffset = (inicioVisible - fechaInicio) / (1000 * 60 * 60 * 24);
            const duracion = Math.max((finVisible - inicioVisible) / (1000 * 60 * 60 * 24) + 1, 1);
            
            const leftPercent = (inicioOffset / totalDias) * 100;
            const widthPercent = (duracion / totalDias) * 100;
            
            const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
            
            const topPosition = (index * 36) + 4;
            
            // Colores por estado
            const colores = {
                'programada': '#42a5f5',
                'en-proceso': '#ffa726',
                'completada': '#66bb6a',
                'cancelada': '#ef5350',
                'recepcion-conforme': '#66bb6a',
                'sin-estado': '#bdbdbd'
            };
            
            const color = colores[estadoClass] || '#78909c';
            
            // Calcular días hábiles
            const duracionHabiles = diasHabiles(inicio, fin);
            
            // Formatear presupuesto
            const presupuestoNum = parseFloat(String(ot.presupuesto).replace(/[^0-9.-]+/g, '')) || 0;
            const presupuestoFormateado = new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(presupuestoNum);
            
            // Tooltip HTML
            const tooltipHTML = `<div style="font-family: 'Segoe UI', sans-serif; padding: 10px; min-width: 280px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="font-size: 1rem; color: #1a237e;">${ot.nombreRecinto}</strong>
                    <strong style="font-size: 1rem; color: #1565c0;">OT ${ot.numeroOT}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
                    <span><i class="fas fa-user"></i> ${ot.ito}</span>
                    <span style="font-weight: bold; color: #ED56A1; font-size: 1.1rem;">${duracionHabiles}d</span>
                </div>
                <div style="margin-bottom: 8px; font-size: 0.9rem;">
                    <i class="fas fa-calendar"></i> ${ot.fechaInicio} → ${ot.fechaFin}
                </div>
                <div style="margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;">
                    <strong style="font-size: 0.85rem; color: #333;">TIPO INTERVENCIÓN</strong><br>
                    <span style="font-size: 0.9rem;">${ot.tipoIntervencion}</span>
                </div>
                <div style="text-align: right; font-weight: bold; font-size: 1rem; color: #2e7d32;">
                    Total: ${presupuestoFormateado}
                </div>
            </div>`;
            
            const tooltipEscaped = tooltipHTML.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
            
            html += `<div class="gantt-bar-v2 gantt-tooltip-trigger" 
                style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 0.2)}%; top: ${topPosition}px; position: absolute; background: ${color};"
                data-tooltip="${tooltipEscaped}">
                <span style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${ot.numeroOT} · ${ot.nombreRecinto}
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
    
    // Inicializar tooltips
    inicializarTooltips();
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
            if (top + 200 > window.innerHeight) top = rect.top - 210;
            if (left < 10) left = 10;
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });
        
        bar.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
    });
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
