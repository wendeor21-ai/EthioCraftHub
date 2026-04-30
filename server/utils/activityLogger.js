const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const AUDIT_LOG_FILE = path.join(__dirname, '..', 'data', 'audit-logs.json');
const MAX_LOG_ENTRIES = 5000;

/**
 * Logs an activity to the audit-logs.json file
 * @param {Object} activityData - The activity data to log
 * @param {string} activityData.userId - The user ID performing the action
 * @param {string} activityData.action - The action type (product_created, product_updated, order_received, order_status_changed)
 * @param {Object} activityData.details - Activity-specific metadata
 * @param {string} [activityData.message] - Optional human-readable description
 * @returns {Promise<void>}
 */
async function logActivity(activityData) {
  try {
    // Validate required fields
    if (!activityData.userId || !activityData.action) {
      console.warn('[Activity Logger] Missing required fields:', {
        userId: !!activityData.userId,
        action: !!activityData.action
      });
      return;
    }

    // Create log entry with unique ID and timestamp
    const logEntry = {
      id: uuidv4(),
      userId: activityData.userId,
      action: activityData.action,
      details: activityData.details || {},
      message: activityData.message || '',
      createdAt: new Date().toISOString()
    };

    // Read existing logs or initialize empty array
    let logs = [];
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        const fileContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
        logs = JSON.parse(fileContent);
      }
    } catch (readError) {
      if (readError instanceof SyntaxError) {
        console.error('[Activity Logger] Corrupted audit-logs.json file, reinitializing:', readError.message);
        logs = [];
      } else if (readError.code !== 'ENOENT') {
        console.error('[Activity Logger] Error reading audit-logs.json:', readError.message);
        logs = [];
      }
    }

    // Prepend new entry to beginning of array
    logs.unshift(logEntry);

    // Trim to MAX_LOG_ENTRIES if exceeded
    if (logs.length > MAX_LOG_ENTRIES) {
      logs = logs.slice(0, MAX_LOG_ENTRIES);
    }

    // Ensure directory exists
    const logDir = path.dirname(AUDIT_LOG_FILE);
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (dirError) {
      console.error('[Activity Logger] Failed to create directory:', dirError.message);
      return;
    }

    // Write logs back to file
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    // Log error but don't throw - logging failures should not break main application flow
    console.error('[Activity Logger] Failed to log activity:', error.message);
  }
}

module.exports = { logActivity };
