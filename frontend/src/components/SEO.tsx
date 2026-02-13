
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
}

export function SEO({ title, description, image, type = 'website' }: SEOProps) {
    const siteTitle = 'Gnoma Multichain Explorer';
    const metaTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const metaDescription = description || 'Advanced Multichain Explorer for Anoma Protocol. Real-time solver analytics, transaction tracking, and privacy metrics.';
    const metaImage = image || '/og-image.png';

    return (
        <Helmet>
            <title>{metaTitle}</title>
            <meta name="description" content={metaDescription} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={metaTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={metaImage} />
        </Helmet>
    );
}
