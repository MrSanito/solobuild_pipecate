import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings/'],
    },
    sitemap: 'https://voiceai.example.com/sitemap.xml',
  }
}
