// Professional Coin Collection Manager - JavaScript

class CoinCollectionManager {
    constructor() {
        this.coins = [];
        this.currentMode = 'annotate';
        this.nextCoinId = 1;
        this.nextAnnotationId = 1000;
        this.selectedAnnotation = null;
        this.quickAnnotationType = null;
        this.comparisonMode = false;
        this.comparisonSlots = [null, null];
        this.expandedCoins = new Set(); // Track which coins are expanded
        this.searchResults = [];
        this.mediaSortMode = 'curated';
        this.mediaViewMode = 'masonry';
        this.mediaFilter = 'all';
        
        // Console and logging system
        this.consoleExpanded = false;
        this.consoleLogs = [];
        this.maxConsoleLogs = 100;
        this.serviceStatuses = {
            ai: { status: 'initializing', model: null, progress: 0 },
            storage: { status: 'ready', progress: 100 },
            market: { status: 'initializing', progress: 0 }
        };

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.renderCoins();
        this.setupEventListeners();
        this.initializeConsole();
        this.initializeServices();
        
        // Add initial sample coin if none exist
        if (this.coins.length === 0) {
            this.addCoin(true);
        }

        this.renderGlobalMediaControls();
    }
    
    initializeConsole() {
        this.logToConsole('Application initialized', 'info');
        this.logToConsole('Console system ready', 'success');
    }
    
    async initializeServices() {
        // Initialize AI services
        this.updateServiceStatus('ai', 'initializing', 10);
        this.logToConsole('Initializing AI services...', 'info');
        
        try {
            const { initializeAIOrchestrator } = await import('./js/ai-orchestrator.js');
            await initializeAIOrchestrator();
            
            // Test AI model initialization
            this.updateServiceStatus('ai', 'testing', 50);
            this.logToConsole('Testing AI model initialization...', 'info');
            
            // Check if TensorFlow.js is available
            if (typeof tf !== 'undefined') {
                this.logToConsole(`TensorFlow.js v${tf.version.tfjs} loaded successfully`, 'success');
                
                // Initialize and test the offline model
                const { initializeOfflineModel } = await import('./js/ai/offlineModel.js');
                const offlineModel = await initializeOfflineModel();
                
                if (offlineModel) {
                    this.updateServiceStatus('ai', 'testing', 75);
                    this.logToConsole('Testing MobileNet model...', 'info');
                    
                    // Create a simple test image
                    const canvas = document.createElement('canvas');
                    canvas.width = 224;
                    canvas.height = 224;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(0, 0, 224, 224);
                    ctx.fillStyle = '#DAA520';
                    ctx.beginPath();
                    ctx.arc(112, 112, 80, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Test classification
                    const testResult = await offlineModel.analyze([canvas.toDataURL()], { classify: true });
                    
                    if (testResult.success) {
                        this.updateServiceStatus('ai', 'ready', 100, 'TensorFlow.js + MobileNet');
                        this.logToConsole('AI Model test successful: MobileNet classification working', 'success');
                        this.logToConsole(`Test classification: ${testResult.results[0]?.classification?.topPrediction?.label || 'Unknown'}`, 'info');
                    } else {
                        this.updateServiceStatus('ai', 'error', 0);
                        this.logToConsole('AI Model test failed: Classification not working', 'error');
                    }
                } else {
                    this.updateServiceStatus('ai', 'error', 0);
                    this.logToConsole('AI initialization failed: Could not initialize offline model', 'error');
                }
            } else {
                this.updateServiceStatus('ai', 'error', 0);
                this.logToConsole('AI initialization failed: TensorFlow.js not available', 'error');
            }
        } catch (error) {
            this.updateServiceStatus('ai', 'error', 0);
            this.logToConsole(`AI initialization failed: ${error.message}`, 'error');
        }
        
        // Initialize market intelligence
        this.updateServiceStatus('market', 'initializing', 30);
        this.logToConsole('Initializing market intelligence...', 'info');
        
        try {
            const { initializeMarketIntel } = await import('./js/market-intel.js');
            initializeMarketIntel();
            this.updateServiceStatus('market', 'ready', 100);
            this.logToConsole('Market intelligence ready', 'success');
        } catch (error) {
            this.updateServiceStatus('market', 'error', 0);
            this.logToConsole(`Market intelligence failed: ${error.message}`, 'error');
        }
    }
    
    logToConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type,
            id: Date.now()
        };
        
        this.consoleLogs.unshift(logEntry);
        
        // Keep only the latest logs
        if (this.consoleLogs.length > this.maxConsoleLogs) {
            this.consoleLogs = this.consoleLogs.slice(0, this.maxConsoleLogs);
        }
        
        this.updateConsoleDisplay();
        
        // Also log to browser console
        const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
        console[consoleMethod](`[${timestamp}] ${message}`);
    }
    
    updateServiceStatus(service, status, progress, model = null) {
        this.serviceStatuses[service] = {
            status,
            progress,
            model: model || this.serviceStatuses[service].model
        };
        this.updateServiceStatusDisplay();
    }
    
    updateConsoleDisplay() {
        const consoleContent = document.getElementById('consoleContent');
        if (!consoleContent) return;
        
        const logsHtml = this.consoleLogs.map(log => `
            <div class="console-log console-${log.type}">
                <span class="console-timestamp">${log.timestamp}</span>
                <span class="console-message">${log.message}</span>
            </div>
        `).join('');
        
        consoleContent.innerHTML = logsHtml;
    }
    
    updateServiceStatusDisplay() {
        const statusContainer = document.getElementById('serviceStatuses');
        if (!statusContainer) return;
        
        const statusHtml = Object.entries(this.serviceStatuses).map(([service, status]) => `
            <div class="service-status service-${status.status}">
                <div class="service-header">
                    <span class="service-name">${service.toUpperCase()}</span>
                    <span class="service-status-text">${status.status}</span>
                    ${status.model ? `<span class="service-model">${status.model}</span>` : ''}
                </div>
                <div class="service-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${status.progress}%"></div>
                    </div>
                    <span class="progress-text">${status.progress}%</span>
                </div>
            </div>
        `).join('');
        
        statusContainer.innerHTML = statusHtml;
    }
    
    toggleConsole() {
        this.consoleExpanded = !this.consoleExpanded;
        const consolePanel = document.getElementById('consolePanel');
        const toggleBtn = document.getElementById('consoleToggle');
        
        if (consolePanel) {
            consolePanel.classList.toggle('expanded', this.consoleExpanded);
        }
        
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.consoleExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        }
    }

    renderGlobalMediaControls() {
        const container = document.getElementById('globalMediaControls');
        if (container) {
            container.innerHTML = this.getGlobalMediaControlsMarkup();
        }
    }

    getGlobalMediaControlsMarkup() {
        return `
            <div class="media-controls-bar">
                <div class="media-controls-group">
                    <label class="media-controls-label">Sort</label>
                    <select class="media-controls-select" onchange="setMediaSortMode(this.value)">
                        <option value="curated" ${this.mediaSortMode === 'curated' ? 'selected' : ''}>Curated first</option>
                        <option value="chronological" ${this.mediaSortMode === 'chronological' ? 'selected' : ''}>Upload date</option>
                        <option value="title" ${this.mediaSortMode === 'title' ? 'selected' : ''}>Title</option>
                        <option value="type" ${this.mediaSortMode === 'type' ? 'selected' : ''}>Media type</option>
                    </select>
                </div>
                <div class="media-controls-group">
                    <label class="media-controls-label">Filter</label>
                    <div class="media-filter-buttons">
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'all' ? 'active' : ''}" onclick="setMediaFilter('all')">All</button>
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'featured' ? 'active' : ''}" onclick="setMediaFilter('featured')">Featured</button>
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'ai' ? 'active' : ''}" onclick="setMediaFilter('ai')">AI tagged</button>
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'macro' ? 'active' : ''}" onclick="setMediaFilter('macro')">Macro</button>
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'video' ? 'active' : ''}" onclick="setMediaFilter('video')">Video</button>
                        <button class="btn btn-secondary btn-small ${this.mediaFilter === 'annotated' ? 'active' : ''}" onclick="setMediaFilter('annotated')">Annotated</button>
                    </div>
                </div>
                <div class="media-controls-group">
                    <label class="media-controls-label">Layout</label>
                    <div class="media-layout-toggle">
                        <button class="btn btn-secondary btn-small ${this.mediaViewMode === 'masonry' ? 'active' : ''}" onclick="setMediaViewMode('masonry')">
                            <i class="fas fa-border-all"></i> Masonry
                        </button>
                        <button class="btn btn-secondary btn-small ${this.mediaViewMode === 'filmstrip' ? 'active' : ''}" onclick="setMediaViewMode('filmstrip')">
                            <i class="fas fa-grip-lines"></i> Filmstrip
                        </button>
                        <button class="btn btn-secondary btn-small ${this.mediaViewMode === 'timeline' ? 'active' : ''}" onclick="setMediaViewMode('timeline')">
                            <i class="fas fa-stream"></i> Timeline
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Auto-save on any change
        document.addEventListener('input', () => this.saveToStorage());
        document.addEventListener('change', () => this.saveToStorage());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.selectedAnnotation = null;
            }
        });
    }

    // Coin Management
    addCoin(isSample = false) {
        const coin = {
            id: this.nextCoinId++,
            title: isSample ? 'Sample Coin' : `Coin ${this.nextCoinId - 1}`,
            description: isSample ? 
                'This is a sample coin to demonstrate the application features. Upload your own images and start documenting your collection.' :
                'New coin added to collection. Add images and detailed information.',
            images: {
                obverse: null,
                reverse: null
            },
            media: {
                images: [],
                videos: []
            },
            annotations: {
                obverse: isSample ? [
                    { id: 1001, x: 150, y: 100, label: 'Portrait', color: '#f97316' },
                    { id: 1002, x: 200, y: 250, label: 'Date Area', color: '#06b6d4' }
                ] : [],
                reverse: isSample ? [
                    { id: 1003, x: 180, y: 120, label: 'Main Device', color: '#ef4444' }
                ] : []
            },
            metadata: {
                country: '',
                year: '',
                denomination: '',
                metal: '',
                diameter: '',
                weight: '',
                mintmark: '',
                edge: '',
                mintage: ''
            },
            condition: {
                grade: '',
                notes: '',
                wear: '',
                luster: '',
                strike: ''
            },
            valuation: {
                scenarios: {
                    common: { min: 5, max: 40, description: 'Common circulated coin' },
                    silver: { min: 20, max: 200, description: 'Silver content value' },
                    collectible: { min: 200, max: 5000, description: 'Rare or high-grade collectible' }
                },
                currentEstimate: '',
                marketNotes: ''
            },
            notes: '',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.coins.push(coin);
        this.renderCoins();
        this.saveToStorage();
        
        // Auto-expand the new coin
        setTimeout(() => {
            const coinElement = document.querySelector(`[data-coin-id="${coin.id}"]`);
            if (coinElement) {
                this.toggleCoinExpansion(coin.id);
            }
        }, 100);
    }

    deleteCoin(coinId) {
        if (confirm('Are you sure you want to delete this coin? This action cannot be undone.')) {
            this.coins = this.coins.filter(coin => coin.id !== coinId);
            this.renderCoins();
            this.saveToStorage();
        }
    }

    updateCoin(coinId, updates) {
        const coinIndex = this.coins.findIndex(c => c.id === coinId);
        if (coinIndex !== -1) {
            this.coins[coinIndex] = { 
                ...this.coins[coinIndex], 
                ...updates, 
                modified: new Date().toISOString() 
            };
            this.saveToStorage();
        }
    }

    // Rendering
    renderCoins() {
        const container = document.getElementById('coinsContainer');
        container.innerHTML = this.coins.map(coin => this.renderCoinCard(coin)).join('');
        
        // Apply expanded states after rendering
        this.expandedCoins.forEach(coinId => {
            const coinCard = document.querySelector(`[data-coin-id="${coinId}"]`);
            if (coinCard) {
                coinCard.classList.add('expanded');
                const content = document.getElementById(`coinContent_${coinId}`);
                if (content) content.style.display = 'block';
                const chevron = coinCard.querySelector('.fa-chevron-down');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            }
        });
        
        // Debug: Check if file inputs are created correctly
        const fileInputs = container.querySelectorAll('.file-input');
        console.log('File inputs created:', fileInputs.length);
        fileInputs.forEach((input, index) => {
            console.log(`File input ${index}:`, {
                id: input.id,
                name: input.name,
                accept: input.accept,
                onchange: !!input.onchange
            });
        });
    }

    renderCoinCard(coin) {
        const obverseImage = coin.images.obverse;
        const reverseImage = coin.images.reverse;
        const thumbnailSrc = obverseImage || reverseImage;

        return `
            <div class="coin-card" data-coin-id="${coin.id}">
                <div class="coin-header" onclick="toggleCoinExpansion(${coin.id})">
                    <div class="coin-info">
                        ${thumbnailSrc ? 
                            `<img src="${thumbnailSrc}" alt="${coin.title}" class="coin-thumbnail">` :
                            `<div class="coin-thumbnail-placeholder">
                                <i class="fas fa-coins"></i>
                            </div>`
                        }
                        <div>
                            <div class="coin-title">${coin.title}</div>
                            <div class="text-muted">${coin.metadata.country} ${coin.metadata.year}</div>
                        </div>
                    </div>
                    <div class="coin-actions">
                        ${this.comparisonMode ? 
                            `<button class="btn btn-secondary" onclick="event.stopPropagation(); addToComparison(${coin.id})">
                                <i class="fas fa-plus"></i> Compare
                            </button>` : ''
                        }
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); deleteCoin(${coin.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <i class="fas fa-chevron-down" style="transition: transform 0.2s;"></i>
                    </div>
                </div>
                <div class="coin-content" id="coinContent_${coin.id}">
                    ${this.renderCoinContent(coin)}
                </div>
            </div>
        `;
    }

    renderCoinContent(coin) {
        return `
            <!-- Image Section -->
            <div class="image-section">
                <div class="image-container">
                    <h4 style="position: absolute; top: 8px; left: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Obverse</h4>
                    ${coin.images.obverse ? 
                        `<img src="${coin.images.obverse}" alt="Obverse" class="coin-image" onclick="openImageZoom('obverse', ${coin.id})" style="cursor: zoom-in">
                         <div class="image-overlay-controls">
                             <button class="btn btn-small btn-secondary" onclick="setMode('annotate'); event.stopPropagation();" title="Annotate Mode">
                                 <i class="fas fa-crosshairs"></i>
                             </button>
                             <button class="btn btn-small btn-secondary" onclick="openImageZoom('obverse', ${coin.id}); event.stopPropagation();" title="Zoom Image">
                                 <i class="fas fa-search-plus"></i>
                             </button>
                             <button class="btn btn-small btn-danger" onclick="deleteImage(${coin.id}, 'obverse'); event.stopPropagation();" title="Delete Image">
                                 <i class="fas fa-trash"></i>
                             </button>
                         </div>`
                        :
                        `<div class="image-placeholder" 
                              onclick="document.getElementById('obverse_${coin.id}').click()"
                              ondrop="handleMainImageDrop(event, ${coin.id}, 'obverse')" 
                              ondragover="handleDragOver(event)" 
                              ondragenter="handleDragEnter(event)" 
                              ondragleave="handleDragLeave(event)">
                            <i class="fas fa-upload" style="font-size: 2rem; margin-bottom: 8px;"></i>
                            <span>Click or drag to upload obverse image</span>
                        </div>`
                    }
                    <input type="file" id="obverse_${coin.id}" name="obverse_${coin.id}" class="file-input" accept="image/*" onchange="handleImageUpload(${coin.id}, 'obverse', this)">
                    <div class="annotation-overlay" onclick="handleImageClick(event, ${coin.id}, 'obverse')">
                        ${this.renderAnnotations(coin.annotations.obverse)}
                    </div>
                </div>
                
                <div class="image-container">
                    <h4 style="position: absolute; top: 8px; left: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Reverse</h4>
                    ${coin.images.reverse ? 
                        `<img src="${coin.images.reverse}" alt="Reverse" class="coin-image" onclick="openImageZoom('reverse', ${coin.id})" style="cursor: zoom-in">
                         <div class="image-overlay-controls">
                             <button class="btn btn-small btn-secondary" onclick="setMode('annotate'); event.stopPropagation();" title="Annotate Mode">
                                 <i class="fas fa-crosshairs"></i>
                             </button>
                             <button class="btn btn-small btn-secondary" onclick="openImageZoom('reverse', ${coin.id}); event.stopPropagation();" title="Zoom Image">
                                 <i class="fas fa-search-plus"></i>
                             </button>
                             <button class="btn btn-small btn-danger" onclick="deleteImage(${coin.id}, 'reverse'); event.stopPropagation();" title="Delete Image">
                                 <i class="fas fa-trash"></i>
                             </button>
                         </div>`
                        :
                        `<div class="image-placeholder" 
                              onclick="document.getElementById('reverse_${coin.id}').click()"
                              ondrop="handleMainImageDrop(event, ${coin.id}, 'reverse')" 
                              ondragover="handleDragOver(event)" 
                              ondragenter="handleDragEnter(event)" 
                              ondragleave="handleDragLeave(event)">
                            <i class="fas fa-upload" style="font-size: 2rem; margin-bottom: 8px;"></i>
                            <span>Click or drag to upload reverse image</span>
                        </div>`
                    }
                    <input type="file" id="reverse_${coin.id}" name="reverse_${coin.id}" class="file-input" accept="image/*" onchange="handleImageUpload(${coin.id}, 'reverse', this)">
                    <div class="annotation-overlay" onclick="handleImageClick(event, ${coin.id}, 'reverse')">
                        ${this.renderAnnotations(coin.annotations.reverse)}
                    </div>
                </div>
            </div>

            <!-- Metadata Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-info-circle"></i>
                    Basic Information
                </h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="title_${coin.id}">Title</label>
                        <input type="text" id="title_${coin.id}" name="title_${coin.id}" class="form-input" value="${coin.title}" 
                               onchange="updateCoinField(${coin.id}, 'title', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="country_${coin.id}">Country</label>
                        <input type="text" id="country_${coin.id}" name="country_${coin.id}" class="form-input" value="${coin.metadata.country}" 
                               onchange="updateCoinMetadata(${coin.id}, 'country', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="year_${coin.id}">Year</label>
                        <input type="text" id="year_${coin.id}" name="year_${coin.id}" class="form-input" value="${coin.metadata.year}" 
                               onchange="updateCoinMetadata(${coin.id}, 'year', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="denomination_${coin.id}">Denomination</label>
                        <input type="text" id="denomination_${coin.id}" name="denomination_${coin.id}" class="form-input" value="${coin.metadata.denomination}" 
                               onchange="updateCoinMetadata(${coin.id}, 'denomination', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="metal_${coin.id}">Metal</label>
                        <select id="metal_${coin.id}" name="metal_${coin.id}" class="form-input" onchange="updateCoinMetadata(${coin.id}, 'metal', this.value)">
                            <option value="">Select Metal</option>
                            <option value="Gold" ${coin.metadata.metal === 'Gold' ? 'selected' : ''}>Gold</option>
                            <option value="Silver" ${coin.metadata.metal === 'Silver' ? 'selected' : ''}>Silver</option>
                            <option value="Copper" ${coin.metadata.metal === 'Copper' ? 'selected' : ''}>Copper</option>
                            <option value="Bronze" ${coin.metadata.metal === 'Bronze' ? 'selected' : ''}>Bronze</option>
                            <option value="Nickel" ${coin.metadata.metal === 'Nickel' ? 'selected' : ''}>Nickel</option>
                            <option value="Brass" ${coin.metadata.metal === 'Brass' ? 'selected' : ''}>Brass</option>
                            <option value="Aluminum" ${coin.metadata.metal === 'Aluminum' ? 'selected' : ''}>Aluminum</option>
                            <option value="Zinc" ${coin.metadata.metal === 'Zinc' ? 'selected' : ''}>Zinc</option>
                            <option value="Bimetallic" ${coin.metadata.metal === 'Bimetallic' ? 'selected' : ''}>Bimetallic</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="diameter_${coin.id}">Diameter (mm)</label>
                        <input type="number" step="0.1" id="diameter_${coin.id}" name="diameter_${coin.id}" class="form-input" value="${coin.metadata.diameter}" 
                               onchange="updateCoinMetadata(${coin.id}, 'diameter', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="weight_${coin.id}">Weight (g)</label>
                        <input type="number" step="0.01" id="weight_${coin.id}" name="weight_${coin.id}" class="form-input" value="${coin.metadata.weight}" 
                               onchange="updateCoinMetadata(${coin.id}, 'weight', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="mintmark_${coin.id}">Mintmark</label>
                        <input type="text" id="mintmark_${coin.id}" name="mintmark_${coin.id}" class="form-input" value="${coin.metadata.mintmark}" 
                               onchange="updateCoinMetadata(${coin.id}, 'mintmark', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="edge_${coin.id}">Edge Type</label>
                        <select id="edge_${coin.id}" name="edge_${coin.id}" class="form-input" onchange="updateCoinMetadata(${coin.id}, 'edge', this.value)">
                            <option value="">Select Edge Type</option>
                            <option value="Plain" ${coin.metadata.edge === 'Plain' ? 'selected' : ''}>Plain</option>
                            <option value="Reeded" ${coin.metadata.edge === 'Reeded' ? 'selected' : ''}>Reeded</option>
                            <option value="Lettered" ${coin.metadata.edge === 'Lettered' ? 'selected' : ''}>Lettered</option>
                            <option value="Decorated" ${coin.metadata.edge === 'Decorated' ? 'selected' : ''}>Decorated</option>
                            <option value="Security" ${coin.metadata.edge === 'Security' ? 'selected' : ''}>Security Edge</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="mintage_${coin.id}">Mintage</label>
                        <input type="text" id="mintage_${coin.id}" name="mintage_${coin.id}" class="form-input" value="${coin.metadata.mintage}" 
                               onchange="updateCoinMetadata(${coin.id}, 'mintage', this.value)">
                    </div>
                </div>
            </div>

            <!-- Condition Assessment -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-search"></i>
                    Condition Assessment
                </h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="grade_${coin.id}">Grade</label>
                        <select id="grade_${coin.id}" name="grade_${coin.id}" class="form-input" onchange="updateCoinCondition(${coin.id}, 'grade', this.value)">
                            <option value="">Select Grade</option>
                            <option value="PR-70" ${coin.condition.grade === 'PR-70' ? 'selected' : ''}>PR-70 (Perfect Proof)</option>
                            <option value="PR-69" ${coin.condition.grade === 'PR-69' ? 'selected' : ''}>PR-69 (Ultra Cameo)</option>
                            <option value="MS-70" ${coin.condition.grade === 'MS-70' ? 'selected' : ''}>MS-70 (Perfect Mint State)</option>
                            <option value="MS-69" ${coin.condition.grade === 'MS-69' ? 'selected' : ''}>MS-69 (Near Perfect)</option>
                            <option value="MS-68" ${coin.condition.grade === 'MS-68' ? 'selected' : ''}>MS-68 (Superb)</option>
                            <option value="MS-67" ${coin.condition.grade === 'MS-67' ? 'selected' : ''}>MS-67 (Superb)</option>
                            <option value="MS-66" ${coin.condition.grade === 'MS-66' ? 'selected' : ''}>MS-66 (Premium)</option>
                            <option value="MS-65" ${coin.condition.grade === 'MS-65' ? 'selected' : ''}>MS-65 (Gem)</option>
                            <option value="MS-64" ${coin.condition.grade === 'MS-64' ? 'selected' : ''}>MS-64 (Choice)</option>
                            <option value="MS-63" ${coin.condition.grade === 'MS-63' ? 'selected' : ''}>MS-63 (Select)</option>
                            <option value="MS-62" ${coin.condition.grade === 'MS-62' ? 'selected' : ''}>MS-62 (Select)</option>
                            <option value="MS-61" ${coin.condition.grade === 'MS-61' ? 'selected' : ''}>MS-61 (Uncirculated)</option>
                            <option value="MS-60" ${coin.condition.grade === 'MS-60' ? 'selected' : ''}>MS-60 (Uncirculated)</option>
                            <option value="AU-58" ${coin.condition.grade === 'AU-58' ? 'selected' : ''}>AU-58 (About Uncirculated)</option>
                            <option value="AU-55" ${coin.condition.grade === 'AU-55' ? 'selected' : ''}>AU-55 (About Uncirculated)</option>
                            <option value="AU-50" ${coin.condition.grade === 'AU-50' ? 'selected' : ''}>AU-50 (About Uncirculated)</option>
                            <option value="XF-45" ${coin.condition.grade === 'XF-45' ? 'selected' : ''}>XF-45 (Extra Fine)</option>
                            <option value="XF-40" ${coin.condition.grade === 'XF-40' ? 'selected' : ''}>XF-40 (Extra Fine)</option>
                            <option value="VF-35" ${coin.condition.grade === 'VF-35' ? 'selected' : ''}>VF-35 (Very Fine)</option>
                            <option value="VF-30" ${coin.condition.grade === 'VF-30' ? 'selected' : ''}>VF-30 (Very Fine)</option>
                            <option value="VF-25" ${coin.condition.grade === 'VF-25' ? 'selected' : ''}>VF-25 (Very Fine)</option>
                            <option value="VF-20" ${coin.condition.grade === 'VF-20' ? 'selected' : ''}>VF-20 (Very Fine)</option>
                            <option value="F-15" ${coin.condition.grade === 'F-15' ? 'selected' : ''}>F-15 (Fine)</option>
                            <option value="F-12" ${coin.condition.grade === 'F-12' ? 'selected' : ''}>F-12 (Fine)</option>
                            <option value="VG-10" ${coin.condition.grade === 'VG-10' ? 'selected' : ''}>VG-10 (Very Good)</option>
                            <option value="VG-8" ${coin.condition.grade === 'VG-8' ? 'selected' : ''}>VG-8 (Very Good)</option>
                            <option value="G-6" ${coin.condition.grade === 'G-6' ? 'selected' : ''}>G-6 (Good)</option>
                            <option value="G-4" ${coin.condition.grade === 'G-4' ? 'selected' : ''}>G-4 (Good)</option>
                            <option value="AG-3" ${coin.condition.grade === 'AG-3' ? 'selected' : ''}>AG-3 (About Good)</option>
                            <option value="FA-2" ${coin.condition.grade === 'FA-2' ? 'selected' : ''}>FA-2 (Fair)</option>
                            <option value="PR-1" ${coin.condition.grade === 'PR-1' ? 'selected' : ''}>PR-1 (Poor)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="wear_${coin.id}">Wear Assessment</label>
                        <select id="wear_${coin.id}" name="wear_${coin.id}" class="form-input" onchange="updateCoinCondition(${coin.id}, 'wear', this.value)">
                            <option value="">Select Wear Level</option>
                            <option value="None" ${coin.condition.wear === 'None' ? 'selected' : ''}>No Wear (Mint State)</option>
                            <option value="Minimal" ${coin.condition.wear === 'Minimal' ? 'selected' : ''}>Minimal Wear</option>
                            <option value="Light" ${coin.condition.wear === 'Light' ? 'selected' : ''}>Light Wear</option>
                            <option value="Moderate" ${coin.condition.wear === 'Moderate' ? 'selected' : ''}>Moderate Wear</option>
                            <option value="Heavy" ${coin.condition.wear === 'Heavy' ? 'selected' : ''}>Heavy Wear</option>
                            <option value="Excessive" ${coin.condition.wear === 'Excessive' ? 'selected' : ''}>Excessive Wear</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="luster_${coin.id}">Luster</label>
                        <select id="luster_${coin.id}" name="luster_${coin.id}" class="form-input" onchange="updateCoinCondition(${coin.id}, 'luster', this.value)">
                            <option value="">Select Luster</option>
                            <option value="Full" ${coin.condition.luster === 'Full' ? 'selected' : ''}>Full Original Luster</option>
                            <option value="Partial" ${coin.condition.luster === 'Partial' ? 'selected' : ''}>Partial Luster</option>
                            <option value="Minimal" ${coin.condition.luster === 'Minimal' ? 'selected' : ''}>Minimal Luster</option>
                            <option value="None" ${coin.condition.luster === 'None' ? 'selected' : ''}>No Luster</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="strike_${coin.id}">Strike Quality</label>
                        <select id="strike_${coin.id}" name="strike_${coin.id}" class="form-input" onchange="updateCoinCondition(${coin.id}, 'strike', this.value)">
                            <option value="">Select Strike</option>
                            <option value="Full" ${coin.condition.strike === 'Full' ? 'selected' : ''}>Full Strike</option>
                            <option value="Sharp" ${coin.condition.strike === 'Sharp' ? 'selected' : ''}>Sharp Strike</option>
                            <option value="Average" ${coin.condition.strike === 'Average' ? 'selected' : ''}>Average Strike</option>
                            <option value="Weak" ${coin.condition.strike === 'Weak' ? 'selected' : ''}>Weak Strike</option>
                            <option value="Poor" ${coin.condition.strike === 'Poor' ? 'selected' : ''}>Poor Strike</option>
                        </select>
                    </div>
                </div>
                <div class="form-group mt-4">
                    <label for="condition_notes_${coin.id}">Condition Notes</label>
                    <textarea id="condition_notes_${coin.id}" name="condition_notes_${coin.id}" class="form-input form-textarea" placeholder="Detailed condition notes, defects, cleaning evidence, etc." 
                              onchange="updateCoinCondition(${coin.id}, 'notes', this.value)">${coin.condition.notes}</textarea>
                </div>
            </div>

            <!-- Valuation Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-dollar-sign"></i>
                    Valuation Assessment
                </h3>
                <div class="valuation-grid">
                    <div class="valuation-scenario">
                        <div class="scenario-title">Scenario A: Common Coin</div>
                        <div class="scenario-range">$${coin.valuation.scenarios.common.min} - $${coin.valuation.scenarios.common.max}</div>
                        <div class="scenario-description">${coin.valuation.scenarios.common.description}</div>
                        <div class="mt-4">
                            <input type="number" id="common_min_${coin.id}" name="common_min_${coin.id}" class="form-input" placeholder="Min" value="${coin.valuation.scenarios.common.min}" 
                                   onchange="updateValuationScenario(${coin.id}, 'common', 'min', this.value)" style="width: 80px; display: inline-block; margin-right: 8px;">
                            <input type="number" id="common_max_${coin.id}" name="common_max_${coin.id}" class="form-input" placeholder="Max" value="${coin.valuation.scenarios.common.max}" 
                                   onchange="updateValuationScenario(${coin.id}, 'common', 'max', this.value)" style="width: 80px; display: inline-block;">
                        </div>
                    </div>
                    <div class="valuation-scenario">
                        <div class="scenario-title">Scenario B: Silver Content</div>
                        <div class="scenario-range">$${coin.valuation.scenarios.silver.min} - $${coin.valuation.scenarios.silver.max}</div>
                        <div class="scenario-description">${coin.valuation.scenarios.silver.description}</div>
                        <div class="mt-4">
                            <input type="number" id="silver_min_${coin.id}" name="silver_min_${coin.id}" class="form-input" placeholder="Min" value="${coin.valuation.scenarios.silver.min}" 
                                   onchange="updateValuationScenario(${coin.id}, 'silver', 'min', this.value)" style="width: 80px; display: inline-block; margin-right: 8px;">
                            <input type="number" id="silver_max_${coin.id}" name="silver_max_${coin.id}" class="form-input" placeholder="Max" value="${coin.valuation.scenarios.silver.max}" 
                                   onchange="updateValuationScenario(${coin.id}, 'silver', 'max', this.value)" style="width: 80px; display: inline-block;">
                        </div>
                    </div>
                    <div class="valuation-scenario">
                        <div class="scenario-title">Scenario C: Collectible</div>
                        <div class="scenario-range">$${coin.valuation.scenarios.collectible.min} - $${coin.valuation.scenarios.collectible.max}+</div>
                        <div class="scenario-description">${coin.valuation.scenarios.collectible.description}</div>
                        <div class="mt-4">
                            <input type="number" id="collectible_min_${coin.id}" name="collectible_min_${coin.id}" class="form-input" placeholder="Min" value="${coin.valuation.scenarios.collectible.min}" 
                                   onchange="updateValuationScenario(${coin.id}, 'collectible', 'min', this.value)" style="width: 80px; display: inline-block; margin-right: 8px;">
                            <input type="number" id="collectible_max_${coin.id}" name="collectible_max_${coin.id}" class="form-input" placeholder="Max" value="${coin.valuation.scenarios.collectible.max}" 
                                   onchange="updateValuationScenario(${coin.id}, 'collectible', 'max', this.value)" style="width: 80px; display: inline-block;">
                        </div>
                    </div>
                </div>
                <div class="form-grid mt-4">
                    <div class="form-group">
                        <label for="current_estimate_${coin.id}">Current Market Estimate</label>
                        <input type="text" id="current_estimate_${coin.id}" name="current_estimate_${coin.id}" class="form-input" placeholder="$0 - $0" value="${coin.valuation.currentEstimate}" 
                               onchange="updateCoinValuation(${coin.id}, 'currentEstimate', this.value)">
                    </div>
                    <div class="form-group">
                        <label for="market_notes_${coin.id}">Market Notes</label>
                        <textarea id="market_notes_${coin.id}" name="market_notes_${coin.id}" class="form-input" placeholder="Market trends, recent sales, auction results, etc." 
                                  onchange="updateCoinValuation(${coin.id}, 'marketNotes', this.value)">${coin.valuation.marketNotes}</textarea>
                    </div>
                </div>
            </div>

            <!-- AI Analysis Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-brain"></i>
                    AI Analysis
                    <button class="btn btn-secondary" onclick="reanalyzeWithAI(${coin.id})" style="margin-left: auto; font-size: 0.8rem;">
                        <i class="fas fa-sync"></i> Re-analyze
                    </button>
                </h3>
                ${this.renderAIAnalysis(coin)}
            </div>

            <!-- Market Research Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-search"></i>
                    Market Research
                    <button class="btn btn-secondary" onclick="searchSimilarCoins(${coin.id})" style="margin-left: auto; font-size: 0.8rem;">
                        <i class="fas fa-sync"></i> Search Market
                    </button>
                </h3>
                <div id="searchResults_${coin.id}" class="search-results-container">
                    <div class="search-placeholder">
                        <i class="fas fa-search" style="font-size: 2rem; opacity: 0.3; margin-bottom: 10px;"></i>
                        <p>Click "Search Market" to find similar coins and current market prices</p>
                    </div>
                </div>
            </div>

            <!-- Media Gallery Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-images"></i>
                    Media Gallery
                    <button class="btn btn-secondary" onclick="toggleMediaUpload(${coin.id})" style="margin-left: auto; font-size: 0.8rem;">
                        <i class="fas fa-plus"></i> Add Media
                    </button>
                </h3>
                <div class="media-gallery" data-coin-id="${coin.id}">
                    ${this.renderMediaGallery(coin)}
                </div>
                <div id="mediaUpload_${coin.id}" class="media-upload-panel" style="display: none;">
                    <div class="upload-options">
                        <input type="file" id="mediaFile_${coin.id}" name="mediaFile_${coin.id}" multiple accept="image/*,video/*" onchange="handleMediaUpload(${coin.id}, this)" style="display: none;">
                        <div class="upload-actions">
                            <button class="btn btn-outline" onclick="document.getElementById('mediaFile_${coin.id}').click()">
                                <i class="fas fa-upload"></i> Select Files
                            </button>
                            <button class="btn btn-secondary" onclick="openFolderPicker(${coin.id})">
                                <i class="fas fa-folder-open"></i> Import Folder
                            </button>
                        </div>
                        <div class="upload-drop-zone" id="dropZone_${coin.id}" ondrop="handleDrop(event, ${coin.id})" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop images/videos here</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notes Section -->
            <div class="analysis-section">
                <h3 class="section-title">
                    <i class="fas fa-sticky-note"></i>
                    Additional Notes
                </h3>
                <div class="form-group">
                    <label for="general_notes_${coin.id}">General Notes</label>
                    <textarea id="general_notes_${coin.id}" name="general_notes_${coin.id}" class="form-input form-textarea" placeholder="General notes, research findings, provenance, historical context, etc." 
                              onchange="updateCoinField(${coin.id}, 'notes', this.value)">${coin.notes}</textarea>
                </div>
            </div>
        `;
    }

    renderAnnotations(annotations) {
        return annotations.map(annotation => `
            <div class="annotation-marker" 
                 style="left: ${annotation.x}px; top: ${annotation.y}px;" 
                 data-annotation-id="${annotation.id}"
                 onmousedown="handleAnnotationMouseDown(event, ${annotation.id})"
                 ondblclick="editAnnotation(${annotation.id})">
                <div class="annotation-dot" style="background-color: ${annotation.color}"></div>
                <div class="annotation-label">${annotation.label}</div>
                <button class="annotation-remove" onclick="removeAnnotation(${annotation.id})">×</button>
            </div>
        `).join('');
    }

    renderAIAnalysis(coin) {
        if (!coin.aiAnalysis || (!coin.aiAnalysis.obverse && !coin.aiAnalysis.reverse)) {
            return `
                <div class="ai-analysis-placeholder">
                    <i class="fas fa-brain" style="font-size: 2rem; opacity: 0.3; margin-bottom: 10px;"></i>
                    <p>Upload coin images to get AI-powered analysis</p>
                    <p style="font-size: 0.85rem; opacity: 0.7;">Classification • Feature Detection • Authenticity • Value Estimation</p>
                </div>
            `;
        }

        const renderSideAnalysis = (side, analysis) => {
            if (!analysis) return '';
            
            const sideLabel = side === 'obverse' ? 'Obverse' : 'Reverse';
            
            return `
                <div class="ai-analysis-side">
                    <h4 class="ai-side-title"><i class="fas fa-${side === 'obverse' ? 'circle' : 'circle-notch'}"></i> ${sideLabel}</h4>
                    
                    ${analysis.classification ? `
                        <div class="ai-result-section">
                            <div class="ai-result-header">
                                <i class="fas fa-tag"></i>
                                <span>Classification</span>
                            </div>
                            <div class="ai-predictions">
                                ${analysis.classification.predictions.slice(0, 3).map(pred => `
                                    <div class="ai-prediction-item">
                                        <span class="prediction-label">${pred.label}</span>
                                        <div class="prediction-bar">
                                            <div class="prediction-fill" style="width: ${(pred.confidence * 100).toFixed(1)}%"></div>
                                        </div>
                                        <span class="prediction-confidence">${(pred.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                `).join('')}
                            </div>
                            ${analysis.classification.isCoin !== undefined ? `
                                <div class="ai-coin-detection ${analysis.classification.isCoin ? 'positive' : 'negative'}">
                                    <i class="fas fa-${analysis.classification.isCoin ? 'check-circle' : 'exclamation-triangle'}"></i>
                                    ${analysis.classification.isCoin ? 'Coin detected' : 'May not be a coin'}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${analysis.features ? `
                        <div class="ai-result-section">
                            <div class="ai-result-header">
                                <i class="fas fa-microscope"></i>
                                <span>Feature Analysis</span>
                            </div>
                            <div class="ai-features-grid">
                                ${analysis.features.annotations.map(feature => `
                                    <div class="ai-feature-item rarity-${feature.rarity}">
                                        <div class="feature-name">${feature.name}</div>
                                        <div class="feature-confidence">${(feature.confidence * 100).toFixed(0)}%</div>
                                        <div class="feature-rarity">${feature.rarity} rarity</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${analysis.authenticity ? `
                        <div class="ai-result-section">
                            <div class="ai-result-header">
                                <i class="fas fa-shield-alt"></i>
                                <span>Authenticity Check</span>
                            </div>
                            <div class="ai-authenticity ${analysis.authenticity.isAuthentic ? 'authentic' : 'suspicious'}">
                                <div class="authenticity-score">
                                    <i class="fas fa-${analysis.authenticity.isAuthentic ? 'check-circle' : 'exclamation-triangle'}"></i>
                                    <span class="score-label">${analysis.authenticity.isAuthentic ? 'Likely Authentic' : 'Needs Verification'}</span>
                                    <span class="score-value">${(analysis.authenticity.confidence * 100).toFixed(1)}%</span>
                                </div>
                                ${analysis.authenticity.warnings && analysis.authenticity.warnings.length > 0 ? `
                                    <div class="authenticity-warnings">
                                        ${analysis.authenticity.warnings.map(warning => `
                                            <div class="warning-item">
                                                <i class="fas fa-exclamation-circle"></i>
                                                ${warning}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        };

        return `
            <div class="ai-analysis-container">
                ${renderSideAnalysis('obverse', coin.aiAnalysis.obverse)}
                ${renderSideAnalysis('reverse', coin.aiAnalysis.reverse)}
                
                ${coin.aiAnalysis.obverse?.value || coin.aiAnalysis.reverse?.value ? `
                    <div class="ai-value-estimation">
                        <div class="ai-result-header">
                            <i class="fas fa-dollar-sign"></i>
                            <span>AI Value Estimation</span>
                        </div>
                        ${(coin.aiAnalysis.obverse?.value || coin.aiAnalysis.reverse?.value) ? `
                            <div class="value-estimate">
                                <div class="estimate-amount">
                                    $${((coin.aiAnalysis.obverse?.value?.estimatedValue || 0) + (coin.aiAnalysis.reverse?.value?.estimatedValue || 0)).toFixed(2)}
                                </div>
                                <div class="estimate-range">
                                    Range: $${((coin.aiAnalysis.obverse?.value?.range?.min || 0) + (coin.aiAnalysis.reverse?.value?.range?.min || 0)).toFixed(2)} - 
                                    $${((coin.aiAnalysis.obverse?.value?.range?.max || 0) + (coin.aiAnalysis.reverse?.value?.range?.max || 0)).toFixed(2)}
                                </div>
                                <div class="estimate-confidence">
                                    Confidence: ${(((coin.aiAnalysis.obverse?.value?.confidence || 0) + (coin.aiAnalysis.reverse?.value?.confidence || 0)) / 2 * 100).toFixed(0)}%
                                </div>
                                <div class="estimate-disclaimer">
                                    <i class="fas fa-info-circle"></i>
                                    AI estimation for reference only. Consult professional appraisers for accurate valuation.
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderMediaGallery(coin) {
        if (!coin.media) {
            coin.media = { images: [], videos: [] };
        }
        
        const allMedia = [...coin.media.images, ...coin.media.videos];
        const curatedMedia = allMedia.filter((item) => item.isCurated);
        const filteredMedia = this.applyMediaFilter(allMedia, this.mediaFilter);
        const displayList = this.mediaSortMode === 'curated' && curatedMedia.length > 0 ? curatedMedia : this.applyMediaSort(filteredMedia);
        const emptyStateMessage = this.mediaFilter === 'featured'
            ? 'No featured media yet. Mark star items to spotlight them here.'
            : this.mediaFilter === 'ai'
                ? "No AI-assisted media yet. Run recognition to auto-tag selections."
                : this.mediaFilter === 'macro'
                    ? 'No macro shots in this selection yet. Capture close-ups to highlight key features.'
                    : 'No additional media uploaded yet';

        if (displayList.length === 0) {
            return `
                <div class="media-placeholder">
                    <i class="fas fa-images" style="font-size: 2rem; opacity: 0.3; margin-bottom: 10px;"></i>
                    <p>${emptyStateMessage}</p>
                </div>
            `;
        }
        
        if (this.mediaViewMode === 'timeline') {
            return this.renderMediaTimeline(displayList, coin);
        }

        const viewModeClass = this.getMediaViewClass();
        return `
            <div class="${viewModeClass}" data-view-mode="${this.mediaViewMode}">
                ${displayList.map(media => this.renderMediaItem(coin, media)).join('')}
            </div>
        `;
    }

    getMediaViewClass() {
        switch (this.mediaViewMode) {
            case 'filmstrip':
                return 'media-strip';
            case 'masonry':
            default:
                return 'media-grid';
        }
    }

    renderMediaTimeline(mediaItems, coin) {
        const grouped = mediaItems.reduce((acc, item) => {
            const dateKey = item.uploadDate ? new Date(item.uploadDate).toDateString() : 'Undated';
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
        }, {});

        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
        return `
            <div class="media-timeline">
                ${sortedDates.map(date => `
                    <div class="timeline-group">
                        <div class="timeline-date">${date}</div>
                        <div class="timeline-items">
                            ${grouped[date].map(item => this.renderMediaItem(coin, item)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMediaItem(coin, media) {
        const mediaTags = Array.isArray(media.tags) ? media.tags : [];
        const badgeLabels = [
            media.isCurated ? '<span class="media-badge curated">Curated</span>' : '',
            media.isFeatured ? '<span class="media-badge featured">Featured</span>' : '',
            media.source === 'ai' ? '<span class="media-badge ai">AI</span>' : '',
            media.source === 'market' ? '<span class="media-badge market">Market</span>' : ''
        ].filter(Boolean).join('');

        // Skip rendering if media URL is null or undefined
        if (!media.url) {
            return '';
        }

        return `
            <div class="media-item" data-media-id="${media.id}" data-type="${media.type}" data-source="${media.source || 'manual'}">
                <div class="media-preview" onclick="openMediaModal('${media.id}', ${coin.id})">
                    ${media.type === 'image'
                        ? `<img src="${media.url}" alt="${media.title}" class="media-thumbnail">
                           <div class="media-zoom-icon"><i class="fas fa-search-plus"></i></div>`
                        : `<video src="${media.url}" class="media-thumbnail" muted></video>
                           <div class="media-play-icon"><i class="fas fa-play"></i></div>`
                    }
                    ${badgeLabels ? `<div class="media-badges">${badgeLabels}</div>` : ''}
                    <button class="media-favorite" data-active="${media.isFeatured || false}" onclick="toggleMediaFeatured(event, ${coin.id}, '${media.id}')">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="media-pin" data-active="${media.isPinned || false}" onclick="toggleMediaPinned(event, ${coin.id}, '${media.id}')">
                        <i class="fas fa-thumbt"></i>
                    </button>
                </div>
                <div class="media-info">
                    <div class="media-info-header">
                        <input type="text" id="media_title_${coin.id}_${media.id}" name="media_title_${coin.id}_${media.id}" class="media-title" value="${media.title}" placeholder="Media title"
                               onchange="updateMediaTitle(${coin.id}, '${media.id}', this.value)">
                        <div class="media-tag-list">
                            ${mediaTags.map(tag => `<span class="media-tag">${tag}</span>`).join('')}
                            <button class="btn btn-secondary btn-icon" onclick="promptAddMediaTag(${coin.id}, '${media.id}')" title="Add tag">
                                <i class="fas fa-tag"></i>
                            </button>
                        </div>
                    </div>
                    <textarea id="media_description_${coin.id}_${media.id}" name="media_description_${coin.id}_${media.id}" class="media-description" placeholder="Description"
                              onchange="updateMediaDescription(${coin.id}, '${media.id}', this.value)">${media.description || ''}</textarea>
                    <div class="media-properties">
                        <label class="media-checkbox">
                            <input type="checkbox" id="media_curated_${coin.id}_${media.id}" name="media_curated_${coin.id}_${media.id}" ${media.isCurated ? 'checked' : ''} onchange="toggleMediaCurated(${coin.id}, '${media.id}', this.checked)">
                            <span>Curate into spotlight</span>
                        </label>
                        <label class="media-checkbox">
                            <input type="checkbox" id="media_annotations_${coin.id}_${media.id}" name="media_annotations_${coin.id}_${media.id}" ${media.allowAnnotations || false ? 'checked' : ''} onchange="toggleMediaAnnotations(${coin.id}, '${media.id}', this.checked)">
                            <span>Enable micro-annotations</span>
                        </label>
                    </div>
                    <div class="media-footer">
                        <span class="media-meta">${media.uploadDate ? new Date(media.uploadDate).toLocaleString() : ''}</span>
                        <div class="media-actions">
                            <button class="btn btn-secondary btn-small" onclick="cycleMediaOrientation(${coin.id}, '${media.id}')">
                                <i class="fas fa-sync-alt"></i> Rotate
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="duplicateMedia(${coin.id}, '${media.id}')">
                                <i class="fas fa-clone"></i> Duplicate
                            </button>
                            <button class="btn btn-danger btn-small" onclick="removeMedia(${coin.id}, '${media.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Media filtering and sorting methods
    applyMediaFilter(mediaList, filter) {
        if (filter === 'all') {
            return mediaList;
        }
        
        return mediaList.filter(media => {
            switch (filter) {
                case 'featured':
                    return media.isFeatured === true;
                case 'ai':
                    return media.source === 'ai';
                case 'macro':
                    return media.tags && media.tags.includes('macro');
                case 'video':
                    return media.type === 'video';
                case 'annotated':
                    return media.allowAnnotations === true;
                default:
                    return true;
            }
        });
    }

    applyMediaSort(mediaList) {
        const sorted = [...mediaList];
        
        switch (this.mediaSortMode) {
            case 'curated':
                return sorted.sort((a, b) => {
                    if (a.isCurated && !b.isCurated) return -1;
                    if (!a.isCurated && b.isCurated) return 1;
                    return 0;
                });
            case 'chronological':
                return sorted.sort((a, b) => {
                    const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
                    const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
                    return dateB - dateA;
                });
            case 'title':
                return sorted.sort((a, b) => {
                    const titleA = (a.title || '').toLowerCase();
                    const titleB = (b.title || '').toLowerCase();
                    return titleA.localeCompare(titleB);
                });
            case 'type':
                return sorted.sort((a, b) => {
                    return (a.type || '').localeCompare(b.type || '');
                });
            default:
                return sorted;
        }
    }

    // Mode Management
    setMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update cursor style for all images
        document.querySelectorAll('.coin-image').forEach(img => {
            img.style.cursor = mode === 'view' ? 'default' : 'crosshair';
        });
    }

    setQuickAnnotationType(type) {
        this.quickAnnotationType = type;
        this.setMode('annotate');
        
        // Highlight the selected annotation type
        document.querySelectorAll('.annotation-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === type);
        });
    }

    // Annotation Management
    addAnnotation(coinId, side, x, y, label = null) {
        if (this.currentMode !== 'annotate') return;
        
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin) return;

        const annotationLabel = label || this.quickAnnotationType || 'New annotation';
        const colors = ['#f97316', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
        const color = colors[coin.annotations[side].length % colors.length];

        const annotation = {
            id: this.nextAnnotationId++,
            x,
            y,
            label: annotationLabel,
            color
        };

        coin.annotations[side].push(annotation);
        this.renderCoins();
        this.saveToStorage();
        
        this.quickAnnotationType = null;
        document.querySelectorAll('.annotation-btn').forEach(btn => btn.classList.remove('active'));
    }

    updateAnnotation(annotationId, updates) {
        this.coins.forEach(coin => {
            ['obverse', 'reverse'].forEach(side => {
                const annotation = coin.annotations[side].find(a => a.id === annotationId);
                if (annotation) {
                    Object.assign(annotation, updates);
                }
            });
        });
        this.renderCoins();
        this.saveToStorage();
    }

    removeAnnotation(annotationId) {
        this.coins.forEach(coin => {
            ['obverse', 'reverse'].forEach(side => {
                coin.annotations[side] = coin.annotations[side].filter(a => a.id !== annotationId);
            });
        });
        this.renderCoins();
        this.saveToStorage();
    }

    editAnnotation(annotationId) {
        let annotation = null;
        this.coins.forEach(coin => {
            ['obverse', 'reverse'].forEach(side => {
                const found = coin.annotations[side].find(a => a.id === annotationId);
                if (found) annotation = found;
            });
        });

        if (annotation) {
            document.getElementById('annotationText').value = annotation.label;
            document.getElementById('annotationColor').value = annotation.color;
            this.selectedAnnotation = annotationId;
            this.showModal('annotationModal');
        }
    }

    saveAnnotation() {
        if (this.selectedAnnotation) {
            const label = document.getElementById('annotationText').value;
            const color = document.getElementById('annotationColor').value;
            
            this.updateAnnotation(this.selectedAnnotation, { label, color });
            this.selectedAnnotation = null;
            this.closeModal('annotationModal');
        }
    }

    // Image Management
    handleImageUpload(coinId, side, fileInput) {
        console.log('handleImageUpload called:', { coinId, side, fileInput });
        
        const file = fileInput.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', { name: file.name, type: file.type, size: file.size });

        // Ensure file is an image for main coin images
        if (!file.type.startsWith('image/')) {
            const errorMsg = 'Please select an image file for the coin images.';
            alert(errorMsg);
            this.logToConsole(errorMsg, 'error');
            return;
        }

        this.logToConsole(`Processing ${side} image for coin ${coinId}... (${file.name}, ${(file.size/1024).toFixed(1)}KB)`, 'info');
        
        // Compress and resize image to save storage space
        this.compressImage(file, 800, 0.8).then(compressedDataUrl => {
            console.log('Image compressed successfully, size:', compressedDataUrl.length);
            
            const coin = this.coins.find(c => c.id === coinId);
            if (coin) {
                coin.images[side] = compressedDataUrl;
                
                // Initialize AI analysis storage if not exists
                if (!coin.aiAnalysis) {
                    coin.aiAnalysis = { obverse: null, reverse: null };
                }
                
                this.renderCoins();
                this.saveToStorage();
                
                this.logToConsole(`${side} image processed and saved successfully`, 'success');
                
                // Trigger AI analysis with compressed image data URL
                this.analyzeImage(coinId, side, compressedDataUrl);
            } else {
                console.error('Coin not found:', coinId);
                this.logToConsole(`Error: Coin ${coinId} not found`, 'error');
            }
        }).catch(error => {
            this.logToConsole(`Failed to process ${side} image: ${error.message}`, 'error');
            console.error('Image compression failed:', error);
            alert(`Failed to process image: ${error.message}`);
        });
    }
    
    // Compress image to reduce storage usage
    compressImage(file, maxWidth = 800, quality = 0.8) {
        console.log('Starting image compression:', { fileName: file.name, fileSize: file.size, maxWidth, quality });
        
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                console.log('Image loaded for compression:', { originalWidth: img.width, originalHeight: img.height });
                
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                console.log('Calculated new dimensions:', { width, height });
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed data URL
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Check size reduction
                const originalSize = file.size;
                const compressedSize = Math.round((compressedDataUrl.length * 3) / 4); // Approximate size
                
                console.log(`Image compressed: ${Math.round(originalSize/1024)}KB → ${Math.round(compressedSize/1024)}KB`);
                
                // Clean up object URL
                URL.revokeObjectURL(img.src);
                
                resolve(compressedDataUrl);
            };
            
            img.onerror = (error) => {
                console.error('Image load error:', error);
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image for compression'));
            };
            
            try {
                img.src = URL.createObjectURL(file);
                console.log('Created object URL for image:', img.src);
            } catch (error) {
                console.error('Failed to create object URL:', error);
                reject(new Error('Failed to create object URL for image'));
            }
        });
    }
    
    // AI Analysis
    async analyzeImage(coinId, side, imageData) {
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin) return;
        
        try {
            // Show loading indicator
            this.showAIAnalysisLoading(coinId, side);
            
            // Import AI orchestrator dynamically
            const { analyzeCoinImages } = await import('./js/ai-orchestrator.js');
            
            // Analyze the image (imageData can be File object or data URL string)
            const results = await analyzeCoinImages([imageData], {
                classify: true,
                features: true,
                authenticity: true,
                value: true
            });
            
            if (results.success && results.results && results.results.length > 0) {
                const analysis = results.results[0];
                
                // Store analysis results
                if (!coin.aiAnalysis) {
                    coin.aiAnalysis = { obverse: null, reverse: null };
                }
                coin.aiAnalysis[side] = analysis;
                
                this.saveToStorage();
                this.renderCoins();
                
                console.log(`AI Analysis complete for ${side}:`, analysis);
            }
        } catch (error) {
            console.error('AI Analysis failed:', error);
            this.showAIAnalysisError(coinId, side, error.message);
        }
    }
    
    showAIAnalysisLoading(coinId, side) {
        const container = document.getElementById(`ai-analysis-${side}-${coinId}`);
        if (container) {
            container.innerHTML = `
                <div class="ai-analysis-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Analyzing with AI...</span>
                </div>
            `;
        }
    }
    
    showAIAnalysisError(coinId, side, message) {
        const container = document.getElementById(`ai-analysis-${side}-${coinId}`);
        if (container) {
            container.innerHTML = `
                <div class="ai-analysis-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Analysis failed: ${message}</span>
                </div>
            `;
        }
    }

    // Media Management
    handleMediaUpload(coinId, fileInput) {
        const files = Array.from(fileInput.files);
        if (files.length === 0) return;

        const coin = this.coins.find(c => c.id === coinId);
        if (!coin) return;

        if (!coin.media) {
            coin.media = { images: [], videos: [] };
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                
                const mediaItem = {
                    id: mediaId,
                    type: mediaType,
                    url: e.target.result,
                    title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
                    description: '',
                    uploadDate: new Date().toISOString()
                };

                if (mediaType === 'video') {
                    coin.media.videos.push(mediaItem);
                } else {
                    coin.media.images.push(mediaItem);
                }

                this.renderCoins();
                this.saveToStorage();
            };
            reader.readAsDataURL(file);
        });

        // Clear the file input
        fileInput.value = '';
    }

    updateMediaTitle(coinId, mediaId, title) {
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin || !coin.media) return;

        const allMedia = [...coin.media.images, ...coin.media.videos];
        const media = allMedia.find(m => m.id === mediaId);
        if (media) {
            media.title = title;
            this.saveToStorage();
        }
    }

    updateMediaDescription(coinId, mediaId, description) {
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin || !coin.media) return;

        const allMedia = [...coin.media.images, ...coin.media.videos];
        const media = allMedia.find(m => m.id === mediaId);
        if (media) {
            media.description = description;
            this.saveToStorage();
        }
    }

    removeMedia(coinId, mediaId) {
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin || !coin.media) return;

        coin.media.images = coin.media.images.filter(m => m.id !== mediaId);
        coin.media.videos = coin.media.videos.filter(m => m.id !== mediaId);
        
        this.renderCoins();
        this.saveToStorage();
    }

    // Comparison Mode
    toggleComparisonView() {
        this.comparisonMode = !this.comparisonMode;
        const panel = document.getElementById('comparisonPanel');
        const button = document.getElementById('comparisonToggle');
        
        if (this.comparisonMode) {
            panel.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-times"></i> Disable Comparison View';
        } else {
            panel.classList.add('hidden');
            button.innerHTML = '<i class="fas fa-columns"></i> Enable Comparison View';
            this.comparisonSlots = [null, null];
        }
        
        this.renderCoins();
    }

    addToComparison(coinId) {
        const coin = this.coins.find(c => c.id === coinId);
        if (!coin) return;

        if (!this.comparisonSlots[0]) {
            this.comparisonSlots[0] = coin;
            document.getElementById('comparisonSlot1').innerHTML = this.renderComparisonSlot(coin);
        } else if (!this.comparisonSlots[1]) {
            this.comparisonSlots[1] = coin;
            document.getElementById('comparisonSlot2').innerHTML = this.renderComparisonSlot(coin);
        } else {
            // Replace first slot
            this.comparisonSlots[0] = coin;
            document.getElementById('comparisonSlot1').innerHTML = this.renderComparisonSlot(coin);
        }
        
        document.querySelectorAll('.comparison-slot').forEach(slot => {
            if (slot.innerHTML.includes(coin.title)) {
                slot.classList.add('has-coin');
            }
        });
    }

    renderComparisonSlot(coin) {
        const image = coin.images.obverse || coin.images.reverse;
        return `
            <div style="text-align: center;" class="comparison-coin-content">
                ${image ? `<img src="${image}" alt="${coin.title}" style="max-width: 100%; max-height: 150px; border-radius: 8px; margin-bottom: 12px; cursor: pointer;" onclick="openImageZoom('${coin.images.obverse ? 'obverse' : 'reverse'}', ${coin.id})">` : ''}
                <h4>${coin.title}</h4>
                <div class="text-muted">${coin.metadata.country} ${coin.metadata.year}</div>
                <div class="text-muted">${coin.condition.grade}</div>
                <div style="color: var(--success-color); font-weight: 600; margin-top: 8px;">
                    ${coin.valuation.currentEstimate || `$${coin.valuation.scenarios.common.min}-${coin.valuation.scenarios.collectible.max}`}
                </div>
                <button class="btn btn-small btn-secondary" onclick="removeFromComparison(${coin.id})" style="margin-top: 8px;">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        `;
    }
    
    removeFromComparison(coinId) {
        if (this.comparisonSlots[0] && this.comparisonSlots[0].id === coinId) {
            this.comparisonSlots[0] = null;
            document.getElementById('comparisonSlot1').innerHTML = '<p>Select a coin to compare</p>';
            document.getElementById('comparisonSlot1').classList.remove('has-coin');
        } else if (this.comparisonSlots[1] && this.comparisonSlots[1].id === coinId) {
            this.comparisonSlots[1] = null;
            document.getElementById('comparisonSlot2').innerHTML = '<p>Select another coin to compare</p>';
            document.getElementById('comparisonSlot2').classList.remove('has-coin');
        }
    }
    
    deleteImage(coinId, side) {
        if (confirm('Are you sure you want to delete this image?')) {
            const coin = this.coins.find(c => c.id === coinId);
            if (coin) {
                coin.images[side] = null;
                
                // Clear AI analysis for this side
                if (coin.aiAnalysis && coin.aiAnalysis[side]) {
                    coin.aiAnalysis[side] = null;
                }
                
                this.renderCoins();
                this.saveToStorage();
                this.logToConsole(`Deleted ${side} image for ${coin.title}`, 'info');
            }
        }
    }

    clearComparison() {
        this.comparisonSlots = [null, null];
        document.getElementById('comparisonSlot1').innerHTML = '<p>Select a coin to compare</p>';
        document.getElementById('comparisonSlot2').innerHTML = '<p>Select another coin to compare</p>';
        document.querySelectorAll('.comparison-slot').forEach(slot => slot.classList.remove('has-coin'));
    }

    // Export Functionality
    showExportModal() {
        this.showModal('exportModal');
    }

    exportCollection() {
        const format = document.getElementById('exportFormat').value;
        const includeImages = document.querySelector('#exportModal input[type="checkbox"]:nth-child(1)').checked;
        const includeAnnotations = document.querySelector('#exportModal input[type="checkbox"]:nth-child(2)').checked;
        const includeValuations = document.querySelector('#exportModal input[type="checkbox"]:nth-child(3)').checked;
        const includeNotes = document.querySelector('#exportModal input[type="checkbox"]:nth-child(4)').checked;

        let exportData = this.coins.map(coin => {
            const exportCoin = {
                id: coin.id,
                title: coin.title,
                description: coin.description,
                metadata: coin.metadata,
                condition: coin.condition,
                created: coin.created,
                modified: coin.modified
            };

            if (includeImages) exportCoin.images = coin.images;
            if (includeAnnotations) exportCoin.annotations = coin.annotations;
            if (includeValuations) exportCoin.valuation = coin.valuation;
            if (includeNotes) exportCoin.notes = coin.notes;

            return exportCoin;
        });

        this.performExport(exportData, format);
        this.closeModal('exportModal');
    }

    performExport(data, format) {
        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = `coin-collection-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.convertToCSV(data);
                filename = `coin-collection-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;
            case 'html':
                content = this.generateHTMLReport(data);
                filename = `coin-collection-report-${new Date().toISOString().split('T')[0]}.html`;
                mimeType = 'text/html';
                break;
            default:
                alert('Export format not supported yet');
                return;
        }

        this.downloadFile(content, filename, mimeType);
    }

    convertToCSV(data) {
        const headers = ['ID', 'Title', 'Country', 'Year', 'Denomination', 'Metal', 'Grade', 'Estimate', 'Notes'];
        const rows = data.map(coin => [
            coin.id,
            coin.title,
            coin.metadata.country,
            coin.metadata.year,
            coin.metadata.denomination,
            coin.metadata.metal,
            coin.condition.grade,
            coin.valuation?.currentEstimate || '',
            coin.notes?.replace(/\n/g, ' ') || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    generateHTMLReport(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Coin Collection Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .coin { margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
        .coin-title { font-size: 1.5em; font-weight: bold; margin-bottom: 10px; }
        .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metadata-item { margin-bottom: 5px; }
        .label { font-weight: bold; }
        .notes { margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Coin Collection Report</h1>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <p>Total Coins: ${data.length}</p>
    
    ${data.map(coin => `
        <div class="coin">
            <div class="coin-title">${coin.title}</div>
            <div class="metadata">
                <div class="metadata-item"><span class="label">Country:</span> ${coin.metadata.country}</div>
                <div class="metadata-item"><span class="label">Year:</span> ${coin.metadata.year}</div>
                <div class="metadata-item"><span class="label">Denomination:</span> ${coin.metadata.denomination}</div>
                <div class="metadata-item"><span class="label">Metal:</span> ${coin.metadata.metal}</div>
                <div class="metadata-item"><span class="label">Grade:</span> ${coin.condition.grade}</div>
                <div class="metadata-item"><span class="label">Estimate:</span> ${coin.valuation?.currentEstimate || 'Not specified'}</div>
            </div>
            ${coin.notes ? `<div class="notes"><strong>Notes:</strong> ${coin.notes}</div>` : ''}
        </div>
    `).join('')}
</body>
</html>
        `;
    }

    exportComparison() {
        if (this.comparisonSlots[0] && this.comparisonSlots[1]) {
            const comparisonData = {
                coin1: this.comparisonSlots[0],
                coin2: this.comparisonSlots[1],
                comparisonDate: new Date().toISOString()
            };
            this.performExport([comparisonData], 'json');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Storage Management
    async saveToStorage() {
        console.log('saveToStorage called, coins count:', this.coins.length);
        try {
            // Check storage quota before saving
            const dataToSave = JSON.stringify(this.coins);
            const metaToSave = JSON.stringify({
                nextCoinId: this.nextCoinId,
                nextAnnotationId: this.nextAnnotationId,
                expandedCoins: Array.from(this.expandedCoins)
            });
            
            // Estimate storage size (rough calculation)
            const estimatedSize = (dataToSave.length + metaToSave.length) * 2; // UTF-16 encoding
            const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(2);
            
            console.log('Storage size estimate:', { sizeMB, estimatedSize });
            
            // Check if we're approaching localStorage limit (usually 5-10MB)
            if (estimatedSize > 4 * 1024 * 1024) { // 4MB threshold
                this.logToConsole(`Storage size (${sizeMB}MB) approaching limit, compressing...`, 'warning');
                await this.handleStorageQuotaExceeded();
                return;
            }
            
            localStorage.setItem('coinCollection', dataToSave);
            localStorage.setItem('coinCollectionMeta', metaToSave);
            
            console.log('Data saved to localStorage successfully');
            this.logToConsole(`Storage saved successfully (${sizeMB}MB)`, 'success');
            this.updateStorageStatus(estimatedSize);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.logToConsole('Storage quota exceeded during save', 'error');
                await this.handleStorageQuotaExceeded();
            } else {
                console.error('Storage error:', error);
                this.logToConsole(`Storage error: ${error.message}`, 'error');
            }
        }
    }
    
    updateStorageStatus(usedBytes) {
        const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
        const maxMB = 5; // Approximate localStorage limit
        const percentage = Math.min((usedBytes / (maxMB * 1024 * 1024)) * 100, 100);
        
        this.updateServiceStatus('storage', 'ready', percentage, `${usedMB}MB used`);
        
        if (percentage > 80) {
            this.logToConsole(`Storage usage high: ${usedMB}MB (${percentage.toFixed(1)}%)`, 'warning');
        }
    }
    
    async handleStorageQuotaExceeded() {
        this.logToConsole('Storage quota exceeded! Compressing images...', 'warning');
        
        // Compress images in all coins
        let compressionApplied = false;
        
        for (const coin of this.coins) {
            // Compress main images
            if (coin.images.obverse && coin.images.obverse.length > 100000) {
                coin.images.obverse = await this.compressDataUrl(coin.images.obverse);
                compressionApplied = true;
            }
            if (coin.images.reverse && coin.images.reverse.length > 100000) {
                coin.images.reverse = await this.compressDataUrl(coin.images.reverse);
                compressionApplied = true;
            }
            
            // Compress media images
            if (coin.media && coin.media.images) {
                for (const media of coin.media.images) {
                    if (media.data && media.data.length > 100000) {
                        media.data = await this.compressDataUrl(media.data);
                        compressionApplied = true;
                    }
                }
            }
        }
        
        if (compressionApplied) {
            this.logToConsole('Images compressed, retrying save...', 'info');
            try {
                localStorage.setItem('coinCollection', JSON.stringify(this.coins));
                localStorage.setItem('coinCollectionMeta', JSON.stringify({
                    nextCoinId: this.nextCoinId,
                    nextAnnotationId: this.nextAnnotationId,
                    expandedCoins: Array.from(this.expandedCoins)
                }));
                this.logToConsole('Storage saved after compression', 'success');
            } catch (retryError) {
                this.logToConsole('Storage still exceeded after compression. Consider using fewer/smaller images.', 'error');
                alert('Storage quota exceeded! Please delete some images or use smaller file sizes.');
            }
        } else {
            this.logToConsole('No images to compress. Storage quota exceeded.', 'error');
            alert('Storage quota exceeded! Please delete some coins or images.');
        }
    }
    
    // Synchronous compression for data URLs
    compressDataUrl(dataUrl, quality = 0.6) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions (max 600px for storage compression)
                const maxSize = 600;
                let { width, height } = img;
                
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            
            img.src = dataUrl;
        });
    }
    
    compressImage(dataUrl, quality = 0.7) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions (max 800px)
                const maxSize = 800;
                let { width, height } = img;
                
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            
            img.src = dataUrl;
        });
    }

    loadFromStorage() {
        const stored = localStorage.getItem('coinCollection');
        const meta = localStorage.getItem('coinCollectionMeta');
        
        if (stored) {
            this.coins = JSON.parse(stored);
        }
        
        if (meta) {
            const metaData = JSON.parse(meta);
            this.nextCoinId = metaData.nextCoinId || 1;
            this.nextAnnotationId = metaData.nextAnnotationId || 1000;
            this.expandedCoins = new Set(metaData.expandedCoins || []);
        }
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // View Toggle
    toggleViewMode() {
        // This could toggle between different view layouts
        const button = document.getElementById('viewModeText');
        if (button.textContent === 'Analysis View') {
            button.textContent = 'Gallery View';
            // Implement gallery view logic
        } else {
            button.textContent = 'Analysis View';
            // Implement analysis view logic
        }
    }
}

// Initialize the application
let coinManager;

document.addEventListener('DOMContentLoaded', function() {
    coinManager = new CoinCollectionManager();
});

// Global functions for HTML event handlers
function addNewCoin() {
    coinManager.addCoin();
}

function deleteCoin(coinId) {
    coinManager.deleteCoin(coinId);
}

function toggleCoinExpansion(coinId) {
    const content = document.getElementById(`coinContent_${coinId}`);
    const card = document.querySelector(`[data-coin-id="${coinId}"]`);
    const chevron = card.querySelector('.fa-chevron-down');
    
    if (coinManager.expandedCoins.has(coinId)) {
        // Collapse coin
        content.style.display = 'none';
        card.classList.remove('expanded');
        chevron.style.transform = 'rotate(0deg)';
        coinManager.expandedCoins.delete(coinId);
    } else {
        // Expand coin
        content.style.display = 'block';
        card.classList.add('expanded');
        chevron.style.transform = 'rotate(180deg)';
        coinManager.expandedCoins.add(coinId);
        
        // Auto-trigger market search after expansion
        const coin = coinManager.coins.find(c => c.id === coinId);
        if (coin && coin.metadata.country && coin.metadata.year && coin.metadata.denomination) {
            setTimeout(() => autoSearchForCoin(coinId), 3000);
        }
    }
    
    coinManager.saveToStorage();
}

function setMode(mode) {
    coinManager.setMode(mode);
}

function setQuickAnnotation(type) {
    coinManager.setQuickAnnotationType(type);
}

function handleImageUpload(coinId, side, input) {
    console.log('Global handleImageUpload called:', { coinId, side, input });
    if (!coinManager) {
        console.error('coinManager not initialized');
        return;
    }
    coinManager.handleImageUpload(coinId, side, input);
}

function handleImageClick(event, coinId, side) {
    if (coinManager.currentMode === 'annotate') {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        coinManager.addAnnotation(coinId, side, x, y);
    }
}

function handleAnnotationMouseDown(event, annotationId) {
    event.stopPropagation();
    
    if (coinManager.currentMode === 'move') {
        let isDragging = true;
        const annotation = event.currentTarget;
        const overlay = annotation.parentElement;
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const rect = overlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            annotation.style.left = x + 'px';
            annotation.style.top = y + 'px';
            
            coinManager.updateAnnotation(annotationId, { x, y });
        }
        
        function handleMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
}

function editAnnotation(annotationId) {
    coinManager.editAnnotation(annotationId);
}

function removeAnnotation(annotationId) {
    if (confirm('Remove this annotation?')) {
        coinManager.removeAnnotation(annotationId);
    }
}

function saveAnnotation() {
    coinManager.saveAnnotation();
}

function updateCoinField(coinId, field, value) {
    coinManager.updateCoin(coinId, { [field]: value });
}

function updateCoinMetadata(coinId, field, value) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (coin) {
        coin.metadata[field] = value;
        coinManager.saveToStorage();
    }
}

function updateCoinCondition(coinId, field, value) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (coin) {
        coin.condition[field] = value;
        coinManager.saveToStorage();
    }
}

function updateCoinValuation(coinId, field, value) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (coin) {
        coin.valuation[field] = value;
        coinManager.saveToStorage();
    }
}

function updateValuationScenario(coinId, scenario, field, value) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (coin) {
        coin.valuation.scenarios[scenario][field] = parseFloat(value) || 0;
        coinManager.saveToStorage();
        // Re-render just the valuation section to update display
        setTimeout(() => coinManager.renderCoins(), 100);
    }
}

function toggleComparisonView() {
    coinManager.toggleComparisonView();
}

function addToComparison(coinId) {
    coinManager.addToComparison(coinId);
}

function removeFromComparison(coinId) {
    coinManager.removeFromComparison(coinId);
}

function clearComparison() {
    coinManager.clearComparison();
}

function exportComparison() {
    coinManager.exportComparison();
}

// AI Re-analysis
async function reanalyzeWithAI(coinId) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (!coin) return;

    try {
        // Re-analyze both sides if images exist
        if (coin.images.obverse) {
            // Use the data URL directly
            await coinManager.analyzeImage(coinId, 'obverse', coin.images.obverse);
        }
        
        if (coin.images.reverse) {
            // Use the data URL directly
            await coinManager.analyzeImage(coinId, 'reverse', coin.images.reverse);
        }
        
        console.log('AI re-analysis complete for coin:', coinId);
    } catch (error) {
        console.error('AI re-analysis failed:', error);
        alert('Failed to re-analyze coin. Please try again.');
    }
}

// Web Search for Coin Comparison
async function searchSimilarCoins(coinId) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (!coin) return;

    const searchQuery = `${coin.metadata.country} ${coin.metadata.year} ${coin.metadata.denomination} coin value price guide`;
    
    try {
        // Show loading indicator
        const searchContainer = document.getElementById(`searchResults_${coinId}`);
        if (searchContainer) {
            searchContainer.innerHTML = '<div class="loading">🔍 Searching for similar coins...</div>';
        }
        
        // Simulate web search API call - replace with actual API
        const mockResults = await simulateWebSearch(searchQuery, coin);
        displaySearchResults(coinId, mockResults);
        
    } catch (error) {
        console.error('Search failed:', error);
        const searchContainer = document.getElementById(`searchResults_${coinId}`);
        if (searchContainer) {
            searchContainer.innerHTML = '<div class="error">Search temporarily unavailable. Please try again later.</div>';
        }
    }
}

async function simulateWebSearch(query, coin) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock search results based on coin data
    const basePrice = parseFloat(coin.valuation.currentEstimate) || 100;
    const year = parseInt(coin.metadata.year) || 2000;
    const country = coin.metadata.country || 'United States';
    
    // Generate more comprehensive results with images
    const results = [
        {
            title: `${coin.metadata.year} ${country} ${coin.metadata.denomination} - Heritage Auctions`,
            price: `$${Math.round(basePrice * (0.8 + Math.random() * 0.4))}`,
            condition: 'MS-65',
            source: 'Heritage Auctions',
            url: `https://coins.ha.com/search?q=${encodeURIComponent(query)}`,
            image: 'https://via.placeholder.com/120x120/8B4513/FFFFFF?text=Coin',
            description: `Certified ${coin.metadata.denomination} in excellent condition. Well-struck example with original luster.`,
            soldDate: '2024-01-15'
        },
        {
            title: `${coin.metadata.year} ${coin.metadata.denomination} PCGS Graded - eBay`,
            price: `$${Math.round(basePrice * (0.6 + Math.random() * 0.8))}`,
            condition: 'AU-58',
            source: 'eBay',
            url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`,
            image: 'https://via.placeholder.com/120x120/DAA520/FFFFFF?text=eBay',
            description: `PCGS certified coin with minimal wear. Popular collector item.`,
            soldDate: '2024-02-03'
        },
        {
            title: `${country} ${coin.metadata.denomination} Price Guide - PCGS`,
            price: `$${Math.round(basePrice * (0.9 + Math.random() * 0.2))} - $${Math.round(basePrice * (1.1 + Math.random() * 0.3))}`,
            condition: 'Various',
            source: 'PCGS Price Guide',
            url: `https://www.pcgs.com/prices`,
            image: 'https://via.placeholder.com/120x120/228B22/FFFFFF?text=PCGS',
            description: `Current market values for ${coin.metadata.denomination} coins in various grades.`,
            soldDate: 'Current'
        },
        {
            title: `${coin.metadata.year} ${coin.metadata.denomination} - Stack's Bowers`,
            price: `$${Math.round(basePrice * (1.1 + Math.random() * 0.4))}`,
            condition: 'MS-64',
            source: 'Stack\'s Bowers',
            url: `https://www.stacksbowers.com/search?q=${encodeURIComponent(query)}`,
            image: 'https://via.placeholder.com/120x120/A0522D/FFFFFF?text=SB',
            description: `Professional numismatic auction house. Includes full provenance and detailed imagery.`,
            soldDate: '2024-01-28'
        },
        {
            title: `${coin.metadata.year} ${coin.metadata.denomination} NGC Certified`,
            price: `$${Math.round(basePrice * (0.9 + Math.random() * 0.3))}`,
            condition: 'MS-63',
            source: 'NGC Registry',
            url: `https://www.ngccoin.com/price-guide/`,
            image: 'https://via.placeholder.com/120x120/CD853F/FFFFFF?text=NGC',
            description: `NGC certified example with detailed population reports and market analysis.`,
            soldDate: '2024-02-10'
        },
        {
            title: `${coin.metadata.year} ${coin.metadata.denomination} Auction Record`,
            price: `$${Math.round(basePrice * (1.2 + Math.random() * 0.5))}`,
            condition: 'MS-66',
            source: 'Coin World',
            url: `https://www.coinworld.com/search?q=${encodeURIComponent(query)}`,
            image: 'https://via.placeholder.com/120x120/5D2F0A/FFFFFF?text=CW',
            description: `Recent auction record for premium grade example. Market trending upward.`,
            soldDate: '2024-01-20'
        },
        {
            title: `${country} ${coin.metadata.denomination} Collector Forum`,
            price: `$${Math.round(basePrice * (0.7 + Math.random() * 0.6))}`,
            condition: 'VF-30',
            source: 'CoinTalk Forum',
            url: `https://www.cointalk.com/search/?q=${encodeURIComponent(query)}`,
            image: 'https://via.placeholder.com/120x120/654321/FFFFFF?text=CT',
            description: `Community discussion and recent sales data from collector forums.`,
            soldDate: '2024-02-05'
        },
        {
            title: `${coin.metadata.year} ${coin.metadata.denomination} Variety Guide`,
            price: `$${Math.round(basePrice * (0.5 + Math.random() * 1.0))}`,
            condition: 'Various',
            source: 'CONECA',
            url: `https://www.conecaonline.org/`,
            image: 'https://via.placeholder.com/120x120/8B7355/FFFFFF?text=VAR',
            description: `Variety and error coin information with pricing for different die states.`,
            soldDate: 'Reference'
        }
    ];
    
    return results;
}

function displaySearchResults(coinId, results) {
    const searchContainer = document.getElementById(`searchResults_${coinId}`);
    if (!searchContainer) return;
    
    const html = `
        <div class="search-results">
            <h4><i class="fas fa-search"></i> Market Comparison Results (${results.length} found)</h4>
            ${results.map(result => `
                <div class="search-result-item" onclick="window.open('${result.url}', '_blank')">
                    <div class="result-content">
                        <div class="result-image">
                            <img src="${result.image}" alt="Coin" onerror="this.src='https://via.placeholder.com/120x120/666/FFF?text=No+Image'">
                        </div>
                        <div class="result-info">
                            <div class="result-header">
                                <h5 class="result-title">${result.title}</h5>
                                <div class="result-price">${result.price}</div>
                            </div>
                            <div class="result-details">
                                <span class="result-condition">Grade: ${result.condition}</span>
                                <span class="result-source">Source: ${result.source}</span>
                                <span class="result-date">Date: ${result.soldDate}</span>
                            </div>
                            <p class="result-description">${result.description}</p>
                            <div class="result-link">
                                <i class="fas fa-external-link-alt"></i> Click to view on ${result.source}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    searchContainer.innerHTML = html;
}

function autoSearchForCoin(coinId) {
    // Auto-trigger search when coin is expanded or metadata is updated
    if (coinManager.expandedCoins.has(coinId)) {
        setTimeout(() => searchSimilarCoins(coinId), 2000);
    }
}

function exportCollection() {
    coinManager.showExportModal();
}

function performExport() {
    coinManager.exportCollection();
}

function toggleViewMode() {
    coinManager.toggleViewMode();
}

function closeModal(modalId) {
    coinManager.closeModal(modalId);
}

// Media Gallery Functions
function toggleMediaUpload(coinId) {
    const panel = document.getElementById(`mediaUpload_${coinId}`);
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
}

function handleMediaUpload(coinId, input) {
    coinManager.handleMediaUpload(coinId, input);
    // Hide upload panel after upload
    setTimeout(() => {
        const panel = document.getElementById(`mediaUpload_${coinId}`);
        if (panel) panel.style.display = 'none';
    }, 500);
}

function updateMediaTitle(coinId, mediaId, title) {
    coinManager.updateMediaTitle(coinId, mediaId, title);
}

function updateMediaDescription(coinId, mediaId, description) {
    coinManager.updateMediaDescription(coinId, mediaId, description);
}

function removeMedia(coinId, mediaId) {
    if (confirm('Are you sure you want to remove this media item?')) {
        coinManager.removeMedia(coinId, mediaId);
    }
}

function openImageZoom(side, coinId) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (!coin || !coin.images[side]) return;

    // Create and show image zoom modal
    const existingModal = document.getElementById('imageZoomModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'imageZoomModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content media-modal-content">
            <div class="modal-header">
                <h3>${side.charAt(0).toUpperCase() + side.slice(1)} - ${coin.title}</h3>
                <button class="modal-close" onclick="closeModal('imageZoomModal')">×</button>
            </div>
            <div class="media-modal-body">
                <img src="${coin.images[side]}" alt="${side}" class="modal-media-full" id="zoomableImage">
                <div class="media-controls">
                    <button class="btn btn-secondary" onclick="toggleImageZoom()">
                        <i class="fas fa-search-plus"></i> Zoom
                    </button>
                    <button class="btn btn-secondary" onclick="downloadMedia('${coin.images[side]}', '${coin.title}_${side}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-secondary" onclick="setMode('annotate'); closeModal('imageZoomModal');">
                        <i class="fas fa-crosshairs"></i> Annotate
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add zoom functionality
    let zoomed = false;
    window.toggleImageZoom = function() {
        const imageEl = document.getElementById('zoomableImage');
        if (imageEl) {
            zoomed = !zoomed;
            imageEl.style.transform = zoomed ? 'scale(2)' : 'scale(1)';
            imageEl.style.cursor = zoomed ? 'zoom-out' : 'zoom-in';
            imageEl.style.transition = 'transform 0.3s ease';
        }
    };
    
    // Add scroll zoom functionality
    const imageEl = modal.querySelector('#zoomableImage');
    imageEl.style.cursor = 'zoom-in';
    let scale = 1;
    
    imageEl.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        scale = Math.min(Math.max(.125, scale + delta), 4);
        this.style.transform = `scale(${scale})`;
    });
    
    imageEl.addEventListener('click', function() {
        scale = scale > 1 ? 1 : 2;
        this.style.transform = `scale(${scale})`;
        this.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
    });
}

function openMediaModal(mediaId, coinId) {
    const coin = coinManager.coins.find(c => c.id === coinId);
    if (!coin || !coin.media) return;

    const allMedia = [...coin.media.images, ...coin.media.videos];
    const media = allMedia.find(m => m.id === mediaId);
    if (!media) return;

    // Create and show media modal
    const existingModal = document.getElementById('mediaModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'mediaModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content media-modal-content">
            <div class="modal-header">
                <h3>${media.title}</h3>
                <button class="modal-close" onclick="closeModal('mediaModal')">×</button>
            </div>
            <div class="media-modal-body">
                ${media.type === 'image' ? 
                    `<img src="${media.url}" alt="${media.title}" class="modal-media-full" id="zoomableMedia">` :
                    `<video src="${media.url}" controls class="modal-media-full" id="zoomableMedia">${media.title}</video>`
                }
                <div class="media-controls">
                    <button class="btn btn-secondary" onclick="toggleZoom()">
                        <i class="fas fa-search-plus"></i> Zoom
                    </button>
                    <button class="btn btn-secondary" onclick="downloadMedia('${media.url}', '${media.title}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
                ${media.description ? `<p class="media-modal-description">${media.description}</p>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add zoom functionality
    let zoomed = false;
    window.toggleZoom = function() {
        const mediaEl = document.getElementById('zoomableMedia');
        if (mediaEl) {
            zoomed = !zoomed;
            mediaEl.style.transform = zoomed ? 'scale(2)' : 'scale(1)';
            mediaEl.style.cursor = zoomed ? 'zoom-out' : 'zoom-in';
            mediaEl.style.transition = 'transform 0.3s ease';
        }
    };
    
    // Add scroll zoom for images
    if (media.type === 'image') {
        const mediaEl = modal.querySelector('#zoomableMedia');
        mediaEl.style.cursor = 'zoom-in';
        let scale = 1;
        
        mediaEl.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY * -0.01;
            scale = Math.min(Math.max(.125, scale + delta), 4);
            this.style.transform = `scale(${scale})`;
        });
        
        mediaEl.addEventListener('click', function() {
            scale = scale > 1 ? 1 : 2;
            this.style.transform = `scale(${scale})`;
            this.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
        });
    }
}

function downloadMedia(url, title) {
    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Drag and Drop Functions
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-enter');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over', 'drag-enter');
}

function handleDrop(event, coinId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over', 'drag-enter');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        // Create a mock file input to process the dropped files
        const mockInput = {
            files: files
        };
        handleMediaUpload(coinId, mockInput);
    }
}

function handleMainImageDrop(event, coinId, side) {
    console.log('handleMainImageDrop called:', { coinId, side });
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over', 'drag-enter');
    
    const files = event.dataTransfer.files;
    console.log('Files dropped:', files.length);
    
    if (files.length > 0) {
        const file = files[0]; // Only take the first file for main images
        console.log('Processing dropped file:', { name: file.name, type: file.type, size: file.size });
        
        if (file.type.startsWith('image/')) {
            const mockInput = {
                files: [file]
            };
            coinManager.handleImageUpload(coinId, side, mockInput);
        } else {
            console.log('Dropped file is not an image:', file.type);
            alert('Please drop an image file.');
        }
    }
}

// Media control functions
function setMediaSortMode(mode) {
    if (coinManager) {
        coinManager.mediaSortMode = mode;
        coinManager.renderGlobalMediaControls();
        coinManager.renderCoins();
        coinManager.saveToStorage();
    }
}

function setMediaFilter(filter) {
    if (coinManager) {
        coinManager.mediaFilter = filter;
        coinManager.renderGlobalMediaControls();
        coinManager.renderCoins();
        coinManager.saveToStorage();
    }
}

// Test function to debug image upload issues
function testImageUpload() {
    console.log('=== IMAGE UPLOAD TEST ===');
    console.log('coinManager exists:', !!coinManager);
    console.log('coins count:', coinManager ? coinManager.coins.length : 'N/A');
    
    if (!coinManager || coinManager.coins.length === 0) {
        alert('Please add a coin first before testing image upload');
        return;
    }
    
    const firstCoin = coinManager.coins[0];
    console.log('Testing with coin:', firstCoin.id, firstCoin.title);
    
    // Create a test file input
    const testInput = document.createElement('input');
    testInput.type = 'file';
    testInput.accept = 'image/*';
    testInput.style.display = 'none';
    
    testInput.onchange = function(e) {
        console.log('Test file selected:', e.target.files[0]);
        if (e.target.files[0]) {
            console.log('Calling handleImageUpload with test file...');
            handleImageUpload(firstCoin.id, 'obverse', e.target);
        }
        document.body.removeChild(testInput);
    };
    
    document.body.appendChild(testInput);
    testInput.click();
    
    console.log('Test file dialog opened');
}

function setMediaViewMode(mode) {
    if (coinManager) {
        coinManager.mediaViewMode = mode;
        coinManager.renderGlobalMediaControls();
        coinManager.renderCoins();
        coinManager.saveToStorage();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        coinManager.closeModal(event.target.id);
    }
});