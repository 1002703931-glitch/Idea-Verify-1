"""
导出 API 路由
提供 CSV 和报告导出功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
import csv
import io
import json

from app.database import get_db
from app.models import Demand
from app.schemas import SearchFilters, PlatformEnum, SentimentEnum, TimeFilterEnum

router = APIRouter(prefix="/export", tags=["导出"])


@router.get("/csv")
async def export_csv(
    query: Optional[str] = Query(None, description="搜索关键词"),
    platforms: Optional[str] = Query(None, description="平台列表，逗号分隔"),
    sentiments: Optional[str] = Query(None, description="情感列表，逗号分隔"),
    categories: Optional[str] = Query(None, description="分类列表，逗号分隔"),
    time_range: Optional[TimeFilterEnum] = Query(None, description="时间范围"),
    min_upvotes: int = Query(0, description="最小点赞数"),
    min_interaction_score: int = Query(0, description="最小互动分数"),
    limit: int = Query(1000, ge=1, le=10000, description="导出数量限制"),
    db: AsyncSession = Depends(get_db)
):
    """
    导出搜索结果为 CSV 文件

    CSV 格式：
    id,platform,author,timestamp,upvotes,comments,shares,sentiment,category,tags,content
    """
    # 构建查询
    sql_query = select(Demand).where(Demand.is_deleted == False)

    # 全文搜索
    if query:
        from sqlalchemy import text
        search_vector = text("plainto_tsquery('english', :query)")
        sql_query = sql_query.where(text("to_tsvector('english', content) @@ " + str(search_vector)))

    # 平台筛选
    if platforms:
        platform_list = [p.strip() for p in platforms.split(",") if p.strip()]
        if "all" not in platform_list:
            sql_query = sql_query.where(Demand.platform.in_(platform_list))

    # 情感筛选
    if sentiments:
        sentiment_list = [s.strip() for s in sentiments.split(",") if s.strip()]
        sql_query = sql_query.where(Demand.sentiment.in_(sentiment_list))

    # 分类筛选
    if categories:
        category_list = [c.strip() for c in categories.split(",") if c.strip()]
        sql_query = sql_query.where(Demand.category.in_(category_list))

    # 时间范围筛选
    if time_range:
        from datetime import timedelta
        time_map = {
            TimeFilterEnum.hour: timedelta(hours=1),
            TimeFilterEnum.day: timedelta(days=1),
            TimeFilterEnum.week: timedelta(weeks=1),
            TimeFilterEnum.month: timedelta(days=30),
            TimeFilterEnum.year: timedelta(days=365),
        }
        time_delta = time_map.get(time_range, timedelta(days=30))
        cutoff_time = datetime.utcnow() - time_delta
        sql_query = sql_query.where(Demand.timestamp >= cutoff_time)

    # 最小点赞数筛选
    if min_upvotes > 0:
        sql_query = sql_query.where(Demand.upvotes >= min_upvotes)

    # 最小互动分数筛选
    if min_interaction_score > 0:
        sql_query = sql_query.where(Demand.interaction_score >= min_interaction_score)

    # 限制数量
    sql_query = sql_query.limit(limit)

    # 执行查询
    result = await db.execute(sql_query)
    demands = result.scalars().all()

    # 创建 CSV 内容
    output = io.StringIO()
    writer = csv.writer(output)

    # 写入表头
    writer.writerow([
        "id", "platform", "author", "timestamp", "upvotes",
        "comments", "shares", "sentiment", "category", "tags", "content"
    ])

    # 写入数据
    for demand in demands:
        # 清理内容中的换行符和引号
        content = demand.content.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
        tags_str = ", ".join(demand.tags) if demand.tags else ""

        writer.writerow([
            str(demand.id),
            demand.platform,
            demand.author or "",
            demand.timestamp.isoformat(),
            demand.upvotes,
            demand.comments,
            demand.shares,
            demand.sentiment,
            demand.category or "",
            tags_str,
            content
        ])

    # 准备响应
    output.seek(0)
    csv_content = output.getvalue()

    # 生成文件名
    filename = f"idea_verify_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8-sig')),  # utf-8-sig 支持 Excel
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/report")
async def export_report(
    query: Optional[str] = Query(None, description="搜索关键词"),
    platforms: Optional[str] = Query(None, description="平台列表，逗号分隔"),
    sentiments: Optional[str] = Query(None, description="情感列表，逗号分隔"),
    categories: Optional[str] = Query(None, description="分类列表，逗号分隔"),
    time_range: Optional[TimeFilterEnum] = Query(None, description="时间范围"),
    min_upvotes: int = Query(0, description="最小点赞数"),
    min_interaction_score: int = Query(0, description="最小互动分数"),
    format: str = Query("json", description="报告格式：json 或 pdf"),
    limit: int = Query(1000, ge=1, le=10000, description="导出数量限制"),
    db: AsyncSession = Depends(get_db)
):
    """
    生成需求报告

    支持两种格式：
    - JSON: 包含搜索条件、结果统计、完整数据
    - PDF: 格式化报告，包含摘要和统计
    """
    # 构建查询（与 export_csv 相同的逻辑）
    sql_query = select(Demand).where(Demand.is_deleted == False)

    if query:
        from sqlalchemy import text
        search_vector = text("plainto_tsquery('english', :query)")
        sql_query = sql_query.where(text("to_tsvector('english', content) @@ " + str(search_vector)))

    if platforms:
        platform_list = [p.strip() for p in platforms.split(",") if p.strip()]
        if "all" not in platform_list:
            sql_query = sql_query.where(Demand.platform.in_(platform_list))

    if sentiments:
        sentiment_list = [s.strip() for s in sentiments.split(",") if s.strip()]
        sql_query = sql_query.where(Demand.sentiment.in_(sentiment_list))

    if categories:
        category_list = [c.strip() for c in categories.split(",") if c.strip()]
        sql_query = sql_query.where(Demand.category.in_(category_list))

    if time_range:
        from datetime import timedelta
        time_map = {
            TimeFilterEnum.hour: timedelta(hours=1),
            TimeFilterEnum.day: timedelta(days=1),
            TimeFilterEnum.week: timedelta(weeks=1),
            TimeFilterEnum.month: timedelta(days=30),
            TimeFilterEnum.year: timedelta(days=365),
        }
        time_delta = time_map.get(time_range, timedelta(days=30))
        cutoff_time = datetime.utcnow() - time_delta
        sql_query = sql_query.where(Demand.timestamp >= cutoff_time)

    if min_upvotes > 0:
        sql_query = sql_query.where(Demand.upvotes >= min_upvotes)

    if min_interaction_score > 0:
        sql_query = sql_query.where(Demand.interaction_score >= min_interaction_score)

    sql_query = sql_query.limit(limit)

    # 执行查询
    result = await db.execute(sql_query)
    demands = result.scalars().all()

    # 统计数据
    total_count = len(demands)
    platform_stats = {}
    sentiment_stats = {}
    category_stats = {}

    for demand in demands:
        # 平台统计
        if demand.platform not in platform_stats:
            platform_stats[demand.platform] = 0
        platform_stats[demand.platform] += 1

        # 情感统计
        if demand.sentiment not in sentiment_stats:
            sentiment_stats[demand.sentiment] = 0
        sentiment_stats[demand.sentiment] += 1

        # 分类统计
        if demand.category and demand.category not in category_stats:
            category_stats[demand.category] = 0
        if demand.category:
            category_stats[demand.category] += 1

    # 准备报告数据
    report_data = {
        "generated_at": datetime.now().isoformat(),
        "search_criteria": {
            "query": query,
            "platforms": platforms,
            "sentiments": sentiments,
            "categories": categories,
            "time_range": time_range.value if time_range else None,
            "min_upvotes": min_upvotes,
            "min_interaction_score": min_interaction_score,
        },
        "summary": {
            "total_demands": total_count,
            "platform_breakdown": platform_stats,
            "sentiment_breakdown": sentiment_stats,
            "category_breakdown": category_stats,
        },
        "data": [
            {
                "id": str(demand.id),
                "content": demand.content,
                "title": demand.title,
                "platform": demand.platform,
                "source_url": demand.source_url,
                "author": demand.author,
                "timestamp": demand.timestamp.isoformat(),
                "upvotes": demand.upvotes,
                "comments": demand.comments,
                "shares": demand.shares,
                "interaction_score": demand.interaction_score,
                "sentiment": demand.sentiment,
                "category": demand.category,
                "tags": demand.tags,
                "product_mentioned": demand.product_mentioned,
            }
            for demand in demands
        ]
    }

    if format.lower() == "pdf":
        # 生成 PDF 报告
        try:
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            # 创建 PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []

            # 标题
            title_style = styles["Heading1"]
            title_style.alignment = TA_CENTER
            story.append(Paragraph("Idea Verify 需求报告", title_style))
            story.append(Spacer(1, 12))

            # 生成时间
            story.append(Paragraph(f"<b>生成时间:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
            story.append(Spacer(1, 12))

            # 搜索条件
            story.append(Paragraph("<b>搜索条件</b>", styles["Heading2"]))
            conditions = [
                ["关键词", query or "-"],
                ["平台", platforms or "-"],
                ["情感", sentiments or "-"],
                ["分类", categories or "-"],
                ["时间范围", time_range.value if time_range else "-"],
                ["最小点赞数", str(min_upvotes)],
                ["最小互动分数", str(min_interaction_score)],
            ]
            condition_table = Table(conditions, colWidths=[3*72, 4*72])
            condition_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(condition_table)
            story.append(Spacer(1, 12))

            # 摘要统计
            story.append(Paragraph("<b>摘要统计</b>", styles["Heading2"]))
            summary_data = [["统计项", "数量"]]
            summary_data.append(["总需求数", str(total_count)])

            if platform_stats:
                summary_data.append(["", ""])
                summary_data.append(["按平台分布", ""])
                for platform, count in platform_stats.items():
                    summary_data.append([f"  - {platform}", str(count)])

            if sentiment_stats:
                summary_data.append(["", ""])
                summary_data.append(["按情感分布", ""])
                for sentiment, count in sentiment_stats.items():
                    summary_data.append([f"  - {sentiment}", str(count)])

            if category_stats:
                summary_data.append(["", ""])
                summary_data.append(["按分类分布", ""])
                for category, count in category_stats.items():
                    summary_data.append([f"  - {category}", str(count)])

            summary_table = Table(summary_data, colWidths=[3*72, 2*72])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 12))

            # 需求详情（前50条）
            story.append(Paragraph("<b>需求详情（前50条）</b>", styles["Heading2"]))

            detail_data = [["平台", "作者", "时间", "互动", "情感", "内容"]]
            for demand in demands[:50]:
                content_preview = demand.content[:80] + "..." if len(demand.content) > 80 else demand.content
                # 清理特殊字符
                content_preview = content_preview.replace("\n", " ").replace("\r", "")
                detail_data.append([
                    demand.platform,
                    demand.author or "-",
                    demand.timestamp.strftime("%Y-%m-%d"),
                    str(demand.interaction_score),
                    demand.sentiment,
                    content_preview,
                ])

            detail_table = Table(detail_data, colWidths=[1*72, 1.5*72, 1.2*72, 0.8*72, 1*72, 4.5*72])
            detail_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ALIGN', (0, 0), (3, -1), 'LEFT'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('ALIGN', (5, 0), (5, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
            ]))
            story.append(detail_table)

            # 构建 PDF
            doc.build(story)

            # 生成文件名
            filename = f"idea_verify_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

            buffer.seek(0)
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PDF 生成功能需要安装 reportlab 库。请运行: pip install reportlab"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF 生成失败: {str(e)}")

    else:
        # JSON 格式
        filename = f"idea_verify_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        return StreamingResponse(
            io.BytesIO(json.dumps(report_data, ensure_ascii=False, indent=2).encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )


@router.get("/bookmarks/csv")
async def export_bookmarks_csv(
    user_id: str = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    导出用户收藏的需求数据为 CSV 文件
    """
    from app.models import Bookmark

    # 查询用户的收藏
    from sqlalchemy.orm import selectinload
    query = (
        select(Bookmark)
        .options(selectinload(Bookmark.demand))
        .where(Bookmark.user_id == user_id)
    )

    result = await db.execute(query)
    bookmarks = result.scalars().all()

    # 创建 CSV 内容
    output = io.StringIO()
    writer = csv.writer(output)

    # 写入表头
    writer.writerow([
        "id", "demand_id", "platform", "author", "timestamp",
        "upvotes", "comments", "shares", "sentiment", "category",
        "tags", "custom_notes", "custom_tags", "custom_category", "content"
    ])

    # 写入数据
    for bookmark in bookmarks:
        demand = bookmark.demand
        if not demand:
            continue

        content = demand.content.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
        tags_str = ", ".join(demand.tags) if demand.tags else ""
        custom_tags_str = ", ".join(bookmark.custom_tags) if bookmark.custom_tags else ""

        writer.writerow([
            str(bookmark.id),
            str(bookmark.demand_id),
            demand.platform,
            demand.author or "",
            demand.timestamp.isoformat(),
            demand.upvotes,
            demand.comments,
            demand.shares,
            demand.sentiment,
            demand.category or "",
            tags_str,
            bookmark.custom_notes or "",
            custom_tags_str,
            bookmark.custom_category or "",
            content
        ])

    output.seek(0)
    csv_content = output.getvalue()

    filename = f"bookmarks_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
