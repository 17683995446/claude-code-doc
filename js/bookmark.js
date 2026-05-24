/**
 * Claude Code Architecture Documentation - 注释/书签系统模块
 * 段落注释、书签收藏、管理面板
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

// ==================== BookmarkModule ====================
/**
 * 注释与书签管理模块
 * 提供段落注释、书签收藏、侧边管理面板功能
 */
const BookmarkModule = {
    // 注释数组
    _notes: [],
    // 收藏的章节 ID 集合
    _bookmarks: new Set(),
    // 管理面板 DOM
    _panel: null,
    // 面板是否打开
    _isOpen: false,
    // 当前激活的标签页
    _activeTab: 'notes',
    // localStorage 存储键
    _storageKeyNotes: 'claude-code-doc-notes',
    _storageKeyBookmarks: 'claude-code-doc-bookmarks',
    // 当前正在编辑的注释 ID（用于面板内编辑）
    _editingNoteId: null,
    // 存储绑定的事件引用，用于 destroy 时清理
    _boundEvents: [],

    /**
     * 初始化模块
     */
    init() {
        // 防止重复初始化
        if (document.getElementById('note-panel')) {
            return this;
        }
        this._loadNotes();
        this._loadBookmarks();
        this.createUI();
        this.bindEvents();

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '注释/书签模块初始化完成');
        }

        return this;
    },

    /**
     * 创建 UI：注入章节图标、侧边栏书签区域、管理面板
     */
    createUI() {
        this._injectSectionIcons();
        this._createSidebarBookmarks();
        this._createPanel();
        this._renderNoteBadges();
        this._renderBookmarkIcons();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 笔记按钮打开管理面板
        const notesBtn = document.getElementById('notes-panel-btn');
        if (notesBtn) {
            const notesBtnHandler = (e) => {
                e.preventDefault();
                this.openPanel();
            };
            notesBtn.addEventListener('click', notesBtnHandler);
            this._boundEvents.push({ el: notesBtn, event: 'click', handler: notesBtnHandler });
        }

        // 遮罩点击关闭面板
        const overlayHandler = (e) => {
            if (this._isOpen && e.target.classList.contains('note-panel-overlay')) {
                this.closePanel();
            }
        };
        document.addEventListener('click', overlayHandler);
        this._boundEvents.push({ el: document, event: 'click', handler: overlayHandler });

        // ESC 关闭面板
        const escHandler = (e) => {
            if (e.key === 'Escape' && this._isOpen) {
                this.closePanel();
            }
        };
        document.addEventListener('keydown', escHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: escHandler });

        // 监听语言切换事件，更新面板内容
        if (window.AppCore) {
            window.AppCore.bus.on('i18n:changed', () => {
                this._renderNoteBadges();
                this._renderBookmarkIcons();
                if (this._isOpen) {
                    this.renderPanelContent();
                }
            });
        }
    },

    // ==================== 注释操作 ====================

    /**
     * 添加注释
     * @param {string} sectionId - 章节 ID
     * @param {string} text - 注释文本
     * @returns {Object} 新创建的注释对象
     */
    addNote(sectionId, text) {
        if (!sectionId || !text.trim()) return null;

        const section = document.getElementById(sectionId);
        const sectionTitle = section ? section.querySelector('h2')?.textContent?.trim() || sectionId : sectionId;

        const note = {
            id: window.AppCore ? window.AppCore.utils.generateId('note') : ('note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
            sectionId: sectionId,
            sectionTitle: sectionTitle,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this._notes.push(note);
        this._saveNotes();
        this._renderNoteBadges();

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', `添加注释到章节: ${sectionTitle}`);
            window.AppCore.bus.emit('bookmark:note-added', note);
        }

        return note;
    },

    /**
     * 获取指定章节的所有注释
     * @param {string} sectionId - 章节 ID
     * @returns {Array} 注释数组
     */
    getNotes(sectionId) {
        return this._notes.filter(n => n.sectionId === sectionId);
    },

    /**
     * 编辑注释
     * @param {string} noteId - 注释 ID
     * @param {string} newText - 新文本
     * @returns {boolean} 是否成功
     */
    editNote(noteId, newText) {
        const note = this._notes.find(n => n.id === noteId);
        if (!note || !newText.trim()) return false;

        note.text = newText.trim();
        note.updatedAt = new Date().toISOString();
        this._saveNotes();
        this._renderNoteBadges();

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', `编辑注释: ${noteId}`);
            window.AppCore.bus.emit('bookmark:note-edited', note);
        }

        return true;
    },

    /**
     * 删除注释
     * @param {string} noteId - 注释 ID
     * @returns {boolean} 是否成功
     */
    deleteNote(noteId) {
        const index = this._notes.findIndex(n => n.id === noteId);
        if (index === -1) return false;

        const removed = this._notes.splice(index, 1)[0];
        this._saveNotes();
        this._renderNoteBadges();

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', `删除注释: ${noteId}`);
            window.AppCore.bus.emit('bookmark:note-deleted', removed);
        }

        return true;
    },

    /**
     * 显示内联注释编辑框
     * @param {string} sectionId - 章节 ID
     */
    _showNoteEditor(sectionId) {
        // 移除已有的编辑器
        const existing = document.querySelector('.note-editor');
        if (existing) existing.remove();

        const section = document.getElementById(sectionId);
        if (!section) return;

        const sectionTitle = section.querySelector('h2')?.textContent?.trim() || sectionId;

        const editor = document.createElement('div');
        editor.className = 'note-editor';
        editor.innerHTML = `
            <div class="note-editor-header">
                <span>${this._escapeHtml(sectionTitle)}</span>
                <button class="note-editor-close" title="取消">&times;</button>
            </div>
            <textarea class="note-editor-textarea" placeholder="${this._escapeHtml(this._t('notes.placeholder'))}" rows="3"></textarea>
            <div class="note-editor-actions">
                <button class="note-editor-save">${this._t('notes.save')}</button>
                <button class="note-editor-cancel">${this._t('notes.cancel')}</button>
            </div>
        `;

        // 插入到章节标题之后
        const h2 = section.querySelector('h2');
        if (h2) {
            h2.parentNode.insertBefore(editor, h2.nextSibling);
        } else {
            section.prepend(editor);
        }

        // 聚焦到 textarea
        const textarea = editor.querySelector('.note-editor-textarea');
        textarea.focus();

        // 绑定事件
        editor.querySelector('.note-editor-save').addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) {
                this.addNote(sectionId, text);
                editor.remove();
            }
        });

        editor.querySelector('.note-editor-cancel').addEventListener('click', () => {
            editor.remove();
        });

        editor.querySelector('.note-editor-close').addEventListener('click', () => {
            editor.remove();
        });

        // Ctrl+Enter 保存
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const text = textarea.value.trim();
                if (text) {
                    this.addNote(sectionId, text);
                    editor.remove();
                }
            }
            if (e.key === 'Escape') {
                editor.remove();
            }
        });
    },

    /**
     * 渲染注释数量徽标
     */
    _renderNoteBadges() {
        // 清除旧徽标
        document.querySelectorAll('.note-badge').forEach(el => el.remove());

        const sections = this._getAllSections();
        sections.forEach(section => {
            const sectionId = section.id;
            const notes = this.getNotes(sectionId);
            if (notes.length === 0) return;

            const badge = document.createElement('span');
            badge.className = 'note-badge';
            badge.textContent = notes.length;
            badge.title = this._t('notes.count', { count: notes.length });

            // 点击徽标显示注释列表
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showNoteList(sectionId);
            });

            // 找到注释图标按钮，在其后插入
            const noteIcon = section.querySelector('.note-icon');
            if (noteIcon) {
                noteIcon.parentNode.insertBefore(badge, noteIcon.nextSibling);
            }
        });
    },

    /**
     * 显示章节注释列表弹窗
     * @param {string} sectionId - 章节 ID
     */
    _showNoteList(sectionId) {
        const notes = this.getNotes(sectionId);
        const section = document.getElementById(sectionId);
        const sectionTitle = section ? section.querySelector('h2')?.textContent?.trim() : sectionId;

        // 移除已有的列表
        const existing = document.querySelector('.note-list-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.className = 'note-list-popup';

        let notesHtml = '';
        if (notes.length === 0) {
            notesHtml = `<div class="note-empty">${this._t('notes.empty')}</div>`;
        } else {
            notesHtml = notes.map(note => `
                <div class="note-item" data-note-id="${this._escapeHtml(note.id)}">
                    <div class="note-item-text">${this._escapeHtml(note.text)}</div>
                    <div class="note-item-meta">${this._escapeHtml(this._formatDate(note.updatedAt))}</div>
                    <div class="note-actions">
                        <button class="note-action-btn note-edit-btn" data-note-id="${this._escapeHtml(note.id)}" title="${this._escapeHtml(this._t('notes.edit'))}">${this._t('notes.edit')}</button>
                        <button class="note-action-btn note-delete-btn" data-note-id="${this._escapeHtml(note.id)}" title="${this._escapeHtml(this._t('notes.delete'))}">${this._t('notes.delete')}</button>
                    </div>
                </div>
            `).join('');
        }

        popup.innerHTML = `
            <div class="note-list-header">
                <span>${this._escapeHtml(sectionTitle)} - ${this._escapeHtml(this._t('notes.tab.notes'))}</span>
                <button class="note-list-close">&times;</button>
            </div>
            <div class="note-list-body">${notesHtml}</div>
        `;

        // 插入到章节中
        const h2 = section.querySelector('h2');
        if (h2) {
            h2.parentNode.insertBefore(popup, h2.nextSibling);
        } else {
            section.prepend(popup);
        }

        // 绑定事件
        popup.querySelector('.note-list-close').addEventListener('click', () => {
            popup.remove();
        });

        popup.querySelectorAll('.note-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = btn.dataset.noteId;
                const note = this._notes.find(n => n.id === noteId);
                if (!note) return;

                const item = btn.closest('.note-item');
                const textEl = item.querySelector('.note-item-text');

                // 替换为编辑框
                const editArea = document.createElement('textarea');
                editArea.className = 'note-editor-textarea';
                editArea.value = note.text;
                editArea.rows = 2;
                textEl.replaceWith(editArea);

                // 替换操作按钮
                const actionsEl = item.querySelector('.note-actions');
                actionsEl.innerHTML = `
                    <button class="note-action-btn note-save-inline-btn">${this._t('notes.save')}</button>
                    <button class="note-action-btn note-cancel-inline-btn">${this._t('notes.cancel')}</button>
                `;

                editArea.focus();

                actionsEl.querySelector('.note-save-inline-btn').addEventListener('click', () => {
                    this.editNote(noteId, editArea.value);
                    popup.remove();
                    this._showNoteList(sectionId);
                });

                actionsEl.querySelector('.note-cancel-inline-btn').addEventListener('click', () => {
                    popup.remove();
                    this._showNoteList(sectionId);
                });
            });
        });

        popup.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = btn.dataset.noteId;
                this.deleteNote(noteId);
                popup.remove();
                this._showNoteList(sectionId);
            });
        });

        // 点击外部关闭
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popup.contains(e.target) && !e.target.classList.contains('note-badge')) {
                    popup.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            // 保存引用以便popup被其他方式移除时也能清理
            popup._closeHandler = closeHandler;

            // 监听 popup 被其他方式移除时清理 closeHandler
            const observer = new MutationObserver(() => {
                if (!document.contains(popup)) {
                    document.removeEventListener('click', closeHandler);
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }, 10);
    },

    // ==================== 书签操作 ====================

    /**
     * 切换书签状态
     * @param {string} sectionId - 章节 ID
     */
    toggleBookmark(sectionId) {
        if (this._bookmarks.has(sectionId)) {
            this._bookmarks.delete(sectionId);
            if (window.AppCore) {
                window.AppCore.logger.info('Bookmark', `移除书签: ${sectionId}`);
                window.AppCore.bus.emit('bookmark:removed', { sectionId });
            }
        } else {
            const section = document.getElementById(sectionId);
            const sectionTitle = section ? section.querySelector('h2')?.textContent?.trim() : sectionId;
            this._bookmarks.add(sectionId);
            if (window.AppCore) {
                window.AppCore.logger.info('Bookmark', `添加书签: ${sectionTitle}`);
                window.AppCore.bus.emit('bookmark:added', { sectionId, sectionTitle });
            }
        }

        this._saveBookmarks();
        this._renderBookmarkIcons();
        this._updateSidebarBookmarks();
    },

    /**
     * 检查章节是否已收藏
     * @param {string} sectionId - 章节 ID
     * @returns {boolean}
     */
    isBookmarked(sectionId) {
        return this._bookmarks.has(sectionId);
    },

    /**
     * 获取所有书签
     * @returns {Array} 书签数组
     */
    getBookmarks() {
        const result = [];
        this._bookmarks.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const sectionTitle = section ? section.querySelector('h2')?.textContent?.trim() : sectionId;
            result.push({ sectionId, sectionTitle });
        });
        return result;
    },

    /**
     * 渲染书签图标状态
     */
    _renderBookmarkIcons() {
        document.querySelectorAll('.bookmark-icon').forEach(icon => {
            const sectionId = icon.dataset.sectionId;
            if (this._bookmarks.has(sectionId)) {
                icon.classList.add('active');
                icon.title = this._t('notes.bookmark.remove');
            } else {
                icon.classList.remove('active');
                icon.title = this._t('notes.bookmark.add');
            }
        });
    },

    // ==================== 面板操作 ====================

    /**
     * 打开管理面板
     */
    openPanel() {
        if (this._isOpen) return;

        this._isOpen = true;
        this._activeTab = 'notes';
        this._editingNoteId = null;

        if (this._panel) {
            this._panel.classList.add('visible');
            // 创建遮罩
            if (!document.querySelector('.note-panel-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'note-panel-overlay';
                document.body.appendChild(overlay);
            }
            document.querySelector('.note-panel-overlay').classList.add('visible');
        }

        this.renderPanelContent();

        // Focus trap
        if (window.A11yModule && typeof window.A11yModule.trapFocus === 'function') {
            setTimeout(() => {
                window.A11yModule.trapFocus(this._panel);
            }, 100);
        }

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '打开笔记管理面板');
            window.AppCore.bus.emit('bookmark:panel-opened');
        }
    },

    /**
     * 关闭管理面板
     */
    closePanel() {
        if (!this._isOpen) return;

        this._isOpen = false;
        this._editingNoteId = null;

        if (this._panel) {
            this._panel.classList.remove('visible');
        }

        const overlay = document.querySelector('.note-panel-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '关闭笔记管理面板');
            window.AppCore.bus.emit('bookmark:panel-closed');
        }
    },

    /**
     * 切换面板标签页
     * @param {string} tab - 'notes' | 'bookmarks'
     */
    switchPanelTab(tab) {
        this._activeTab = tab;
        this._editingNoteId = null;
        this.renderPanelContent();
    },

    /**
     * 渲染面板内容
     */
    renderPanelContent() {
        if (!this._panel) return;

        const content = this._panel.querySelector('.note-panel-content');
        if (!content) return;

        // 标签页按钮
        const tabsHtml = `
            <div class="note-panel-tabs">
                <button class="note-panel-tab ${this._activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
                    ${this._t('notes.tab.notes')}
                </button>
                <button class="note-panel-tab ${this._activeTab === 'bookmarks' ? 'active' : ''}" data-tab="bookmarks">
                    ${this._t('notes.tab.bookmarks')}
                </button>
            </div>
        `;

        let listHtml = '';

        if (this._activeTab === 'notes') {
            listHtml = this._renderNotesList();
        } else {
            listHtml = this._renderBookmarksList();
        }

        // 底部操作栏
        const footerHtml = `
            <div class="note-panel-footer">
                <div class="note-panel-footer-actions">
                    <button class="note-panel-action-btn" id="bookmark-export-btn">${this._t('notes.export')}</button>
                    <button class="note-panel-action-btn" id="bookmark-import-btn">${this._t('notes.import')}</button>
                    <button class="note-panel-action-btn note-panel-action-danger" id="bookmark-clear-btn">${this._t('notes.clear')}</button>
                </div>
            </div>
        `;

        content.innerHTML = tabsHtml + `<div class="note-panel-list">${listHtml}</div>` + footerHtml;

        // 绑定标签页切换
        content.querySelectorAll('.note-panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPanelTab(tab.dataset.tab);
            });
        });

        // 绑定底部按钮
        const exportBtn = content.querySelector('#bookmark-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const importBtn = content.querySelector('#bookmark-import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this._triggerImport());
        }

        const clearBtn = content.querySelector('#bookmark-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }

        // 绑定列表内操作
        this._bindPanelListEvents(content);
    },

    /**
     * 渲染注释列表（面板内）
     * @returns {string} HTML 字符串
     */
    _renderNotesList() {
        if (this._notes.length === 0) {
            return `<div class="note-empty">${this._t('notes.empty')}</div>`;
        }

        // 按章节分组
        const grouped = {};
        this._notes.forEach(note => {
            if (!grouped[note.sectionId]) {
                grouped[note.sectionId] = {
                    title: note.sectionTitle,
                    notes: []
                };
            }
            grouped[note.sectionId].notes.push(note);
        });

        let html = '';
        Object.entries(grouped).forEach(([sectionId, group]) => {
            html += `<div class="note-group">
                <div class="note-group-title" data-section-id="${sectionId}">
                    ${this._escapeHtml(group.title)}
                    <button class="note-jump-btn" data-section-id="${sectionId}" title="${this._t('notes.jump')}">&#8594;</button>
                </div>`;

            group.notes.forEach(note => {
                const isEditing = this._editingNoteId === note.id;
                if (isEditing) {
                    html += `
                        <div class="note-item" data-note-id="${note.id}">
                            <textarea class="note-editor-textarea note-panel-edit" data-note-id="${note.id}" rows="2">${this._escapeHtml(note.text)}</textarea>
                            <div class="note-actions">
                                <button class="note-action-btn note-panel-save-btn" data-note-id="${note.id}">${this._t('notes.save')}</button>
                                <button class="note-action-btn note-panel-cancel-edit-btn">${this._t('notes.cancel')}</button>
                            </div>
                        </div>`;
                } else {
                    html += `
                        <div class="note-item" data-note-id="${note.id}">
                            <div class="note-item-text">${this._escapeHtml(note.text)}</div>
                            <div class="note-item-meta">${this._formatDate(note.updatedAt)}</div>
                            <div class="note-actions">
                                <button class="note-action-btn note-panel-edit-btn" data-note-id="${note.id}" title="${this._t('notes.edit')}">${this._t('notes.edit')}</button>
                                <button class="note-action-btn note-panel-delete-btn" data-note-id="${note.id}" title="${this._t('notes.delete')}">${this._t('notes.delete')}</button>
                            </div>
                        </div>`;
                }
            });

            html += '</div>';
        });

        return html;
    },

    /**
     * 渲染书签列表（面板内）
     * @returns {string} HTML 字符串
     */
    _renderBookmarksList() {
        const bookmarks = this.getBookmarks();
        if (bookmarks.length === 0) {
            return `<div class="note-empty">${this._t('notes.bookmark.empty')}</div>`;
        }

        let html = '';
        bookmarks.forEach(bm => {
            html += `
                <div class="note-item" data-section-id="${bm.sectionId}">
                    <div class="note-item-text">${this._escapeHtml(bm.sectionTitle)}</div>
                    <div class="note-actions">
                        <button class="note-action-btn note-panel-jump-btn" data-section-id="${bm.sectionId}" title="${this._t('notes.jump')}">${this._t('notes.jump')}</button>
                        <button class="note-action-btn note-panel-remove-bm-btn" data-section-id="${bm.sectionId}" title="${this._t('notes.delete')}">${this._t('notes.delete')}</button>
                    </div>
                </div>`;
        });

        return html;
    },

    /**
     * 绑定面板列表内的事件
     * @param {HTMLElement} content - 面板内容容器
     */
    _bindPanelListEvents(content) {
        // 跳转到章节
        content.querySelectorAll('.note-jump-btn, .note-panel-jump-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.sectionId;
                this._jumpToSection(sectionId);
            });
        });

        // 编辑注释
        content.querySelectorAll('.note-panel-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._editingNoteId = btn.dataset.noteId;
                this.renderPanelContent();
                // 聚焦到编辑框
                const textarea = content.querySelector('.note-panel-edit');
                if (textarea) textarea.focus();
            });
        });

        // 保存编辑
        content.querySelectorAll('.note-panel-save-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = btn.dataset.noteId;
                const textarea = content.querySelector(`.note-panel-edit[data-note-id="${noteId}"]`);
                if (textarea) {
                    this.editNote(noteId, textarea.value);
                }
                this._editingNoteId = null;
                this.renderPanelContent();
            });
        });

        // 取消编辑
        content.querySelectorAll('.note-panel-cancel-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._editingNoteId = null;
                this.renderPanelContent();
            });
        });

        // 删除注释
        content.querySelectorAll('.note-panel-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteNote(btn.dataset.noteId);
                this.renderPanelContent();
            });
        });

        // 删除书签
        content.querySelectorAll('.note-panel-remove-bm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleBookmark(btn.dataset.sectionId);
                this.renderPanelContent();
            });
        });
    },

    // ==================== 数据操作 ====================

    /**
     * 导出所有数据为 JSON 文件
     */
    exportData() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            notes: this._notes,
            bookmarks: Array.from(this._bookmarks)
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-code-doc-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
        a.setAttribute('aria-label', '导出书签数据');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '数据已导出');
        }
    },

    /**
     * 触发文件选择器导入 JSON
     */
    _triggerImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    this.importData(ev.target.result);
                } catch (err) {
                    if (window.AppCore) {
                        window.AppCore.logger.error('Bookmark', '导入失败: ' + err.message);
                    }
                }
            };
            reader.readAsText(file);
        });
        input.click();
    },

    /**
     * 导入 JSON 数据
     * @param {string} jsonStr - JSON 字符串
     * @returns {boolean} 是否成功
     */
    importData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);

            if (data.notes && Array.isArray(data.notes)) {
                // 合并注释，避免重复 ID
                const existingIds = new Set(this._notes.map(n => n.id));
                data.notes.forEach(note => {
                    if (!existingIds.has(note.id)) {
                        this._notes.push(note);
                    }
                });
                this._saveNotes();
                this._renderNoteBadges();
            }

            if (data.bookmarks && Array.isArray(data.bookmarks)) {
                data.bookmarks.forEach(id => {
                    this._bookmarks.add(id);
                });
                this._saveBookmarks();
                this._renderBookmarkIcons();
                this._updateSidebarBookmarks();
            }

            if (this._isOpen) {
                this.renderPanelContent();
            }

            if (window.AppCore) {
                window.AppCore.logger.info('Bookmark', '数据导入成功');
                window.AppCore.bus.emit('bookmark:data-imported', data);
            }

            return true;
        } catch (err) {
            if (window.AppCore) {
                window.AppCore.logger.error('Bookmark', '导入失败: ' + err.message);
            }
            return false;
        }
    },

    /**
     * 清空所有数据（带确认）
     */
    clearAllData() {
        const msg = this._t('notes.clear.confirm');
        if (!confirm(msg)) return;

        this._notes = [];
        this._bookmarks.clear();
        this._saveNotes();
        this._saveBookmarks();
        this._renderNoteBadges();
        this._renderBookmarkIcons();
        this._updateSidebarBookmarks();

        if (this._isOpen) {
            this.renderPanelContent();
        }

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '所有数据已清空');
            window.AppCore.bus.emit('bookmark:data-cleared');
        }
    },

    // ==================== UI 创建方法 ====================

    /**
     * 注入章节图标按钮（注释和书签）
     */
    _injectSectionIcons() {
        const sections = this._getAllSections();

        sections.forEach(section => {
            const sectionId = section.id;
            const h2 = section.querySelector('h2');
            if (!h2) return;

            // 检查是否已注入
            if (h2.querySelector('.note-icon')) return;

            // 创建图标容器
            const iconGroup = document.createElement('span');
            iconGroup.className = 'section-icon-group';

            // 注释图标
            const noteIcon = document.createElement('button');
            noteIcon.className = 'note-icon';
            noteIcon.dataset.sectionId = sectionId;
            noteIcon.title = this._t('notes.add');
            noteIcon.innerHTML = '&#128172;'; // 💬
            noteIcon.setAttribute('aria-label', this._t('notes.add'));
            noteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showNoteEditor(sectionId);
            });

            // 书签图标
            const bookmarkIcon = document.createElement('button');
            bookmarkIcon.className = 'bookmark-icon';
            bookmarkIcon.dataset.sectionId = sectionId;
            bookmarkIcon.title = this._t('notes.bookmark.add');
            bookmarkIcon.innerHTML = '&#128278;'; // 🔖
            bookmarkIcon.setAttribute('aria-label', this._t('notes.bookmark.add'));
            bookmarkIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBookmark(sectionId);
            });

            iconGroup.appendChild(noteIcon);
            iconGroup.appendChild(bookmarkIcon);
            h2.appendChild(iconGroup);
        });
    },

    /**
     * 创建侧边栏书签区域
     */
    _createSidebarBookmarks() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // 检查是否已存在
        if (document.getElementById('sidebar-bookmarks-section')) return;

        const section = document.createElement('div');
        section.className = 'sidebar-section';
        section.id = 'sidebar-bookmarks-section';
        section.innerHTML = `
            <div class="sidebar-section-title" style="cursor:pointer;" id="sidebar-bookmarks-toggle">
                &#128278; <span data-i18n="notes.tab.bookmarks">书签</span>
                <span class="sidebar-bookmarks-count" id="sidebar-bookmarks-count" style="display:none;"></span>
            </div>
            <ul class="sidebar-nav" id="sidebar-bookmarks-list" style="display:none;"></ul>
        `;

        // 插入到侧边栏底部（在最后一个 sidebar-section 之前）
        const lastSection = sidebar.querySelector('.sidebar-section:last-of-type');
        if (lastSection) {
            sidebar.insertBefore(section, lastSection);
        } else {
            sidebar.appendChild(section);
        }

        // 折叠/展开
        const toggle = section.querySelector('#sidebar-bookmarks-toggle');
        const list = section.querySelector('#sidebar-bookmarks-list');
        toggle.addEventListener('click', () => {
            const isVisible = list.style.display !== 'none';
            list.style.display = isVisible ? 'none' : 'block';
        });

        this._updateSidebarBookmarks();
    },

    /**
     * 更新侧边栏书签列表
     */
    _updateSidebarBookmarks() {
        const list = document.getElementById('sidebar-bookmarks-list');
        const countEl = document.getElementById('sidebar-bookmarks-count');
        if (!list) return;

        const bookmarks = this.getBookmarks();

        // 更新计数
        if (countEl) {
            if (bookmarks.length > 0) {
                countEl.textContent = bookmarks.length;
                countEl.style.display = 'inline';
            } else {
                countEl.style.display = 'none';
            }
        }

        // 更新列表
        if (bookmarks.length === 0) {
            list.innerHTML = `<li style="color:var(--text-muted);font-size:0.85em;padding:4px 0;">${this._t('notes.bookmark.empty')}</li>`;
            return;
        }

        list.innerHTML = bookmarks.map(bm => `
            <li>
                <a href="#${bm.sectionId}" class="sidebar-bookmark-link" data-section-id="${bm.sectionId}">
                    <span class="nav-icon">&#128278;</span>
                    <span>${this._escapeHtml(bm.sectionTitle)}</span>
                </a>
            </li>
        `).join('');

        // 绑定点击事件
        list.querySelectorAll('.sidebar-bookmark-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this._jumpToSection(link.dataset.sectionId);
            });
        });
    },

    /**
     * 创建管理面板 DOM
     */
    _createPanel() {
        // 检查是否已存在
        if (document.getElementById('note-panel')) return;

        const panel = document.createElement('div');
        panel.className = 'note-panel';
        panel.id = 'note-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', this._t('notes.title'));
        panel.innerHTML = `
            <div class="note-panel-header">
                <h3>${this._t('notes.title')}</h3>
                <button class="note-panel-close-btn" aria-label="Close">&times;</button>
            </div>
            <div class="note-panel-content"></div>
        `;

        document.body.appendChild(panel);
        this._panel = panel;

        // 关闭按钮
        panel.querySelector('.note-panel-close-btn').addEventListener('click', () => {
            this.closePanel();
        });
    },

    // ==================== 工具方法 ====================

    /**
     * 获取所有 h2 级别章节
     * @returns {Array<HTMLElement>} 章节元素数组
     */
    _getAllSections() {
        return Array.from(document.querySelectorAll('.section[id]'));
    },

    /**
     * 保存注释到 localStorage
     */
    _saveNotes() {
        try {
            localStorage.setItem(this._storageKeyNotes, JSON.stringify(this._notes));
        } catch (e) {
            if (window.AppCore) {
                window.AppCore.logger.warn('Bookmark', '保存注释失败: ' + e.message);
            }
        }
    },

    /**
     * 从 localStorage 加载注释
     */
    _loadNotes() {
        try {
            const data = localStorage.getItem(this._storageKeyNotes);
            if (data) {
                this._notes = JSON.parse(data);
                if (!Array.isArray(this._notes)) {
                    this._notes = [];
                }
            }
        } catch (e) {
            this._notes = [];
            if (window.AppCore) {
                window.AppCore.logger.warn('Bookmark', '加载注释失败: ' + e.message);
            }
        }
    },

    /**
     * 保存书签到 localStorage
     */
    _saveBookmarks() {
        try {
            localStorage.setItem(this._storageKeyBookmarks, JSON.stringify(Array.from(this._bookmarks)));
        } catch (e) {
            if (window.AppCore) {
                window.AppCore.logger.warn('Bookmark', '保存书签失败: ' + e.message);
            }
        }
    },

    /**
     * 从 localStorage 加载书签
     */
    _loadBookmarks() {
        try {
            const data = localStorage.getItem(this._storageKeyBookmarks);
            if (data) {
                const arr = JSON.parse(data);
                if (Array.isArray(arr)) {
                    this._bookmarks = new Set(arr);
                }
            }
        } catch (e) {
            this._bookmarks = new Set();
            if (window.AppCore) {
                window.AppCore.logger.warn('Bookmark', '加载书签失败: ' + e.message);
            }
        }
    },

    /**
     * 跳转到指定章节
     * @param {string} sectionId - 章节 ID
     */
    _jumpToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 高亮闪烁效果
        section.classList.add('section-highlight');
        setTimeout(() => {
            section.classList.remove('section-highlight');
        }, 2000);

        // 关闭面板
        this.closePanel();

        // 关闭移动端侧边栏
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    },

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @param {Object} [params] - 插值参数
     * @returns {string}
     */
    _t(key, params) {
        if (window.I18nModule) {
            return window.I18nModule.t(key, params);
        }
        // 回退：直接返回 key
        let text = key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, v);
            });
        }
        return text;
    },

    /**
     * 格式化日期
     * @param {string} isoStr - ISO 日期字符串
     * @returns {string}
     */
    _formatDate(isoStr) {
        if (window.AppCore && window.AppCore.utils.formatDate) {
            return window.AppCore.utils.formatDate(isoStr, 'YYYY-MM-DD HH:mm');
        }
        try {
            const d = new Date(isoStr);
            return d.toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return isoStr;
        }
    },

    /**
     * HTML 转义
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /**
     * 销毁模块，清理所有事件监听器和 DOM 元素
     */
    destroy() {
        // 移除所有绑定的事件监听器
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];

        // 关闭面板
        this.closePanel();

        // 移除面板 DOM
        if (this._panel) {
            this._panel.remove();
            this._panel = null;
        }

        // 移除遮罩
        const overlay = document.querySelector('.note-panel-overlay');
        if (overlay) overlay.remove();

        // 清理数据
        this._notes = [];
        this._bookmarks.clear();
        this._isOpen = false;
        this._editingNoteId = null;

        if (window.AppCore) {
            window.AppCore.logger.info('Bookmark', '注释/书签模块已销毁');
        }
    }
};

// ==================== 全局暴露 ====================
window.BookmarkModule = BookmarkModule;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BookmarkModule };
}
