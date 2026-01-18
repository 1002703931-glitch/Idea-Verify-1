"""
Twitter(X)数据收集器
从Twitter收集产品相关的推文和功能请求
"""

import tweepy
from typing import List, Dict, Optional
from datetime import datetime
from vaderSentiment import SentimentIntensityAnalyzer
from app.config import settings


class TwitterCollector:
    """
    Twitter数据收集器
    收集产品相关的推文、功能请求
    """

    def __init__(self):
        """初始化Twitter客户端"""
        self.client = None

        if settings.twitter_bearer_token:
            # 使用Twitter API v2
            self.client = tweepy.Client(
                bearer_token=settings.twitter_bearer_token,
                consumer_key=settings.twitter_api_key,
                consumer_secret=settings.twitter_api_secret,
                access_token=settings.twitter_access_token,
                access_token_secret=settings.twitter_access_secret,
                wait_on_rate_limit=True
            )
        else:
            print("警告: Twitter API密钥未配置，Twitter数据收集功能将不可用")

        self.sentiment_analyzer = SentimentIntensityAnalyzer()

    async def collect(
        self,
        query: Optional[str] = None,
        user: Optional[str] = None,
        count: int = 50
    ) -> List[Dict]:
        """
        收集Twitter数据

        Args:
            query: 搜索关键词
            user: 指定用户名
            count: 返回结果数量

        Returns:
            收集到的推文数据列表
        """
        results = []

        if not self.client:
            print("Twitter客户端未初始化，跳过数据收集")
            return []

        try:
            if user:
                # 获取特定用户的推文
                results.extend(await self._collect_from_user(user, count))
            elif query:
                # 搜索推文
                results.extend(await self._search_twitter(query, count))
            else:
                print("Twitter收集需要提供query或user参数")
                return []

            return results

        except Exception as e:
            print(f"收集Twitter数据时出错: {e}")
            return []

    async def _collect_from_user(
        self,
        username: str,
        count: int
    ) -> List[Dict]:
        """
        从特定用户收集推文
        """
        results = []

        try:
            # 获取用户信息
            user = self.client.get_user(username=username)
            if not user:
                return []

            # 获取用户的推文
            tweets = self.client.get_users_tweets(
                user.data.id,
                max_results=min(count, 100),
                tweet_fields=["created_at", "public_metrics", "author_id"]
            )

            if tweets and tweets.data:
                for tweet in tweets.data:
                    data = self._parse_tweet(tweet, username)
                    if data:
                        results.append(data)

        except Exception as e:
            print(f"从用户 @{username} 收集推文时出错: {e}")

        return results

    async def _search_twitter(
        self,
        query: str,
        count: int
    ) -> List[Dict]:
        """
        使用Twitter搜索功能
        """
        results = []

        try:
            # 构建搜索查询
            # 添加需求相关的过滤词
            enhanced_query = f'{query} ("feature request" OR "missing feature" OR "needs" OR "should have" OR "want") -is:retweet'

            tweets = self.client.search_recent_tweets(
                query=enhanced_query,
                max_results=min(count, 100),
                tweet_fields=["created_at", "public_metrics", "author_id", "entities"]
            )

            if tweets and tweets.data:
                for tweet in tweets.data:
                    data = self._parse_tweet(tweet)
                    if data:
                        results.append(data)

        except Exception as e:
            print(f"搜索Twitter时出错: {e}")

        return results

    def _parse_tweet(self, tweet, username: Optional[str] = None) -> Optional[Dict]:
        """
        解析Twitter推文数据

        Args:
            tweet: Twitter推文对象
            username: 用户名（如果已知）

        Returns:
            解析后的数据字典
        """
        try:
            # 获取内容
            content = tweet.text

            # 检查是否与需求相关
            category = self._categorize_tweet(content)

            # 如果不是需求相关，跳过
            if not category:
                return None

            # 进行情感分析
            sentiment, sentiment_score = self._analyze_sentiment(content)

            # 提取标签
            tags = self._extract_tags(content, category)

            # 提取提及的产品（从entities中提取）
            products = self._extract_product_mentions(tweet.entities, content)

            # 计算互动分数
            metrics = tweet.public_metrics
            interaction_score = (
                metrics.get("like_count", 0) +
                metrics.get("reply_count", 0) * 2 +
                metrics.get("retweet_count", 0) * 3 +
                metrics.get("quote_count", 0) * 2
            )

            # 尝试获取用户信息
            author = username
            author_url = None
            if author:
                author_url = f"https://twitter.com/{author}"

            return {
                "content": content,
                "title": None,
                "platform": "twitter",
                "source_url": f"https://twitter.com/i/web/status/{tweet.id}",
                "author": author,
                "author_url": author_url,
                "timestamp": tweet.created_at,
                "upvotes": metrics.get("like_count", 0),
                "comments": metrics.get("reply_count", 0),
                "shares": metrics.get("retweet_count", 0) + metrics.get("quote_count", 0),
                "interaction_score": interaction_score,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "tags": tags,
                "product_mentioned": products,
                "category": category,
                "language": "en"  # 简化处理
            }

        except Exception as e:
            print(f"解析Twitter推文时出错: {e}")
            return None

    def _categorize_tweet(self, content: str) -> Optional[str]:
        """
        对推文进行分类

        Returns:
            category 分类: feature-request, complaint, discussion, None
        """
        content_lower = content.lower()

        # 功能请求关键词
        request_keywords = [
            "feature request", "missing", "need", "should have", "wish",
            "want", "why no", "please add", "implement", "support"
        ]

        # 抱怨关键词
        complaint_keywords = [
            "hate", "frustrating", "annoying", "useless", "broken",
            "sucks", "terrible", "worst", "slow", "lag"
        ]

        # 讨论关键词
        discussion_keywords = [
            "how", "what", "why", "anyone", "experience", "opinion",
            "thoughts", "feedback", "ideas"
        ]

        if any(kw in content_lower for kw in request_keywords):
            return "feature-request"
        if any(kw in content_lower for kw in complaint_keywords):
            return "complaint"
        if any(kw in content_lower for kw in discussion_keywords):
            return "discussion"

        return None

    def _analyze_sentiment(self, text: str) -> tuple:
        """
        使用VADER分析文本情感

        Returns:
            (sentiment, sentiment_score)
        """
        scores = self.sentiment_analyzer.polarity_scores(text)
        compound = scores["compound"]

        if compound >= 0.05:
            return "positive", compound
        elif compound <= -0.05:
            return "negative", abs(compound)
        else:
            return "neutral", 0.5

    def _extract_product_mentions(self, entities: Optional[Dict], content: str) -> List[str]:
        """
        从推文中提取产品名称

        Returns:
            产品名称列表
        """
        products = []

        # 从@mentions中提取
        if entities and entities.get("mentions"):
            for mention in entities["mentions"]:
                # 常见产品账号
                product_accounts = [
                    "github", "notion", "figma", "vercel", "netlify", "slack",
                    "discord", "zoom", "awscloud", "googlecloud", "docker",
                    "kubernetesio", "gitlab", "realtwitter", "x"
                ]
                if mention.username.lower() in product_accounts:
                    products.append(f"@{mention.username}".capitalize())

        # 从内容中提取（简化版）
        content_lower = content.lower()
        product_list = [
            "notion", "figma", "github", "gitlab", "slack", "discord", "zoom",
            "aws", "azure", "gcp", "heroku", "vercel", "netlify",
            "docker", "kubernetes", "react", "vue", "angular", "nextjs"
        ]

        for product in product_list:
            if product in content_lower and product.capitalize() not in products:
                products.append(product.capitalize())

        return products

    def _extract_tags(self, content: str, category: str) -> List[str]:
        """
        从推文中提取标签

        Returns:
            标签列表
        """
        tags = [category]
        content_lower = content.lower()

        feature_tags = {
            "mobile": ["mobile", "ios", "android", "app"],
            "api": ["api", "integration", "webhook"],
            "ui": ["ui", "design", "dark mode", "theme"],
            "pricing": ["pricing", "cost", "expensive", "price"],
            "support": ["support", "help", "customer service"],
            "privacy": ["privacy", "data", "security"]
        }

        for tag, keywords in feature_tags.items():
            if any(kw in content_lower for kw in keywords):
                tags.append(tag)

        return list(set(tags))

    def is_configured(self) -> bool:
        """
        检查Twitter API是否已配置
        """
        return self.client is not None
