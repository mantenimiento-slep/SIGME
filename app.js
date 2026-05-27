<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGME 2.0 - Visualizador de Programación</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div>
                <h1><i class="fas fa-school"></i> SIGME 2.0</h1>
                <p>Sistema de Gestión del Mantenimiento Escolar</p>
            </div>
            <div class="header-stats">
                <div class="stat-badge" id="totalOT">Cargando...</div>
                <div class="stat-badge" id="totalRecintos">Cargando...</div>
            </div>
        </div>
    </header>

    <main class="main-layout">
        <!-- Panel izquierdo: Filtros -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h3><i class="fas fa-filter"></i> Filtros</h3>
            </div>
            
            <div class="sidebar-section">
                <label for="filterLinea">Línea de Trabajo</label>
                <select id="filterLinea">
                    <option value="">Todas las líneas</option>
                </select>
            </div>
            
            <div class="sidebar-section">
                <label for="filterITO">ITO</label>
                <select id="filterITO">
                    <option value="">Todos los ITO</option>
                </select>
            </div>
            
            <div class="sidebar-section">
                <label for="filterRecinto">Establecimiento</label>
                <input type="text" id="filterRecinto" placeholder="Buscar recinto...">
            </div>
            
            <div class="sidebar-section">
                <label for="searchInput">Buscar OT</label>
                <input type="text" id="searchInput" placeholder="N° OT o palabra clave...">
            </div>
            
            <div class="sidebar-actions">
                <button class="btn-reset" onclick="resetFiltros()">
                    <i class="fas fa-undo"></i> Limpiar filtros
                </button>
            </div>
            
            <div class="sidebar-footer">
                <div class="view-selector">
                    <button class="view-btn active" onclick="cambiarVista('gantt')">
                        <i class="fas fa-chart-gantt"></i> Gantt
                    </button>
                    <button class="view-btn" onclick="cambiarVista('tarjetas')">
                        <i class="fas fa-th-large"></i> Tarjetas
                    </button>
                </div>
            </div>
        </aside>

        <!-- Panel derecho: Contenido -->
        <section class="content">
            <div id="loadingSpinner" class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando programación de mantenimiento...</p>
            </div>

            <div id="errorMessage" class="error" style="display: none;">
                <i class="fas fa-exclamation-triangle"></i>
                <p id="errorText"></p>
            </div>

            <!-- Vista Gantt -->
            <div id="ganttView" class="gantt-container" style="display: none;">
                <div class="gantt-toolbar">
                    <div class="gantt-legend">
                        <span class="legend-item"><span class="legend-color" style="background: #5C9CE6;"></span> Programada</span>
                        <span class="legend-item"><span class="legend-color" style="background: #F5A623;"></span> En Proceso</span>
                        <span class="legend-item"><span class="legend-color" style="background: #5CB85C;"></span> Finalizada</span>
                    </div>
                    <div class="gantt-navigation">
                        <button onclick="zoomGantt(-1)" title="Zoom out"><i class="fas fa-search-minus"></i></button>
                        <button onclick="zoomGantt(1)" title="Zoom in"><i class="fas fa-search-plus"></i></button>
                        <button onclick="scrollGantt('left')" title="Anterior"><i class="fas fa-chevron-left"></i></button>
                        <button onclick="scrollGantt('today')" title="Hoy"><i class="fas fa-calendar-day"></i> Hoy</button>
                        <button onclick="scrollGantt('right')" title="Siguiente"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="gantt-chart" id="ganttChart"></div>
            </div>

            <!-- Vista Tarjetas -->
            <div id="tarjetasView" style="display: none;"></div>
        </section>
    </main>

    <footer class="footer">
        <p>SIGME 2.0 - Desarrollado para la gestión de 76 establecimientos escolares</p>
    </footer>

    <script src="gantt.js"></script>
    <script src="app.js"></script>
</body>
</html>
