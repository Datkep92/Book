// file-manager.js - File Operations Management
class FileManager {
    constructor(bookReader) {
        this.bookReader = bookReader;
    }

    // Read a file and attempt to detect its encoding, returning decoded text
    async readFileAsText(file, preferredEncoding = null) {
        if (!file) throw new Error('No file provided');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = (e) => reject(e);
            reader.onload = async (e) => {
                try {
                    const buffer = e.target.result;
                    // If caller provided a preferredEncoding use it first
                    if (preferredEncoding) {
                        try {
                            const decoder = new TextDecoder(preferredEncoding);
                            const text = decoder.decode(buffer);
                            return resolve(text);
                        } catch (err) {
                            // fall through to detection
                        }
                    }

                    // Try to detect encoding from buffer
                    try {
                        const det = await this.detectEncoding(buffer);
                        return resolve(det.text);
                    } catch (err) {
                        // fallback to UTF-8
                        const text = new TextDecoder('utf-8').decode(buffer);
                        return resolve(text);
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // Process a selected file and return a normalized "book" object plus processed content
    async handleFileSelect(file, options = {}) {
        const {
            fileContentDiv = this.bookReader.fileContentDiv,
            bookTitleEl = this.bookReader.bookTitle,
            contentReaderEl = this.bookReader.contentReader,
            storageKey = 'bookreader_books',
            lastBookKey = 'bookreader_lastbook',
            encoding = null
        } = options;

        if (!file) throw new Error('No file provided');

        const raw = await this.readFileAsText(file, encoding);
        const fileName = file.name.replace(/\.[^/.]+$/, '');

        // Fix encoding mojibake and ensure meta
        let processed = this.fixContentEncoding(raw);

        // Ensure meta charset header
        if (!processed.includes('<meta charset=')) {
            processed = processed.replace('<head>', '<head>\n    <meta charset="UTF-8">');
        }

        // If a DOM element is available, render and optimize it for TOC/pages detection
        let headings = [];
        if (fileContentDiv) {
            // Render into a temporary container inside the provided div so we don't overwrite main UI
            let temp = fileContentDiv.querySelector('.upload-temp');
            if (!temp) {
                temp = document.createElement('div');
                temp.className = 'upload-temp';
                temp.style.display = 'none';
                fileContentDiv.appendChild(temp);
            }

            temp.innerHTML = processed;
            // Run optimizations that modify DOM (images, tables...)
            try { this.optimizeContent(fileContentDiv); } catch(e) { console.warn('optimizeContent failed', e); }
            // Generate TOC using existing method; it expects content already in fileContentDiv
            if (this.bookReader.sidebarManager) {
                headings = this.bookReader.sidebarManager.getHeadings();
            }
        }

        // Calculate pages if reader element exists
        let totalPages = null;
        if (contentReaderEl && fileContentDiv) {
            try {
                totalPages = this.bookReader.calculatePages();
            } catch (e) {
                console.warn('calculatePages failed', e);
            }
        }

        const book = {
            name: fileName,
            content: processed,
            timestamp: Date.now(),
            lastPosition: 0
        };

        // Save local (processed) copy before trying to upload
        try {
            this.bookReader.saveBookToStorage(book);
            if (lastBookKey) localStorage.setItem(lastBookKey, fileName);
        } catch (e) {
            console.warn('Save book to storage (upload flow) failed', e);
        }

        // Return normalized book and processed content to caller
        return { book, processedContent: processed, headings, totalPages };
    }

    async detectEncoding(buffer) {
        const encodings = ['utf-8', 'windows-1252', 'iso-8859-1', 'utf-16'];
        
        for (let encoding of encodings) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(buffer);
                
                // Kiểm tra xem text có hợp lệ không (có chứa ký tự tiếng Việt)
                const vietnameseChars = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
                if (vietnameseChars.test(text)) {
                    console.log(`✅ Detected encoding: ${encoding}`);
                    return { encoding, text };
                }
            } catch (e) {
                continue;
            }
        }
        
        // Fallback to UTF-8
        console.log('⚠️ Using UTF-8 as fallback');
        return { encoding: 'utf-8', text: new TextDecoder('utf-8').decode(buffer) };
    }

    fixContentEncoding(content) {
        // Thêm meta charset UTF-8 nếu thiếu
        if (!content.includes('<meta charset=') && !content.includes('charset=')) {
            content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
            console.log('🔧 Added UTF-8 meta tag');
        }
        
        // Sửa các ký tự tiếng Việt bị lỗi phổ biến
        const encodingFixes = {
            // Windows-1252 to UTF-8 fixes
            'Ã¡': 'á', 'Ã ': 'à', 'Ã£': 'ã', 'Ã¢': 'â', 'Ã©': 'é',
            'Ã¨': 'è', 'Ãª': 'ê', 'Ã­': 'í', 'Ã¬': 'ì', 'Ã³': 'ó',
            'Ã²': 'ò', 'Ã´': 'ô', 'Ãº': 'ú', 'Ã¹': 'ù', 'Ã½': 'ý',
            'Ã': 'Á', 'Ã€': 'À', 'Ãƒ': 'Ã', 'Ã‚': 'Â', 'Ã‰': 'É',
            'Ãˆ': 'È', 'ÃŠ': 'Ê', 'Ã': 'Í', 'ÃŒ': 'Ì', 'Ã“': 'Ó',
            'Ã’': 'Ò', 'Ã”': 'Ô', 'Ãš': 'Ú', 'Ã™': 'Ù', 'Ã': 'Ý',
            'Äƒ': 'ă', 'Ä‚': 'Ă', 'Æ¡': 'ơ', 'Æ¯': 'ư', 'â€“': '–',
            'â€œ': '“', 'â€': '”', 'â€¦': '…',
            
            // UTF-8 mojibake fixes
            'áº¡': 'ạ', 'áº£': 'ả', 'áº¥': 'ấ', 'áº§': 'ầ', 'áº­': 'ậ',
            'áº©': 'ẩ', 'áº«': 'ẫ', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº·': 'ặ',
            'áº³': 'ẳ', 'áºµ': 'ẵ', 'áº¹': 'ẵ', 'áº»': 'ẻ', 'áº½': 'ẽ',
            'áº¿': 'ế', 'á»': 'ề', 'á»‡': 'ệ', 'á»ƒ': 'ể', 'á»…': 'ễ',
            'á»‹': 'ị', 'á»‰': 'ỉ', 'á»': 'ọ', 'á»': 'ỏ', 'á»‘': 'ố',
            'á»“': 'ồ', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ', 'á»›': 'ớ',
            'á»': 'ờ', 'á»£': 'ợ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»¥': 'ụ',
            'á»§': 'ủ', 'Å©': 'ũ', 'á»©': 'ứ', 'á»«': 'ừ', 'á»±': 'ự',
            'á»­': 'ử', 'á»¯': 'ữ', 'á»³': 'ỳ', 'á»·': 'ỵ', 'á»¹': 'ỹ'
        };

        // Áp dụng tất cả các fix
        Object.keys(encodingFixes).forEach(badChar => {
            const regex = new RegExp(badChar, 'g');
            content = content.replace(regex, encodingFixes[badChar]);
        });

        console.log('🔧 Applied encoding fixes');
        return content;
    }

    displayContentDirectly(content) {
        // Xóa iframe cũ nếu có
        this.bookReader.fileContentDiv.innerHTML = '';
        
        // Tạo div để hiển thị nội dung trực tiếp
        const contentDiv = document.createElement('div');
        contentDiv.className = 'file-content-display';
        contentDiv.innerHTML = content;
        
        // Thêm vào DOM
        this.bookReader.fileContentDiv.appendChild(contentDiv);
        
        // Tối ưu hóa nội dung
        this.optimizeContent(this.bookReader.fileContentDiv);
        
        console.log('📄 Content displayed directly');
    }

    optimizeContent(contentDiv) {
        const contentDisplay = contentDiv.querySelector('.file-content-display');
        if (!contentDisplay) return;
        
        // Tối ưu hóa images
        contentDisplay.querySelectorAll('img').forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.loading = 'lazy';
        });
        
        // Tối ưu hóa tables
        contentDisplay.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.display = 'block';
            table.style.overflowX = 'auto';
            table.style.fontSize = '0.9em';
        });
        
        // Đảm bảo tất cả elements không vượt quá width
        contentDisplay.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.boxSizing = 'border-box';
        });
        
        // Xóa empty elements
        contentDisplay.querySelectorAll('p, div').forEach(el => {
            if (!el.textContent.trim() && !el.querySelector('img, table')) {
                el.remove();
            }
        });
        
        console.log('🎨 Content optimized');
    }

    displayContentInIframe(content) {
        // Create iframe for better isolation and font rendering
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.background = 'var(--bg-primary)';
        
        // Ensure UTF-8 meta tag
        if (!content.includes('<meta charset=')) {
            content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
        }
        
        // Add basic styles for iframe content
        const styles = `
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6; 
                    margin: 0; 
                    padding: 16px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }
                img { max-width: 100%; height: auto; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid var(--border-color); padding: 8px; }
            </style>
        `;
        
        content = content.replace('</head>', styles + '</head>');
        
        this.bookReader.fileContentDiv.innerHTML = '';
        this.bookReader.fileContentDiv.appendChild(iframe);
        
        iframe.onload = () => {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(content);
            iframeDoc.close();
            
            // Apply theme to iframe
            this.applyThemeToIframe(iframe);
        };
    }
// Thêm hàm extract metadata từ file HTML
extractMetadata(content) {
    const metadataMatch = content.match(/<!--\s*BOOK_METADATA_START([\s\S]*?)BOOK_METADATA_END\s*-->/);
    if (metadataMatch) {
        const metadataText = metadataMatch[1];
        const metadata = {};
        
        const lines = metadataText.split('\n');
        lines.forEach(line => {
            const match = line.match(/(\w+):\s*(.+)/);
            if (match) {
                metadata[match[1].toLowerCase()] = match[2].trim();
            }
        });
        
        return metadata;
    }
    return null;
}

// Khi display content, có thể hiển thị metadata
displayContentWithMetadata(content, docInfo) {
    const metadata = this.extractMetadata(content);
    const contentWithoutMetadata = content.replace(/<!--\s*BOOK_METADATA_START[\s\S]*?BOOK_METADATA_END\s*-->/, '');
    
    // Hiển thị metadata ở đầu bài viết nếu có
    let displayContent = '';
    if (metadata) {
        displayContent = `
            <div class="article-metadata" style="background: var(--bg-secondary); padding: 20px; border-radius: var(--radius); margin-bottom: 20px; border-left: 4px solid var(--primary-color);">
                <h1 style="margin-top: 0; color: var(--text-primary);">${metadata.title || docInfo.title}</h1>
                <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px;">
                    <div><strong>Tác giả:</strong> ${metadata.author || docInfo.author || 'Không rõ'}</div>
                    <div><strong>Ngày xuất bản:</strong> ${metadata.publisheddate || docInfo.date || 'N/A'}</div>
                </div>
                ${metadata.description ? `<div style="color: var(--text-secondary); line-height: 1.5;"><strong>Miêu tả:</strong> ${metadata.description}</div>` : ''}
            </div>
        `;
    }
    
    displayContent += contentWithoutMetadata;
    this.displayContentDirectly(displayContent);
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
    applyThemeToIframe(iframe) {
        const theme = localStorage.getItem('bookreader-theme') || 'light';
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        iframeDoc.body.setAttribute('data-theme', theme);
        iframeDoc.documentElement.style.cssText = `
            --bg-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')};
            --text-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary')};
            --border-color: ${getComputedStyle(document.documentElement).getPropertyValue('--border-color')};
        `;
    }
}