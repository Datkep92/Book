// app.js - Main Application (Ultra Clean Version After Moving)
class BookReader {
    constructor() {
        // Core systems - KHỞI TẠO SAU KHI CÁC CLASS ĐÃ ĐƯỢC ĐỊNH NGHĨA
        this.auth = null;
        this.sidebarManager = null;
        this.githubManager = null;
        this.fileManager = null;
        
        // Reading state
        this.currentPage = 0;
        this.totalPages = 0;
        this.currentBook = null;
        
        // UI state
        this.isSettingsOpen = false;
        
        // Touch gestures
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // Data
        this.documents = [];
        this.pendingUpload = null;
    }

    async initialize() {
        console.log('🚀 Khởi tạo BookReader...');
        
        // KHỞI TẠO CÁC MANAGER
        this.auth = new AuthSystem();
        this.sidebarManager = new SidebarManager(this);
        this.githubManager = new GitHubManager(this);
        this.fileManager = new FileManager(this);
        
        // KHỞI TẠO ELEMENTS TRƯỚC
        this.initializeElements();
        
        // KHỞI TẠO CÁC MANAGER
        this.auth.initialize(this.githubManager.getConfig(), this.getAuthElements());
        this.sidebarManager.initialize();
        this.githubManager.initialize();
        
        // Bind events và các setting khác
        this.bindEvents();
        this.disableZoom();
        this.disableHorizontalScroll();
        this.loadPreferences();

        // Check device và đăng ký
        console.log('📱 Checking device registration...');
        const authResult = await this.auth.checkDeviceAndRegister();
        
        if (authResult === 'registered' || authResult === true) {
            console.log('🎯 Tự động load từ GitHub');
            await this.githubManager.autoLoadFromGitHub();
        } else {
            console.log('❌ Đăng ký thất bại - Dừng khởi tạo app');
            return;
        }
        
        // Cập nhật UI dựa trên role
        this.auth.updateUIBasedOnRole();
        console.log('✅ BookReader initialized');
    }

    initializeElements() {
        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsBtn = document.getElementById('settings-btn');
        this.closeSettingsBtn = document.getElementById('close-settings-btn');
        
        // File upload elements
        this.fileInput = document.getElementById('file-input');
        this.authorName = document.getElementById('author-name');
        this.bookTitleInput = document.getElementById('book-title-input');
        this.uploadBtn = document.getElementById('upload-btn');
        if (this.uploadBtn) this.uploadBtn.disabled = true;
        
        // Content elements
        this.mainWrapper = document.getElementById('main-wrapper');
        this.contentReader = document.getElementById('content-reader');
        this.fileContentDiv = document.getElementById('file-content-display');
        this.placeholderDiv = document.getElementById('placeholder-content');
        this.bookTitle = document.getElementById('book-title');
        
        // Page indicator
        this.currentPageEl = document.getElementById('current-page');
        this.totalPagesEl = document.getElementById('total-pages');
        this.pageIndicator = document.getElementById('page-indicator');
        
        // Progress
        this.progressFill = document.getElementById('progress-fill');
        
        // Settings
        this.fontSizeSelect = document.getElementById('font-size');
        this.themeSelect = document.getElementById('theme');
        
        // Loading
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.getStartedBtn = document.getElementById('get-started-btn');
    }

    getAuthElements() {
        return {
            adminLoginBtn: document.getElementById('admin-login-btn'),
            adminLogoutBtn: document.getElementById('admin-logout-btn'),
            adminSection: document.getElementById('admin-section'),
            grantAdminBtn: document.getElementById('grant-admin-btn'),
            usersList: document.getElementById('users-list')
        };
    }

    bindEvents() {
        // Settings controls
        this.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettings();
        });
        
        this.closeSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeSettings();
        });
        
        // Get started button
        this.getStartedBtn.addEventListener('click', () => {
            this.toggleSettings();
        });
        
        // Settings changes
        this.fontSizeSelect.addEventListener('change', (e) => {
            this.changeFontSize(e.target.value);
        });
        
        this.themeSelect.addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        // File upload operations
        this.uploadBtn.addEventListener('click', () => {
            this.uploadFileToGitHub();
        });

        // Pre-process file on select
        this.fileInput.addEventListener('change', async () => {
            const f = this.fileInput.files[0];
            if (!f) return;
            try {
                this.showMessage('🔍 Đang xử lý file...');
                const res = await this.fileManager.handleFileSelect(f);
                this.pendingUpload = { 
                    file: f, 
                    book: res.book, 
                    processedContent: res.processedContent 
                };

                if (!this.bookTitleInput.value) {
                    this.bookTitleInput.value = res.book.name;
                }

                this.uploadBtn.disabled = false;
                this.showUploadPreview(res);
                this.showMessage('✅ File đã được xử lý, sẵn sàng upload');
            } catch (e) {
                console.error('Preprocess error', e);
                this.showMessage('❌ Lỗi xử lý file: ' + (e.message || e));
            }
        });

        // Touch events for swipe navigation
        this.contentReader.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.contentReader.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isSettingsOpen && !e.target.closest('.settings-panel') && !e.target.closest('.settings-btn') && !e.target.closest('.sidebar-settings-btn')) {
                this.closeSettings();
            }
        });

        // Prevent event propagation for settings
        this.settingsPanel.addEventListener('click', (e) => e.stopPropagation());

        // Scroll event for page tracking
        this.contentReader.addEventListener('scroll', () => {
            this.updateCurrentPage();
            this.saveReadingProgress();
        });

        console.log('✅ App events bound');
    }

    // Core Reading methods
    async openDocument(index) {
        console.log('🎯 Opening document:', index);
        
        const doc = this.documents[index];
        if (!doc) {
            this.showMessage('❌ Tài liệu không tồn tại');
            return false;
        }
        
        this.showLoading();
        this.placeholderDiv.style.display = 'none';
        
        try {
            let content = '';
            
            if (doc.file) {
                const filePath = `${this.githubManager.ghConfig.basePath}/${doc.file}`;
                const fileUrl = `https://raw.githubusercontent.com/${this.githubManager.ghConfig.owner}/${this.githubManager.ghConfig.repo}/main/${filePath}`;
                
                console.log('📖 Loading from:', fileUrl);
                
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('⚠️ File not found:', fileUrl);
                        this.hideLoading();
                        return false;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const buffer = await response.arrayBuffer();
                const result = await this.fileManager.detectEncoding(buffer);
                content = result.text;
                
            } else if (doc.content) {
                content = doc.content;
            } else {
                throw new Error('Tài liệu không có nội dung');
            }
            
            // Áp dụng encoding fixes
            content = this.fileManager.fixContentEncoding(content);
            
            // Log access
            try {
                await this.auth.logAccess('document_open', doc.title);
            } catch (e) {
                console.log('⚠️ Log access failed:', e.message);
            }
            
            // Hiển thị nội dung
            this.fileManager.displayContentDirectly(content);
            
            this.fileContentDiv.style.display = 'block';
            this.bookTitle.textContent = doc.title;
            
            // Generate TOC và calculate pages
            this.sidebarManager.generateTOC();
            this.calculatePages();
            
            // Save to storage
            this.currentBook = {
                name: doc.title,
                content: content,
                timestamp: new Date().getTime(),
                lastPosition: 0
            };
            
            this.saveBookToStorage();
            localStorage.setItem('bookreader_lastbook', doc.title);
            this.restoreReadingProgress();
            
            // Apply settings
            const savedFontSize = localStorage.getItem('bookreader-fontsize');
            if (savedFontSize) {
                this.changeFontSize(savedFontSize);
            }
            
            // CHUYỂN SANG CHẾ ĐỘ ĐỌC
            this.sidebarManager.showTOC();
            
            this.hideLoading();
            this.sidebarManager.closeMenu();
            
            console.log('✅ Document loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading document:', error);
            this.hideLoading();
            if (error && error.message && error.message.includes('HTTP 404')) return false;
            this.showError('Lỗi khi tải tài liệu: ' + (error.message || error));
            return false;
        }
        return true;
    }

    async uploadFileToGitHub() {
    if (!this.auth.isAdmin) {
        this.showMessage('❌ Vui lòng đăng nhập Admin!');
        return;
    }

    const file = this.fileInput.files[0];
    const author = this.authorName.value.trim();
    const title = this.bookTitleInput.value.trim();
    const description = document.getElementById('book-description').value.trim(); // Thêm ô miêu tả

    if (!file || !author || !title) {
        this.showMessage('❌ Vui lòng điền đầy đủ thông tin!');
        return;
    }

    try {
        this.showLoading();
        
        // 1. Tạo slug cho tác giả và tiêu đề
        const authorSlug = this.githubManager.slugify(author);
        const titleSlug = this.githubManager.slugify(title);
        
        // 2. Đường dẫn file mới
        const filePath = `${this.githubManager.ghConfig.basePath}/${authorSlug}/${titleSlug}.html`;
        
        // 3. Xử lý file content
        let book, processedContent;
        if (this.pendingUpload && this.pendingUpload.file === file) {
            book = this.pendingUpload.book;
            processedContent = this.pendingUpload.processedContent;
        } else {
            const result = await this.fileManager.handleFileSelect(file);
            book = result.book;
            processedContent = result.processedContent;
        }

        this.currentBook = book;

        // 4. Thêm metadata vào đầu file HTML
        const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const metadata = `
<!-- 
BOOK_METADATA_START
Title: ${title}
Author: ${author}
Description: ${description}
PublishedDate: ${currentDate}
CreatedAt: ${new Date().toISOString()}
BOOK_METADATA_END
-->
`;
        const contentWithMetadata = metadata + processedContent;

        // 5. Upload file lên GitHub
        console.log('📤 Uploading to:', filePath);
        await this.githubManager.uploadToGitHub(filePath, contentWithMetadata);
        
        // 6. Cập nhật documents.json với đầy đủ thông tin
        await this.githubManager.updateDocumentsJson({
            id: `${authorSlug}_${titleSlug}_${Date.now()}`,
            title: title,
            author: author,
            authorSlug: authorSlug,
            description: description, // Thêm miêu tả
            date: currentDate, // Thêm ngày xuất bản
            file: `${authorSlug}/${titleSlug}.html`,
            fileSize: contentWithMetadata.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isNew: true
        });

        this.hideLoading();
        this.showMessage(`✅ Upload thành công!\n📁 Tác giả: ${author}\n📖 Sách: ${title}\n📅 Ngày: ${currentDate}`);
        
        // Reset form
        this.fileInput.value = '';
        this.authorName.value = '';
        this.bookTitleInput.value = '';
        document.getElementById('book-description').value = ''; // Reset miêu tả
        this.pendingUpload = null;
        this.clearUploadPreview();

    } catch (error) {
        this.hideLoading();
        console.error('Upload error:', error);
        this.showMessage('❌ Lỗi upload: ' + (error.message || error));
    }
}

    // UI methods
    toggleSettings() {
        this.isSettingsOpen = !this.isSettingsOpen;
        this.settingsPanel.classList.toggle('active', this.isSettingsOpen);
        if (this.isSettingsOpen) {
            this.sidebarManager.closeMenu();
        }
    }

    closeSettings() {
        this.isSettingsOpen = false;
        this.settingsPanel.classList.remove('active');
    }

    // Reading methods
    calculatePages() {
        const contentHeight = this.contentReader.clientHeight;
        const totalHeight = this.fileContentDiv.scrollHeight;
        this.totalPages = Math.ceil(totalHeight / contentHeight);
        this.totalPagesEl.textContent = this.totalPages;
        this.updateCurrentPage();
        
        console.log('📄 Pages calculated:', this.totalPages);
    }

    updateCurrentPage() {
        const scrollTop = this.contentReader.scrollTop;
        const contentHeight = this.contentReader.clientHeight;
        const totalHeight = this.fileContentDiv.scrollHeight;
        
        if (totalHeight > 0) {
            this.currentPage = Math.floor((scrollTop / totalHeight) * this.totalPages);
            this.currentPageEl.textContent = this.currentPage + 1;
            
            const progress = ((this.currentPage + 1) / this.totalPages) * 100;
            this.progressFill.style.width = `${progress}%`;
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToPage(page) {
        if (page < 0 || page >= this.totalPages) return;
        
        this.currentPage = page;
        const scrollPosition = (page / this.totalPages) * this.fileContentDiv.scrollHeight;
        
        this.contentReader.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }

    // Utility methods
    disableZoom() {
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
        
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    disableHorizontalScroll() {
        this.contentReader.addEventListener('scroll', (e) => {
            if (e.target.scrollLeft !== 0) {
                e.target.scrollLeft = 0;
            }
        });
    }

    loadPreferences() {
        const savedTheme = localStorage.getItem('bookreader-theme');
        if (savedTheme) {
            this.themeSelect.value = savedTheme;
            document.body.setAttribute('data-theme', savedTheme);
        }
        
        const savedFontSize = localStorage.getItem('bookreader-fontsize');
        if (savedFontSize) {
            this.fontSizeSelect.value = savedFontSize;
        }
    }

    changeFontSize(size) {
        const contentDiv = this.fileContentDiv.querySelector('.file-content-display');
        if (contentDiv) {
            contentDiv.style.fontSize = `${size}rem`;
        }
        localStorage.setItem('bookreader-fontsize', size);
        setTimeout(() => this.calculatePages(), 100);
    }

    changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('bookreader-theme', theme);
        
        // Apply theme to iframe if exists
        const iframe = this.fileContentDiv.querySelector('iframe');
        if (iframe) {
            this.fileManager.applyThemeToIframe(iframe);
        }
    }

    saveBookToStorage(bookArg) {
    const bookToSave = bookArg || this.currentBook;
    if (!bookToSave) return;
    
    try {
        const savedBooks = this.getSavedBooks();
        const existingBookIndex = savedBooks.findIndex(book => book.name === bookToSave.name);

        // Xóa content để tiết kiệm dung lượng - chỉ lưu metadata
        const bookToSaveLight = {
            name: bookToSave.name,
            timestamp: bookToSave.timestamp,
            lastPosition: bookToSave.lastPosition,
            lastRead: bookToSave.lastRead,
            // KHÔNG lưu content để tiết kiệm dung lượng
        };

        if (existingBookIndex !== -1) {
            savedBooks[existingBookIndex] = bookToSaveLight;
        } else {
            savedBooks.push(bookToSaveLight);
        }
        
        localStorage.setItem('bookreader_books', JSON.stringify(savedBooks));
        console.log('💾 Book metadata saved to localStorage');
        
    } catch (error) {
        console.error('❌ Error saving book to storage:', error);
        this.handleStorageFull(error);
    }
}

// Hàm xử lý khi storage đầy
handleStorageFull(error) {
    if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage full, clearing old data...');
        
        // Xóa các book cũ nhất
        const savedBooks = this.getSavedBooks();
        if (savedBooks.length > 5) {
            // Giữ lại 5 book gần đây nhất
            savedBooks.sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0));
            const keptBooks = savedBooks.slice(0, 5);
            localStorage.setItem('bookreader_books', JSON.stringify(keptBooks));
            console.log('🗑️ Cleared old books, kept:', keptBooks.length);
        } else {
            // Nếu vẫn đầy, xóa hết
            localStorage.removeItem('bookreader_books');
            console.log('🗑️ Cleared all book storage');
        }
        
        // Thử lưu lại
        setTimeout(() => {
            this.saveBookToStorage();
        }, 100);
    }
}

    getSavedBooks() {
        try {
            const savedBooks = localStorage.getItem('bookreader_books');
            return savedBooks ? JSON.parse(savedBooks) : [];
        } catch (error) {
            console.error('❌ Error reading saved books:', error);
            return [];
        }
    }

    saveReadingProgress() {
        if (!this.currentBook) return;
        
        const scrollTop = this.contentReader.scrollTop;
        this.currentBook.lastPosition = scrollTop;
        this.currentBook.lastRead = new Date().getTime();
        
        this.saveBookToStorage();
    }

    restoreReadingProgress() {
        if (!this.currentBook) return;
        
        const savedBooks = this.getSavedBooks();
        const savedBook = savedBooks.find(book => book.name === this.currentBook.name);
        
        if (savedBook && savedBook.lastPosition) {
            setTimeout(() => {
                this.contentReader.scrollTo({
                    top: savedBook.lastPosition,
                    behavior: 'smooth'
                });
                
                setTimeout(() => {
                    this.updateCurrentPage();
                }, 200);
                
                console.log('📖 Reading progress restored');
            }, 100);
        }
    }

    // Touch and keyboard handlers
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (!this.touchStartX) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchEndX - this.touchStartX;
        const diffY = touchEndY - this.touchStartY;
        
        // Only handle horizontal swipe with small vertical deviation
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
            if (diffX > 0) {
                this.previousPage();
            } else {
                this.nextPage();
            }
        }
        
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    handleKeydown(e) {
        if (e.key === 'F5' || e.keyCode === 116) {
            e.preventDefault();
            if (this.githubManager.ghConfig.owner && this.githubManager.ghConfig.repo) {
                this.githubManager.loadFromGitHub().catch(() => {});
            } else {
                this.showMessage('❌ Chưa cấu hình GitHub (owner/repo).');
            }
            return;
        }
        if (e.key === 'ArrowLeft') {
            this.previousPage();
        } else if (e.key === 'ArrowRight') {
            this.nextPage();
        } else if (e.key === 'Escape') {
            if (this.sidebarManager.isMenuOpen) {
                this.sidebarManager.closeMenu();
            }
            if (this.isSettingsOpen) this.closeSettings();
        }
    }

    // UI helpers
    showLoading() {
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    showError(message) {
        this.placeholderDiv.style.display = 'block';
        this.placeholderDiv.innerHTML = `
            <div style="font-size: 48px;">❌</div>
            <h3>Đã xảy ra lỗi</h3>
            <p>${message}</p>
            <button class="get-started-btn" onclick="location.reload()">Thử lại</button>
        `;
        this.hideLoading();
    }

    showMessage(message) {
        alert(message);
    }

    showUploadPreview(res) {
        const el = document.getElementById('upload-preview');
        if (!el) return;
        const book = res.book || {};
        const processed = res.processedContent || '';
        const headings = res.headings || [];
        const totalPages = res.totalPages || 'N/A';
        const sizeKB = (new Blob([processed]).size / 1024).toFixed(1);

        el.style.display = 'block';
        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escapeHtml(book.name || 'Không tên')}</div>
                    <div style="font-size:0.85em;color:var(--text-secondary);margin-top:4px">Kích thước: ${sizeKB} KB · Mục lục: ${headings.length} · Trang ~ ${totalPages}</div>
                </div>
                <div style="display:flex;gap:6px">
                    <button id="upload-preview-view" class="upload-btn" style="padding:6px 10px">Xem</button>
                    <button id="upload-preview-clear" class="upload-btn" style="padding:6px 10px">Hủy</button>
                </div>
            </div>
        `;

        // Bind events
        const viewBtn = document.getElementById('upload-preview-view');
        const clearBtn = document.getElementById('upload-preview-clear');
        if (viewBtn) viewBtn.addEventListener('click', () => {
            try {
                this.currentBook = book;
                this.fileManager.displayContentDirectly(processed);
                this.sidebarManager.generateTOC();
                this.calculatePages();
                this.showMessage('👁️ Đã hiển thị bản xử lý (preview)');
            } catch (e) {
                console.warn('Preview failed', e);
                this.showMessage('❌ Hiển thị preview thất bại: ' + (e.message || e));
            }
        });

        if (clearBtn) clearBtn.addEventListener('click', () => {
            this.pendingUpload = null;
            this.fileInput.value = '';
            this.bookTitleInput.value = '';
            this.authorName.value = '';
            this.clearUploadPreview();
            this.showMessage('🗑️ Đã hủy bản xử lý');
        });
    }

    clearUploadPreview() {
        const el = document.getElementById('upload-preview');
        if (!el) return;
        el.style.display = 'none';
        el.innerHTML = '';
        if (this.uploadBtn) this.uploadBtn.disabled = true;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded - Starting BookReader...');
    window.bookReader = new BookReader();
    await window.bookReader.initialize();
});