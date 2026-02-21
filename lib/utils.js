'use strict';

const fs = require('fs').promises;

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes} menit ${secs} detik` : `${secs} detik`;
}

function initStats() {
    return {
        total: 0,
        success: 0,
        failed: 0,
        alreadyCounted: 0,
        proxyErrors: 0,
    };
}

function aggregateStats(videoStats) {
    return Object.values(videoStats).reduce(
        (acc, stats) => ({
            success: acc.success + stats.success,
            failed: acc.failed + stats.failed,
            proxyErrors: acc.proxyErrors + stats.proxyErrors,
            alreadyCounted: acc.alreadyCounted + stats.alreadyCounted,
        }),
        { success: 0, failed: 0, proxyErrors: 0, alreadyCounted: 0 }
    );
}

async function loadIds(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
}

module.exports = {
    formatDuration,
    initStats,
    aggregateStats,
    loadIds,
};