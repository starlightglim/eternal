/**
 * useDocumentMeta - Hook for dynamically updating document title and meta tags
 *
 * Updates document.title and manages OpenGraph/Twitter meta tags for SEO.
 * Meta tags are updated in the document head.
 */

import { useEffect } from 'react';

interface MetaConfig {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

/**
 * Updates or creates a meta tag
 */
function setMetaTag(name: string, content: string, isProperty = false): void {
  const attr = isProperty ? 'property' : 'name';
  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }

  meta.content = content;
}

/**
 * Hook to set document title and meta tags
 * Cleans up meta tags when component unmounts or config changes
 */
export function useDocumentMeta(config: MetaConfig): void {
  useEffect(() => {
    // Store original title for cleanup
    const originalTitle = document.title;

    // Set document title
    document.title = config.title;

    // Set description
    if (config.description) {
      setMetaTag('description', config.description);
    }

    // OpenGraph meta tags
    if (config.ogTitle || config.title) {
      setMetaTag('og:title', config.ogTitle || config.title, true);
    }
    if (config.ogDescription || config.description) {
      setMetaTag('og:description', config.ogDescription || config.description || '', true);
    }
    if (config.ogType) {
      setMetaTag('og:type', config.ogType, true);
    }
    if (config.ogUrl) {
      setMetaTag('og:url', config.ogUrl, true);
    }
    if (config.ogImage) {
      setMetaTag('og:image', config.ogImage, true);
      setMetaTag('twitter:image', config.ogImage);
    }

    // Twitter card meta tags
    if (config.twitterCard) {
      setMetaTag('twitter:card', config.twitterCard);
    }
    if (config.ogTitle || config.title) {
      setMetaTag('twitter:title', config.ogTitle || config.title);
    }
    if (config.ogDescription || config.description) {
      setMetaTag('twitter:description', config.ogDescription || config.description || '');
    }

    // Cleanup function
    return () => {
      document.title = originalTitle;
      // Note: We don't remove meta tags on cleanup to avoid flicker
      // They will be updated by the next page
    };
  }, [config.title, config.description, config.ogTitle, config.ogDescription, config.ogType, config.ogUrl, config.ogImage, config.twitterCard]);
}

/**
 * Sets the page title only (simpler hook)
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = title;
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}
