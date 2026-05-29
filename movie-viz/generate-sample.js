/**
 * 数据预处理脚本
 * 从原始 TSV 文件中提取 14 万条电影数据，生成 JS 文件
 * 
 * 使用方法：node generate-sample.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TARGET_COUNT = 200000; // 目标采样数量
const OUTPUT_FILE = path.join(__dirname, 'js', 'data.js');
const BASICS_FILE = path.join(__dirname, '..', 'movie-viz', 'data', 'title.basics.tsv');
const RATINGS_FILE = path.join(__dirname, '..', 'movie-viz', 'data', 'title.ratings.tsv');

async function generateSample() {
    console.log('=== 电影数据预处理脚本 ===');
    console.log(`目标：提取 ${TARGET_COUNT.toLocaleString()} 条电影数据`);
    console.log('');
    
    const startTime = Date.now();
    
    // ========================================
    // 第一步：加载评分数据
    // ========================================
    console.log('[1/4] 加载评分数据...');
    const ratingsMap = {};  // 存储评分数据的映射表，key为电影ID
    let ratingsCount = 0;
    
    // 创建可读流，逐行读取评分文件
    const ratingsStream = fs.createReadStream(RATINGS_FILE, { encoding: 'utf8' });
    const ratingsReader = readline.createInterface({ input: ratingsStream });
    let ratingsHeaders = null;  // 存储表头
    
    for await (const line of ratingsReader) {
        // 第一行是表头，跳过
        if (!ratingsHeaders) {
            ratingsHeaders = line.split('\t');
            continue;
        }
        
        // 解析每行数据：tconst, averageRating, numVotes
        const parts = line.split('\t');
        const tconst = parts[0];           // 电影ID
        const averageRating = parseFloat(parts[1]) || 0;  // 平均评分
        const numVotes = parseInt(parts[2]) || 0;         // 投票数
        
        // 只保存有投票数据的电影
        if (tconst && numVotes > 0) {
            ratingsMap[tconst] = { averageRating, numVotes };
            ratingsCount++;
        }
    }
    console.log(`   评分数据加载完成: ${ratingsCount.toLocaleString()} 条`);
    
    // ========================================
    // 第二步：扫描电影基础数据
    // ========================================
    console.log('[2/4] 扫描电影基础数据...');
    const moviesByYear = {};  // 按年份分组存储电影
    let totalMovies = 0;
    let skippedCount = 0;
    
    // 创建可读流，逐行读取电影基础文件
    const basicsStream = fs.createReadStream(BASICS_FILE, { encoding: 'utf8' });
    const basicsReader = readline.createInterface({ input: basicsStream });
    let basicsHeaders = null;
    
    for await (const line of basicsReader) {
        // 第一行是表头，跳过
        if (!basicsHeaders) {
            basicsHeaders = line.split('\t');
            continue;
        }
        
        // 解析每行数据
        const parts = line.split('\t');
        const tconst = parts[0];           // 电影ID
        const titleType = parts[1];        // 类型（movie, short, tvSeries等）
        const primaryTitle = parts[2];     // 主要标题
        const startYear = parts[5];        // 上映年份
        const genres = parts[8];           // 类型标签
        
        // 筛选条件1：必须是电影类型
        if (titleType !== 'movie') {
            skippedCount++;
            continue;
        }
        
        // 筛选条件2：去除无效数据
        if (!genres || genres === '\\N' || !startYear || startYear === '\\N') {
            skippedCount++;
            continue;
        }
        
        // 筛选条件3：年份必须在有效范围内
        const year = parseInt(startYear);
        if (isNaN(year) || year < 1900 || year > 2024) {
            skippedCount++;
            continue;
        }
        
        // 筛选条件4：必须有评分数据
        const ratingInfo = ratingsMap[tconst];
        if (!ratingInfo) {
            skippedCount++;
            continue;
        }
        
        // 构建电影对象
        const movie = {
            id: tconst,
            title: primaryTitle || 'Unknown',
            year: year,
            genres: genres.split(',').map(g => g.trim()),  // 类型标签数组
            rating: ratingInfo.averageRating,
            votes: ratingInfo.numVotes
        };
        
        // 按年份分组存储
        if (!moviesByYear[year]) {
            moviesByYear[year] = [];
        }
        moviesByYear[year].push(movie);
        totalMovies++;
        
        // 每处理50万条输出一次进度
        if (totalMovies % 500000 === 0) {
            console.log(`   已扫描 ${totalMovies.toLocaleString()} 条电影数据...`);
        }
    }
    console.log(`   扫描完成: 共 ${totalMovies.toLocaleString()} 条有效电影数据`);
    
    // ========================================
    // 第三步：按年份均匀采样
    // ========================================
    console.log('[3/4] 按年份均匀采样...');
    const years = Object.keys(moviesByYear).map(Number).sort((a, b) => a - b);
    const samplesPerYear = Math.ceil(TARGET_COUNT / years.length);  // 每年平均采样数量
    
    let sampledMovies = [];
    let yearStats = [];  // 记录每年的采样统计
    
    years.forEach(year => {
        const yearMovies = moviesByYear[year];
        // 该年电影数量不足时，全部保留；否则随机采样
        const sampleCount = Math.min(yearMovies.length, samplesPerYear);
        
        // 随机打乱后取前N个
        const shuffled = yearMovies.sort(() => Math.random() - 0.5);
        const sampled = shuffled.slice(0, sampleCount);
        
        sampledMovies = sampledMovies.concat(sampled);
        yearStats.push({
            year: year,
            total: yearMovies.length,
            sampled: sampleCount
        });
    });
    
    // 如果超过目标数量，再次随机截取
    if (sampledMovies.length > TARGET_COUNT) {
        sampledMovies = sampledMovies.sort(() => Math.random() - 0.5).slice(0, TARGET_COUNT);
    }
    
    console.log(`   采样完成: ${sampledMovies.length.toLocaleString()} 条`);
    
    // ========================================
    // 第四步：保存为 JS 文件
    // ========================================
    console.log('[4/4] 保存 JS 文件...');
    
    // 构建输出数据结构
    const outputData = {
        meta: {
            total: sampledMovies.length,
            yearRange: [years[0], years[years.length - 1]],
            generatedAt: new Date().toISOString().split('T')[0],
            source: 'IMDB Non-Commercial Datasets'
        },
        yearStats: yearStats,
        movies: sampledMovies
    };
    
    // 写入 JS 文件，将数据赋值给全局变量 MOVIES_DATA
    const jsContent = 'const MOVIES_DATA = ' + JSON.stringify(outputData) + ';';
    fs.writeFileSync(OUTPUT_FILE, jsContent, 'utf8');
    
    const endTime = Date.now();
    const fileSize = fs.statSync(OUTPUT_FILE).size;
    
    // 输出处理结果统计
    console.log('');
    console.log('=== 处理完成 ===');
    console.log(`输出文件: ${OUTPUT_FILE}`);
    console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`数据条数: ${sampledMovies.length.toLocaleString()} 条`);
    console.log(`年份范围: ${years[0]} - ${years[years.length - 1]}`);
    console.log(`耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
}

// 运行脚本
generateSample().catch(err => {
    console.error('处理失败:', err);
    process.exit(1);
});
