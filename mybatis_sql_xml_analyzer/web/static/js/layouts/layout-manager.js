// Layout Manager - Coordinates all layout strategies
import { applyGridLayout } from './grid-layout.js';
import { applyDagreLayout } from './dagre-layout.js';
import { applyForceLayout } from './force-layout.js';
import { applyCircularLayout } from './circular-layout.js';
import { applyRadialLayout } from './radial-layout.js';
import { applyFruchtermanLayout } from './fruchterman-layout.js';

// Constants
const MIN_ENTITY_SPACING = 60; // Reduced from 100px to 60px for more compact layout

/**
 * Apply the selected layout to graph elements
 * @param {string} layoutType - The type of layout to apply
 * @param {Array} elements - The graph elements to position
 * @param {number} paperWidth - The width of the paper
 * @param {number} paperHeight - The height of the paper
 * @param {Object} graph - The JointJS graph instance
 * @param {Object} paper - The JointJS paper instance
 */
function applyLayout(layoutType, elements, paperWidth, paperHeight, graph, paper) {
    console.log('Applying layout:', layoutType);
    
    if (elements.length === 0) {
        console.log('No elements to layout');
        return; // No elements to layout
    }
    
    console.log('Found elements:', elements.length);
    console.log(`Paper dimensions for layout: ${paperWidth}x${paperHeight}`);
    
    try {
        // Apply the selected layout
        switch (layoutType) {
            case 'grid':
                applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
                break;
            case 'dagre':
                try {
                    applyDagreLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING);
                } catch (e) {
                    console.error('Error applying Dagre layout:', e);
                    // Fall back to grid layout
                    applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
                }
                break;
            case 'force':
                applyForceLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING);
                break;
            case 'circular':
                applyCircularLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
                break;
            case 'radial':
                try {
                    applyRadialLayout(elements, paperWidth, paperHeight, graph, paper, MIN_ENTITY_SPACING);
                } catch (e) {
                    console.error('Error applying Radial layout:', e);
                    // Fall back to grid layout
                    applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
                }
                break;
            case 'fruchterman':
                applyFruchtermanLayout(elements, paperWidth, paperHeight, graph, MIN_ENTITY_SPACING);
                break;
            default:
                applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
        }
        
        // Success message
        console.log(`Successfully applied ${layoutType} layout to ${elements.length} elements`);
        
    } catch (error) {
        console.error("Error applying layout:", error);
        // Fall back to grid layout if other layouts fail
        try {
            applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING);
        } catch (gridError) {
            console.error("Critical error in grid layout fallback:", gridError);
        }
    }
}

/**
 * Update links after layout change
 * @param {Object} graph - The JointJS graph instance
 */
function updateLinks(graph) {
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

// Export the layout functions
export { 
    applyLayout, 
    updateLinks,
    MIN_ENTITY_SPACING
}; 