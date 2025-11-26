// sidebar.js - Complete Sidebar & TOC Management System
class SidebarManager {
    constructor(bookReader) {
        this.bookReader = bookReader;
        this.isMenuOpen = false;
        this.headings = [];
        
        // Sidebar elements
        this.sidebar = null;
        this.menuToggleBtn = null;
        this.closeMenuBtn = null;
        this.sidebarSettingsBtn = null;
        
        // Sidebar navigation elements
        this.sidebarNav = null;
        this.backBtn = null;
        this.pageTitle = null;
        
        // Search elements
        this.documentsSearch = null;
        this.documentsSearchResults = null;
        this.documentsSearchContainer = null;
        this.documentsSection = null;
        this.tocSearch = null;
        this.tocSearchResults = null;
        this.tocSearchContainer = null;
        this.tocSection = null;
        
        // Content elements
        this.documentsList = null;
        this.tocList = null;
   
    this.isAdminMode = false; // Chế độ quản lý
    this.originalDocuments = []; // Lưu danh sách gốc
    this.modifiedDocuments = []; // Danh sách đã chỉnh sửa
}
// Thêm hàm makeDocumentsSortable (drag & drop)
makeDocumentsSortable() {
    // Tạm thời bỏ qua drag & drop để fix lỗi
    console.log('🔧 Drag & drop tạm thời chưa được implement');
}

// Thêm hàm showMessage
showMessage(message) {
    alert(message);
}

// Thêm hàm deleteRemovedDocuments (cho github-manager)
async deleteRemovedDocuments() {
    console.log('🗑️ Xóa documents đã bị xóa khỏi GitHub...');
    // TODO: Implement sau
}

// Thêm hàm escapeRegex cho highlight
escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Thêm hàm searchTOC nếu chưa có
searchTOC(searchTerm) {
    const searchTermNoTone = this.removeVietnameseTones(searchTerm.toLowerCase());
    
    const filteredHeadings = this.headings.filter(heading => {
        const textNoTone = this.removeVietnameseTones(heading.text.toLowerCase());
        return textNoTone.includes(searchTermNoTone);
    });

    this.filterTOCItems(searchTerm);
    this.showTOCSearchResults(filteredHeadings, searchTerm);
}

// Thêm hàm removeVietnameseTones nếu chưa có
removeVietnameseTones(str) {
    if (!str) return '';
    return str.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/Đ/g, "D");
}
    initialize() {
    console.log('🚀 Khởi tạo SidebarManager...');
    this.initializeElements();
    this.bindEvents();
    this.addAdminToggleButton(); // Thêm nút admin
    console.log('✅ SidebarManager initialized');
}

    initializeElements() {
    // Sidebar elements
    this.sidebar = document.getElementById('sidebar');
    this.menuToggleBtn = document.getElementById('menu-toggle-btn');
    this.closeMenuBtn = document.getElementById('close-menu-btn');
    this.sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');

    // Sidebar navigation elements - THÊM DÒNG NÀY
    this.sidebarHeader = document.getElementById('sidebar-header'); // ← THÊM
    this.sidebarNav = document.getElementById('sidebar-nav');
    this.backBtn = document.getElementById('back-btn');
    this.pageTitle = document.getElementById('page-title');

        // Search elements
        this.documentsSearch = document.getElementById('documents-search');
        this.documentsSearchResults = document.getElementById('documents-search-results');
        this.documentsSearchContainer = document.getElementById('documents-search-container');
        this.documentsSection = document.getElementById('documents-section');
        this.tocSearch = document.getElementById('toc-search');
        this.tocSearchResults = document.getElementById('toc-search-results');
        this.tocSearchContainer = document.getElementById('toc-search-container');
        this.tocSection = document.getElementById('toc-section');

        // Content elements
        this.documentsList = document.getElementById('documents-list');
        this.tocList = document.getElementById('toc-list');

        console.log('✅ Sidebar elements initialized');
    }

    bindEvents() {
        // Menu controls
        this.menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        this.closeMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeMenu();
        });

        // Sidebar settings button
        this.sidebarSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.bookReader.toggleSettings) {
                this.bookReader.toggleSettings();
            }
        });

        // Sidebar navigation events
        this.backBtn.addEventListener('click', () => {
            this.showDocumentsList();
        });

        // Documents search events
        this.documentsSearch.addEventListener('input', (e) => {
            this.searchDocuments(e.target.value);
        });

        // TOC search events
        this.tocSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                this.tocSearchResults.style.display = 'none';
                this.showAllTOCItems();
                return;
            }

            const filteredHeadings = this.headings.filter(heading => 
                heading.text.toLowerCase().includes(searchTerm)
            );

            this.filterTOCItems(searchTerm);
            this.showTOCSearchResults(filteredHeadings, searchTerm);
        });

        // TOC list click events
        this.tocList.addEventListener('click', (e) => {
            const tocLink = e.target.closest('.toc-link');
            if (tocLink) {
                e.preventDefault();
                const index = parseInt(tocLink.getAttribute('data-index'));
                this.scrollToHeading(this.headings[index].element);
                this.closeMenu();
            }
        });

        // TOC search results click events
        this.tocSearchResults.addEventListener('click', (e) => {
            const searchResult = e.target.closest('.toc-search-result');
            if (searchResult) {
                const index = parseInt(searchResult.getAttribute('data-index'));
                this.scrollToHeading(this.headings[index].element);
                this.closeMenu();
                this.tocSearchResults.style.display = 'none';
                this.tocSearch.value = '';
                this.showAllTOCItems();
            }
        });

        // Documents search results click events
        this.documentsSearchResults.addEventListener('click', (e) => {
            const searchResult = e.target.closest('.documents-search-result');
            if (searchResult) {
                const index = parseInt(searchResult.getAttribute('data-index'));
                if (this.bookReader.openDocument) {
                    this.bookReader.openDocument(index);
                }
                this.documentsSearchResults.style.display = 'none';
                this.documentsSearch.value = '';
                this.showAllDocuments();
            }
        });

        // Documents list events
        this.documentsList.addEventListener('click', (e) => {
            const documentItem = e.target.closest('.document-item');
            if (documentItem) {
                const index = parseInt(documentItem.getAttribute('data-index'));
                if (this.bookReader.openDocument) {
                    this.bookReader.openDocument(index);
                }
            }
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !e.target.closest('.sidebar') && !e.target.closest('.menu-toggle-btn')) {
                this.closeMenu();
            }
        });

        // Prevent event propagation
        this.sidebar.addEventListener('click', (e) => e.stopPropagation());

        console.log('✅ Sidebar events bound');
    }
// Thêm methods quản lý
enableAdminMode() {
    if (!this.bookReader.auth?.isAdmin) {
        console.warn('⚠️ Không có quyền admin');
        return;
    }
    
    this.isAdminMode = true;
    this.originalDocuments = [...this.bookReader.documents];
    this.modifiedDocuments = [...this.bookReader.documents];
    
    // Hiển thị controls - an toàn
    const adminControls = document.querySelector('.documents-admin-controls');
    if (adminControls) {
        adminControls.style.display = 'block';
    } else {
        console.warn('⚠️ Không tìm thấy documents-admin-controls');
    }
    
    // Render lại với controls
    this.renderDocumentsList();
    console.log('🔧 Bật chế độ quản lý admin');
}

disableAdminMode() {
    this.isAdminMode = false;
    document.querySelector('.documents-admin-controls').style.display = 'none';
    this.renderDocumentsList();
    console.log('🔧 Tắt chế độ quản lý admin');
}
    // Menu controls
    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.sidebar.classList.toggle('active', this.isMenuOpen);
        
        if (this.isMenuOpen) {
            if (this.bookReader.closeSettings) {
                this.bookReader.closeSettings();
            }
            // Hiển thị đúng chế độ dựa trên trạng thái hiện tại
            if (this.bookReader.currentBook) {
                this.showTOC();
            } else {
                this.showDocumentsList();
            }
        }
    }

    closeMenu() {
        this.isMenuOpen = false;
        this.sidebar.classList.remove('active');
        // Reset về danh sách tài liệu khi đóng menu
        if (!this.bookReader.currentBook) {
            this.showDocumentsList();
        }
    }

    // Sidebar modes
    showTOC() {
        this.sidebarNav.style.display = 'flex';
        this.documentsSearchContainer.style.display = 'none';
        this.documentsSection.style.display = 'none';
        this.tocSearchContainer.style.display = 'block';
        this.tocSection.style.display = 'block';
        this.pageTitle.textContent = this.bookReader.currentBook ? this.bookReader.currentBook.name : 'Mục lục';
        
        // Display TOC with search
        this.displayTOCWithSearch();
    }

    showDocumentsList() {
        this.sidebarNav.style.display = 'none';
        this.documentsSearchContainer.style.display = 'block';
        this.documentsSection.style.display = 'block';
        this.tocSearchContainer.style.display = 'none';
        this.tocSection.style.display = 'none';
        this.pageTitle.textContent = 'Mục lục';
        
        // Reset search
        this.documentsSearch.value = '';
        this.documentsSearchResults.style.display = 'none';
        this.showAllDocuments();
    }

    // Cập nhật renderDocumentsList
renderDocumentsList() {
    if (!this.bookReader.documents || this.bookReader.documents.length === 0) {
        this.documentsList.innerHTML = '<div class="document-placeholder">Chưa có tài liệu nào</div>';
        return;
    }
    
    const documentsToRender = this.isAdminMode ? this.modifiedDocuments : this.bookReader.documents;
    
    this.documentsList.innerHTML = documentsToRender.map((doc, index) => {
        let displayDate = 'Chưa có ngày';
        
        if (doc.date) {
            displayDate = doc.date;
        } else if (doc.createdAt) {
            try {
                const date = new Date(doc.createdAt);
                if (!isNaN(date.getTime())) {
                    displayDate = date.toISOString().split('T')[0];
                }
            } catch (e) {
                console.warn('Invalid date for document:', doc.title, doc.createdAt);
            }
        }
        
        return `
            <div class="document-item ${this.isAdminMode ? 'admin-mode' : ''} ${doc.pinned ? 'pinned' : ''}" 
                 data-index="${index}" data-id="${doc.id}">
                <div class="document-icon">${doc.pinned ? '📌' : '📄'}</div>
                <div class="document-info">
                    <div class="document-title">
                        ${this.escapeHtml(doc.title)}
                        ${doc.pinned ? '<span class="pin-badge">GIM</span>' : ''}
                    </div>
                    <div class="document-meta">
                        <span>Tác giả: ${this.escapeHtml(doc.author || 'Không rõ')}</span>
                        <span>•</span>
                        <span>${displayDate}</span>
                        ${doc.isNew ? '<span class="badge-new">MỚI</span>' : ''}
                    </div>
                    ${doc.description ? `<div class="document-description">${this.escapeHtml(doc.description)}</div>` : ''}
                    
                    ${this.isAdminMode ? `
                        <div class="document-actions">
                            <button class="action-btn edit-btn" data-action="edit" data-id="${doc.id}">✏️ Sửa</button>
                            <button class="action-btn delete-btn" data-action="delete" data-id="${doc.id}">🗑️ Xóa</button>
                            <button class="action-btn pin-btn" data-action="pin" data-id="${doc.id}">
                                ${doc.pinned ? '❌ Bỏ gim' : '📌 Gim'}
                            </button>
                            <button class="action-btn move-up-btn" data-action="move-up" data-id="${doc.id}">⬆️ Lên</button>
                            <button class="action-btn move-down-btn" data-action="move-down" data-id="${doc.id}">⬇️ Xuống</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    if (this.isAdminMode) {
        this.bindAdminEvents();
        // TẠM THỜI COMMENT DÒNG NÀY
        // this.makeDocumentsSortable();
    }
    
    console.log('✅ Documents list rendered:', documentsToRender.length, 'items');
}
// Bind events cho admin controls
bindAdminEvents() {
    // Nút actions
    this.documentsList.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            const docId = btn.getAttribute('data-id');
            this.handleDocumentAction(action, docId);
        });
    });
    
    // Exit admin mode
    document.getElementById('exit-admin-mode').addEventListener('click', () => {
        this.disableAdminMode();
    });
    
    // Save changes
    document.getElementById('save-changes').addEventListener('click', () => {
        this.saveDocumentChanges();
    });
    
    // Add new document
    document.getElementById('add-new-doc').addEventListener('click', () => {
        this.addNewDocument();
    });
}
// Xử lý các action
handleDocumentAction(action, docId) {
    const docIndex = this.modifiedDocuments.findIndex(doc => doc.id === docId);
    if (docIndex === -1) return;
    
    switch (action) {
        case 'edit':
            this.editDocument(docIndex);
            break;
        case 'delete':
            this.deleteDocument(docIndex);
            break;
        case 'pin':
            this.togglePinDocument(docIndex);
            break;
        case 'move-up':
            this.moveDocument(docIndex, -1);
            break;
        case 'move-down':
            this.moveDocument(docIndex, 1);
            break;
    }
}

// Sửa bài viết
editDocument(index) {
    const doc = this.modifiedDocuments[index];
    const newTitle = prompt('Sửa tiêu đề:', doc.title);
    if (newTitle && newTitle !== doc.title) {
        doc.title = newTitle;
        doc.updatedAt = new Date().toISOString();
        this.renderDocumentsList();
        this.showMessage('✅ Đã sửa tiêu đề: ' + newTitle);
    }
    
    // Có thể mở rộng để sửa các thông tin khác
    const newAuthor = prompt('Sửa tác giả:', doc.author || '');
    if (newAuthor !== null) {
        doc.author = newAuthor;
        doc.updatedAt = new Date().toISOString();
        this.renderDocumentsList();
    }
    
    const newDescription = prompt('Sửa miêu tả:', doc.description || '');
    if (newDescription !== null) {
        doc.description = newDescription;
        doc.updatedAt = new Date().toISOString();
        this.renderDocumentsList();
    }
}

// Xóa bài viết
deleteDocument(index) {
    const doc = this.modifiedDocuments[index];
    if (confirm(`Bạn có chắc muốn xóa bài viết "${doc.title}"?`)) {
        this.modifiedDocuments.splice(index, 1);
        this.renderDocumentsList();
        this.showMessage('🗑️ Đã xóa bài viết: ' + doc.title);
    }
}

// Gim/Bỏ gim bài viết
togglePinDocument(index) {
    const doc = this.modifiedDocuments[index];
    doc.pinned = !doc.pinned;
    doc.updatedAt = new Date().toISOString();
    
    // Sắp xếp lại: pinned lên đầu
    this.modifiedDocuments.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });
    
    this.renderDocumentsList();
    this.showMessage(doc.pinned ? '📌 Đã gim bài viết' : '❌ Đã bỏ gim bài viết');
}

// Di chuyển bài viết
moveDocument(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < this.modifiedDocuments.length) {
        const doc = this.modifiedDocuments[index];
        this.modifiedDocuments.splice(index, 1);
        this.modifiedDocuments.splice(newIndex, 0, doc);
        this.renderDocumentsList();
        this.showMessage('↕️ Đã di chuyển bài viết');
    }
}

// Thêm bài viết mới
addNewDocument() {
    const title = prompt('Nhập tiêu đề bài viết mới:');
    if (!title) return;
    
    const newDoc = {
        id: 'manual_' + Date.now(),
        title: title,
        author: prompt('Tác giả:', '') || 'Không rõ',
        description: prompt('Miêu tả:', '') || '',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNew: true,
        pinned: false,
        file: 'manual/' + this.bookReader.githubManager.slugify(title) + '.html'
    };
    
    this.modifiedDocuments.unshift(newDoc);
    this.renderDocumentsList();
    this.showMessage('✅ Đã thêm bài viết mới: ' + title);
}

async saveDocumentChanges() {
    try {
        this.showMessage('💾 Đang lưu thay đổi lên GitHub...');
        
        // Cập nhật documents.json
        await this.bookReader.githubManager.updateDocumentsJsonBulk(this.modifiedDocuments);
        
        // Cập nhật danh sách trong app
        this.bookReader.documents = [...this.modifiedDocuments];
        
        this.showMessage('✅ Đã lưu tất cả thay đổi lên GitHub!');
        this.disableAdminMode();
        
    } catch (error) {
        console.error('❌ Lỗi lưu thay đổi:', error);
        this.showMessage('❌ Lỗi lưu thay đổi: ' + error.message);
    }
}

addAdminToggleButton() {
    if (!this.bookReader.auth?.isAdmin) return;
    
    // Tìm sidebar header an toàn
    const sidebarHeader = document.getElementById('sidebar-header');
    const sidebarControls = document.querySelector('.sidebar-controls');
    
    if (!sidebarHeader || !sidebarControls) {
        console.warn('⚠️ Không tìm thấy sidebar header hoặc controls');
        return;
    }
    
    // Kiểm tra xem nút đã tồn tại chưa
    if (document.querySelector('.sidebar-admin-toggle')) return;
    
    const adminToggleBtn = document.createElement('button');
    adminToggleBtn.className = 'sidebar-admin-toggle';
    adminToggleBtn.innerHTML = '⚙️';
    adminToggleBtn.title = 'Quản lý bài viết';
    adminToggleBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 6px;
        border-radius: var(--radius);
        transition: var(--transition);
    `;
    
    adminToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enableAdminMode();
    });
    
    adminToggleBtn.addEventListener('mouseenter', () => {
        adminToggleBtn.style.background = 'var(--bg-secondary)';
    });
    
    adminToggleBtn.addEventListener('mouseleave', () => {
        adminToggleBtn.style.background = 'none';
    });
    
    sidebarControls.prepend(adminToggleBtn);
    console.log('✅ Đã thêm nút admin toggle');
}
    // Trong searchDocuments
searchDocuments(searchTerm) {
    if (searchTerm === '') {
        this.documentsSearchResults.style.display = 'none';
        this.showAllDocuments();
        return;
    }

    const searchTermNoTone = this.removeVietnameseTones(searchTerm.toLowerCase());
    
    const filteredDocs = this.bookReader.documents.filter(doc => {
        const titleNoTone = this.removeVietnameseTones(doc.title.toLowerCase());
        const authorNoTone = doc.author ? this.removeVietnameseTones(doc.author.toLowerCase()) : '';
        
        return titleNoTone.includes(searchTermNoTone) || 
               authorNoTone.includes(searchTermNoTone);
    });

    this.filterDocuments(searchTerm);
    this.showDocumentSearchResults(filteredDocs, searchTerm);
}

// Trong searchTOC
searchTOC(searchTerm) {
    const searchTermNoTone = this.removeVietnameseTones(searchTerm.toLowerCase());
    
    const filteredHeadings = this.headings.filter(heading => {
        const textNoTone = this.removeVietnameseTones(heading.text.toLowerCase());
        return textNoTone.includes(searchTermNoTone);
    });

    this.filterTOCItems(searchTerm);
    this.showTOCSearchResults(filteredHeadings, searchTerm);
}

    filterDocuments(searchTerm) {
        const docItems = this.documentsList.querySelectorAll('.document-item');
        
        docItems.forEach(item => {
            const title = item.querySelector('.document-title').textContent.toLowerCase();
            const authorElement = item.querySelector('.document-meta span:first-child');
            const author = authorElement ? authorElement.textContent.toLowerCase() : '';
            const searchText = (title + ' ' + author).toLowerCase();
            
            if (searchText.includes(searchTerm.toLowerCase())) {
                item.style.display = 'flex';
                // Highlight kết quả tìm kiếm
                const originalTitle = item.querySelector('.document-title').textContent;
                const highlightedTitle = this.highlightText(originalTitle, searchTerm);
                item.querySelector('.document-title').innerHTML = highlightedTitle;
            } else {
                item.style.display = 'none';
            }
        });
    }

    showAllDocuments() {
        const docItems = this.documentsList.querySelectorAll('.document-item');
        docItems.forEach(item => {
            item.style.display = 'flex';
            const title = item.querySelector('.document-title').textContent;
            item.querySelector('.document-title').textContent = title;
        });
    }

    showDocumentSearchResults(filteredDocs, searchTerm) {
        if (filteredDocs.length === 0) {
            this.documentsSearchResults.innerHTML = '<div class="toc-no-results">Không tìm thấy tài liệu</div>';
            this.documentsSearchResults.style.display = 'block';
            return;
        }

        const resultsHTML = filteredDocs.map((doc, index) => {
            const highlightedTitle = this.highlightText(doc.title, searchTerm);
            const highlightedAuthor = this.highlightText(doc.author || '', searchTerm);
            return `
                <div class="documents-search-result" data-index="${this.bookReader.documents.indexOf(doc)}">
                    <div class="document-search-title">${highlightedTitle}</div>
                    <div class="document-search-author">${highlightedAuthor}</div>
                </div>
            `;
        }).join('');

        this.documentsSearchResults.innerHTML = resultsHTML;
        this.documentsSearchResults.style.display = 'block';

        this.documentsSearchResults.querySelectorAll('.documents-search-result').forEach(result => {
            result.addEventListener('click', () => {
                const index = parseInt(result.getAttribute('data-index'));
                if (this.bookReader.openDocument) {
                    this.bookReader.openDocument(index);
                }
                this.documentsSearchResults.style.display = 'none';
                this.documentsSearch.value = '';
                this.showAllDocuments();
            });
        });
    }

    // TOC functionality - TOÀN BỘ LOGIC TOC CHUYỂN SANG ĐÂY
    generateTOC() {
        this.tocList.innerHTML = '';
        this.headings = [];
        
        const fileContentDiv = this.bookReader.fileContentDiv;
        if (!fileContentDiv) {
            console.warn('⚠️ File content div not found for TOC generation');
            return;
        }
        
        const allElements = fileContentDiv.querySelectorAll('*');
        const headingRegexes = [
            /^(\d{1,2})\.\s+(.+)/,
            /^(\d{1,2}\.\d{1,2})\.\s+(.+)/,
            /^(\d{1,2}\.\d{1,2}\.\d{1,2})\.\s+(.+)/
        ];
        
        const prioritySelectors = [
            'p.A10', 'h1', '.A10', 'p[class*="A10"]', 
            'p[class*="a1"]', 'h2', 'h3', '.MsoNormal'
        ];
        
        // Search in priority selectors first
        for (let selector of prioritySelectors) {
            const elements = fileContentDiv.querySelectorAll(selector);
            
            for (let element of elements) {
                if (this.headings.length >= 50) break;
                
                const text = element.textContent.trim();
                const match = this.findHeadingMatch(text, headingRegexes);
                
                if (match) {
                    this.addHeadingToTOC(element, match);
                }
            }
            
            if (this.headings.length >= 50) break;
        }
        
        // Fallback: search all elements
        if (this.headings.length < 10) {
            for (let element of allElements) {
                if (this.headings.length >= 50) break;
                if (element.id && element.id.startsWith('toc-heading-')) continue;
                
                const text = element.textContent.trim();
                const match = this.findHeadingMatch(text, headingRegexes);
                
                if (match) {
                    this.addHeadingToTOC(element, match);
                }
            }
        }
        
        // Sort headings by position in document
        this.headings.sort((a, b) => {
            const positionA = this.getElementPosition(a.element);
            const positionB = this.getElementPosition(b.element);
            return positionA - positionB;
        });
        
        this.displayTOCWithSearch();
        console.log('✅ TOC generated with', this.headings.length, 'headings');
    }

    findHeadingMatch(text, regexes) {
        for (let regex of regexes) {
            const match = text.match(regex);
            if (match) return match;
        }
        return null;
    }

    addHeadingToTOC(element, match) {
        const id = `toc-heading-${this.headings.length}`;
        element.id = id;
        
        const level = match[1].split('.').length;
        
        this.headings.push({
            id: id,
            text: match[0],
            element: element,
            level: Math.min(level, 3)
        });
    }

    getElementPosition(element) {
        let position = 0;
        let prevElement = element.previousElementSibling;
        while (prevElement) {
            position++;
            prevElement = prevElement.previousElementSibling;
        }
        return position;
    }

    displayTOCWithSearch() {
        if (!this.headings || this.headings.length === 0) {
            this.tocList.innerHTML = '<li class="toc-placeholder">Không tìm thấy mục lục trong file</li>';
            return;
        }

        const tocItemsHTML = this.headings.map((heading, index) => {
            return `
                <li class="toc-item">
                    <a href="#${heading.id}" class="toc-link level-${heading.level}" data-index="${index}">
                        <span class="toc-text">${heading.text}</span>
                    </a>
                </li>
            `;
        }).join('');

        this.tocList.innerHTML = tocItemsHTML;
        console.log('✅ TOC displayed with search:', this.headings.length, 'headings');
    }

    filterTOCItems(searchTerm) {
        const tocItems = this.tocList.querySelectorAll('.toc-item');
        
        tocItems.forEach(item => {
            const text = item.querySelector('.toc-text').textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = 'flex';
                const originalText = item.querySelector('.toc-text').textContent;
                const highlightedText = this.highlightText(originalText, searchTerm);
                item.querySelector('.toc-text').innerHTML = highlightedText;
            } else {
                item.style.display = 'none';
            }
        });
    }

    showAllTOCItems() {
        const tocItems = this.tocList.querySelectorAll('.toc-item');
        tocItems.forEach(item => {
            item.style.display = 'flex';
            const text = item.querySelector('.toc-text').textContent;
            item.querySelector('.toc-text').textContent = text;
        });
    }

    showTOCSearchResults(filteredHeadings, searchTerm) {
        if (filteredHeadings.length === 0) {
            this.tocSearchResults.innerHTML = '<div class="toc-no-results">Không tìm thấy kết quả</div>';
            this.tocSearchResults.style.display = 'block';
            return;
        }

        const resultsHTML = filteredHeadings.map(heading => {
            const highlightedText = this.highlightText(heading.text, searchTerm);
            return `
                <div class="toc-search-result" data-index="${this.headings.indexOf(heading)}">
                    <div class="toc-search-text">${highlightedText}</div>
                </div>
            `;
        }).join('');

        this.tocSearchResults.innerHTML = resultsHTML;
        this.tocSearchResults.style.display = 'block';

        this.tocSearchResults.querySelectorAll('.toc-search-result').forEach(result => {
            result.addEventListener('click', () => {
                const index = parseInt(result.getAttribute('data-index'));
                this.scrollToHeading(this.headings[index].element);
                this.closeMenu();
                this.tocSearchResults.style.display = 'none';
                this.tocSearch.value = '';
                this.showAllTOCItems();
            });
        });
    }

    // Utility functions
    scrollToHeading(element) {
        element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        if (this.bookReader.updateCurrentPage) {
            setTimeout(() => this.bookReader.updateCurrentPage(), 300);
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods for external access
    updateDocumentsList() {
        this.renderDocumentsList();
    }
// Hàm loại bỏ dấu tiếng Việt ngắn gọn
removeVietnameseTones(str) {
    return str.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/Đ/g, "D");
}
    updateTOC() {
        this.generateTOC();
    }

    refreshSidebar() {
        if (this.bookReader.currentBook) {
            this.showTOC();
        } else {
            this.showDocumentsList();
        }
    }

    // Getter for headings để app.js có thể truy cập nếu cần
    getHeadings() {
        return this.headings;
    }
}