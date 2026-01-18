"""
Reddit数据收集器
使用PRAW库从Reddit收集与功能需求、痛点相关的讨论
"""

import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import praw
from prawcore.exceptions import ResponseException
from vaderSentiment import SentimentIntensityAnalyzer
from app.config import settings


class RedditCollector:
    """
    Reddit数据收集器
    收集特定subreddit中的功能请求、抱怨帖
    """

    def __init__(self):
        """初始化Reddit客户端"""
        self.reddit = praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
        )
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

        # 需求相关的subreddit列表
        self.subreddits = [
            "webdev", "webdevtools", "SaaS",
            "UIUC", "technology", "Productivity",
            "selfhosted", "sysadmin", "Programming",
            "devops", "learnprogramming", "coding",
            "software", "softwaredevelopment", "startups",
            "entrepreneur", "entrepreneurship",
            "ProductHunt", "SideProject", "IndieHackers",
            "apps", "ios", "android", "webapp",
            "webdesign", "design", "UXDesign",
            "privacy", "security", "privacytools"
        ]

        # 需求相关的关键词模式
        self.request_keywords = [
            "feature request", "missing", "need", "should have", "wish",
            "want", "why no", "does anyone have", "looking for", "suggestion",
            "implement", "add feature", "support", "integrate"
        ]

        self.complaint_keywords = [
            "hate", "frustrating", "annoying", "useless", "broken",
            "sucks", "terrible", "worst", "slow", "lag",
            "bug", "crash", "error", "fail", "problem"
        ]

    async def collect(
        self,
        query: Optional[str] = None,
        subreddit: Optional[str] = None,
        time_filter: str = "month",
        limit: int = 50
    ) -> List[Dict]:
        """
        收集Reddit数据

        Args:
            query: 搜索关键词
            subreddit: 指定subreddit（可选）
            time_filter: 时间筛选 (hour, day, week, month, year, all)
            limit: 返回结果数量

        Returns:
            收集到的帖子数据列表
        """
        results = []

        try:
            # 如果指定了subreddit，只从该subreddit收集
            if subreddit:
                results.extend(await self._collect_from_subreddit(
                    subreddit, query, time_filter, limit
                ))
            # 如果指定了查询，使用搜索功能
            elif query:
                results.extend(await self._search_reddit(
                    query, time_filter, limit
                ))
            # 否则，从热门subreddit收集
            else:
                for sub in self.subreddits[:5]:  # 限制subreddit数量
                    sub_results = await self._collect_from_subreddit(
                        sub, query, time_filter, limit // 5
                    )
                    results.extend(sub_results)

            return results

        except ResponseException as e:
            print(f"Reddit API 错误: {e}")
            return []
        except Exception as e:
            print(f"收集Reddit数据时出错: {e}")
            return []

    async def _collect_from_subreddit(
        self,
        subreddit: str,
        query: Optional[str],
        time_filter: str,
        limit: int
    ) -> List[Dict]:
        """
        从单个subreddit收集数据
        """
        results = []
        sub = self.reddit.subreddit(subreddit)

        try:
            # 获取热门或新帖子
            if query:
                # 搜索特定关键词
                for submission in sub.search(query, time_filter=time_filter, limit=limit):
                    data = self._parse_submission(submission, subreddit)
                    if data:
                        results.append(data)
            else:
                # 获取新帖子
                for submission in sub.new(limit=limit):
                    data = self._parse_submission(submission, subreddit)
                    if data:
                        results.append(data)

        except Exception as e:
            print(f"从 r/{subreddit} 收集数据时出错: {e}")

        return results

    async def _search_reddit(
        self,
        query: str,
        time_filter: str,
        limit: int
    ) -> List[Dict]:
        """
        使用Reddit搜索功能
        """
        results = []

        try:
            for submission in self.reddit.subreddit("all").search(
                query,
                time_filter=time_filter,
                sort="relevance",
                limit=limit
            ):
                data = self._parse_submission(submission)
                if data:
                    results.append(data)

        except Exception as e:
            print(f"搜索Reddit时出错: {e}")

        return results

    def _parse_submission(self, submission, subreddit: Optional[str] = None) -> Optional[Dict]:
        """
        解析Reddit提交数据

        Args:
            submission: PRAW submission对象
            subreddit: subreddit名称（如果已知）

        Returns:
            解析后的数据字典
        """
        try:
            # 获取完整内容
            content = submission.selftext if submission.selftext else submission.title

            # 检查是否与需求相关
            category = self._categorize_post(content, submission.title)

            # 如果不是需求相关，跳过
            if not category:
                return None

            # 进行情感分析
            full_text = f"{submission.title} {content}"
            sentiment, sentiment_score = self._analyze_sentiment(full_text)

            # 提取产品提及
            products = self._extract_product_mentions(full_text)

            # 提取标签
            tags = self._extract_tags(content, submission.title, category)

            # 计算互动分数
            interaction_score = (
                submission.upvote_ratio * submission.score +
                submission.num_comments * 2
            )

            return {
                "content": content,
                "title": submission.title,
                "platform": "reddit",
                "source_url": f"https://reddit.com{submission.permalink}",
                "author": str(submission.author) if submission.author else "[deleted]",
                "author_url": f"https://reddit.com/user/{submission.author}" if submission.author else None,
                "timestamp": datetime.fromtimestamp(submission.created_utc),
                "upvotes": submission.score,
                "comments": submission.num_comments,
                "shares": 0,
                "interaction_score": int(interaction_score),
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "tags": tags,
                "product_mentioned": products,
                "category": category,
                "subreddit": subreddit or str(submission.subreddit),
                "language": "en"  # 简化处理，默认英语
            }

        except Exception as e:
            print(f"解析Reddit帖子时出错: {e}")
            return None

    def _categorize_post(self, content: str, title: str) -> Optional[str]:
        """
        对帖子进行分类

        Returns:
            category 分类: feature-request, bug-report, complaint, praise, discussion, None
        """
        full_text = f"{title} {content}".lower()

        # 检查是否是功能请求
        if any(kw in full_text for kw in self.request_keywords):
            return "feature-request"

        # 检查是否是抱怨
        if any(kw in full_text for kw in self.complaint_keywords):
            return "complaint"

        # 检查是否是bug报告
        bug_keywords = ["bug", "crash", "error", "doesn't work", "not working", "glitch"]
        if any(kw in full_text for kw in bug_keywords):
            return "bug-report"

        # 检查是否是赞美
        praise_keywords = ["love", "great", "amazing", "awesome", "perfect", "best", "thanks"]
        if any(kw in full_text for kw in praise_keywords):
            return "praise"

        # 检查是否是一般讨论
        discussion_keywords = ["how", "what", "why", "anyone", "experience", "opinion"]
        if any(kw in full_text for kw in discussion_keywords):
            return "discussion"

        # 如果没有匹配，返回None（不存储）
        return None

    def _analyze_sentiment(self, text: str) -> tuple:
        """
        使用VADER分析文本情感

        Returns:
            (sentiment, sentiment_score)
            sentiment: positive, negative, neutral
            sentiment_score: 情感分数 (0-1)
        """
        scores = self.sentiment_analyzer.polarity_scores(text)
        compound = scores["compound"]

        if compound >= 0.05:
            return "positive", compound
        elif compound <= -0.05:
            return "negative", abs(compound)
        else:
            return "neutral", 0.5

    def _extract_product_mentions(self, text: str) -> List[str]:
        """
        从文本中提取产品名称
        简化版本，实际应用中应使用NER模型

        Returns:
            产品名称列表
        """
        text = text.lower()

        # 常见产品/工具列表（简化版）
        products = [
            "notion", "figma", "github", "gitlab", "linear", "jira", "trello",
            "slack", "discord", "zoom", "teams", "gmail", "outlook",
            "vscode", "intellij", "vim", "emacs", "xcode",
            "chrome", "firefox", "safari", "edge",
            "aws", "azure", "gcp", "heroku", "vercel", "netlify",
            "docker", "kubernetes", "terraform", "ansible",
            "react", "vue", "angular", "svelte", "nextjs", "nuxt",
            "python", "javascript", "typescript", "java", "go", "rust",
            "mongodb", "postgresql", "mysql", "redis", "elasticsearch"
        ]

        found = []
        for product in products:
            if product in text:
                found.append(product.capitalize())

        return list(set(found))

    def _extract_tags(self, content: str, title: str, category: str) -> List[str]:
        """
        从文本中提取标签

        Returns:
            标签列表
        """
        tags = [category]
        full_text = f"{title} {content}".lower()

        # 功能相关标签
        feature_tags = {
            "offline": ["offline", "offline mode", "no internet", "without connection"],
            "sync": ["sync", "synchronize", "syncing"],
            "export": ["export", "download", "backup"],
            "import": ["import", "migrate", "transfer"],
            "api": ["api", "webhook", "integration"],
            "mobile": ["mobile", "ios", "android", "app"],
            "collaboration": ["collaborate", "team", "share", "real-time"],
            "pricing": ["pricing", "cost", "expensive", "cheap", "free"],
            "performance": ["slow", "lag", "performance", "speed"],
            "ui": ["ui", "design", "interface", "dark mode", "theme"],
            "security": ["security", "privacy", "encryption", "2fa"]
        }

        for tag, keywords in feature_tags.items():
            if any(kw in full_text for kw in keywords):
                tags.append(tag)

        return list(set(tags))

    def get_subreddit_list(self) -> List[Dict]:
        """
        获取可用的subreddit列表
        """
        return [{"name": sub, "url": f"https://reddit.com/r/{sub}"} for sub in self.subreddits]
