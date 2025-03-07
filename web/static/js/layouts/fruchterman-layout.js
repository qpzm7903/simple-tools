// Fruchterman-Reingold Layout Implementation
function applyFruchtermanLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING) {
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

// Export the layout function
export { applyFruchtermanLayout }; 