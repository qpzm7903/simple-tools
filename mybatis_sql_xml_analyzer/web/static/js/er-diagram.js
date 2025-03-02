// ER Diagram renderer using JointJS
let paper, graph;
let currentScale = 1;

// Initialize the JointJS diagram
function initializeERDiagram() {
    const namespace = joint.shapes;
    
    // Create a new directed graph
    graph = new joint.dia.Graph({}, { cellNamespace: namespace });
    
    // Create a paper to render the graph
    paper = new joint.dia.Paper({
        el: document.getElementById('diagram-canvas'),
        model: graph,
        width: '100%',
        height: 600,
        gridSize: 10,
        drawGrid: true,
        background: {
            color: 'rgba(0, 0, 0, 0.03)'
        },
        interactive: true,
        cellViewNamespace: namespace
    });
    
    // Enable panning
    paper.on('blank:pointerdown', function(evt, x, y) {
        const scale = paper.scale();
        paper.setOrigin(0, 0);
        const normalizedX = x * scale.sx;
        const normalizedY = y * scale.sy;
        paper.translate(normalizedX, normalizedY);
    });
    
    // Setup zoom buttons
    document.getElementById('zoom-in-btn').addEventListener('click', function() {
        zoomIn();
    });
    
    document.getElementById('zoom-out-btn').addEventListener('click', function() {
        zoomOut();
    });
    
    document.getElementById('fit-content-btn').addEventListener('click', function() {
        fitContent();
    });
    
    // Setup download buttons
    document.getElementById('download-svg-btn').addEventListener('click', function() {
        downloadDiagram('svg');
    });
    
    document.getElementById('download-png-btn').addEventListener('click', function() {
        downloadDiagram('png');
    });
}

// Render ER diagram from relationship data
function renderERDiagram(relationshipData) {
    if (!paper || !graph) {
        initializeERDiagram();
    }
    
    // Clear previous diagram
    graph.clear();
    
    const entities = {};
    const relationships = [];
    
    // First pass: Create unique entities
    relationshipData.forEach(rel => {
        if (!entities[rel.source_table]) {
            entities[rel.source_table] = createEntity(rel.source_table);
        }
        
        if (!entities[rel.target_table]) {
            entities[rel.target_table] = createEntity(rel.target_table);
        }
        
        relationships.push(rel);
    });
    
    // Position entities in a grid layout
    positionEntities(Object.values(entities));
    
    // Add all entities to the graph
    Object.values(entities).forEach(entity => {
        graph.addCell(entity);
    });
    
    // Add relationships
    relationships.forEach(rel => {
        const link = createRelationship(
            entities[rel.source_table],
            entities[rel.target_table],
            rel.source_field,
            rel.target_field
        );
        graph.addCell(link);
    });
    
    // Enable download buttons
    document.getElementById('download-svg-btn').disabled = false;
    document.getElementById('download-png-btn').disabled = false;
    
    // Fit the content
    fitContent();
}

// Create an entity (table) shape
function createEntity(tableName) {
    const entity = new joint.shapes.standard.Rectangle({
        attrs: {
            body: {
                fill: 'var(--entity-bg-color, #fff)',
                stroke: 'var(--entity-border-color, #333)',
                strokeWidth: 2,
                rx: 5,
                ry: 5
            },
            label: {
                text: tableName,
                fill: 'var(--text-color, #333)',
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                textVerticalAnchor: 'middle',
                textAnchor: 'middle'
            }
        },
        size: { width: 160, height: 50 }
    });
    
    return entity;
}

// Create a relationship (link) between entities
function createRelationship(sourceEntity, targetEntity, sourceField, targetField) {
    const link = new joint.shapes.standard.Link({
        source: { id: sourceEntity.id },
        target: { id: targetEntity.id },
        attrs: {
            line: {
                stroke: 'var(--relationship-line-color, #333)',
                strokeWidth: 2,
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z'
                }
            }
        },
        labels: [
            {
                position: 0.3,
                attrs: {
                    text: {
                        text: sourceField,
                        fill: 'var(--text-color, #333)',
                        fontSize: 12,
                        fontFamily: 'Arial, sans-serif',
                        textAnchor: 'middle'
                    },
                    rect: {
                        fill: 'var(--entity-bg-color, #fff)',
                        stroke: 'var(--relationship-line-color, #333)',
                        strokeWidth: 1,
                        rx: 3,
                        ry: 3
                    }
                }
            },
            {
                position: 0.7,
                attrs: {
                    text: {
                        text: targetField,
                        fill: 'var(--text-color, #333)',
                        fontSize: 12,
                        fontFamily: 'Arial, sans-serif',
                        textAnchor: 'middle'
                    },
                    rect: {
                        fill: 'var(--entity-bg-color, #fff)',
                        stroke: 'var(--relationship-line-color, #333)',
                        strokeWidth: 1,
                        rx: 3,
                        ry: 3
                    }
                }
            }
        ]
    });
    
    return link;
}

// Position entities in a grid layout
function positionEntities(entities) {
    const gridSize = Math.ceil(Math.sqrt(entities.length));
    const xSpacing = 250;
    const ySpacing = 150;
    
    entities.forEach((entity, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        entity.position(50 + col * xSpacing, 50 + row * ySpacing);
    });
}

// Zoom in
function zoomIn() {
    currentScale = Math.min(currentScale + 0.1, 2);
    paper.scale(currentScale);
}

// Zoom out
function zoomOut() {
    currentScale = Math.max(currentScale - 0.1, 0.3);
    paper.scale(currentScale);
}

// Fit content to view
function fitContent() {
    paper.scaleContentToFit({ padding: 50 });
    currentScale = paper.scale().sx;
}

// Download diagram as SVG or PNG
function downloadDiagram(format) {
    let dataUrl;
    
    if (format === 'svg') {
        const svgDoc = paper.svg;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgDoc);
        dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        downloadFile(dataUrl, 'er-diagram.svg');
    } else if (format === 'png') {
        // Convert SVG to PNG using canvas
        const svgDoc = paper.svg;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgDoc);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create an image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(svgUrl);
            
            // Convert canvas to PNG
            try {
                const pngUrl = canvas.toDataURL('image/png');
                downloadFile(pngUrl, 'er-diagram.png');
            } catch (e) {
                console.error('Failed to convert to PNG:', e);
                alert('Failed to download as PNG. Try using SVG instead.');
            }
        };
        
        img.src = svgUrl;
    }
}

// Helper function to download a file
function downloadFile(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Apply theme to diagram
function applyThemeToDiagram(isDarkMode) {
    document.documentElement.style.setProperty('--entity-bg-color', isDarkMode ? '#2b3035' : '#ffffff');
    document.documentElement.style.setProperty('--entity-border-color', isDarkMode ? '#6c757d' : '#333333');
    document.documentElement.style.setProperty('--relationship-line-color', isDarkMode ? '#adb5bd' : '#333333');
    document.documentElement.style.setProperty('--text-color', isDarkMode ? '#f8f9fa' : '#333333');
    
    // Refresh the diagram with new theme colors
    if (paper && graph) {
        paper.drawBackground();
        graph.getCells().forEach(cell => cell.trigger('change:attrs'));
    }
}

// Adjust the existing script.js file to call our JointJS functions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize JointJS diagram
    initializeERDiagram();
    
    // Handle theme changes
    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            applyThemeToDiagram(isDarkMode);
        });
    }
}); 