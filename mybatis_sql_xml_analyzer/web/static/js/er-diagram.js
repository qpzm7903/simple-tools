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
const MIN_ENTITY_SPACING = 60; // Reduced from 100px to 60px for more compact layout

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
        applyLayout(selectedLayout);
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
function applyLayout(layoutType) {
    console.log('Applying layout:', layoutType);
    
    // Get all elements (entities)
    const elements = graph.getElements();
    
    if (elements.length === 0) {
        console.log('No elements to layout');
        return; // No elements to layout
    }
    
    console.log('Found elements:', elements.length);
    
    // Store current entities for layout changes
    currentEntities = elements;
    
    // Get actual paper dimensions
    const paperWidth = paper.options.width;
    const paperHeight = paper.options.height;
    
    console.log(`Paper dimensions for layout: ${paperWidth}x${paperHeight}`);
    
    // Reset scale temporarily for layout calculation
    const originalScale = currentScale;
    
    try {
        // Apply the selected layout
        switch (layoutType) {
            case 'grid':
                applyGridLayout(elements, paperWidth, paperHeight);
                break;
            case 'dagre':
                applyDagreLayout(elements, paperWidth, paperHeight);
                break;
            case 'force':
                applyForceLayout(elements, paperWidth, paperHeight);
                break;
            case 'circular':
                applyCircularLayout(elements, paperWidth, paperHeight);
                break;
            case 'radial':
                applyRadialLayout(elements, paperWidth, paperHeight);
                break;
            case 'fruchterman':
                applyFruchtermanLayout(elements, paperWidth, paperHeight);
                break;
            default:
                applyGridLayout(elements, paperWidth, paperHeight);
        }
        
        // After applying layout, update links
        updateLinks();
        
        // Fit content after layout with some delay to ensure positioning is complete
        setTimeout(function() {
            // Use gentle fit content that maintains reasonable spacing
            fitContentWithPadding();
        }, 600);
        
    } catch (error) {
        console.error("Error applying layout:", error);
        // Fall back to grid layout if other layouts fail
        applyGridLayout(elements, paperWidth, paperHeight);
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

// Update links after layout change
function updateLinks() {
    // Get all links and make sure they update with the new element positions
    const links = graph.getLinks();
    links.forEach(link => {
        // Force link update
        const source = link.source();
        const target = link.target();
        
        if (source.id && target.id) {
            // This will trigger link routing update
            link.set('source', { id: source.id });
            link.set('target', { id: target.id });
        }
    });
}

// Apply grid layout
function applyGridLayout(elements, paperWidth, paperHeight) {
    // Get the number of rows and columns for the grid
    const count = elements.length;
    const gridSize = Math.ceil(Math.sqrt(count));
    
    // Calculate the available space
    const availableWidth = paperWidth * 0.9;  // Use 90% of paper width
    const availableHeight = paperHeight * 0.9; // Use 90% of paper height
    
    // Calculate the spacing between elements with more compact spacing
    const xSpacing = Math.max(MIN_ENTITY_SPACING, availableWidth / gridSize);
    const ySpacing = Math.max(MIN_ENTITY_SPACING, availableHeight / gridSize);
    
    console.log(`Grid layout with spacing: ${xSpacing}x${ySpacing}, using ${gridSize}x${gridSize} grid`);
    
    // Position elements in a grid
    elements.forEach((element, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        // Calculate position with margins
        const x = (paperWidth * 0.05) + col * xSpacing;
        const y = (paperHeight * 0.05) + row * ySpacing;
        
        console.log(`Positioning element ${index} at (${x}, ${y})`);
        
        // Apply position with animation
        element.transition('position', { x, y }, {
            delay: 50,
            duration: 500,
            easing: 'quadOut'
        });
    });
}

// Apply dagre (hierarchical) layout
function applyDagreLayout(elements, paperWidth, paperHeight) {
    // Check if joint.layout.DirectedGraph is available
    if (typeof joint.layout.DirectedGraph !== 'function') {
        console.error('Dagre layout requires the joint.layout.DirectedGraph plugin');
        applyGridLayout(elements, paperWidth, paperHeight);
        return;
    }
    
    const links = graph.getLinks();
    
    // If there are no links, fall back to grid layout
    if (links.length === 0) {
        console.log('No links for Dagre layout, falling back to grid');
        applyGridLayout(elements, paperWidth, paperHeight);
        return;
    }
    
    // Apply dagre layout with paper dimensions as constraints
    try {
        joint.layout.DirectedGraph.layout(graph, {
            setLinkVertices: false,
            setVertices: false,
            rankDir: 'LR',
            marginX: paperWidth * 0.1,
            marginY: paperHeight * 0.1,
            nodeSep: Math.max(80, paperWidth * 0.1),
            edgeSep: Math.max(80, paperWidth * 0.05),
            rankSep: Math.max(150, paperHeight * 0.1)
        });
        
        // Animate to new positions
        elements.forEach(element => {
            const targetPosition = element.get('position');
            // Save current position
            const originalPosition = { x: element.position().x, y: element.position().y };
            // Reset to original position first (for animation)
            element.position(originalPosition.x, originalPosition.y);
            // Animate to target position
            element.transition('position', targetPosition, {
                delay: 50,
                duration: 500,
                easing: 'quadOut'
            });
        });
    } catch (e) {
        console.error('Error applying Dagre layout:', e);
        // Fall back to grid layout
        applyGridLayout(elements, paperWidth, paperHeight);
    }
}

// Apply force directed layout
function applyForceLayout(elements, paperWidth, paperHeight) {
    const links = graph.getLinks();
    const width = paperWidth;
    const height = paperHeight;
    
    console.log('Force layout with dimensions:', width, height);
    
    // Create initial positions in a circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Set initial positions in a circle
    elements.forEach((element, i) => {
        const angle = (i / elements.length) * 2 * Math.PI;
        element.set('position', {
            x: centerX + radius * Math.cos(angle) - element.size().width / 2,
            y: centerY + radius * Math.sin(angle) - element.size().height / 2
        });
    });
    
    // Simple force-directed layout implementation
    const iterations = 50;
    const k = 300; // Optimal distance
    const gravity = 0.1;
    const charge = -3000;
    
    // Create a force simulation
    const simulation = {
        nodes: elements.map(el => ({
            id: el.id,
            x: el.position().x + el.size().width / 2,
            y: el.position().y + el.size().height / 2,
            fx: null,
            fy: null,
            width: el.size().width,
            height: el.size().height
        })),
        links: links.map(link => ({
            source: graph.getCell(link.source().id),
            target: graph.getCell(link.target().id)
        })).map(link => ({
            source: elements.findIndex(el => el.id === link.source.id),
            target: elements.findIndex(el => el.id === link.target.id)
        }))
    };
    
    // Run simulation
    for (let i = 0; i < iterations; i++) {
        // Apply forces
        applyForces(simulation, k, gravity, charge);
    }
    
    // Update positions with animation
    simulation.nodes.forEach((node, i) => {
        elements[i].transition('position', {
            x: node.x - elements[i].size().width / 2,
            y: node.y - elements[i].size().height / 2
        }, {
            delay: 50,
            duration: 500,
            easing: 'quadOut'
        });
    });
}

// Helper function for force layout
function applyForces(simulation, k, gravity, charge) {
    const nodes = simulation.nodes;
    const links = simulation.links;
    
    // Initialize forces
    nodes.forEach(node => {
        node.fx = 0;
        node.fy = 0;
    });
    
    // Apply link forces (attraction)
    links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance - k) / distance * 0.1;
        
        if (distance > 0) {
            target.fx -= dx * force;
            target.fy -= dy * force;
            source.fx += dx * force;
            source.fy += dy * force;
        }
    });
    
    // Apply charge forces (repulsion)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            if (distance > 0) {
                const force = charge / (distance * distance);
                nodeA.fx -= dx * force / distance;
                nodeA.fy -= dy * force / distance;
                nodeB.fx += dx * force / distance;
                nodeB.fy += dy * force / distance;
            }
        }
    }
    
    // Apply gravity towards center
    const centerX = paper.options.width / 2;
    const centerY = paper.options.height / 2;
    
    nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.fx += dx * gravity;
        node.fy += dy * gravity;
    });
    
    // Update positions
    nodes.forEach(node => {
        node.x += Math.min(Math.max(node.fx, -10), 10);
        node.y += Math.min(Math.max(node.fy, -10), 10);
    });
}

// Apply circular layout
function applyCircularLayout(elements, paperWidth, paperHeight) {
    const centerX = paperWidth / 2;
    const centerY = paperHeight / 2;
    const radius = Math.min(paperWidth, paperHeight) / 3;
    
    elements.forEach((element, i) => {
        const angle = (i / elements.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle) - element.size().width / 2;
        const y = centerY + radius * Math.sin(angle) - element.size().height / 2;
        
        element.transition('position', { x, y }, {
            delay: 50,
            duration: 500,
            easing: 'quadOut'
        });
    });
}

// Apply radial layout
function applyRadialLayout(elements, paperWidth, paperHeight) {
    if (elements.length === 0) return;
    
    console.log("Applying radial layout with paper dimensions:", paperWidth, paperHeight);
    
    try {
        // Calculate average entity size to better position elements
        let totalWidth = 0;
        let totalHeight = 0;
        elements.forEach(element => {
            totalWidth += element.size().width;
            totalHeight += element.size().height;
        });
        const avgWidth = totalWidth / elements.length;
        const avgHeight = totalHeight / elements.length;
        console.log(`Average entity size: ${avgWidth.toFixed(1)}x${avgHeight.toFixed(1)}`);
        
        // Determine if we should expand the canvas temporarily - only for larger diagrams
        const originalWidth = paper.options.width;
        const originalHeight = paper.options.height;
        let expandCanvas = elements.length > 20; // Only expand for larger diagrams
        const expandedWidth = expandCanvas ? Math.max(paperWidth, paperWidth * 1.1) : paperWidth; 
        const expandedHeight = expandCanvas ? Math.max(paperHeight, paperHeight * 1.1) : paperHeight;
        
        // Temporarily expand the paper if needed for layout calculations
        if (expandCanvas) {
            console.log(`Temporarily expanding paper for layout calculation: ${expandedWidth}x${expandedHeight}`);
            paper.setDimensions(expandedWidth, expandedHeight);
        }
        
        const centerX = paper.options.width / 2;
        const centerY = paper.options.height / 2;
        
        // Get links for relationship analysis
        const links = graph.getLinks();
        
        // Calculate connections for each element
        const connections = {};
        elements.forEach(element => {
            connections[element.id] = {
                element: element,
                connected: [],
                connectionCount: 0,
                width: element.size().width,
                height: element.size().height
            };
        });
        
        // Map connections - ensure we're only using valid IDs
        links.forEach(link => {
            const source = link.source();
            const target = link.target();
            
            if (!source || !target || !source.id || !target.id) return;
            
            const sourceId = source.id;
            const targetId = target.id;
            
            if (connections[sourceId]) {
                connections[sourceId].connected.push(targetId);
                connections[sourceId].connectionCount++;
            }
            
            if (connections[targetId]) {
                connections[targetId].connected.push(sourceId);
                connections[targetId].connectionCount++;
            }
        });
        
        // Find element with most connections to use as center
        let centralElementId = elements[0].id;
        let maxConnections = connections[centralElementId]?.connectionCount || 0;
        
        Object.keys(connections).forEach(id => {
            if (connections[id].connectionCount > maxConnections) {
                centralElementId = id;
                maxConnections = connections[id].connectionCount;
            }
        });
        
        // Defensive check to ensure central element exists
        if (!connections[centralElementId] || !connections[centralElementId].element) {
            console.error("Central element not found, using first element");
            centralElementId = elements[0].id;
        }
        
        const centralElement = connections[centralElementId].element;
        console.log("Central element selected:", centralElementId, "with", maxConnections, "connections");
        
        // Position central element
        centralElement.position(
            centerX - centralElement.size().width / 2,
            centerY - centralElement.size().height / 2
        );
        
        // BFS to assign levels
        const visited = { [centralElementId]: true };
        let queue = [centralElementId];
        const levels = { [centralElementId]: 0 };
        const nodesByLevel = { 0: [centralElementId] };
        
        // Assign levels based on distance from central node using BFS
        while (queue.length > 0) {
            const nodeId = queue.shift();
            const level = levels[nodeId];
            
            if (!connections[nodeId]) continue; // Skip if node not found
            
            connections[nodeId].connected.forEach(connectedId => {
                if (!visited[connectedId]) {
                    visited[connectedId] = true;
                    levels[connectedId] = level + 1;
                    
                    if (!nodesByLevel[level + 1]) {
                        nodesByLevel[level + 1] = [];
                    }
                    
                    nodesByLevel[level + 1].push(connectedId);
                    queue.push(connectedId);
                }
            });
        }
        
        // Count number of nodes per level to calculate spacing needs
        const nodesPerLevel = {};
        let maxNodesInAnyLevel = 0;
        Object.keys(nodesByLevel).forEach(level => {
            const count = nodesByLevel[level].length;
            nodesPerLevel[level] = count;
            if (count > maxNodesInAnyLevel) {
                maxNodesInAnyLevel = count;
            }
        });
        
        // Calculate max level and effective radius with entity size consideration
        const levelsArray = Object.keys(nodesByLevel).map(Number);
        const maxLevel = levelsArray.length > 0 ? Math.max(...levelsArray) : 0;
        
        // Create visual level indicators (circles)
        const levelCircles = [];
        
        // Calculate radius step with better spacing formula
        // Use the average entity size as the base for calculations
        const maxDimension = Math.max(avgWidth, avgHeight);
        
        // More compact spacing - reduced multiplier and decreased step
        // Further reduce the base radius step for more compact layout
        const baseRadiusStep = maxDimension * (1.2 - Math.min(0.3, elements.length / 100)); // Dynamic reduction based on number of elements
        
        // Make level multiplier smaller as levels increase
        // This means outer rings (with typically fewer nodes) will be closer to inner rings
        const levelMultiplier = 1.0 + Math.min(0.05, (maxLevel > 1 ? 0.05 / maxLevel : 0));
        
        // Calculate space needed based on entity density
        // For diagrams with many entities, we want to be more compact
        const densityFactor = Math.max(0.5, Math.min(1, 15 / elements.length));
        
        // The initial radius should be proportional to the paper size but smaller for more entities
        const paperSize = Math.min(paperWidth, paperHeight);
        const effectiveRadius = Math.min(
            baseRadiusStep * 1.5, 
            paperSize * 0.2 * densityFactor * (1 + (maxLevel / 15))
        );
        
        // Create an array of radius values for each level with more compact progressive spacing
        const levelRadii = [0]; // Level 0 is at the center
        let currentRadius = effectiveRadius;
        for (let i = 1; i <= maxLevel; i++) {
            levelRadii.push(currentRadius);
            // More compact level spacing for higher levels
            const levelProgress = i / maxLevel; // 0 to 1 as we progress through levels
            const adjustedMultiplier = levelMultiplier * (1 - (levelProgress * 0.2)); // Decrease multiplier as we go out
            currentRadius += baseRadiusStep * Math.pow(adjustedMultiplier, i);
        }
        
        // Add an outer radius for unconnected nodes with much less distance
        // Make outer radius closer to the last connected level
        const outerRadiusMultiplier = Math.max(0.5, Math.min(0.8, 10 / Math.max(1, elements.length - Object.keys(visited).length)));
        const outerRadius = currentRadius + (baseRadiusStep * outerRadiusMultiplier);
        
        console.log(`Radial layout levels: ${maxLevel}`);
        console.log(`Level radii:`, levelRadii);
        console.log(`Outer radius for unconnected nodes: ${outerRadius}`);
        
        // Reset all elements to default style
        elements.forEach(element => {
            element.attr('body/stroke', 'var(--entity-border-color, #333)');
            element.attr('body/strokeWidth', 2);
        });
        
        // Highlight central element
        centralElement.attr('body/stroke', '#e91e63');
        centralElement.attr('body/strokeWidth', 3);
        
        // Add visual indicators for levels (subtle circles)
        if (levelRadii.length > 1) {
            // Create level circles for visual reference (optional)
            for (let i = 1; i < levelRadii.length; i++) {
                const levelCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                levelCircle.setAttribute('cx', centerX);
                levelCircle.setAttribute('cy', centerY);
                levelCircle.setAttribute('r', levelRadii[i]);
                levelCircle.setAttribute('fill', 'none');
                levelCircle.setAttribute('stroke', '#e0e0e0');
                levelCircle.setAttribute('stroke-width', '1');
                levelCircle.setAttribute('stroke-dasharray', '5,5');
                levelCircle.setAttribute('class', 'level-indicator');
                
                // Add to SVG behind all elements
                const svgElement = paper.svg;
                const firstChild = svgElement.firstChild;
                svgElement.insertBefore(levelCircle, firstChild);
                
                levelCircles.push(levelCircle);
            }
        }
        
        // Position nodes by level (concentric circles)
        Object.keys(nodesByLevel).forEach(level => {
            if (level === '0') return; // Skip center node
            
            const currentLevel = parseInt(level);
            const radius = levelRadii[currentLevel];
            const nodes = nodesByLevel[level];
            
            if (!nodes || nodes.length === 0) return;
            
            console.log(`Positioning ${nodes.length} nodes at level ${level} with radius ${radius}`);
            
            // Improved angle distribution for cleaner look
            // Simple angle distribution for cleaner look - make sure there's enough space
            // Dynamic angle calculation based on node count
            const angleOffset = (2 * Math.PI) / nodes.length;
            const startAngle = Math.PI / 4; // Start from 45 degrees (looks nicer than 0)
            
            // Sort nodes by size to position larger ones first
            const sortedNodeIds = [...nodes].sort((a, b) => {
                const aSize = connections[a]?.width || 0;
                const bSize = connections[b]?.width || 0;
                return bSize - aSize; // Larger first
            });
            
            // Position nodes with more efficient spacing
            sortedNodeIds.forEach((nodeId, i) => {
                if (!connections[nodeId] || !connections[nodeId].element) return;
                
                const element = connections[nodeId].element;
                const elementWidth = element.size().width;
                const elementHeight = element.size().height;
                
                // Calculate angle with offset to avoid straight vertical/horizontal alignments
                const angle = startAngle + (i * angleOffset);
                
                // Calculate coordinates with safety checks and size adjustments
                const x = centerX + radius * Math.cos(angle) - elementWidth / 2;
                const y = centerY + radius * Math.sin(angle) - elementHeight / 2;
                
                // Safety check to ensure values are valid numbers before applying transform
                if (isNaN(x) || isNaN(y)) {
                    console.error(`Invalid position calculated for element ${nodeId}: (${x}, ${y})`);
                    return;
                }
                
                // Apply position directly instead of using transition for more stability
                element.position(x, y);
                
                // Subtle visual indicator of the level - different border colors
                // Use a color gradient from blue (inner levels) to green (outer levels)
                const levelRatio = currentLevel / Math.max(1, maxLevel);
                const levelColor = getLevelColor(levelRatio);
                element.attr('body/stroke', levelColor);
            });
        });
        
        // Process any unvisited/unconnected nodes in an outer circle
        const unvisitedNodes = elements.filter(element => !visited[element.id]);
        
        if (unvisitedNodes.length > 0) {
            console.log(`Positioning ${unvisitedNodes.length} unconnected nodes in outer circle`);
            
            // Sort unconnected nodes by size
            unvisitedNodes.sort((a, b) => b.size().width - a.size().width);
            
            // More compact positioning for unconnected nodes
            // If there are many unconnected nodes, make multiple concentric rings
            const nodesPerRing = Math.min(12, Math.ceil(Math.sqrt(unvisitedNodes.length * 2)));
            
            unvisitedNodes.forEach((element, i) => {
                const elementWidth = element.size().width;
                const elementHeight = element.size().height;
                
                // Calculate which ring this node belongs to
                const ringIndex = Math.floor(i / nodesPerRing);
                const positionInRing = i % nodesPerRing;
                
                // Calculate radius with small increment between rings
                const ringRadius = outerRadius + (ringIndex * baseRadiusStep * 0.7);
                
                // Calculate angle within the ring
                const angleOffset = (2 * Math.PI) / Math.min(nodesPerRing, unvisitedNodes.length - ringIndex * nodesPerRing);
                const startAngle = Math.PI / 6; // Offset for aesthetics
                const angle = startAngle + positionInRing * angleOffset;
                
                // Calculate coordinates with size adjustments
                const x = centerX + ringRadius * Math.cos(angle) - elementWidth / 2;
                const y = centerY + ringRadius * Math.sin(angle) - elementHeight / 2;
                
                // Safety check to ensure values are valid numbers
                if (isNaN(x) || isNaN(y)) {
                    console.error(`Invalid position calculated for unconnected element: (${x}, ${y})`);
                    return;
                }
                
                // Apply position directly
                element.position(x, y);
                
                // Use a distinct color for unconnected nodes
                element.attr('body/stroke', '#9e9e9e');
            });
            
            // Add outer circle indicator for the first ring only
            const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            outerCircle.setAttribute('cx', centerX);
            outerCircle.setAttribute('cy', centerY);
            outerCircle.setAttribute('r', outerRadius);
            outerCircle.setAttribute('fill', 'none');
            outerCircle.setAttribute('stroke', '#eeeeee');
            outerCircle.setAttribute('stroke-width', '1');
            outerCircle.setAttribute('stroke-dasharray', '3,3');
            outerCircle.setAttribute('class', 'level-indicator');
            
            // Add to SVG behind all elements
            const svgElement = paper.svg;
            const firstChild = svgElement.firstChild;
            svgElement.insertBefore(outerCircle, firstChild);
            
            levelCircles.push(outerCircle);
        }
        
        // Update the link routing models with improved timing
        setTimeout(() => {
            links.forEach(link => {
                try {
                    // Get source and target elements
                    const source = link.source();
                    const target = link.target();
                    
                    if (!source || !target || !source.id || !target.id) return;
                    
                    const sourceId = source.id;
                    const targetId = target.id;
                    
                    // Refresh the link connections
                    link.set({
                        source: { id: sourceId },
                        target: { id: targetId }
                    });
                    
                    // Only adjust if both source and target are in our levels
                    if (levels[sourceId] !== undefined && levels[targetId] !== undefined) {
                        const sourceLevel = levels[sourceId];
                        const targetLevel = levels[targetId];
                        
                        // Determine if this is a level-crossing link
                        if (Math.abs(sourceLevel - targetLevel) > 0) {
                            // For links crossing levels, use a straight router with rounded connector
                            link.router('normal');
                            link.connector('rounded', { radius: 20 });
                            
                            // Style the link based on direction (inward vs outward)
                            if (sourceLevel < targetLevel) {
                                // Outward link (from center to periphery)
                                link.attr('line/stroke', '#2196F3'); // Blue
                                link.attr('line/strokeWidth', 1.5);
                            } else {
                                // Inward link (from periphery to center)
                                link.attr('line/stroke', '#4CAF50'); // Green
                                link.attr('line/strokeWidth', 1.5);
                            }
                        } else {
                            // For same-level links, use curved routing
                            link.router('normal');
                            link.connector('rounded', { radius: 25 });
                            link.attr('line/stroke', '#9C27B0'); // Purple for same level
                            link.attr('line/strokeDasharray', '5,5'); // Dashed
                        }
                    } else {
                        // Default routing for unleveled links
                        link.router('manhattan');
                        link.connector('rounded');
                        link.attr('line/stroke', '#9e9e9e'); // Gray
                    }
                } catch (e) {
                    console.error("Error updating link:", e);
                }
            });
        }, 100);
        
        // Restore original paper dimensions if we expanded them
        if (expandCanvas && (paper.options.width !== originalWidth || paper.options.height !== originalHeight)) {
            setTimeout(() => {
                console.log(`Restoring original paper dimensions: ${originalWidth}x${originalHeight}`);
                paper.setDimensions(originalWidth, originalHeight);
                
                // Update level indicators to match new scaling
                levelCircles.forEach(circle => {
                    // Remove level indicators as they would need rescaling
                    if (circle && circle.parentNode) {
                        circle.parentNode.removeChild(circle);
                    }
                });
            }, 200);
        }
        
        console.log("Radial layout applied successfully");
        
    } catch (e) {
        console.error("Error in radial layout:", e);
        // Fall back to grid layout on error
        applyGridLayout(elements, paperWidth, paperHeight);
    }
}

// Helper function to get a color based on level ratio
function getLevelColor(ratio) {
    // Gradient from blue to green to orange
    if (ratio < 0.33) {
        return '#2196F3'; // Blue for inner levels
    } else if (ratio < 0.66) {
        return '#4CAF50'; // Green for middle levels
    } else {
        return '#FF9800'; // Orange for outer levels
    }
}

// Apply Fruchterman-Reingold layout
function applyFruchtermanLayout(elements, paperWidth, paperHeight) {
    if (elements.length === 0) return;
    
    const width = paperWidth;
    const height = paperHeight;
    const area = width * height;
    const k = Math.sqrt(area / elements.length) * 1.5;
    
    // Initialize with random positions
    elements.forEach(element => {
        element.set('position', {
            x: Math.random() * width * 0.8 + width * 0.1,
            y: Math.random() * height * 0.8 + height * 0.1
        });
    });
    
    const links = graph.getLinks();
    const iterations = 50;
    const temperature = width / 10;
    const coolingFactor = 0.95;
    
    let currentTemp = temperature;
    
    // Create node data
    const nodes = elements.map(element => ({
        id: element.id,
        width: element.size().width,
        height: element.size().height,
        x: element.position().x + element.size().width / 2,
        y: element.position().y + element.size().height / 2,
        dx: 0,
        dy: 0
    }));
    
    // Create edge data
    const edges = links.map(link => {
        const sourceId = link.source().id;
        const targetId = link.target().id;
        const sourceIndex = nodes.findIndex(n => n.id === sourceId);
        const targetIndex = nodes.findIndex(n => n.id === targetId);
        
        return {
            source: sourceIndex >= 0 ? sourceIndex : 0,
            target: targetIndex >= 0 ? targetIndex : 0
        };
    });
    
    // Fruchterman-Reingold algorithm
    for (let i = 0; i < iterations; i++) {
        // Reset forces
        nodes.forEach(node => {
            node.dx = 0;
            node.dy = 0;
        });
        
        // Calculate repulsive forces
        for (let j = 0; j < nodes.length; j++) {
            for (let l = j + 1; l < nodes.length; l++) {
                const nodeA = nodes[j];
                const nodeB = nodes[l];
                
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                
                if (distance > 0) {
                    // Repulsive force
                    const force = k * k / distance;
                    const fx = dx / distance * force;
                    const fy = dy / distance * force;
                    
                    nodeA.dx -= fx;
                    nodeA.dy -= fy;
                    nodeB.dx += fx;
                    nodeB.dy += fy;
                }
            }
        }
        
        // Calculate attractive forces
        edges.forEach(edge => {
            const sourceNode = nodes[edge.source];
            const targetNode = nodes[edge.target];
            
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            
            if (distance > 0) {
                // Attractive force
                const force = distance * distance / k;
                const fx = dx / distance * force;
                const fy = dy / distance * force;
                
                sourceNode.dx += fx;
                sourceNode.dy += fy;
                targetNode.dx -= fx;
                targetNode.dy -= fy;
            }
        });
        
        // Limit movement by temperature
        nodes.forEach(node => {
            const displacement = Math.sqrt(node.dx * node.dx + node.dy * node.dy);
            
            if (displacement > 0) {
                // Limit displacement to temperature
                const limitedDisplacement = Math.min(displacement, currentTemp);
                
                node.x += node.dx / displacement * limitedDisplacement;
                node.y += node.dy / displacement * limitedDisplacement;
                
                // Keep within bounds
                node.x = Math.max(node.width / 2, Math.min(width - node.width / 2, node.x));
                node.y = Math.max(node.height / 2, Math.min(height - node.height / 2, node.y));
            }
        });
        
        // Cool down the system
        currentTemp *= coolingFactor;
    }
    
    // Apply final positions
    nodes.forEach((node, i) => {
        elements[i].transition('position', {
            x: node.x - elements[i].size().width / 2,
            y: node.y - elements[i].size().height / 2
        }, {
            delay: 50,
            duration: 500,
            easing: 'quadOut'
        });
    });
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
        applyLayout(currentLayout);
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