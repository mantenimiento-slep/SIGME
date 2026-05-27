// Configuración de Google Sheets
const SHEET_ID = '1_9ewqYv-o3O37ylPS6vxcGceBOQ1l4jB2VlM2T_4iSg';
const SHEET_NAME = 'BBDD_OT';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// Variables globales
let todasLasOTs = [];
let lineasUnicas = [];

// Función para cargar datos
async function cargarDatos() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const dashboard = document.getElementById('dashboard');
    
    try {
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
        dashboard.style.display = 'none';
        
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Error al cargar datos de Google Sheets');
        
        const csvText = await response.text();
        const datos = parseCSV(csvText);
        
        if (datos.length === 0) throw new Error('No se encontraron datos en la hoja');
        
        todasLasOTs = procesarDatos(datos);
        lineasUnicas = [...new Set(todasLasOTs.map(ot => ot.lineaTrabajo))].filter(Boolean);
        
        actualizarEstadisticas();
        llenarFiltros();
        renderizarDashboard();
        
        loadingSpinner.style.display = 'none';
        dashboard.style.display = 'block';
        
    } catch (error) {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = error.message;
        console.error('Error:', error);
    }
}

// Parsear CSV
function parseCSV(csvText) {
    const lineas = csvText.split('\n');
    const headers = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        
        const valores = parsearLineaCSV(lineas[i]);
        const fila = {};
        headers.forEach((header, index) => {
            fila[header] = valores[index] ? valores[index].trim().replace(/"/g, '') : '';
        });
        datos.push(fila);
    }
    
    return datos;
}

// Parsear línea CSV respetando comillas
function parsearLineaCSV(linea) {
    const resultado = [];
    let actual = '';
    let entreComillas = false;
    
    for (let char of linea) {
        if (char === '"') {
            entreComillas = !entreComillas;
        } else if (char === ',' && !entreComillas) {
            resultado.push(actual);
            actual = '';
        } else {
            actual += char;
        }
    }
    resultado.push(actual);
    return resultado;
}

// Procesar datos - CORREGIDO para MAYÚSCULAS
function procesarDatos(datos) {
    return datos.map(fila => ({
        numeroOT: fila['N° OT'] || '',
        ito: fila['ITO'] || '',
        nombreRecinto: fila['NOMBRE RECINTO'] || '',
        tipoRecinto: fila['TIPO RECINTO'] || '',
        tipoIntervencion: fila['TIPO INTERVENCIÓN'] || '',
        fechaVisita: fila['FECHA VISITA'] || '',
        estado: fila['ESTADO'] || '',
        presupuesto: fila['PRESUPUESTO'] || '0',
        plazoProyectado: fila['PLAZO PROYECTADO'] || '',
        lineaTrabajo: fila['LÍNEA DE TRABAJO'] || '',
        fechaInicio: fila['FECHA INICIO'] || '',
        fechaFin: fila['FECHA FIN'] || '',
        numeroEP: fila['N° EP'] || ''
    }));
}

// Actualizar estadísticas del header
function actualizarEstadisticas() {
    document.getElementById('totalOT').innerHTML = `<i class="fas fa-clipboard-list"></i> ${todasLasOTs.length} OT`;
    
    const recintosUnicos = new Set(todasLasOTs.map(ot => ot.nombreRecinto).filter(Boolean));
    document.getElementById('totalRecintos').innerHTML = `<i class="fas fa-school"></i> ${recintosUnicos.size} EE`;
}

// Llenar filtros
function llenarFiltros() {
    const filterLinea = document.getElementById('filterLinea');
    const filterEstado = document.getElementById('filterEstado');
    const filterTipo = document.getElementById('filterTipo');
    
    // Líneas de trabajo
    lineasUnicas.sort().forEach(linea => {
        const option = document.createElement('option');
        option.value = linea;
        option.textContent = linea;
        filterLinea.appendChild(option);
    });
    
    // Estados
    const estadosUnicos = [...new Set(todasLasOTs.map(ot => ot.estado))].sort();
    estadosUnicos.forEach(estado => {
        if (estado) {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            filterEstado.appendChild(option);
        }
    });
    
    // Tipos de intervención
    const tiposUnicos = [...new Set(todasLasOTs.map(ot => ot.tipoIntervencion))].sort();
    tiposUnicos.forEach(tipo => {
        if (tipo) {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            filterTipo.appendChild(option);
        }
    });
}

// Renderizar dashboard
function renderizarDashboard() {
    const dashboard = document.getElementById('dashboard');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const tipoFiltro = document.getElementById('filterTipo').value;
    
    // Filtrar OTs
    let otsFiltradas = todasLasOTs.filter(ot => {
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLinea = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchTipo = !tipoFiltro || ot.tipoIntervencion === tipoFiltro;
        
        return matchSearch && matchLinea && matchEstado && matchTipo;
    });
    
    // Agrupar por línea de trabajo
    const lineasAMostrar = lineaFiltro ? [lineaFiltro] : lineasUnicas;
    
    dashboard.innerHTML = '';
    
    lineasAMostrar.forEach(linea => {
        const otsDeLinea = otsFiltradas.filter(ot => ot.lineaTrabajo === linea);
        if (otsDeLinea.length === 0) return;
        
        const lineaSection = crearLineaSection(linea, otsDeLinea);
        dashboard.appendChild(lineaSection);
    });
    
    if (dashboard.innerHTML === '') {
        dashboard.innerHTML = '<div class="error"><i class="fas fa-search"></i><p>No se encontraron resultados con los filtros actuales</p></div>';
    }
}

// Crear sección de línea de trabajo
function crearLineaSection(linea, ots) {
    const section = document.createElement('div');
    section.className = 'linea-section';
    
    const recintosUnicos = new Set(ots.map(ot => ot.nombreRecinto));
    const presupuestoTotal = ots.reduce((sum, ot) => {
        const presupuesto = parseFloat(ot.presupuesto.replace(/[^0-9.-]+/g, '')) || 0;
        return sum + presupuesto;
    }, 0);
    
    // Calcular progreso
    const completadas = ots.filter(ot => ot.estado.toLowerCase().includes('complet')).length;
    const progreso = ots.length > 0 ? Math.round((completadas / ots.length) * 100) : 0;
    
    section.innerHTML = `
        <div class="linea-header" onclick="toggleLinea(this)">
            <div>
                <h2><i class="fas fa-layer-group"></i> ${linea}</h2>
                <div class="linea-stats">
                    <span><i class="fas fa-clipboard-list"></i> ${ots.length} OT</span>
                    <span><i class="fas fa-school"></i> ${recintosUnicos.size} EE</span>
                    <span><i class="fas fa-dollar-sign"></i> ${formatearPresupuesto(presupuestoTotal)}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div class="progress-bar" style="width: 200px;">
                    <div class="progress-fill" style="width: ${progreso}%"></div>
                </div>
                <small style="font-size: 0.8rem; color: var(--text-secondary);">${progreso}% completado</small>
            </div>
        </div>
        <div class="ots-grid">
            ${ots.map(ot => crearOTCard(ot)).join('')}
        </div>
    `;
    
    return section;
}

// Crear tarjeta de OT
function crearOTCard(ot) {
    const estadoClass = `estado-${ot.estado.toLowerCase().replace(/\s+/g, '-')}`;
    const presupuesto = parseFloat(ot.presupuesto.replace(/[^0-9.-]+/g, '')) || 0;
    
    return `
        <div class="ot-card">
            <div class="ot-header">
                <span class="ot-number">OT #${ot.numeroOT}</span>
                <span class="estado-badge ${estadoClass}">${ot.estado}</span>
            </div>
            
            <div class="ot-recinto">
                <i class="fas fa-school"></i>
                ${ot.nombreRecinto}
            </div>
            
            <div class="ot-details">
                <div class="ot-detail">
                    <i class="fas fa-user-tie"></i>
                    <span>ITO: ${ot.ito}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-building"></i>
                    <span>${ot.tipoRecinto}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-tools"></i>
                    <span>${ot.tipoIntervencion}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Visita: ${ot.fechaVisita || 'N/D'}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-calendar-check"></i>
                    <span>Inicio: ${ot.fechaInicio || 'N/D'}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-calendar-times"></i>
                    <span>Fin: ${ot.fechaFin || 'N/D'}</span>
                </div>
            </div>
            
            <div class="ot-footer">
                <span class="presupuesto">
                    <i class="fas fa-money-bill-wave"></i>
                    ${formatearPresupuesto(presupuesto)}
                </span>
                <span>
                    <i class="fas fa-file-invoice"></i>
                    EP: ${ot.numeroEP || 'N/A'}
                </span>
            </div>
        </div>
    `;
}

// Formatear presupuesto
function formatearPresupuesto(monto) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto);
}

// Toggle línea
function toggleLinea(header) {
    const grid = header.nextElementSibling;
    if (grid.style.display === 'none') {
        grid.style.display = 'grid';
    } else {
        grid.style.display = 'none';
    }
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', renderizarDashboard);
document.getElementById('filterLinea').addEventListener('change', renderizarDashboard);
document.getElementById('filterEstado').addEventListener('change', renderizarDashboard);
document.getElementById('filterTipo').addEventListener('change', renderizarDashboard);

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', cargarDatos);
