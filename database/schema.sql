-- Idea Verify 数据库 Schema
-- 用于存储从 Reddit, GitHub, Twitter 收集的用户需求数据

-- 创建数据库
CREATE DATABASE idea_verify;

\c idea_verify;

-- ============================================================================
-- 核心数据表：存储收集到的需求数据
-- ============================================================================
CREATE TABLE IF NOT EXISTS demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,                    -- 需求内容
    platform VARCHAR(20) NOT NULL,           -- 来源平台: reddit, github, twitter
    source_url TEXT NOT NULL,                -- 原始链接
    author VARCHAR(255),                      -- 作者
    author_url TEXT,                         -- 作者主页链接
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- 发布时间
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 收集时间

    -- 互动数据
    upvotes INTEGER DEFAULT 0,               -- 点赞数/支持数
    comments INTEGER DEFAULT 0,               -- 评论数
    shares INTEGER DEFAULT 0,                 -- 分享数/转发数
    interaction_score INTEGER DEFAULT 0,      -- 综合互动分数

    -- 内容分析
    sentiment VARCHAR(20) DEFAULT 'neutral', -- 情感: positive, negative, neutral
    sentiment_score NUMERIC(5,4),             -- 情感分数 (0-1)

    -- 分类信息
    tags TEXT[],                             -- 标签数组
    product_mentioned TEXT[],                -- 提及的产品名称
    category VARCHAR(100),                   -- 主要分类: feature-request, bug-report, complaint, praise, discussion

    -- 语言检测
    language VARCHAR(10) DEFAULT 'en',      -- 语言代码

    -- 元数据
    title TEXT,                              -- 标题（仅部分平台）
    subreddit VARCHAR(100),                  -- Reddit 子版块
    repository VARCHAR(255),                 -- GitHub 仓库
    issue_number INTEGER,                    -- GitHub issue 编号

    -- 状态
    is_processed BOOLEAN DEFAULT FALSE,      -- 是否已处理
    is_deleted BOOLEAN DEFAULT FALSE,        -- 是否已删除

    -- 创建和更新时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 索引定义
-- ============================================================================

-- 平台索引
CREATE INDEX idx_demands_platform ON demands(platform);

-- 时间索引（用于时间范围筛选）
CREATE INDEX idx_demands_timestamp ON demands(timestamp DESC);

-- 情感分析索引
CREATE INDEX idx_demands_sentiment ON demands(sentiment);

-- 分类索引
CREATE INDEX idx_demands_category ON demands(category);

-- 标签索引（GIN索引用于数组类型）
CREATE INDEX idx_demands_tags ON demands USING GIN(tags);

-- 全文搜索索引（用于内容搜索）
CREATE INDEX idx_demands_content_fts ON demands USING GIN(to_tsvector('english', content));

-- 产品提及索引
CREATE INDEX idx_demands_product ON demands USING GIN(product_mentioned);

-- 互动分数索引（用于热门排序）
CREATE INDEX idx_demands_interaction_score ON demands(interaction_score DESC);

-- 复合索引（平台 + 时间 + 情感）
CREATE INDEX idx_demands_platform_time_sentiment ON demands(platform, timestamp DESC, sentiment);

-- ============================================================================
-- 热门趋势表（用于存储聚合数据）
-- ============================================================================
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(255) NOT NULL,             -- 话题关键词
    platform VARCHAR(20) NOT NULL,           -- 平台
    mention_count INTEGER DEFAULT 0,         -- 提及次数
    interaction_total INTEGER DEFAULT 0,     -- 总互动数
    sentiment_avg NUMERIC(5,4),             -- 平均情感分数

    -- 时间维度
    date DATE NOT NULL,                      -- 统计日期
    period VARCHAR(20) DEFAULT 'day',       -- 统计周期: day, week, month

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(topic, platform, date, period)
);

CREATE INDEX idx_trending_topics_date ON trending_topics(date DESC);
CREATE INDEX idx_trending_topics_platform ON trending_topics(platform);

-- ============================================================================
-- 用户收藏表
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,          -- 用户ID（简化版，实际项目中应使用UUID或认证系统）
    demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,

    -- 自定义信息
    custom_notes TEXT,                      -- 用户笔记
    custom_tags TEXT[],                     -- 用户自定义标签
    custom_category VARCHAR(100),           -- 用户自定义分类

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, demand_id)
);

CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX idx_bookmarks_demand ON user_bookmarks(demand_id);

-- ============================================================================
-- 搜索历史表（用于统计热门搜索）
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,                    -- 搜索查询
    user_id VARCHAR(255),                   -- 用户ID（可为空，表示匿名搜索）
    filters JSONB,                          -- 筛选条件（JSON格式）

    -- 统计信息
    result_count INTEGER,                   -- 返回结果数量
    has_results BOOLEAN DEFAULT TRUE,       -- 是否有结果

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_created ON search_history(created_at DESC);

-- ============================================================================
-- 触发器：自动更新 updated_at 字段
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间戳的表创建触发器
CREATE TRIGGER update_demands_updated_at BEFORE UPDATE ON demands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trending_topics_updated_at BEFORE UPDATE ON trending_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bookmarks_updated_at BEFORE UPDATE ON user_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 视图：搜索结果优化视图
-- ============================================================================
CREATE OR REPLACE VIEW search_results_view AS
SELECT
    id,
    content,
    title,
    platform,
    source_url,
    author,
    author_url,
    timestamp,
    upvotes,
    comments,
    shares,
    interaction_score,
    sentiment,
    sentiment_score,
    tags,
    product_mentioned,
    category,
    language
FROM demands
WHERE is_deleted = FALSE;

-- ============================================================================
-- 视图：热门需求视图（按互动分数排序）
-- ============================================================================
CREATE OR REPLACE VIEW popular_demands_view AS
SELECT
    d.*,
    ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', d.content)) as relevance_score
FROM demands d
WHERE d.is_deleted = FALSE AND d.interaction_score > 0
ORDER BY d.interaction_score DESC, d.timestamp DESC
LIMIT 100;

-- ============================================================================
-- 初始化数据：示例分类标签
-- ============================================================================
-- 这些数据可以用作下拉选项的初始化数据
COMMENT ON TABLE demands IS '存储从各平台收集的用户需求数据';
COMMENT ON COLUMN demands.sentiment IS 'positive: 积极评价/赞美, negative: 消极评价/抱怨, neutral: 中性/客观讨论';
COMMENT ON COLUMN demands.category IS 'feature-request: 功能请求, bug-report: 错误报告, complaint: 抱怨, praise: 赞美, discussion: 一般讨论';
COMMENT ON COLUMN demands.interaction_score IS '综合互动分数 = upvotes * 1 + comments * 2 + shares * 3';

-- ============================================================================
-- 有用的查询示例
-- ============================================================================

-- 查找特定产品的功能请求
-- SELECT * FROM demands WHERE 'Notion' = ANY(product_mentioned) AND category = 'feature-request' ORDER BY upvotes DESC;

-- 全文搜索示例
-- SELECT * FROM demands WHERE to_tsvector('english', content) @@ to_tsquery('english', 'offline & mode');

-- 按时间范围和情感筛选
-- SELECT * FROM demands WHERE timestamp >= NOW() - INTERVAL '30 days' AND sentiment = 'negative';

-- 获取热门话题
-- SELECT topic, SUM(mention_count) as total_mentions FROM trending_topics GROUP BY topic ORDER BY total_mentions DESC LIMIT 10;

-- ============================================================================
-- 数据库版本信息
-- ============================================================================
-- Schema Version: 1.0
-- Last Updated: 2025-01-18
-- Compatible With: PostgreSQL 14+
