// Circular Layout Implementation
function applyCircularLayout(elements, paperWidth, paperHeight, MIN_ENTITY_SPACING) {
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

// Export the layout function
export { applyCircularLayout }; 