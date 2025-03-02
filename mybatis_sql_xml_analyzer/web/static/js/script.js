/**
 * MyBatis SQL Relationship Analyzer
 * Frontend JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get form and result elements
    const analysisForm = document.getElementById('analysis-form');
    const directoryPath = document.getElementById('directory-path');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const resultMessage = document.getElementById('result-message');
    
    // Diagram elements
    const diagramImage = document.getElementById('diagram-image');
    const downloadSvgBtn = document.getElementById('download-svg-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');
    
    // Relationships table elements
    const relationshipsTable = document.getElementById('relationships-table').querySelector('tbody');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const downloadJsonBtn = document.getElementById('download-json-btn');
    const downloadMarkdownBtn = document.getElementById('download-markdown-btn');
    
    // PlantUML elements
    const plantumlCode = document.getElementById('plantuml-code');
    const copyPlantumlBtn = document.getElementById('copy-plantuml-btn');
    const downloadPlantumlBtn = document.getElementById('download-plantuml-btn');
    
    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    
    // Store analysis results
    let currentResults = null;
    
    // Initialize theme
    initTheme();
    
    // Theme toggle click handler
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Form submission
    analysisForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const path = directoryPath.value.trim();
        if (!path) {
            alert('Please enter a directory path');
            return;
        }
        
        // Show loading
        analyzeBtn.disabled = true;
        loading.classList.remove('d-none');
        results.classList.add('d-none');
        
        // Send analysis request
        fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ directory_path: path })
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading
            loading.classList.add('d-none');
            analyzeBtn.disabled = false;
            
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            
            // Store results
            currentResults = data;
            
            // Show results
            resultMessage.textContent = data.message;
            results.classList.remove('d-none');
            
            // Update diagram
            updateDiagram(data.diagram);
            
            // Update relationships table
            updateRelationshipsTable(data.relationships);
            
            // Update PlantUML code
            plantumlCode.textContent = data.diagram;
            
            // Enable export buttons
            enableExportButtons(data);
            
            // Render the JointJS diagram
            renderERDiagram(data.relationships);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while analyzing: ' + error.message);
            loading.classList.add('d-none');
            analyzeBtn.disabled = false;
        });
    });
    
    // Enable all export buttons based on available data
    function enableExportButtons(data) {
        if (data.files) {
            // SVG & PNG downloads
            if (data.files.svg) {
                downloadSvgBtn.disabled = false;
            }
            downloadPngBtn.disabled = false;
            
            // CSV download
            if (data.files.csv) {
                downloadCsvBtn.disabled = false;
            }
            
            // PlantUML download
            if (data.files.plantuml) {
                downloadPlantumlBtn.disabled = false;
            }
            
            // JSON download
            if (data.files.json) {
                downloadJsonBtn.disabled = false;
            }
            
            // Markdown download
            if (data.files.markdown) {
                downloadMarkdownBtn.disabled = false;
            }
        }
    }
    
    // Update diagram
    function updateDiagram(plantUmlCode) {
        // Store the PlantUML code for the PlantUML tab
        const codeElement = document.getElementById('plantuml-code');
        if (codeElement) {
            codeElement.textContent = plantUmlCode;
        }
        
        // Set up copy button functionality
        const copyButton = document.getElementById('copy-plantuml-btn');
        if (copyButton) {
            copyButton.addEventListener('click', function() {
                navigator.clipboard.writeText(plantUmlCode).then(function() {
                    copyButton.innerHTML = '<i class="bi bi-check me-1"></i> Copied!';
                    setTimeout(function() {
                        copyButton.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy';
                    }, 2000);
                });
            });
        }
        
        // Set up download button functionality
        const downloadPlantUmlBtn = document.getElementById('download-plantuml-btn');
        if (downloadPlantUmlBtn) {
            downloadPlantUmlBtn.disabled = false;
            // Make sure we only add one event listener
            downloadPlantUmlBtn.removeEventListener('click', downloadPlantUml);
            downloadPlantUmlBtn.addEventListener('click', downloadPlantUml);
        }
        
        function downloadPlantUml() {
            const blob = new Blob([plantUmlCode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.puml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    // Update relationships table
    function updateRelationshipsTable(relationships) {
        relationshipsTable.innerHTML = '';
        
        relationships.forEach(rel => {
            const row = document.createElement('tr');
            
            const sourceTableCell = document.createElement('td');
            sourceTableCell.textContent = rel.source_table;
            row.appendChild(sourceTableCell);
            
            const sourceFieldCell = document.createElement('td');
            sourceFieldCell.textContent = rel.source_field;
            // Add FK indicator if applicable
            if (rel.is_potential_fk) {
                const fkBadge = document.createElement('span');
                fkBadge.className = 'badge bg-info ms-1';
                fkBadge.textContent = 'FK';
                sourceFieldCell.appendChild(fkBadge);
            }
            row.appendChild(sourceFieldCell);
            
            const targetTableCell = document.createElement('td');
            targetTableCell.textContent = rel.target_table;
            row.appendChild(targetTableCell);
            
            const targetFieldCell = document.createElement('td');
            targetFieldCell.textContent = rel.target_field;
            // Add PK indicator if the target field is 'id'
            if (rel.target_field.toLowerCase() === 'id') {
                const pkBadge = document.createElement('span');
                pkBadge.className = 'badge bg-primary ms-1';
                pkBadge.textContent = 'PK';
                targetFieldCell.appendChild(pkBadge);
            }
            row.appendChild(targetFieldCell);
            
            const sourceFileCell = document.createElement('td');
            sourceFileCell.textContent = rel.source_file;
            row.appendChild(sourceFileCell);
            
            relationshipsTable.appendChild(row);
        });
    }
    
    // Theme functions
    function initTheme() {
        // Check for saved theme preference or respect OS preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeIcon('light');
        }
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Update diagram if it exists
        if (currentResults && plantumlCode.textContent) {
            updateDiagram(plantumlCode.textContent);
        }
    }
    
    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        
        if (theme === 'dark') {
            themeIcon.className = 'bi bi-moon-fill';
        } else {
            themeIcon.className = 'bi bi-sun-fill';
        }
    }
    
    // Download buttons
    downloadSvgBtn.addEventListener('click', function() {
        if (currentResults && currentResults.files && currentResults.files.svg) {
            window.location.href = `/download/${currentResults.files.svg}`;
        }
    });
    
    downloadPngBtn.addEventListener('click', function() {
        if (currentResults && currentResults.files) {
            // Try to get SVG data and convert to PNG
            const encodedDiagram = encodePlantUML(currentResults.diagram);
            let url = `http://www.plantuml.com/plantuml/png/${encodedDiagram}`;
            
            // Use dark theme if applicable
            if (document.documentElement.getAttribute('data-theme') === 'dark') {
                url += '?theme=dark';
            }
            
            window.location.href = url;
        }
    });
    
    downloadCsvBtn.addEventListener('click', function() {
        if (currentResults && currentResults.files && currentResults.files.csv) {
            window.location.href = `/download/${currentResults.files.csv}`;
        }
    });
    
    // JSON download
    if (downloadJsonBtn) {
        downloadJsonBtn.addEventListener('click', function() {
            if (currentResults && currentResults.files && currentResults.files.json) {
                window.location.href = `/download/${currentResults.files.json}`;
            }
        });
    }
    
    // Markdown download
    if (downloadMarkdownBtn) {
        downloadMarkdownBtn.addEventListener('click', function() {
            if (currentResults && currentResults.files && currentResults.files.markdown) {
                window.location.href = `/download/${currentResults.files.markdown}`;
            }
        });
    }
    
    downloadPlantumlBtn.addEventListener('click', function() {
        if (currentResults && currentResults.files && currentResults.files.plantuml) {
            window.location.href = `/download/${currentResults.files.plantuml}`;
        }
    });
    
    // Copy PlantUML to clipboard
    copyPlantumlBtn.addEventListener('click', function() {
        if (plantumlCode.textContent) {
            navigator.clipboard.writeText(plantumlCode.textContent)
                .then(() => {
                    alert('PlantUML code copied to clipboard');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    alert('Failed to copy PlantUML code');
                });
        }
    });
    
    // Encode PlantUML for URL
    function encodePlantUML(s) {
        // A very simple encoder - for production, use a proper encoder
        function encode64(data) {
            let r = "";
            for (let i = 0; i < data.length; i += 3) {
                if (i + 2 === data.length) {
                    r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), 0);
                } else if (i + 1 === data.length) {
                    r += append3bytes(data.charCodeAt(i), 0, 0);
                } else {
                    r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), data.charCodeAt(i + 2));
                }
            }
            return r;
        }

        function append3bytes(b1, b2, b3) {
            const c1 = b1 >> 2;
            const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
            const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
            const c4 = b3 & 0x3F;
            return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
        }

        function encode6bit(b) {
            if (b < 10) {
                return String.fromCharCode(48 + b);
            }
            b -= 10;
            if (b < 26) {
                return String.fromCharCode(65 + b);
            }
            b -= 26;
            if (b < 26) {
                return String.fromCharCode(97 + b);
            }
            b -= 26;
            if (b === 0) {
                return '-';
            }
            if (b === 1) {
                return '_';
            }
            return '?';
        }
        
        // This is a very simplified version - in production use proper encoding
        return encode64(deflateRaw(unescape(encodeURIComponent(s))));
    }
    
    // Simple deflate function - replace with proper implementation in production
    function deflateRaw(s) {
        // This is just a placeholder - in a real app, use a proper deflate algorithm
        // For production, use a library like pako
        return s;
    }

    function displayResults(data) {
        // Show results container
        document.getElementById('results').classList.remove('d-none');
        document.getElementById('loading').classList.add('d-none');
        
        // Update result message
        const resultMessage = document.getElementById('result-message');
        resultMessage.textContent = `Found ${data.relationships.length} table relationships from ${data.stats.total_files} files.`;
        
        // Render JointJS diagram with relationship data
        renderERDiagram(data.relationships);
        
        // Update relationships table
        const tableBody = document.querySelector('#relationships-table tbody');
        tableBody.innerHTML = '';
        
        data.relationships.forEach(rel => {
            const row = document.createElement('tr');
            
            const sourceTableCell = document.createElement('td');
            sourceTableCell.textContent = rel.source_table;
            row.appendChild(sourceTableCell);
            
            const sourceFieldCell = document.createElement('td');
            sourceFieldCell.textContent = rel.source_field;
            row.appendChild(sourceFieldCell);
            
            const targetTableCell = document.createElement('td');
            targetTableCell.textContent = rel.target_table;
            row.appendChild(targetTableCell);
            
            const targetFieldCell = document.createElement('td');
            targetFieldCell.textContent = rel.target_field;
            row.appendChild(targetFieldCell);
            
            const sourceFileCell = document.createElement('td');
            sourceFileCell.textContent = rel.source_file;
            row.appendChild(sourceFileCell);
            
            tableBody.appendChild(row);
        });
        
        // Update PlantUML code - use existing updateDiagram function
        updateDiagram(data.plantuml_code);
        
        // Enable download buttons
        document.getElementById('download-csv-btn').disabled = false;
        document.getElementById('download-json-btn').disabled = false;
        document.getElementById('download-markdown-btn').disabled = false;
    }
}); 