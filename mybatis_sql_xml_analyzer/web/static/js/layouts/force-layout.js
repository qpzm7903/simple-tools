// Force Directed Layout Implementation
function applyForceLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING) {
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
        applyForces(simulation, k, gravity, charge, paperWidth, paperHeight);
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
function applyForces(simulation, k, gravity, charge, paperWidth, paperHeight) {
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
    const centerX = paperWidth / 2;
    const centerY = paperHeight / 2;
    
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

// Export the layout function
export { applyForceLayout }; 