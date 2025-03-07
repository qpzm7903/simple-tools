// ER Diagram renderer using JointJS
let paper, graph;
let currentScale = 1;
let isPanning = false;
let panningThreshold = 200; // Time in ms to hold before panning starts
let panningTimer = null;
let lastMousePosition = { x: 0, y: 0 };
let paperOrigin = { x: 0, y: 0 };
let currentLayout = 'grid'; // Default layout
let currentEntities = []; // Store entities for layout changes

// Import layout manager
import { applyLayout, updateLinks, MIN_ENTITY_SPACING } from './layouts/layout-manager.js';

// Initialize the JointJS diagram
function initializeERDiagram() {
    const namespace = joint.shapes;
    
    // Create a new directed graph
    graph = new joint.dia.Graph({}, { cellNamespace: namespace });
    
    // Get the actual container width and height
    const container = document.getElementById('diagram-canvas');
    const containerWidth = container.clientWidth || 800;
    const containerHeight = Math.max(600, window.innerHeight * 0.6); // Use at least 60% of window height
    
    console.log(`Initializing diagram with size: ${containerWidth}x${containerHeight}`);
    
    // Create a paper to render the graph
    paper = new joint.dia.Paper({
        el: container,
        model: graph,
        width: containerWidth, 
        height: containerHeight,
        gridSize: 10,
        drawGrid: true,
        background: {
            color: 'rgba(0, 0, 0, 0.03)'
        },
        interactive: {
            elementMove: true,
            addLinkFromMagnet: false
        },
        cellViewNamespace: namespace
    });
    
    // Setup element interaction behaviors
    setupElementInteractions();
    
    // Setup panning behavior
    setupPanning();
    
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
    
    // Add layout control dropdown if it doesn't exist
    createLayoutControls();
    
    // Add window resize handler
    window.addEventListener('resize', function() {
        const newWidth = container.clientWidth || 800;
        const newHeight = Math.max(600, window.innerHeight * 0.6);
        if (paper && (paper.options.width !== newWidth || paper.options.height !== newHeight)) {
            console.log(`Resizing paper to: ${newWidth}x${newHeight}`);
            paper.setDimensions(newWidth, newHeight);
        }
    });
}

// Create layout control dropdown
function createLayoutControls() {
    // Check if controls already exist
    if (document.getElementById('layout-controls')) {
        return;
    }
    
    // Create layout controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'layout-controls';
    controlsContainer.className = 'layout-controls';
    controlsContainer.style.cssText = 'margin: 10px 0; display: flex; align-items: center;';
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = 'layout-select';
    label.textContent = 'Layout:';
    label.style.marginRight = '10px';
    
    // Create select dropdown
    const select = document.createElement('select');
    select.id = 'layout-select';
    select.className = 'layout-select';
    select.style.cssText = 'padding: 5px; border-radius: 5px; margin-right: 10px;';
    
    // Layout options
    const layouts = [
        { value: 'grid', label: 'Grid' },
        { value: 'dagre', label: 'Hierarchical (Dagre)' },
        { value: 'force', label: 'Force-Directed' },
        { value: 'circular', label: 'Circular' },
        { value: 'radial', label: 'Radial' },
        { value: 'fruchterman', label: 'Fruchterman-Reingold' }
    ];
    
    // Add options to select
    layouts.forEach(layout => {
        const option = document.createElement('option');
        option.value = layout.value;
        option.textContent = layout.label;
        if (layout.value === currentLayout) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Create apply button
    const applyButton = document.createElement('button');
    applyButton.id = 'apply-layout-btn';
    applyButton.textContent = 'Apply Layout';
    applyButton.className = 'btn btn-primary btn-sm';
    
    // Add event listener to apply button
    applyButton.addEventListener('click', function() {
        const selectedLayout = select.value;
        currentLayout = selectedLayout;
        applySelectedLayout(selectedLayout);
    });
    
    // Append elements to container
    controlsContainer.appendChild(label);
    controlsContainer.appendChild(select);
    controlsContainer.appendChild(applyButton);
    
    // Find the appropriate place to insert the controls
    const canvasContainer = document.getElementById('diagram-canvas').parentNode;
    const zoomControls = document.querySelector('.zoom-controls');
    
    if (zoomControls) {
        // Insert before zoom controls
        canvasContainer.insertBefore(controlsContainer, zoomControls);
    } else {
        // Insert before canvas
        canvasContainer.insertBefore(controlsContainer, document.getElementById('diagram-canvas'));
    }
    
    // Log to confirm creation
    console.log('Layout controls created. Current layout:', currentLayout);
}

// Apply the selected layout
function applySelectedLayout(layoutType) {
    // Get all elements (entities)
    const elements = graph.getElements();
    
    if (elements.length === 0) {
        console.log('No elements to layout');
        return; // No elements to layout
    }
    
    // Store current entities for layout changes
    currentEntities = elements;
    
    // Get actual paper dimensions
    const paperWidth = paper.options.width;
    const paperHeight = paper.options.height;
    
    // Reset scale temporarily for layout calculation
    const originalScale = currentScale;
    
    try {
        // Apply the selected layout using the layout manager
        applyLayout(layoutType, elements, paperWidth, paperHeight, graph, paper);
        
        // Update links after applying the layout
        updateLinks(graph);
        
        // Fit content after layout with some delay to ensure positioning is complete
        setTimeout(function() {
            // Use gentle fit content that maintains reasonable spacing
            fitContentWithPadding();
        }, 600);
        
    } catch (error) {
        console.error("Error applying layout:", error);
    }
}

// Custom fit content that ensures reasonable padding
function fitContentWithPadding() {
    if (!graph || graph.getElements().length === 0) return;
    
    // Get the bounding box of all elements
    const contentBBox = graph.getBBox();
    if (!contentBBox) return;
    
    // Get the current paper dimensions
    const paperWidth = paper.options.width;
    const paperHeight = paper.options.height;
    
    // Add reduced padding around the content to make the diagram more compact
    const padding = Math.min(60, Math.max(30, Math.min(paperWidth, paperHeight) * 0.04)); // Dynamic smaller padding
    const paddedWidth = contentBBox.width + padding * 2;
    const paddedHeight = contentBBox.height + padding * 2;
    
    // Calculate the scale needed to fit the content with padding
    const scaleX = paperWidth / paddedWidth;
    const scaleY = paperHeight / paddedHeight;
    
    // Be more aggressive with scaling to fit everything better
    const scale = Math.min(Math.min(scaleX, scaleY), 1.3); // Allow scaling up to 1.3x if needed
    
    console.log(`Fitting content with scale: ${scale}, content size: ${paddedWidth}x${paddedHeight}`);
    
    // Set the new scale
    currentScale = scale;
    paper.scale(scale);
    
    // Center the content
    const centerX = (paperWidth - contentBBox.width * scale) / 2;
    const centerY = (paperHeight - contentBBox.height * scale) / 2;
    
    // Translate to center, accounting for the content's position
    paper.translate(
        centerX - contentBBox.x * scale,
        centerY - contentBBox.y * scale
    );
    
    // Update paperOrigin
    paperOrigin = { 
        x: paper.translate().tx, 
        y: paper.translate().ty 
    };
}

// Setup element interaction behaviors
function setupElementInteractions() {
    // When clicking on an element, highlight it and prepare for dragging
    paper.on('element:pointerdown', function(elementView, evt) {
        // Prevent panning when interacting with elements
        evt.stopPropagation();
        
        // Change cursor to indicate dragging
        elementView.el.style.cursor = 'grabbing';
        
        // Optional: Add visual feedback like highlighting
        elementView.model.attr('body/stroke', '#2196F3');
        elementView.model.attr('body/strokeWidth', 3);
    });
    
    // When dragging is done, reset the styling
    paper.on('element:pointerup', function(elementView) {
        // Reset cursor
        elementView.el.style.cursor = '';
        
        // Reset highlighting
        elementView.model.attr('body/stroke', 'var(--entity-border-color, #333)');
        elementView.model.attr('body/strokeWidth', 2);
    });
}

// Setup panning functionality
function setupPanning() {
    const canvas = document.getElementById('diagram-canvas');
    
    // Initialize paperOrigin with current paper translation
    paperOrigin = { 
        x: paper.options.origin.x || 0, 
        y: paper.options.origin.y || 0 
    };
    
    // Prevent text selection during panning
    canvas.addEventListener('selectstart', function(e) {
        if (isPanning) {
            e.preventDefault();
            return false;
        }
    });
    
    // Mouse down - start panning timer
    canvas.addEventListener('mousedown', function(e) {
        // More comprehensive check for diagram elements
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        
        // Check if we're clicking on any diagram elements (including SVG group elements)
        if (elementBelow) {
            // Get the closest SVG element or group
            const svgElement = elementBelow.closest('g.joint-cell, rect, text, path, circle');
            if (svgElement) {
                // We're on a diagram element, don't start panning
                return;
            }
        }
        
        // Store initial mouse position
        lastMousePosition = { x: e.clientX, y: e.clientY };
        
        // Start a timer - if mouse is held down for threshold time, start panning
        panningTimer = setTimeout(function() {
            isPanning = true;
            // Set cursor to indicate panning
            canvas.style.cursor = 'grabbing';
        }, panningThreshold);
    });
    
    // Mouse move - pan if we're in panning mode
    canvas.addEventListener('mousemove', function(e) {
        if (isPanning) {
            // Calculate how far the mouse has moved since the last position
            const dx = e.clientX - lastMousePosition.x;
            const dy = e.clientY - lastMousePosition.y;
            
            // Update the paper's translation by the delta (not absolute position)
            // Use tx() and ty() to get current translation values
            const currentTx = paper.translate().tx;
            const currentTy = paper.translate().ty;
            
            // Apply the relative movement scaled appropriately
            paper.translate(currentTx + (dx / currentScale), currentTy + (dy / currentScale));
            
            // Update the last mouse position for next move event
            lastMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    // Mouse up - end panning
    window.addEventListener('mouseup', function() {
        if (panningTimer) {
            clearTimeout(panningTimer);
            panningTimer = null;
        }
        
        if (isPanning) {
            isPanning = false;
            // Store the new paper origin
            paperOrigin = { 
                x: paper.translate().tx, 
                y: paper.translate().ty 
            };
            // Reset cursor
            canvas.style.cursor = '';
        }
    });
    
    // Mouse leave - end panning
    canvas.addEventListener('mouseleave', function() {
        if (panningTimer) {
            clearTimeout(panningTimer);
            panningTimer = null;
        }
        
        if (isPanning) {
            isPanning = false;
            // Store the new paper origin
            paperOrigin = { 
                x: paper.translate().tx, 
                y: paper.translate().ty 
            };
            // Reset cursor
            canvas.style.cursor = '';
        }
    });
    
    // Prevent context menu from appearing on right-click
    canvas.addEventListener('contextmenu', function(e) {
        if (isPanning) {
            e.preventDefault();
        }
    });
}

// Render ER diagram from relationship data
function renderERDiagram(relationshipData) {
    if (!paper || !graph) {
        initializeERDiagram();
    }
    
    // Clear previous diagram
    graph.clear();
    
    // Check container dimensions and update if needed
    const container = document.getElementById('diagram-canvas');
    const containerWidth = container.clientWidth || 800;
    const containerHeight = Math.max(600, window.innerHeight * 0.6);
    
    if (paper.options.width !== containerWidth || paper.options.height !== containerHeight) {
        console.log(`Updating paper dimensions to: ${containerWidth}x${containerHeight}`);
        paper.setDimensions(containerWidth, containerHeight);
    }
    
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
    
    // Reset paper origin and scale
    paper.translate(0, 0);
    currentScale = 1;
    paper.scale(1);
    
    // Apply the current layout after a short delay to ensure rendering is complete
    console.log('Rendering diagram with layout:', currentLayout);
    setTimeout(function() {
        applySelectedLayout(currentLayout);
    }, 100);
}

// Create an entity (table) shape with better sizing
function createEntity(tableName) {
    // Calculate width based on table name length (with minimum and maximum)
    const textWidth = tableName.length * 10; // Rough estimate of text width
    const width = Math.max(160, Math.min(300, textWidth + 40)); // Min 160, Max 300
    
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
        size: { width: width, height: 50 }
    });
    
    return entity;
}

// Create a relationship (link) between entities
function createRelationship(sourceEntity, targetEntity, sourceField, targetField) {
    const link = new joint.shapes.standard.Link({
        source: { id: sourceEntity.id },
        target: { id: targetEntity.id },
        router: { 
            name: 'manhattan', 
            args: {
                padding: 20,
                startDirections: ['right', 'bottom', 'top', 'left'],
                endDirections: ['left', 'bottom', 'top', 'right']
            } 
        },
        connector: { name: 'rounded' },
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
    // Save original scale to prevent unwanted zooming
    const originalScale = currentScale;
    
    // Add additional padding to prevent content from touching the edges
    paper.scaleContentToFit({ 
        padding: 50,
        minScale: 0.2,
        maxScale: 1.5
    });
    
    // Update current scale
    currentScale = paper.scale().sx;
    console.log(`Fitted content with scale: ${currentScale}`);
    
    // Update paperOrigin
    paperOrigin = { 
        x: paper.translate().tx, 
        y: paper.translate().ty 
    };
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

// Export the renderERDiagram function to make it globally accessible
// This is needed because script.js uses this function but isn't an ES module
window.renderERDiagram = renderERDiagram; 