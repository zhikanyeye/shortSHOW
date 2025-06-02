/**
 * 搜索功能模块
 * 负责处理所有搜索相关的功能
 */

class SearchEngine {
    constructor() {
        this.dramas = [];
        this.searchCache = new Map();
        this.searchHistory = this.loadSearchHistory();
        this.isLoading = false;
        this.dataLoadAttempts = 0; // 添加数据加载尝试次数计数
        
        // 初始化
        this.init();
    }

    /**
     * 初始化搜索引擎
     */
    async init() {
        try {
            await this.loadDramas();
            this.updateStats();
            console.log('搜索引擎初始化完成');
        } catch (error) {
            console.error('搜索引擎初始化失败:', error);
            
            // 添加重试逻辑
            if (this.dataLoadAttempts < 3) {
                this.dataLoadAttempts++;
                console.log(`尝试重新加载数据（${this.dataLoadAttempts}/3）...`);
                setTimeout(() => this.init(), 1000);
            } else {
                this.showError('数据加载失败，请刷新页面重试');
            }
        }
    }

    /**
     * 加载短剧数据
     */
    async loadDramas() {
        try {
            // 添加随机数防止缓存，并设置超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch('data/dramas.json?' + Date.now(), {
                signal: controller.signal,
                cache: 'no-store' // 禁止缓存
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 处理数据格式
            if (Array.isArray(data)) {
                this.dramas = data;
            } else if (data.dramas && Array.isArray(data.dramas)) {
                this.dramas = data.dramas;
            } else {
                throw new Error('数据格式错误');
            }
            
            console.log(`成功加载 ${this.dramas.length} 部短剧数据`);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('加载数据超时');
                throw new Error('加载数据超时，请检查网络连接');
            }
            console.error('加载数据失败:', error);
            throw error;
        }
    }

    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     * @returns {Array} 搜索结果
     */
    search(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        // 检查数据是否已加载
        if (!this.dramas || this.dramas.length === 0) {
            console.warn('搜索前数据尚未加载完成');
            throw new Error('数据尚未准备好，请稍后再试');
        }

        const searchKey = query.toLowerCase().trim();
        
        // 检查缓存
        if (this.searchCache.has(searchKey)) {
            console.log('从缓存获取搜索结果');
            return this.searchCache.get(searchKey);
        }

        console.log(`搜索关键词: "${searchKey}"`);
        
        try {
            const results = this.dramas.filter(drama => {
                try {
                    // 解密数据进行搜索
                    const title = this.decrypt(drama['短剧名称'] || '').toLowerCase();
                    const actors = this.decrypt(drama['主演'] || '').toLowerCase();
                    const description = this.decrypt(drama['简介'] || '').toLowerCase();
                    
                    // 多字段搜索
                    return title.includes(searchKey) || 
                          actors.includes(searchKey) || 
                          description.includes(searchKey);
                          
                } catch (error) {
                    console.warn('搜索时解密失败:', error);
                    return false;
                }
            });

            // 缓存结果
            this.searchCache.set(searchKey, results);
            
            // 保存搜索历史
            this.saveSearchHistory(query);
            
            console.log(`找到 ${results.length} 个结果`);
            return results;
        } catch (error) {
            console.error('搜索执行出错:', error);
            throw error;
        }
    }

    /**
     * 获取搜索建议
     * @param {string} query - 输入的关键词
     * @returns {Array} 建议列表
     */
    getSuggestions(query) {
        if (!query || query.length < 1 || !this.dramas || this.dramas.length === 0) {
            return [];
        }

        try {
            const searchKey = query.toLowerCase();
            const suggestions = new Set();
            
            // 从短剧标题中提取建议
            this.dramas.forEach(drama => {
                try {
                    const title = this.decrypt(drama['短剧名称'] || '');
                    if (title.toLowerCase().includes(searchKey)) {
                        suggestions.add(title);
                    }
                    
                    // 从演员名中提取建议
                    const actors = this.decrypt(drama['主演'] || '');
                    if (actors.toLowerCase().includes(searchKey)) {
                        actors.split(/[,，\s]+/).forEach(actor => {
                            if (actor.toLowerCase().includes(searchKey)) {
                                suggestions.add(actor.trim());
                            }
                        });
                    }
                } catch (error) {
                    // 忽略解密错误
                }
            });

            return Array.from(suggestions).slice(0, 5);
        } catch (error) {
            console.error('获取建议时出错:', error);
            return [];
        }
    }

    /**
     * 格式化搜索结果
     * @param {Array} results - 原始搜索结果
     * @returns {Array} 格式化后的结果
     */
    formatResults(results) {
        try {
            return results.map(drama => {
                try {
                    return {
                        title: this.decrypt(drama['短剧名称'] || ''),
                        link: this.decrypt(drama['短剧链接'] || ''),
                        actors: this.decrypt(drama['主演'] || ''),
                        description: this.decrypt(drama['简介'] || ''),
                        episodes: drama['集数'] || '',
                        category: drama['类型'] || ''
                    };
                } catch (error) {
                    console.warn('格式化结果时出错:', error);
                    return null;
                }
            }).filter(item => item !== null);
        } catch (error) {
            console.error('格式化结果列表时出错:', error);
            return [];
        }
    }

    /**
     * 数据解密
     * @param {string} encryptedText - 加密文本
     * @returns {string} 解密后的文本
     */
    decrypt(encryptedText) {
        if (!encryptedText) return '';
        
        try {
            // 简单的反向Base64解密
            return decodeURIComponent(atob(encryptedText.split('').reverse().join('')));
        } catch (error) {
            // 如果解密失败，可能是未加密的文本，直接返回
            return encryptedText;
        }
    }

    /**
     * 数据加密
     * @param {string} text - 原始文本
     * @returns {string} 加密后的文本
     */
    encrypt(text) {
        if (!text) return '';
        return btoa(encodeURIComponent(text)).split('').reverse().join('');
    }

    /**
     * 保存搜索历史
     * @param {string} query - 搜索词
     */
    saveSearchHistory(query) {
        if (!query || query.trim().length === 0) return;
        
        const trimmedQuery = query.trim();
        
        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => item !== trimmedQuery);
        
        // 添加到开头
        this.searchHistory.unshift(trimmedQuery);
        
        // 限制历史记录数量
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(0, 20);
        }
        
        // 保存到本地存储
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('保存搜索历史失败:', error);
        }
    }

    /**
     * 加载搜索历史
     * @returns {Array} 搜索历史
     */
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.warn('加载搜索历史失败:', error);
            return [];
        }
    }

    /**
     * 获取搜索历史
     * @returns {Array} 搜索历史
     */
    getSearchHistory() {
        return this.searchHistory.slice(0, 10);
    }

    /**
     * 清空搜索历史
     */
    clearSearchHistory() {
        this.searchHistory = [];
        try {
            localStorage.removeItem('searchHistory');
        } catch (error) {
            console.warn('清空搜索历史失败:', error);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalDramas = this.dramas.length;
        const totalSearches = this.getTotalSearches();
        
        // 更新页面显示
        const totalDramasEl = document.getElementById('totalDramas');
        const totalSearchesEl = document.getElementById('totalSearches');
        
        if (totalDramasEl) {
            this.animateNumber(totalDramasEl, 0, totalDramas, 1000);
        }
        
        if (totalSearchesEl) {
            this.animateNumber(totalSearchesEl, 0, totalSearches, 1500);
        }
    }

    /**
     * 获取总搜索次数
     * @returns {number} 搜索次数
     */
    getTotalSearches() {
        try {
            return parseInt(localStorage.getItem('totalSearches') || '0');
        } catch (error) {
            return 0;
        }
    }

    /**
     * 增加搜索次数
     */
    incrementSearchCount() {
        try {
            const current = this.getTotalSearches();
            localStorage.setItem('totalSearches', (current + 1).toString());
        } catch (error) {
            console.warn('更新搜索次数失败:', error);
        }
    }

    /**
     * 数字动画效果
     * @param {Element} element - 目标元素
     * @param {number} start - 起始值
     * @param {number} end - 结束值
     * @param {number} duration - 动画时长
     */
    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        const change = end - start;

        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
            
            const current = Math.floor(start + change * easeProgress);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        console.error(message);
        
        // 创建一个更美观的错误提示，取代alert
        const errorToast = document.createElement('div');
        errorToast.style.position = 'fixed';
        errorToast.style.top = '20%';
        errorToast.style.left = '50%';
        errorToast.style.transform = 'translateX(-50%)';
        errorToast.style.background = 'rgba(220, 53, 69, 0.95)';
        errorToast.style.color = 'white';
        errorToast.style.padding = '1rem 1.5rem';
        errorToast.style.borderRadius = '8px';
        errorToast.style.maxWidth = '90%';
        errorToast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        errorToast.style.zIndex = '10000';
        errorToast.style.textAlign = 'center';
        errorToast.style.fontSize = '1rem';
        errorToast.textContent = message;
        
        document.body.appendChild(errorToast);
        
        setTimeout(() => {
            errorToast.style.opacity = '0';
            errorToast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(errorToast);
            }, 500);
        }, 4000);
    }

    /**
     * 清空搜索缓存
     */
    clearCache() {
        this.searchCache.clear();
        console.log('搜索缓存已清空');
    }

    /**
     * 获取缓存统计
     * @returns {Object} 缓存统计信息
     */
    getCacheStats() {
        return {
            size: this.searchCache.size,
            keys: Array.from(this.searchCache.keys())
        };
    }
}

// 创建全局搜索引擎实例
window.searchEngine = new SearchEngine();
