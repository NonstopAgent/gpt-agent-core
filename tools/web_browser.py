import urllib.parse
from playwright.sync_api import sync_playwright


class WebBrowserTool:
    """Simple headless browser using Playwright."""

    def run(self, params: dict) -> dict:
        """Visit a URL or search query and return the title and body text."""
        query = params.get("query", "")
        url = params.get("url")
        if not url:
            if query.startswith("http://") or query.startswith("https://"):
                url = query
            else:
                url = "https://www.google.com/search?q=" + urllib.parse.quote(query)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded")
            title = page.title()
            body = page.inner_text("body")
            browser.close()

        return {"url": url, "title": title, "body": body}
