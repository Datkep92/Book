// manual-toc-engine.js - Mobile-Optimized Manual TOC Engine
class ManualTOCEngine {
    constructor(bookReader) {
        this.bookReader = bookReader;
        this.isActive = false;
        this.selectedElements = [];
        this.autoDetectedHeadings = [];
        this.currentLevels = {};
        
        // Mobile touch state
        this.touchState = {
            isSelecting: false,
            selectionBox: null,
            lastTouch: null
        };
        
        // Auto-detection patterns (optimized for Vietnamese)
        this.detectionPatterns = [
            // Level 1: Chapters
            {
                regex: /^(CHƯƠNG|CHUONG|Chương|Chuong|PHẦN|PHAN|Phần|Phan)\s+([IVXLCDM]+|[A-Z]|\d+)[:\-\.]?\s*(.+)/i,
                level: 1,
                confidence: 0.95,
                type: 'chapter'
            },
            // Level 2: Roman numerals (I, II, III)
            {
                regex: /^([IVXLCDM]+)[:\-\.]\s*(.+)/i,
                level: 2, 
                confidence: 0.90,
                type: 'roman'
            },
            // Level 2: Alphabet (A, B, C)
            {
                regex: /^([A-Z])[:\-\.]\s*(.+)/i,
                level: 2,
                confidence: 0.85,
                type: 'alphabet'
            },
            // Level 3: Numbers (1, 2, 3)
            {
                regex: /^(\d+)[:\-\.]\s*(.+)/i,
                level: 3,
                confidence: 0.88,
                type: 'number'
            },
            // Level 4: Decimal (1.1, 2.1)
            {
                regex: /^(\d+\.\d+)[:\-\.]\s*(.+)/i,
                level: 4,
                confidence: 0.92,
                type: 'decimal'
            },
            // Level 5: Deep decimal (1.1.1, 1.1.2)
            {
                regex: /^(\d+\.\d+\.\d+)[:\-\.]\s*(.+)/i,
                level: 5,
                confidence: 0.80,
                type: 'deep-decimal'
            }
        ];
    }

    /**
     * 🚀 KHỞI ĐỘNG ENGINE CHÍNH
     */
    async initialize() {
        console.log('🚀 Khởi động Manual TOC Engine...');
        
        // Tạo mobile-optimized UI
        this.createMobileUI();
        
        // Bind touch events
        this.bindTouchEvents();
        
        // Auto-scan document khi khởi động
        await this.autoScanDocument();
        
        console.log('✅ Manual TOC Engine ready');
    }

    /**
     * 📱 TẠO MOBILE-OPTIMIZED UI
     */
    createMobileUI() {
        // Tạo overlay cho mobile
        const overlay = document.createElement('div');
        overlay.id = 'toc-mobile-overlay';
        overlay.innerHTML = this.getMobileUITemplate();
        document.body.appendChild(overlay);

        // Bind mobile events
        this.bindMobileEvents();
    }

    /**
     * 🎨 MOBILE UI TEMPLATE
     */
    getMobileUITemplate() {
        return `
        <div class="toc-mobile-container">
            <!-- Header -->
            <div class="toc-mobile-header">
                <button class="toc-btn-back" id="toc-btn-back">🔙</button>
                <h3>🎯 Tạo Mục Lục</h3>
                <button class="toc-btn-save" id="toc-btn-save">💾</button>
            </div>

            <!-- Status Bar -->
            <div class="toc-status-bar">
                <span class="toc-status" id="toc-status">
                    🔍 Đang quét... 0%
                </span>
                <span class="toc-stats" id="toc-stats">
                    📊 0 mục
                </span>
            </div>

            <!-- Selection Mode -->
            <div class="toc-selection-mode">
                <button class="mode-btn active" data-mode="auto" id="mode-auto">
                    🤖 TỰ ĐỘNG
                </button>
                <button class="mode-btn" data-mode="touch" id="mode-touch">
                    👉 CHẠM CHỌN
                </button>
                <button class="mode-btn" data-mode="area" id="mode-area">
                    📦 KÉO VÙNG
                </button>
            </div>

            <!-- Auto-detected TOC -->
            <div class="toc-preview-container">
                <div class="toc-preview-header">
                    <h4>📑 MỤC LỤC TỰ ĐỘNG</h4>
                    <button class="toc-btn-rescan" id="toc-btn-rescan">🔄</button>
                </div>
                <div class="toc-preview-list" id="toc-preview-list">
                    <!-- Auto-populated by scan results -->
                </div>
            </div>

            <!-- Quick Actions Bottom Bar -->
            <div class="toc-bottom-actions">
                <button class="action-btn" id="action-preview">👁 XEM</button>
                <button class="action-btn" id="action-optimize">📐 TỐI ƯU</button>
                <button class="action-btn" id="action-validate">✅ KIỂM TRA</button>
                <button class="action-btn" id="action-export">📤 XUẤT</button>
            </div>

            <!-- Context Menu (shown on long press) -->
            <div class="toc-context-menu" id="toc-context-menu" style="display: none;">
                <div class="context-item" data-action="promote">⬆️ Lên cấp</div>
                <div class="context-item" data-action="demote">⬇️ Xuống cấp</div>
                <div class="context-item" data-action="rename">✏️ Đổi tên</div>
                <div class="context-item" data-action="delete">🗑️ Xóa</div>
                <div class="context-item" data-action="highlight">🎯 Đánh dấu</div>
            </div>
        </div>
        `;
    }

    /**
     * 🔍 QUÉT TỰ ĐỘNG TOÀN BỘ DOCUMENT
     */
    async autoScanDocument() {
        console.log('🔍 Bắt đầu quét tự động...');
        
        const fileContentDiv = this.bookReader.fileContentDiv;
        if (!fileContentDiv) {
            console.warn('⚠️ Không tìm thấy nội dung để quét');
            return;
        }

        this.updateStatus('🔍 Đang quét... 0%');

        // Tìm tất cả elements có thể là heading
        const allElements = fileContentDiv.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, td, li');
        const totalElements = allElements.length;
        let processed = 0;

        const candidates = [];

        for (let element of allElements) {
            try {
                const text = element.textContent.trim();
                
                if (text && text.length >= 5 && text.length <= 200) {
                    const detection = this.analyzeElement(element, text);
                    
                    if (detection.confidence > 0.6) {
                        candidates.push({
                            element: element,
                            text: text,
                            level: detection.level,
                            confidence: detection.confidence,
                            type: detection.type,
                            position: this.getElementPosition(element)
                        });
                    }
                }
            } catch (error) {
                console.warn('⚠️ Lỗi phân tích element:', error);
            }

            processed++;
            if (processed % 10 === 0) {
                const progress = Math.round((processed / totalElements) * 100);
                this.updateStatus(`🔍 Đang quét... ${progress}%`);
                
                // Yield để UI không bị block
                await this.delay(10);
            }
        }

        // Xây dựng cấu trúc cây
        this.autoDetectedHeadings = this.buildOptimalTOC(candidates);
        
        // Hiển thị kết quả
        this.renderTOCPreview();
        
        this.updateStatus(`✅ Hoàn thành: ${this.autoDetectedHeadings.length} mục`);
        this.updateStats(`${this.autoDetectedHeadings.length} mục`);
        
        console.log('🎯 Auto-scan completed:', this.autoDetectedHeadings);
    }

    /**
     * 🔬 PHÂN TÍCH ELEMENT - SMART DETECTION
     */
    analyzeElement(element, text) {
        let bestMatch = { level: 3, confidence: 0.5, type: 'unknown' };
        
        // 1. Kiểm tra pattern matching
        for (let pattern of this.detectionPatterns) {
            const match = text.match(pattern.regex);
            if (match) {
                if (pattern.confidence > bestMatch.confidence) {
                    bestMatch = {
                        level: pattern.level,
                        confidence: pattern.confidence,
                        type: pattern.type
                    };
                }
            }
        }

        // 2. Kiểm tra style-based detection
        const style = getComputedStyle(element);
        const styleDetection = this.detectByStyling(element, style, text);
        if (styleDetection.confidence > bestMatch.confidence) {
            bestMatch = styleDetection;
        }

        // 3. Kiểm tra structural detection
        const structuralDetection = this.detectByStructure(element);
        if (structuralDetection.confidence > bestMatch.confidence) {
            bestMatch = structuralDetection;
        }

        return bestMatch;
    }

    /**
     * 🎨 DETECTION BY STYLING
     */
    detectByStyling(element, style, text) {
        let confidence = 0.3;
        let level = 3;

        const fontSize = parseInt(style.fontSize);
        const fontWeight = parseInt(style.fontWeight);
        const isBold = fontWeight >= 600 || style.fontWeight === 'bold';
        const isUppercase = text === text.toUpperCase();
        const isCentered = style.textAlign === 'center';

        // Font size based detection
        if (fontSize >= 24) {
            level = 1;
            confidence += 0.4;
        } else if (fontSize >= 20) {
            level = 2;
            confidence += 0.3;
        } else if (fontSize >= 16 && isBold) {
            level = 3;
            confidence += 0.2;
        }

        // Style bonuses
        if (isBold) confidence += 0.1;
        if (isUppercase) confidence += 0.15;
        if (isCentered) confidence += 0.1;

        return { level, confidence: Math.min(confidence, 0.9), type: 'styling' };
    }

    /**
     * 🏗️ DETECTION BY STRUCTURE
     */
    detectByStructure(element) {
        let confidence = 0.3;
        let level = 3;

        const style = getComputedStyle(element);
        const marginLeft = parseInt(style.marginLeft) || 0;
        const paddingLeft = parseInt(style.paddingLeft) || 0;
        const textIndent = parseInt(style.textIndent) || 0;
        const totalIndent = marginLeft + paddingLeft + textIndent;

        // Indentation based level
        if (totalIndent === 0) {
            level = 1;
            confidence += 0.3;
        } else if (totalIndent <= 40) {
            level = 2;
            confidence += 0.2;
        } else if (totalIndent <= 80) {
            level = 3;
            confidence += 0.2;
        } else {
            level = 4;
            confidence += 0.1;
        }

        return { level, confidence: Math.min(confidence, 0.8), type: 'structural' };
    }

    /**
     * 🌳 XÂY DỰNG MỤC LỤC TỐI ƯU
     */
    buildOptimalTOC(candidates) {
        // Sắp xếp theo vị trí
        candidates.sort((a, b) => a.position - b.position);
        
        // Áp dụng smart level adjustment
        const adjustedCandidates = this.adjustLevelsSmartly(candidates);
        
        // Xây dựng cấu trúc cây
        return this.buildTOCStructure(adjustedCandidates);
    }

    /**
     * 🧠 ĐIỀU CHỈNH LEVEL THÔNG MINH
     */
    adjustLevelsSmartly(candidates) {
        if (candidates.length === 0) return candidates;

        const adjusted = [...candidates];
        
        // Đảm bảo có ít nhất 1 level 1
        if (!adjusted.some(c => c.level === 1)) {
            adjusted[0].level = 1;
            adjusted[0].confidence = 0.9;
        }

        // Điều chỉnh level dựa trên context
        for (let i = 1; i < adjusted.length; i++) {
            const prev = adjusted[i - 1];
            const current = adjusted[i];
            
            // Nếu level jump quá lớn, điều chỉnh
            if (current.level > prev.level + 2) {
                current.level = prev.level + 1;
                current.confidence *= 0.8; // Giảm confidence
            }
            
            // Nếu level giảm quá nhiều, có thể là chapter mới
            if (current.level < prev.level - 2) {
                // Có thể đây là chapter mới, kiểm tra pattern
                if (this.isLikelyChapter(current.text)) {
                    current.level = 1;
                    current.confidence = 0.95;
                }
            }
        }

        return adjusted;
    }

    /**
     * 🔍 KIỂM TRA CÓ PHẢI CHAPTER
     */
    isLikelyChapter(text) {
        const chapterPatterns = [
            /^CHƯƠNG\s+[IVXLCDM]/i,
            /^PHẦN\s+[IVXLCDM]/i,
            /^CHAPTER\s+[IVXLCDM]/i,
            /^[IVXLCDM]+\.[\s\S]{10,}/i // Roman numeral followed by substantial text
        ];
        
        return chapterPatterns.some(pattern => pattern.test(text));
    }

    /**
     * 🌲 XÂY DỰNG CẤU TRÚC CÂY
     */
    buildTOCStructure(candidates) {
        const tree = [];
        const stack = [];
        
        for (let candidate of candidates) {
            const node = {
                ...candidate,
                children: [],
                id: `toc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            
            // Tìm parent phù hợp
            while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
                stack.pop();
            }
            
            // Thêm vào tree
            if (stack.length === 0) {
                tree.push(node);
            } else {
                const parent = stack[stack.length - 1];
                parent.children.push(node);
            }
            
            stack.push(node);
        }
        
        return tree;
    }

    /**
     * 📱 RENDER TOC PREVIEW CHO MOBILE
     */
    renderTOCPreview() {
        const previewList = document.getElementById('toc-preview-list');
        if (!previewList) return;

        if (this.autoDetectedHeadings.length === 0) {
            previewList.innerHTML = '<div class="toc-empty">📝 Không tìm thấy mục lục tự động</div>';
            return;
        }

        previewList.innerHTML = this.generateTOCHTML(this.autoDetectedHeadings);
        
        // Bind touch events cho items
        this.bindTOCItemEvents();
    }

    /**
     * 🎨 GENERATE TOC HTML
     */
    generateTOCHTML(headings, depth = 0) {
        let html = '';
        
        headings.forEach(heading => {
            const indent = depth * 20;
            const hasChildren = heading.children && heading.children.length > 0;
            
            html += `
                <div class="toc-item" data-id="${heading.id}" style="margin-left: ${indent}px">
                    <div class="toc-item-content">
                        <span class="toc-level-badge">L${heading.level}</span>
                        <span class="toc-text">${this.escapeHtml(heading.text)}</span>
                        <span class="toc-confidence">${Math.round(heading.confidence * 100)}%</span>
                    </div>
                    ${hasChildren ? this.generateTOCHTML(heading.children, depth + 1) : ''}
                </div>
            `;
        });
        
        return html;
    }

    /**
     * 👆 BIND TOUCH EVENTS CHO MOBILE
     */
    bindTouchEvents() {
        const fileContentDiv = this.bookReader.fileContentDiv;
        if (!fileContentDiv) return;

        // Touch start
        fileContentDiv.addEventListener('touchstart', (e) => {
            if (!this.isActive) return;
            
            this.touchState.isSelecting = true;
            this.touchState.lastTouch = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
            
            e.preventDefault();
        });

        // Touch end - selection complete
        fileContentDiv.addEventListener('touchend', (e) => {
            if (!this.isActive || !this.touchState.isSelecting) return;
            
            this.handleTouchSelection(e);
            this.touchState.isSelecting = false;
            e.preventDefault();
        });

        // Long press - context menu
        fileContentDiv.addEventListener('touchstart', (e) => {
            if (!this.isActive) return;
            
            this.touchState.longPressTimer = setTimeout(() => {
                this.showContextMenu(e);
            }, 500);
        });

        fileContentDiv.addEventListener('touchend', () => {
            clearTimeout(this.touchState.longPressTimer);
        });
    }

    /**
     * 🎯 XỬ LÝ CHỌN BẰNG TOUCH
     */
    handleTouchSelection(e) {
        const element = document.elementFromPoint(
            e.changedTouches[0].clientX,
            e.changedTouches[0].clientY
        );

        if (element && this.isValidTOCElement(element)) {
            this.toggleElementSelection(element);
        }
    }

    /**
     * 📱 BIND MOBILE UI EVENTS
     */
    bindMobileEvents() {
        // Back button
        document.getElementById('toc-btn-back')?.addEventListener('click', () => {
            this.deactivate();
        });

        // Save button
        document.getElementById('toc-btn-save')?.addEventListener('click', () => {
            this.saveTOCToSidebar();
        });

        // Rescan button
        document.getElementById('toc-btn-rescan')?.addEventListener('click', () => {
            this.autoScanDocument();
        });

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSelectionMode(e.target.dataset.mode);
            });
        });

        // Action buttons
        document.getElementById('action-preview')?.addEventListener('click', () => {
            this.previewInSidebar();
        });
    }

    /**
     * 🎯 BIND TOC ITEM EVENTS
     */
    bindTOCItemEvents() {
        document.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleTOCItemClick(e);
            });

            item.addEventListener('touchstart', (e) => {
                this.handleTOCItemTouchStart(e);
            });
        });
    }

    /**
     * 🎯 ACTIVATE/DEACTIVATE ENGINE
     */
    activate() {
        this.isActive = true;
        document.getElementById('toc-mobile-overlay').style.display = 'block';
        this.autoScanDocument();
    }

    deactivate() {
        this.isActive = false;
        document.getElementById('toc-mobile-overlay').style.display = 'none';
    }

    /**
     * 🛠️ UTILITY METHODS
     */
    updateStatus(message) {
        const statusEl = document.getElementById('toc-status');
        if (statusEl) statusEl.textContent = message;
    }

    updateStats(message) {
        const statsEl = document.getElementById('toc-stats');
        if (statsEl) statsEl.textContent = message;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getElementPosition(element) {
        let position = 0;
        let prev = element.previousElementSibling;
        while (prev) {
            position++;
            prev = prev.previousElementSibling;
        }
        return position;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isValidTOCElement(element) {
        const text = element.textContent.trim();
        return text && text.length >= 5 && text.length <= 200;
    }

    toggleElementSelection(element) {
        // Implementation for manual selection
        const index = this.selectedElements.indexOf(element);
        if (index > -1) {
            this.selectedElements.splice(index, 1);
            element.classList.remove('toc-selected');
        } else {
            this.selectedElements.push(element);
            element.classList.add('toc-selected');
        }
    }

    // Placeholder methods for future implementation
    setSelectionMode(mode) {
        console.log('Setting selection mode:', mode);
        // Implementation for different selection modes
    }

    showContextMenu(e) {
        // Implementation for context menu
    }

    handleTOCItemClick(e) {
        // Implementation for TOC item click
    }

    handleTOCItemTouchStart(e) {
        // Implementation for TOC item touch
    }

    previewInSidebar() {
        // Implementation for sidebar preview
    }

    saveTOCToSidebar() {
        // Implementation for saving TOC to sidebar
        console.log('Saving TOC to sidebar:', this.autoDetectedHeadings);
        this.bookReader.showMessage('✅ Đã lưu mục lục');
        this.deactivate();
    }
}

// CSS cho mobile (thêm vào style.css)
const mobileTOCStyles = `
/* Mobile TOC Overlay */
#toc-mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.toc-mobile-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    display: flex;
    flex-direction: column;
}

/* Header */
.toc-mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #4f46e5;
    color: white;
}

.toc-mobile-header h3 {
    margin: 0;
    font-size: 18px;
}

.toc-btn-back, .toc-btn-save {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    padding: 8px;
}

/* Status Bar */
.toc-status-bar {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
}

/* Selection Mode */
.toc-selection-mode {
    display: flex;
    padding: 12px 16px;
    gap: 8px;
    border-bottom: 1px solid #e2e8f0;
}

.mode-btn {
    flex: 1;
    padding: 12px 8px;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
}

.mode-btn.active {
    border-color: #4f46e5;
    background: #4f46e5;
    color: white;
}

/* TOC Preview */
.toc-preview-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.toc-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.toc-preview-header h4 {
    margin: 0;
    color: #1e293b;
}

.toc-btn-rescan {
    background: none;
    border: none;
    font-size: 18px;
    padding: 4px;
}

/* TOC Items */
.toc-item {
    margin-bottom: 8px;
}

.toc-item-content {
    display: flex;
    align-items: center;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.toc-level-badge {
    background: #4f46e5;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    margin-right: 8px;
}

.toc-text {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
}

.toc-confidence {
    background: #10b981;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.toc-empty {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
}

/* Bottom Actions */
.toc-bottom-actions {
    display: flex;
    padding: 12px 16px;
    gap: 8px;
    border-top: 1px solid #e2e8f0;
    background: white;
}

.action-btn {
    flex: 1;
    padding: 12px 8px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
}

/* Context Menu */
.toc-context-menu {
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    z-index: 10001;
    min-width: 150px;
}

.context-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
}

.context-item:last-child {
    border-bottom: none;
}

/* Selection Highlight */
.toc-selected {
    outline: 3px solid #4f46e5 !important;
    outline-offset: 2px;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileTOCStyles;
document.head.appendChild(styleSheet);