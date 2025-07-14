-- Create tables for the Acue Store application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE
);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    developer VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    description TEXT,
    icon VARCHAR(255),
    download_url TEXT NOT NULL,
    is_hot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App badges table
CREATE TABLE IF NOT EXISTS app_badges (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(255) NOT NULL,
    badge_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    UNIQUE(app_id, badge_type)
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin config
INSERT INTO admin_settings (setting_key, setting_value) VALUES 
('admin_user', 'AlzzTech'),
('primary_pin', '291210'),
('security_pin', '505'),
('security_question', 'Addy 7?'),
('security_answer', '613 Cranbrook Road')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_hot ON apps(is_hot);
CREATE INDEX IF NOT EXISTS idx_app_badges_app_id ON app_badges(app_id);