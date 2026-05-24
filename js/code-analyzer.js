/**
 * 代码分析器 - 逆向分析工具
 * 用于静态分析代码结构、分支、边界条件
 */

const CodeAnalyzer = {
    // 分析结果存储
    results: {
        files: {},
        summary: {
            totalFiles: 0,
            totalFunctions: 0,
            totalBranches: 0,
            totalExceptions: 0,
            coverage: {}
        }
    },

    /**
     * 分析单个文件
     */
    analyzeFile(filename, content) {
        const analysis = {
            filename,
            functions: [],
            branches: [],
            exceptions: [],
            boundaries: [],
            dependencies: [],
            exports: []
        };

        // 提取函数定义
        const functionRegex = /(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            analysis.functions.push({
                name: match[1],
                line: this._getLineNumber(content, match.index),
                params: this._extractParams(match[0])
            });
        }

        // 提取分支结构
        const branchPatterns = [
            { type: 'if', regex: /if\s*\([^)]*\)/g },
            { type: 'else', regex: /else\s*\{/g },
            { type: 'switch', regex: /switch\s*\([^)]*\)/g },
            { type: 'case', regex: /case\s+[^:]+:/g },
            { type: 'ternary', regex: /\?\s*[^:]*\s*:/g },
            { type: 'short-circuit', regex: /&&|\|\|/g }
        ];

        branchPatterns.forEach(({ type, regex }) => {
            while ((match = regex.exec(content)) !== null) {
                analysis.branches.push({
                    type,
                    line: this._getLineNumber(content, match.index),
                    code: match[0].substring(0, 50)
                });
            }
        });

        // 提取异常处理
        const exceptionPatterns = [
            { type: 'try', regex: /try\s*\{/g },
            { type: 'catch', regex: /catch\s*\([^)]*\)/g },
            { type: 'finally', regex: /finally\s*\{/g },
            { type: 'throw', regex: /throw\s+[^;]+;/g }
        ];

        exceptionPatterns.forEach(({ type, regex }) => {
            while ((match = regex.exec(content)) !== null) {
                analysis.exceptions.push({
                    type,
                    line: this._getLineNumber(content, match.index),
                    code: match[0].substring(0, 50)
                });
            }
        });

        // 提取边界条件检查
        const boundaryPatterns = [
            { type: 'null-check', regex: /===\s*null|!==\s*null|==\s*null|!=\s*null/g },
            { type: 'undefined-check', regex: /===\s*undefined|!==\s*undefined|typeof\s+\w+\s*===\s*['"]undefined['"]/g },
            { type: 'empty-check', regex: /\.length\s*===?\s*0|\.length\s*>\s*0|===\s*['"]['"]/g },
            { type: 'range-check', regex: />\s*0|>=\s*0|<\s*0|<=\s*0/g }
        ];

        boundaryPatterns.forEach(({ type, regex }) => {
            while ((match = regex.exec(content)) !== null) {
                analysis.boundaries.push({
                    type,
                    line: this._getLineNumber(content, match.index),
                    code: match[0]
                });
            }
        });

        // 提取依赖关系
        const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(content)) !== null) {
            if (!analysis.dependencies.includes(match[1])) {
                analysis.dependencies.push(match[1]);
            }
        }

        // 提取导出
        const exportRegex = /(?:export\s+(?:default\s+)?|module\.exports\s*=\s*)(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
            analysis.exports.push(match[1]);
        }

        return analysis;
    },

    /**
     * 获取行号
     */
    _getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    },

    /**
     * 提取参数
     */
    _extractParams(funcDef) {
        const match = funcDef.match(/\(([^)]*)\)/);
        return match ? match[1].split(',').map(p => p.trim()).filter(p => p) : [];
    },

    /**
     * 生成分析报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: Object.keys(this.results.files).length,
                totalFunctions: 0,
                totalBranches: 0,
                totalExceptions: 0,
                totalBoundaries: 0
            },
            files: this.results.files,
            recommendations: []
        };

        // 汇总统计
        for (const analysis of Object.values(this.results.files)) {
            report.summary.totalFunctions += analysis.functions.length;
            report.summary.totalBranches += analysis.branches.length;
            report.summary.totalExceptions += analysis.exceptions.length;
            report.summary.totalBoundaries += analysis.boundaries.length;
        }

        // 生成建议
        for (const [filename, analysis] of Object.entries(this.results.files)) {
            // 检查缺少异常处理的函数
            const functionsWithoutTryCatch = analysis.functions.filter(fn => {
                const hasTryCatch = analysis.exceptions.some(ex => 
                    ex.type === 'try' && Math.abs(ex.line - fn.line) < 20
                );
                return !hasTryCatch && fn.name !== 'init' && fn.name !== 'destroy';
            });

            if (functionsWithoutTryCatch.length > 0) {
                report.recommendations.push({
                    file: filename,
                    type: 'missing-exception-handling',
                    message: `${functionsWithoutTryCatch.length} 个函数可能缺少异常处理`,
                    functions: functionsWithoutTryCatch.map(f => f.name)
                });
            }

            // 检查缺少边界检查的函数
            if (analysis.boundaries.length < analysis.functions.length * 0.3) {
                report.recommendations.push({
                    file: filename,
                    type: 'insufficient-boundary-checks',
                    message: `边界检查可能不足 (${analysis.boundaries.length}/${analysis.functions.length})`
                });
            }
        }

        return report;
    },

    /**
     * 打印分析报告
     */
    printReport(report) {
        console.log('%c[CodeAnalyzer] 代码分析报告', 'font-size: 16px; font-weight: bold; color: #6db3f2;');
        console.log('=====================================');
        console.log(`分析时间: ${report.timestamp}`);
        console.log('');
        
        console.log('%c统计摘要:', 'font-weight: bold;');
        console.log(`  文件数: ${report.summary.totalFiles}`);
        console.log(`  函数数: ${report.summary.totalFunctions}`);
        console.log(`  分支数: ${report.summary.totalBranches}`);
        console.log(`  异常处理: ${report.summary.totalExceptions}`);
        console.log(`  边界检查: ${report.summary.totalBoundaries}`);
        console.log('');

        if (report.recommendations.length > 0) {
            console.log('%c改进建议:', 'font-weight: bold; color: #e5c07b;');
            report.recommendations.forEach(rec => {
                console.log(`  [${rec.type}] ${rec.file}:`);
                console.log(`    ${rec.message}`);
                if (rec.functions) {
                    console.log(`    函数: ${rec.functions.join(', ')}`);
                }
            });
        } else {
            console.log('%c✅ 代码质量良好，暂无改进建议', 'color: #7bc47f;');
        }

        console.log('');
        console.log('%c详细分析:', 'font-weight: bold;');
        for (const [filename, analysis] of Object.entries(report.files)) {
            console.log(`\n  ${filename}:`);
            console.log(`    函数: ${analysis.functions.length}`);
            console.log(`    分支: ${analysis.branches.length}`);
            console.log(`    异常处理: ${analysis.exceptions.length}`);
            console.log(`    边界检查: ${analysis.boundaries.length}`);
            console.log(`    依赖: ${analysis.dependencies.join(', ') || '无'}`);
        }
    },

    /**
     * 导出结果为 JSON
     */
    exportJSON() {
        return JSON.stringify(this.results, null, 2);
    }
};

// 暴露到全局
window.CodeAnalyzer = CodeAnalyzer;

console.log('[CodeAnalyzer] 代码分析器已加载');
