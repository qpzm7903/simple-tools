// Dagre (Hierarchical) Layout Implementation
function applyDagreLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING) {
    // Check if joint.layout.DirectedGraph is available
    if (typeof joint.layout.DirectedGraph !== 'function') {
        console.error('Dagre layout requires the joint.layout.DirectedGraph plugin');
        throw new Error('Dagre layout plugin not available');
        return;
    }
    
    const links = graph.getLinks();
    
    // If there are no links, fall back to grid layout
    if (links.length === 0) {
        console.log('No links for Dagre layout, falling back to grid');
        throw new Error('No links available for Dagre layout');
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
        throw e;
    }
}

// Export the layout function
export { applyDagreLayout }; 