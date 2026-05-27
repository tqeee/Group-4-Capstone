-- ---------------------------------------------------------------------------
-- 1. DATABASE EXTENSIONS & WORKSPACE SETUP
-- ---------------------------------------------------------------------------
 -- It injects cryptographic and hashing functions directly into your database.  
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- For automatic gen_random_uuid()

-- Case-Insensitive Text (Emails for eg. Investor@gmail,com is the same as investor@gmail.com by using this extension
CREATE EXTENSION IF NOT EXISTS "citext";     

CREATE SCHEMA IF NOT EXISTS investor_portal_db;
SET search_path = 'investor_portal_db', public;

-- ---------------------------------------------------------------------------
-- 2. ENUM TYPE REGISTRATIONS (BUSINESS CONSTRAINTS)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('investor', 'operations', 'admin');
CREATE TYPE auth_action_type AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'MFA_CHALLENGE',
    'MFA_VERIFIED',
    'MFA_FAILED',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET_SUCCESS',
    'ACCOUNT_LOCKOUT',
    'INVITATION_SENT',
    'INVITATION_ACCEPTED',
    'SESSION_EXPIRED',
    'ROLE_CHANGED'
);
CREATE TYPE flow_type AS ENUM ('deposit', 'withdrawal');
CREATE TYPE flow_status AS ENUM ('pending', 'approved', 'processed', 'rejected');
CREATE TYPE broker_deal_type AS ENUM ('buy', 'sell', 'balance');
CREATE TYPE broker_entry_direction AS ENUM ('IN', 'OUT');

-- ---------------------------------------------------------------------------
-- 3. FEATURE 3.1  AUTHENTICATION AND ACCOUNT MANAGEMENT
-- ---------------------------------------------------------------------------
CREATE TABLE investor_portal_db.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt / Argon2id hash; never plaintext
    role user_role NOT NULL DEFAULT 'investor',
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- turns true only when invitation is accpeted 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Dataset 5.1 (Active Investor Accounts)
CREATE TABLE investor_portal_db.investors (
    investor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    onboarding_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Invitation‑based investor onboarding (no public self‑registration)
CREATE TABLE investor_portal_db.invitation (
    invitation_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    assigned_role user_role NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT(NOW() + INTERVAL '72 hours')
);
 
CREATE TABLE investor_portal_db.audit_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- if a user account is deleted, this will be set to null
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    action auth_action_type NOT NULL,
    metadata JSONB,
    ip_address TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    
);


-- ---------------------------------------------------------------------------
-- 4. TRANSACTIONAL LEDGERS
-- ---------------------------------------------------------------------------
CREATE TABLE investor_portal_db.funds ( 
    fund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_code VARCHAR(50) NOT NULL UNIQUE,   
    base_currency CHAR(3) NOT NULL DEFAULT 'SGD',
    inception_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Dataset 5.2 (External Fund Flow Submissions)
CREATE TABLE investor_portal_db.fund_flows (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(investor_id) ON DELETE RESTRICT,
    fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
    request_type flow_type NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    processed_date DATE,
    request_amount NUMERIC(18, 4) NOT NULL CHECK (request_amount > 0),
    request_currency    CHAR(3)     NOT NULL
                            CHECK (request_currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dataset 5.4 (Broker Stream Ingestion Layer)
CREATE TABLE investor_portal_db.raw_broker_transactions (
    raw_txn_id BIGSERIAL PRIMARY KEY, 
    fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
    ticket BIGINT NOT NULL UNIQUE,                         -- Broker Ticket Reference ID
    magic_number BIGINT,
    deal_time TIMESTAMPTZ NOT NULL,                       -- Broker timestamp
    deal_type broker_deal_type NOT NULL,                  -- 'buy', 'sell', 'balance'
    entry_direction broker_entry_direction NOT NULL,       -- 'IN' or 'OUT'
    symbol VARCHAR(20),                                   -- E.g., 'XAUUSD'
    volume NUMERIC(12, 4) NOT NULL CHECK (volume >= 0),
    profit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    swap NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,          -- Flag to prevent double processing
    processed_into_date DATE
);

-- ---------------------------------------------------------------------------
-- 5. VALUATION & INVESTOR TRACK RECORDS
-- ---------------------------------------------------------------------------
-- Dataset 5.3 (Fund Daily Net Asset Value Summaries)
CREATE TABLE investor_portal_db.fund_daily_nav (
    nav_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
    nav_date DATE NOT NULL,
    total_assets_open NUMERIC(18, 4) NOT NULL CHECK (total_assets_open >= 0),
    net_pnl NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,        -- Aggregated Day's Net Broker P&L
    shares_outstanding_open NUMERIC(18, 4) NOT NULL CHECK (shares_outstanding_open >= 0),
    nav_per_share_open NUMERIC(18, 6) NOT NULL CHECK (nav_per_share_open > 0),
    net_flow_applied NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- From Processed Deposits/Withdrawals
    total_assets_close NUMERIC(18, 4) NOT NULL CHECK (total_assets_close >= 0),
    nav_per_share_close NUMERIC(18, 6) NOT NULL CHECK (nav_per_share_close > 0),
    CONSTRAINT unique_fund_nav_date UNIQUE (fund_id, nav_date)
);

-- Dataset 5.3 (Individual Investor Share/Balance Records)
CREATE TABLE investor_portal_db.investor_fund_holdings (
    holding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(investor_id) ON DELETE RESTRICT,
    fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE RESTRICT,
    as_of_date DATE NOT NULL,
    shares_held NUMERIC(18, 4) NOT NULL CHECK (shares_held >= 0),
    shareholding_pct NUMERIC(7, 4) NOT NULL CHECK (shareholding_pct >= 0 AND shareholding_pct <= 100.0000),
    dollar_value NUMERIC(18, 4) NOT NULL CHECK (dollar_value >= 0),
    daily_pnl_allocated NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    cumulative_pnl NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    nav_id UUID NOT NULL REFERENCES fund_daily_nav(nav_id) ON DELETE RESTRICT,
    CONSTRAINT unique_investor_holding_date UNIQUE (investor_id, fund_id, as_of_date)
);
