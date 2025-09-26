// Node.js entry point for the parlant-server package
// This file exports the TypeScript/JavaScript modules that can be used by Next.js

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    // Return empty object if module doesn't exist
    return {};
  }
}

// Export all the TypeScript/JavaScript modules
module.exports = {
  // Health monitoring modules
  health: safeRequire('./health'),
  monitoring: safeRequire('./monitoring'),

  // Logging and error handling
  logging: safeRequire('./logging'),
  errorTracking: safeRequire('./error-tracking'),
  errorIntelligence: safeRequire('./error-intelligence'),
  errorTaxonomy: safeRequire('./error-taxonomy'),
  errorExplanations: safeRequire('./error-explanations'),
  errorHandler: safeRequire('./error-handler'),
  errorRecovery: safeRequire('./error-recovery'),
  errorAnalytics: safeRequire('./error-analytics'),

  // Integration health
  integrationHealth: safeRequire('./integration-health'),

  // Quick health check function
  quickHealthCheck: safeRequire('./quick-health-check'),

  // Note: The Python server.py is not exported as it's meant to be run separately
  // Use the npm scripts to start the Python server: npm run start or npm run dev
};