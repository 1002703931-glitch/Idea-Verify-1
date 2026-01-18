"""
GitHub数据收集器
从GitHub issues收集功能请求和bug报告
"""

from typing import List, Dict, Optional
from datetime import datetime
from github import Github
from vaderSentiment import SentimentIntensityAnalyzer
from app.config import settings


class GitHubCollector:
    """
    GitHub数据收集器
    收集GitHub仓库中的功能请求和bug报告
    """

    def __init__(self):
        """初始化GitHub客户端"""
        self.github = Github(settings.github_token)
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

        # 热门仓库列表（示例）
        self.popular_repos = [
            "facebook/react",
            "vuejs/core",
            "angular/angular",
            "microsoft/vscode",
            "notionhq/notion-sdk-js",
            "vercel/next.js",
            "tailwindlabs/tailwindcss",
            "prisma/prisma",
            "typeorm/typeorm",
            "facebook/jest",
            "airbnb/javascript",
            "github/docs",
            "hashicorp/terraform",
            "elastic/elasticsearch"
        ]

    async def collect(
        self,
        query: Optional[str] = None,
        repo: Optional[str] = None,
        state: str = "open",
        limit: int = 50
    ) -> List[Dict]:
        """
        收集GitHub issues

        Args:
            query: 搜索关键词
            repo: 指定仓库（owner/repo格式）
            state: issue状态 (open, closed, all)
            limit: 返回结果数量

        Returns:
            收集到的issue数据列表
        """
        results = []

        try:
            if repo:
                # 从指定仓库收集
                results.extend(await self._collect_from_repo(repo, state, limit))
            elif query:
                # 搜索issues
                results.extend(await self._search_github(query, state, limit))
            else:
                # 从热门仓库收集
                for repository in self.popular_repos[:5]:
                    repo_results = await self._collect_from_repo(repository, state, limit // 5)
                    results.extend(repo_results)

            return results

        except Exception as e:
            print(f"收集GitHub数据时出错: {e}")
            return []

    async def _collect_from_repo(
        self,
        repo_name: str,
        state: str,
        limit: int
    ) -> List[Dict]:
        """
        从单个仓库收集issues
        """
        results = []

        try:
            repo = self.github.get_repo(repo_name)

            # 获取issues
            issues = repo.get_issues(state=state)[:limit]

            for issue in issues:
                data = self._parse_issue(issue, repo_name)
                if data:
                    results.append(data)

        except Exception as e:
            print(f"从仓库 {repo_name} 收集数据时出错: {e}")

        return results

    async def _search_github(
        self,
        query: str,
        state: str,
        limit: int
    ) -> List[Dict]:
        """
        使用GitHub搜索功能
        """
        results = []

        try:
            # 添加label过滤
            search_query = f'{query} label:"enhancement" OR label:"feature request" OR label:"bug"'
            if state == "open":
                search_query += " state:open"

            issues = self.github.search_issues(search_query)[:limit]

            for issue in issues:
                data = self._parse_issue(issue)
                if data:
                    results.append(data)

        except Exception as e:
            print(f"搜索GitHub时出错: {e}")

        return results

    def _parse_issue(self, issue, repo_name: Optional[str] = None) -> Optional[Dict]:
        """
        解析GitHub issue数据

        Args:
            issue: GitHub issue对象
            repo_name: 仓库名称（如果已知）

        Returns:
            解析后的数据字典
        """
        try:
            # 获取内容
            content = issue.body if issue.body else ""

            # 分类issue
            category = self._categorize_issue(content, issue.title, issue.labels)

            # 检查是否是功能请求或bug报告
            if category not in ["feature-request", "bug-report"]:
                return None

            # 情感分析
            full_text = f"{issue.title} {content}"
            sentiment, sentiment_score = self._analyze_sentiment(full_text)

            # 提取标签
            tags = self._extract_labels(issue.labels) + self._extract_tags(content, issue.title, category)

            # 计算互动分数
            interaction_score = (
                issue.reactions.total_count +
                issue.comments * 2
            )

            # 获取仓库名称
            if repo_name is None and issue.repository:
                repo_name = f"{issue.repository.owner.login}/{issue.repository.name}"

            return {
                "content": content,
                "title": issue.title,
                "platform": "github",
                "source_url": issue.html_url,
                "author": str(issue.user.login) if issue.user else None,
                "author_url": issue.user.html_url if issue.user else None,
                "timestamp": issue.created_at,
                "upvotes": issue.reactions.total_count,
                "comments": issue.comments,
                "shares": 0,
                "interaction_score": interaction_score,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "tags": tags,
                "product_mentioned": [repo_name] if repo_name else [],
                "category": category,
                "repository": repo_name,
                "issue_number": issue.number,
                "language": "en"
            }

        except Exception as e:
            print(f"解析GitHub issue时出错: {e}")
            return None

    def _categorize_issue(
        self,
        content: str,
        title: str,
        labels
    ) -> Optional[str]:
        """
        对issue进行分类

        Returns:
            category 分类: feature-request, bug-report, None
        """
        full_text = f"{title} {content}".lower()

        # 检查labels
        for label in labels:
            label_name = label.name.lower()
            if "enhancement" in label_name or "feature" in label_name or "request" in label_name:
                return "feature-request"
            if "bug" in label_name or "error" in label_name or "crash" in label_name:
                return "bug-report"

        # 检查标题和内容
        feature_keywords = ["add feature", "feature request", "would be nice", "support for", "implement"]
        if any(kw in full_text for kw in feature_keywords):
            return "feature-request"

        bug_keywords = ["bug", "issue", "problem", "doesn't work", "not working", "broken"]
        if any(kw in full_text for kw in bug_keywords):
            return "bug-report"

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

    def _extract_labels(self, labels) -> List[str]:
        """
        提取issue标签
        """
        return [label.name for label in labels]

    def _extract_tags(self, content: str, title: str, category: str) -> List[str]:
        """
        从文本中提取标签

        Returns:
            标签列表
        """
        tags = [category]
        full_text = f"{title} {content}".lower()

        feature_tags = {
            "documentation": ["docs", "documentation", "readme", "tutorial"],
            "performance": ["slow", "performance", "optimize", "speed", "lag"],
            "ui": ["ui", "design", "interface", "css", "style"],
            "security": ["security", "vulnerability", "cve", "exploit"],
            "compatibility": ["compatible", "version", "browser", "platform"],
            "testing": ["test", "unit test", "integration", "e2e"]
        }

        for tag, keywords in feature_tags.items():
            if any(kw in full_text for kw in keywords):
                tags.append(tag)

        return list(set(tags))

    def get_popular_repos(self) -> List[Dict]:
        """
        获取热门仓库列表
        """
        return [{"name": repo, "url": f"https://github.com/{repo}"} for repo in self.popular_repos]
