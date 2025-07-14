const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, hashedPassword, email || `${username}@acuestore.com`]
    );
    
    res.json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Get user
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if banned
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at, is_banned FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ban/unban user
app.put('/api/admin/users/:username/ban', async (req, res) => {
  try {
    const { username } = req.params;
    const { banned } = req.body;
    
    await pool.query('UPDATE users SET is_banned = $1 WHERE username = $2', [banned, username]);
    res.json({ message: `User ${username} has been ${banned ? 'banned' : 'unbanned'}` });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all apps
app.get('/api/apps', async (req, res) => {
  try {
    const appsResult = await pool.query(`
      SELECT a.*, 
             COALESCE(json_agg(
               CASE WHEN ab.badge_type IS NOT NULL 
                    THEN ab.badge_type 
                    ELSE NULL 
               END
             ) FILTER (WHERE ab.badge_type IS NOT NULL), '[]') as badges
      FROM apps a
      LEFT JOIN app_badges ab ON a.id = ab.app_id
      GROUP BY a.id
      ORDER BY a.name
    `);
    
    res.json(appsResult.rows);
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new app
app.post('/api/admin/apps', async (req, res) => {
  try {
    const { id, name, developer, category, rating, description, icon, download_url, is_hot } = req.body;
    
    const result = await pool.query(
      'INSERT INTO apps (id, name, developer, category, rating, description, icon, download_url, is_hot) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [id, name, developer, category, rating, description, icon, download_url, is_hot]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add app error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update app
app.put('/api/admin/apps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, developer, category, rating, description, icon, download_url, is_hot } = req.body;
    
    const result = await pool.query(
      'UPDATE apps SET name = $2, developer = $3, category = $4, rating = $5, description = $6, icon = $7, download_url = $8, is_hot = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, name, developer, category, rating, description, icon, download_url, is_hot]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete app
app.delete('/api/admin/apps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM apps WHERE id = $1', [id]);
    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add badge to app
app.post('/api/admin/apps/:id/badges', async (req, res) => {
  try {
    const { id } = req.params;
    const { badge_type } = req.body;
    
    await pool.query(
      'INSERT INTO app_badges (app_id, badge_type) VALUES ($1, $2) ON CONFLICT (app_id, badge_type) DO NOTHING',
      [id, badge_type]
    );
    
    res.json({ message: 'Badge added successfully' });
  } catch (error) {
    console.error('Add badge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove badge from app
app.delete('/api/admin/apps/:id/badges/:badgeType', async (req, res) => {
  try {
    const { id, badgeType } = req.params;
    await pool.query('DELETE FROM app_badges WHERE app_id = $1 AND badge_type = $2', [id, badgeType]);
    res.json({ message: 'Badge removed successfully' });
  } catch (error) {
    console.error('Remove badge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get admin settings
app.get('/api/admin/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM admin_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Force reload apps from config
app.post('/api/admin/reload-apps', async (req, res) => {
  try {
    // Clear all existing apps and badges
    await pool.query('DELETE FROM app_badges');
    await pool.query('DELETE FROM apps');
    
    // Force reinitialize
    await initializeApps(true);
    
    res.json({ message: 'Apps reloaded from config successfully' });
  } catch (error) {
    console.error('Reload apps error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public endpoint to reload apps (for development)
app.get('/api/reload-apps', async (req, res) => {
  try {
    // Clear all existing apps and badges
    await pool.query('DELETE FROM app_badges');
    await pool.query('DELETE FROM apps');
    
    // Force reinitialize
    await initializeApps(true);
    
    res.json({ message: 'Apps reloaded from config successfully' });
  } catch (error) {
    console.error('Reload apps error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize database with apps from config
async function initializeApps(forceReload = false) {
  try {
    // Check if apps table is empty or force reload
    const countResult = await pool.query('SELECT COUNT(*) FROM apps');
    const appCount = parseInt(countResult.rows[0].count);
    
    if (appCount === 0 || forceReload) {
      console.log(forceReload ? 'Force reloading apps from config...' : 'Apps table is empty, populating with default apps...');
      
      // Clear require cache to ensure fresh data
      delete require.cache[require.resolve('./apps-config.js')];
      
      // Import apps data directly
      const configModule = require('./apps-config.js');
      const appsData = global.appsData || [];
      
      if (appsData && appsData.length > 0) {
        // Insert each app into the database
        for (const app of appsData) {
          await pool.query(
            'INSERT INTO apps (id, name, developer, category, rating, description, icon, download_url, is_hot) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET name = $2, developer = $3, category = $4, rating = $5, description = $6, icon = $7, download_url = $8, is_hot = $9',
            [app.id, app.name, app.developer, app.category, app.rating, app.description, app.icon, app.downloadUrl, app.isHot || false]
          );
          
          // Clear existing badges for this app
          await pool.query('DELETE FROM app_badges WHERE app_id = $1', [app.id]);
          
          // Insert badges if they exist
          if (app.badges && app.badges.length > 0) {
            for (const badge of app.badges) {
              await pool.query(
                'INSERT INTO app_badges (app_id, badge_type) VALUES ($1, $2) ON CONFLICT (app_id, badge_type) DO NOTHING',
                [app.id, badge]
              );
            }
          }
        }
        
        console.log(`${forceReload ? 'Reloaded' : 'Populated'} database with ${appsData.length} apps`);
      } else {
        console.log('No apps data found in config file');
      }
    } else {
      console.log(`Database already has ${appCount} apps`);
    }
  } catch (error) {
    console.error('Error initializing apps:', error);
  }
}

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`Server running on port ${port}`);
  await initializeApps();
});