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
        console.log('CSV recibido (primeras líneas):', csvText.substring(0, 500)); // Para debug
        
        const datos = parseCSV(csvText);
        console.log('Datos parseados:', datos.length, 'filas');
        console.log('Primera fila de datos:', datos[0]); // Para verificar estructura
        console.log('Encabezados encontrados:', Object.keys(datos[0])); // Columnas reales
        
        if (datos.length === 0) throw new Error('No se encontraron datos en la hoja');
        
        todasLasOTs = procesarDatos(datos);
        console.log('OTs procesadas:', todasLasOTs.length);
        console.log('Ejemplo OT:', todasLasOTs[0]);
        
        lineasUnicas = [...new Set(todasLasOTs.map(ot => ot.lineaTrabajo))].filter(Boolean);
        console.log('Líneas de trabajo únicas:', lineasUnicas);
        
        actualizarEstadisticas();
        llenarFiltros();
        renderizarDashboard();
        
        loadingSpinner.style.display = 'none';
        dashboard.style.display = 'block';
        
    } catch (error) {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = 'Error: ' + error.message + '. Abre la consola (F12) para más detalles.';
        console.error('Error detallado:', error);
    }
}

// Parsear CSV mejorado
function parseCSV(csvText) {
    const lineas = csvText.split('\n').filter(linea => linea.trim());
    if (lineas.length < 2) return [];
    
    const headers = parsearLineaCSV(lineas[0]);
    console.log('Headers encontrados:', headers);
    
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
        const valores = parsearLineaCSV(lineas[i]);
        const fila = {};
        
        headers.forEach((header, index) => {
            // Limpiar el header: quitar comillas, espacios extras, normalizar
            const headerLimpio = header.trim().replace(/"/g, '');
            const valor = valores[index] ? valores[index].trim().replace(/"/g, '') : '';
            fila[headerLimpio] = valor;
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
            resultado.push(actual.trim());
            actual = '';
        } else {
            actual += char;
        }
    }
    resultado.push(actual.trim());
    return resultado;
}

// Procesar datos con mapeo flexible
function procesarDatos(datos) {
    return datos.map((fila, index) => {
        // Función helper para buscar valor por posible nombre de columna
        const obtenerValor = (posiblesNombres) => {
            for (let nombre of posiblesNombres) {
                if (fila[nombre] !== undefined) return fila[nombre];
                // Buscar también sin acentos
                const nombreSinAcentos = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                for (let key in fila) {
                    if (key.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === nombreSinAcentos) {
                        return fila[key];
                    }
                }
            }
            return '';
        };
        
        const ot = {
            numeroOT: obtenerValor(['N° OT', 'Nº OT', 'Nro OT', 'OT', 'Numero OT', 'Número OT']),
            ito: obtenerValor(['ITO', 'Inspector Técnico de Obras']),
            nombreRecinto: obtenerValor(['Nombre Recinto', 'Recinto', 'Establecimiento', 'Nombre Establecimiento']),
            tipoRecinto: obtenerValor(['Tipo Recinto', 'Tipo Establecimiento']),
            tipoIntervencion: obtenerValor(['Tipo Intervención', 'Tipo Intervencion', 'Intervención', 'Intervencion', 'Tipo de Intervención']),
            fechaVisita: obtenerValor(['Fecha Visita', 'Fecha de Visita']),
            estado: obtenerValor(['Estado']),
            presupuesto: obtenerValor(['Presupuesto', 'Monto', 'Presupuesto Asignado']),
            plazoProyectado: obtenerValor(['Plazo Proyectado', 'Plazo']),
            lineaTrabajo: obtenerValor(['Línea de Trabajo', 'Linea de Trabajo', 'Línea', 'Linea']),
            fechaInicio: obtenerValor(['Fecha Inicio', 'Fecha de Inicio']),
            fechaFin: obtenerValor(['Fecha Fin', 'Fecha de Fin', 'Fecha Término', 'Fecha Termino']),
            numeroEP: obtenerValor(['N° EP', 'Nº EP', 'EP', 'Estado de Pago', 'Numero EP'])
        };
        
        // Si no encuentra el número de OT, usar el índice
        if (!ot.numeroOT && fila['N° OT']) ot.numeroOT = fila['N° OT'];
        
        return ot;
    });
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
    filterLinea.innerHTML = '<option value="">Todas las líneas de trabajo</option>';
    lineasUnicas.sort().forEach(linea => {
        if (linea) {
            const option = document.createElement('option');
            option.value = linea;
            option.textContent = linea;
            filterLinea.appendChild(option);
        }
    });
    
    // Estados
    filterEstado.innerHTML = '<option value="">Todos los estados</option>';
    const estadosUnicos = [...new Set(todasLasOTs.map(ot => ot.estado).filter(Boolean))].sort();
    estadosUnicos.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = estado;
        filterEstado.appendChild(option);
    });
    
    // Tipos de intervención
    filterTipo.innerHTML = '<option value="">Todos los tipos de intervención</option>';
    const tiposUnicos = [...new Set(todasLasOTs.map(ot => ot.tipoIntervencion).filter(Boolean))].sort();
    tiposUnicos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        filterTipo.appendChild(option);
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
            (ot.nombreRecinto && ot.nombreRecinto.toLowerCase().includes(searchTerm)) ||
            (ot.ito && ot.ito.toLowerCase().includes(searchTerm)) ||
            (ot.numeroOT && ot.numeroOT.toLowerCase().includes(searchTerm));
        const matchLinea = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchTipo = !tipoFiltro || ot.tipoIntervencion === tipoFiltro;
        
        return matchSearch && matchLinea && matchEstado && matchTipo;
    });
    
    // Agrupar por línea de trabajo
    const lineasAMostrar = lineaFiltro ? [lineaFiltro] : lineasUnicas.filter(Boolean);
    
    dashboard.innerHTML = '';
    
    if (lineasAMostrar.length === 0) {
        dashboard.innerHTML = '<div class="linea-section"><div class="ots-grid">' + 
            otsFiltradas.map(ot => crearOTCard(ot)).join('') + 
            '</div></div>';
    } else {
        lineasAMostrar.forEach(linea => {
            const otsDeLinea = otsFiltradas.filter(ot => ot.lineaTrabajo === linea);
            if (otsDeLinea.length === 0) return;
            
            const lineaSection = crearLineaSection(linea, otsDeLinea);
            dashboard.appendChild(lineaSection);
        });
    }
    
    if (dashboard.innerHTML === '') {
        dashboard.innerHTML = '<div class="error"><i class="fas fa-search"></i><p>No se encontraron resultados con los filtros actuales</p></div>';
    }
}

// Crear sección de línea de trabajo
function crearLineaSection(linea, ots) {
    const section = document.createElement('div');
    section.className = 'linea-section';
    
    const recintosUnicos = new Set(ots.map(ot => ot.nombreRecinto).filter(Boolean));
    const presupuestoTotal = ots.reduce((sum, ot) => {
        const presupuesto = parseFloat(String(ot.presupuesto).replace(/[^0-9.-]+/g, '')) || 0;
        return sum + presupuesto;
    }, 0);
    
    // Calcular progreso
    const completadas = ots.filter(ot => ot.estado && ot.estado.toLowerCase().includes('complet')).length;
    const progreso = ots.length > 0 ? Math.round((completadas / ots.length) * 100) : 0;
    
    section.innerHTML = `
        <div class="linea-header">
            <div>
                <h2><i class="fas fa-layer-group"></i> ${linea || 'Sin línea asignada'}</h2>
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
    const estadoClass = `estado-${(ot.estado || 'sin-estado').toLowerCase().replace(/\s+/g, '-')}`;
    const presupuesto = parseFloat(String(ot.presupuesto).replace(/[^0-9.-]+/g, '')) || 0;
    
    return `
        <div class="ot-card">
            <div class="ot-header">
                <span class="ot-number">${ot.numeroOT ? 'OT #' + ot.numeroOT : 'Sin N° OT'}</span>
                <span class="estado-badge ${estadoClass}">${ot.estado || 'Sin estado'}</span>
            </div>
            
            <div class="ot-recinto">
                <i class="fas fa-school"></i>
                ${ot.nombreRecinto || 'Sin nombre de recinto'}
            </div>
            
            <div class="ot-details">
                <div class="ot-detail">
                    <i class="fas fa-user-tie"></i>
                    <span>ITO: ${ot.ito || 'No asignado'}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-building"></i>
                    <span>${ot.tipoRecinto || 'Sin tipo'}</span>
                </div>
                <div class="ot-detail">
                    <i class="fas fa-tools"></i>
                    <span>${ot.tipoIntervencion || 'Sin tipo'}</span>
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
    if (!monto || monto === 0) return '$0';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto);
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', renderizarDashboard);
document.getElementById('filterLinea').addEventListener('change', renderizarDashboard);
document.getElementById('filterEstado').addEventListener('change', renderizarDashboard);
document.getElementById('filterTipo').addEventListener('change', renderizarDashboard);

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', cargarDatos);
