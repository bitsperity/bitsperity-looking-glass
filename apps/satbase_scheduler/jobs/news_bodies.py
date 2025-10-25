"""
Background Job: Fetch News Bodies Asynchronously

This job runs independently and fetches news article bodies without blocking the API.
Agents can work while bodies are being fetched in the background.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

from .utils import get_api_client

logger = logging.getLogger(__name__)


async def fetch_pending_news_bodies(
    max_articles: int = 100,
    batch_size: int = 10,
    timeout_hours: Optional[int] = None
) -> dict:
    """
    Fetch bodies for news articles that don't have them yet.
    
    Args:
        max_articles: Maximum number of articles to process in this run
        batch_size: Number of concurrent requests
        timeout_hours: Only fetch articles newer than this (None = all pending)
    
    Returns:
        dict: Statistics about the fetch operation
    """
    start_time = datetime.utcnow()
    stats = {
        'started_at': start_time.isoformat(),
        'articles_processed': 0,
        'bodies_fetched': 0,
        'errors': 0,
        'status': 'running'
    }
    
    try:
        client = await get_api_client()
        
        # Get articles that need body fetching
        params = {
            'has_body': False,
            'limit': max_articles
        }
        
        if timeout_hours:
            cutoff = start_time - timedelta(hours=timeout_hours)
            params['from'] = cutoff.strftime('%Y-%m-%d')
        
        logger.info(f"Fetching pending news bodies (max={max_articles}, batch={batch_size})")
        
        response = await client.get('/v1/news', params=params)
        response.raise_for_status()
        articles = response.json().get('items', [])
        
        if not articles:
            logger.info("No pending news articles to fetch")
            stats['status'] = 'completed'
            stats['finished_at'] = datetime.utcnow().isoformat()
            return stats
        
        logger.info(f"Found {len(articles)} articles needing bodies")
        
        # Process in batches to avoid overwhelming the system
        for i in range(0, len(articles), batch_size):
            batch = articles[i:i + batch_size]
            batch_tasks = []
            
            for article in batch:
                article_id = article.get('id')
                if article_id:
                    batch_tasks.append(_fetch_single_body(client, article_id))
            
            # Execute batch concurrently
            results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for result in results:
                stats['articles_processed'] += 1
                if isinstance(result, Exception):
                    stats['errors'] += 1
                    logger.error(f"Error fetching body: {result}")
                elif result:
                    stats['bodies_fetched'] += 1
            
            # Small delay between batches to be nice to the API
            if i + batch_size < len(articles):
                await asyncio.sleep(0.5)
        
        stats['status'] = 'completed'
        stats['finished_at'] = datetime.utcnow().isoformat()
        stats['duration_seconds'] = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(
            f"News bodies fetch completed: "
            f"{stats['bodies_fetched']}/{stats['articles_processed']} successful, "
            f"{stats['errors']} errors"
        )
        
    except Exception as e:
        logger.exception(f"Fatal error in fetch_pending_news_bodies: {e}")
        stats['status'] = 'failed'
        stats['error'] = str(e)
        stats['finished_at'] = datetime.utcnow().isoformat()
    
    return stats


async def _fetch_single_body(client: httpx.AsyncClient, article_id: str) -> bool:
    """
    Fetch body for a single article.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        response = await client.post(f'/v1/news/{article_id}/fetch-body')
        response.raise_for_status()
        return True
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.warning(f"Article {article_id} not found")
        elif e.response.status_code == 429:
            logger.warning(f"Rate limited on article {article_id}")
            await asyncio.sleep(2)  # Backoff
        else:
            logger.error(f"HTTP error fetching body for {article_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error fetching body for {article_id}: {e}")
        return False


async def continuous_body_fetcher(
    check_interval_minutes: int = 15,
    max_articles_per_run: int = 100
) -> None:
    """
    Continuously check for and fetch pending news bodies.
    
    This runs as a long-lived background task.
    
    Args:
        check_interval_minutes: How often to check for pending articles
        max_articles_per_run: Max articles to process per iteration
    """
    logger.info(f"Starting continuous news body fetcher (interval={check_interval_minutes}m)")
    
    while True:
        try:
            stats = await fetch_pending_news_bodies(
                max_articles=max_articles_per_run,
                batch_size=10,
                timeout_hours=24  # Only fetch last 24h to stay relevant
            )
            
            if stats['status'] == 'completed':
                logger.info(
                    f"Body fetch cycle completed: "
                    f"{stats.get('bodies_fetched', 0)} fetched, "
                    f"{stats.get('errors', 0)} errors"
                )
            
        except Exception as e:
            logger.exception(f"Error in continuous body fetcher: {e}")
        
        # Wait before next check
        await asyncio.sleep(check_interval_minutes * 60)

