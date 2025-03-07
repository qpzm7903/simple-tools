// Radial Layout Implementation
function applyRadialLayout(elements, paperWidth, paperHeight, graph, paper, MIN_ENTITY_SPACING) {
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
        throw e;
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

// Export the layout function and helper
export { applyRadialLayout, getLevelColor }; 