/**
 * 全面测试执行脚本
 * 执行所有测试套件并生成报告
 */

async function runAllTests() {
    console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
    console.log('%c  Claude Code 文档系统 - 全面测试执行器', 'font-size: 16px; font-weight: bold; color: #6db3f2;');
    console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
    console.log('');

    const allResults = {
        timestamp: new Date().toISOString(),
        suites: [],
        summary: {
            totalSuites: 0,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            passRate: '0%'
        }
    };

    // 1. 运行 ComprehensiveTestSuite
    if (window.ComprehensiveTestSuite) {
        console.log('%c[Phase 1] 运行 ComprehensiveTestSuite...', 'font-weight: bold; color: #e87e2f;');
        await ComprehensiveTestSuite.runAll();
        allResults.suites.push({
            name: 'ComprehensiveTestSuite',
            results: ComprehensiveTestSuite._results
        });
    }

    // 2. 运行 ChaosTest
    if (window.ChaosTest && !window.location.search.includes('skip-chaos')) {
        console.log('');
        console.log('%c[Phase 2] 运行 ChaosTest...', 'font-weight: bold; color: #e87e2f;');
        await ChaosTest.runAllTests();
    }

    // 3. 代码分析
    if (window.CodeAnalyzer) {
        console.log('');
        console.log('%c[Phase 3] 运行代码分析...', 'font-weight: bold; color: #e87e2f;');
        
        // 分析核心文件
        const filesToAnalyze = ['core.js', 'main.js', 'theme.js', 'search.js'];
        for (const file of filesToAnalyze) {
            try {
                const response = await fetch(`/js/${file}`);
                const content = await response.text();
                const analysis = CodeAnalyzer.analyzeFile(file, content);
                CodeAnalyzer.results.files[file] = analysis;
            } catch (e) {
                console.warn(`无法分析 ${file}:`, e.message);
            }
        }
        
        const report = CodeAnalyzer.generateReport();
        CodeAnalyzer.printReport(report);
    }

    // 生成最终报告
    console.log('');
    console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #7bc47f;');
    console.log('%c  全面测试执行完成', 'font-size: 16px; font-weight: bold; color: #7bc47f;');
    console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #7bc47f;');

    return allResults;
}

// 自动运行（如果 URL 包含 run-all-tests=true）
if (window.location.search.includes('run-all-tests=true')) {
    window.addEventListener('load', () => {
        setTimeout(runAllTests, 2000);
    });
}

// 暴露到全局
window.runAllTests = runAllTests;

console.log('[TestRunner] 测试执行器已加载');
console.log('运行 runAllTests() 执行所有测试');
