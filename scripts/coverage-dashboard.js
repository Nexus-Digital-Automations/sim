#!/usr/bin/env node

/**
 * Coverage Dashboard Generator
 *
 * Generates comprehensive coverage reports, badges, and trend analysis
 * for the test coverage reporting system. Integrates with CI/CD pipeline
 * to provide real-time coverage visibility and quality monitoring.
 *
 * Features:
 * - Coverage badge generation
 * - Trend analysis over time
 * - Detailed coverage breakdown by module
 * - Quality gate status reporting
 * - Performance metrics tracking
 *
 * Usage:
 *   node scripts/coverage-dashboard.js [--badge] [--trend] [--report]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for coverage dashboard
 */
const CONFIG = {
  coverageDir: path.join(__dirname, "../apps/sim/coverage"),
  outputDir: path.join(__dirname, "../coverage-reports"),
  badgeDir: path.join(__dirname, "../apps/sim/public/badges"),
  thresholds: {
    excellent: 95,
    good: 85,
    acceptable: 80,
    poor: 60,
  },
  colors: {
    excellent: "#4c1",
    good: "#97CA00",
    acceptable: "#dfb317",
    poor: "#fe7d37",
    fail: "#e05d44",
  },
};

/**
 * Logger utility for structured logging
 */
const logger = {
  info: (message, data = {}) =>
    console.log(`ℹ️  ${message}`, Object.keys(data).length ? data : ""),
  success: (message, data = {}) =>
    console.log(`✅ ${message}`, Object.keys(data).length ? data : ""),
  warn: (message, data = {}) =>
    console.log(`⚠️  ${message}`, Object.keys(data).length ? data : ""),
  error: (message, data = {}) =>
    console.error(`❌ ${message}`, Object.keys(data).length ? data : ""),
  debug: (message, data = {}) =>
    process.env.DEBUG &&
    console.log(`🔍 ${message}`, Object.keys(data).length ? data : ""),
};

/**
 * Parse coverage data from JSON file
 * @param {string} coverageFile - Path to coverage-final.json
 * @returns {Object} Parsed coverage metrics
 */
function parseCoverageData(coverageFile) {
  logger.info("Parsing coverage data", { file: coverageFile });

  try {
    if (!fs.existsSync(coverageFile)) {
      logger.warn("Coverage file not found", { file: coverageFile });
      return null;
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageFile, "utf8"));

    let totalLines = 0,
      coveredLines = 0;
    let totalFunctions = 0,
      coveredFunctions = 0;
    let totalStatements = 0,
      coveredStatements = 0;
    let totalBranches = 0,
      coveredBranches = 0;

    // Detailed file-by-file analysis
    const fileMetrics = {};

    Object.entries(coverageData).forEach(([filePath, fileData]) => {
      const lines = Object.keys(fileData.l || {}).length;
      const linesCovered = Object.values(fileData.l || {}).filter(
        (x) => x > 0,
      ).length;
      const functions = Object.keys(fileData.f || {}).length;
      const functionsCovered = Object.values(fileData.f || {}).filter(
        (x) => x > 0,
      ).length;
      const statements = Object.keys(fileData.s || {}).length;
      const statementsCovered = Object.values(fileData.s || {}).filter(
        (x) => x > 0,
      ).length;
      const branches = Object.keys(fileData.b || {}).length * 2;
      const branchData = Object.values(fileData.b || {});
      const branchesCovered = branchData.reduce(
        (acc, branch) => acc + branch.filter((x) => x > 0).length,
        0,
      );

      // Aggregate totals
      totalLines += lines;
      coveredLines += linesCovered;
      totalFunctions += functions;
      coveredFunctions += functionsCovered;
      totalStatements += statements;
      coveredStatements += statementsCovered;
      totalBranches += branches;
      coveredBranches += branchesCovered;

      // Store file-specific metrics
      fileMetrics[filePath] = {
        lines: {
          total: lines,
          covered: linesCovered,
          percentage: lines
            ? ((linesCovered / lines) * 100).toFixed(2)
            : "0.00",
        },
        functions: {
          total: functions,
          covered: functionsCovered,
          percentage: functions
            ? ((functionsCovered / functions) * 100).toFixed(2)
            : "0.00",
        },
        statements: {
          total: statements,
          covered: statementsCovered,
          percentage: statements
            ? ((statementsCovered / statements) * 100).toFixed(2)
            : "0.00",
        },
        branches: {
          total: branches,
          covered: branchesCovered,
          percentage: branches
            ? ((branchesCovered / branches) * 100).toFixed(2)
            : "0.00",
        },
      };
    });

    // Calculate overall percentages
    const metrics = {
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines
          ? ((coveredLines / totalLines) * 100).toFixed(2)
          : "0.00",
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions
          ? ((coveredFunctions / totalFunctions) * 100).toFixed(2)
          : "0.00",
      },
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements
          ? ((coveredStatements / totalStatements) * 100).toFixed(2)
          : "0.00",
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches
          ? ((coveredBranches / totalBranches) * 100).toFixed(2)
          : "0.00",
      },
    };

    // Calculate overall coverage (average of all metrics)
    const overallPercentage = (
      (parseFloat(metrics.lines.percentage) +
        parseFloat(metrics.functions.percentage) +
        parseFloat(metrics.statements.percentage) +
        parseFloat(metrics.branches.percentage)) /
      4
    ).toFixed(2);

    logger.success("Coverage data parsed successfully", {
      overall: `${overallPercentage}%`,
      files: Object.keys(fileMetrics).length,
    });

    return {
      overall: overallPercentage,
      metrics,
      fileMetrics,
      timestamp: new Date().toISOString(),
      filesAnalyzed: Object.keys(fileMetrics).length,
    };
  } catch (error) {
    logger.error("Error parsing coverage data", { error: error.message });
    return null;
  }
}

/**
 * Generate coverage badge SVG
 * @param {number} coverage - Coverage percentage
 * @returns {string} SVG badge content
 */
function generateCoverageBadge(coverage) {
  logger.info("Generating coverage badge", { coverage: `${coverage}%` });

  const coverageNum = parseFloat(coverage);
  let color = CONFIG.colors.fail;
  let status = "poor";

  if (coverageNum >= CONFIG.thresholds.excellent) {
    color = CONFIG.colors.excellent;
    status = "excellent";
  } else if (coverageNum >= CONFIG.thresholds.good) {
    color = CONFIG.colors.good;
    status = "good";
  } else if (coverageNum >= CONFIG.thresholds.acceptable) {
    color = CONFIG.colors.acceptable;
    status = "acceptable";
  } else if (coverageNum >= CONFIG.thresholds.poor) {
    color = CONFIG.colors.poor;
    status = "poor";
  }

  const badgeText = `${coverage}%`;
  const textWidth = badgeText.length * 7 + 10; // Approximate text width
  const totalWidth = 63 + textWidth; // Label width + text width

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="a">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#a)">
      <path fill="#555" d="M0 0h63v20H0z"/>
      <path fill="${color}" d="M63 0h${textWidth}v20H63z"/>
      <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
      <text x="315" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
      <text x="315" y="140" transform="scale(.1)" textLength="530">coverage</text>
      <text x="${630 + textWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth * 10 - 100}">${badgeText}</text>
      <text x="${630 + textWidth * 5}" y="140" transform="scale(.1)" textLength="${textWidth * 10 - 100}">${badgeText}</text>
    </g>
  </svg>`;

  logger.success("Coverage badge generated", { status, color });
  return svg;
}

/**
 * Generate comprehensive HTML coverage report
 * @param {Object} coverageData - Parsed coverage data
 * @returns {string} HTML report content
 */
function generateHtmlReport(coverageData) {
  logger.info("Generating HTML coverage report");

  if (!coverageData) {
    return "<html><body><h1>Coverage Report</h1><p>No coverage data available</p></body></html>";
  }

  const { overall, metrics, fileMetrics, timestamp, filesAnalyzed } =
    coverageData;
  const qualityGate = parseFloat(overall) >= 80 ? "PASSED" : "FAILED";
  const qualityGateClass = parseFloat(overall) >= 80 ? "success" : "failure";

  // Generate file breakdown table
  const fileRows = Object.entries(fileMetrics)
    .sort(
      ([, a], [, b]) =>
        parseFloat(a.lines.percentage) - parseFloat(b.lines.percentage),
    )
    .map(([filePath, data]) => {
      const overallFile = (
        (parseFloat(data.lines.percentage) +
          parseFloat(data.functions.percentage) +
          parseFloat(data.statements.percentage) +
          parseFloat(data.branches.percentage)) /
        4
      ).toFixed(2);
      const statusClass =
        parseFloat(overallFile) >= 80
          ? "good"
          : parseFloat(overallFile) >= 60
            ? "medium"
            : "poor";

      return `
        <tr class="${statusClass}">
          <td><code>${filePath.replace(process.cwd(), "")}</code></td>
          <td>${data.lines.percentage}%</td>
          <td>${data.functions.percentage}%</td>
          <td>${data.statements.percentage}%</td>
          <td>${data.branches.percentage}%</td>
          <td><strong>${overallFile}%</strong></td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #eee; 
        }
        .quality-gate { 
            font-size: 1.5em; 
            font-weight: bold; 
            padding: 15px 25px; 
            border-radius: 6px; 
            margin: 20px 0; 
        }
        .success { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb; 
        }
        .failure { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb; 
        }
        .metrics { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 30px 0; 
        }
        .metric-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 6px; 
            text-align: center; 
            border-left: 4px solid #007bff; 
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #007bff; 
        }
        .metric-label { 
            color: #6c757d; 
            font-size: 0.9em; 
            margin-top: 5px; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600; 
        }
        .good { background: rgba(40, 167, 69, 0.1); }
        .medium { background: rgba(255, 193, 7, 0.1); }
        .poor { background: rgba(220, 53, 69, 0.1); }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            color: #6c757d; 
            text-align: center; 
            font-size: 0.9em; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Test Coverage Report</h1>
            <p>Generated on: ${new Date(timestamp).toLocaleString()}</p>
            <p>Files analyzed: ${filesAnalyzed}</p>
        </div>

        <div class="quality-gate ${qualityGateClass}">
            Quality Gate: ${qualityGate} (${overall}% coverage)
            <br>
            <small>Minimum threshold: 80%</small>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${metrics.lines.percentage}%</div>
                <div class="metric-label">Lines Coverage</div>
                <div class="metric-label">${metrics.lines.covered}/${metrics.lines.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.functions.percentage}%</div>
                <div class="metric-label">Functions Coverage</div>
                <div class="metric-label">${metrics.functions.covered}/${metrics.functions.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.statements.percentage}%</div>
                <div class="metric-label">Statements Coverage</div>
                <div class="metric-label">${metrics.statements.covered}/${metrics.statements.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.branches.percentage}%</div>
                <div class="metric-label">Branches Coverage</div>
                <div class="metric-label">${metrics.branches.covered}/${metrics.branches.total}</div>
            </div>
        </div>

        <h2>📁 File Coverage Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Lines</th>
                    <th>Functions</th>
                    <th>Statements</th>
                    <th>Branches</th>
                    <th>Overall</th>
                </tr>
            </thead>
            <tbody>
                ${fileRows}
            </tbody>
        </table>

        <div class="footer">
            <p>🚀 Generated by Sim Coverage Dashboard | ⚡ Powered by Vitest</p>
            <p><strong>Quality Standards:</strong> Excellent (95%+) | Good (85%+) | Acceptable (80%+) | Poor (60%+)</p>
        </div>
    </div>
</body>
</html>`;

  logger.success("HTML report generated");
  return html;
}

/**
 * Save coverage trend data for historical analysis
 * @param {Object} coverageData - Current coverage data
 */
function saveCoverageTrend(coverageData) {
  logger.info("Saving coverage trend data");

  try {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const trendFile = path.join(CONFIG.outputDir, "coverage-trend.json");
    let trendData = [];

    // Load existing trend data
    if (fs.existsSync(trendFile)) {
      trendData = JSON.parse(fs.readFileSync(trendFile, "utf8"));
    }

    // Add current data point
    trendData.push({
      timestamp: coverageData.timestamp,
      overall: parseFloat(coverageData.overall),
      lines: parseFloat(coverageData.metrics.lines.percentage),
      functions: parseFloat(coverageData.metrics.functions.percentage),
      statements: parseFloat(coverageData.metrics.statements.percentage),
      branches: parseFloat(coverageData.metrics.branches.percentage),
      filesAnalyzed: coverageData.filesAnalyzed,
    });

    // Keep only last 100 data points
    if (trendData.length > 100) {
      trendData = trendData.slice(-100);
    }

    fs.writeFileSync(trendFile, JSON.stringify(trendData, null, 2));
    logger.success("Coverage trend data saved", {
      dataPoints: trendData.length,
    });
  } catch (error) {
    logger.error("Error saving coverage trend", { error: error.message });
  }
}

/**
 * Main execution function
 */
async function main() {
  logger.info("🚀 Starting Coverage Dashboard Generator");

  const args = process.argv.slice(2);
  const generateBadge = args.includes("--badge");
  const analyzeTrend = args.includes("--trend");
  const generateReport = args.includes("--report") || args.length === 0;

  // Parse coverage data
  const coverageFile = path.join(CONFIG.coverageDir, "coverage-final.json");
  const coverageData = parseCoverageData(coverageFile);

  if (!coverageData) {
    logger.error("❌ Cannot proceed without coverage data");
    process.exit(1);
  }

  // Ensure output directories exist
  [CONFIG.outputDir, CONFIG.badgeDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.debug("Created directory", { dir });
    }
  });

  // Generate coverage badge
  if (generateBadge) {
    logger.info("📛 Generating coverage badge...");
    const badgeSvg = generateCoverageBadge(coverageData.overall);
    const badgePath = path.join(CONFIG.badgeDir, "coverage.svg");
    fs.writeFileSync(badgePath, badgeSvg);
    logger.success("Coverage badge saved", { path: badgePath });
  }

  // Generate HTML report
  if (generateReport) {
    logger.info("📄 Generating HTML coverage report...");
    const htmlReport = generateHtmlReport(coverageData);
    const reportPath = path.join(CONFIG.outputDir, "coverage-report.html");
    fs.writeFileSync(reportPath, htmlReport);
    logger.success("HTML report saved", { path: reportPath });
  }

  // Analyze coverage trends
  if (analyzeTrend) {
    logger.info("📈 Analyzing coverage trends...");
    saveCoverageTrend(coverageData);
  }

  // Output summary
  logger.success("✨ Coverage dashboard generation completed", {
    overall: `${coverageData.overall}%`,
    qualityGate: parseFloat(coverageData.overall) >= 80 ? "PASSED" : "FAILED",
    filesAnalyzed: coverageData.filesAnalyzed,
  });

  // Exit with appropriate code for CI/CD
  const exitCode = parseFloat(coverageData.overall) >= 80 ? 0 : 1;
  process.exit(exitCode);
}

// Run the dashboard generator
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('coverage-dashboard.js')) {
  main().catch((error) => {
    logger.error("Fatal error in coverage dashboard", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

export {
  parseCoverageData,
  generateCoverageBadge,
  generateHtmlReport,
  saveCoverageTrend,
};
