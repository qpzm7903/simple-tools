// Grid Layout Implementation
function applyGridLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING) {
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

// Export the layout function
export { applyGridLayout }; 