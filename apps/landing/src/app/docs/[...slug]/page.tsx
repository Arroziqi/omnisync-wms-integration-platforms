import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import MarkdownRenderer from '../MarkdownRenderer';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

const fileMap: Record<string, string> = {
  'admin/getting-started': 'operational_handbook.md',
  'admin/marketplaces': 'operational_handbook.md',
  'admin/products': 'operational_handbook.md',
  'admin/inventory': 'operational_handbook.md',
  'admin/orders': 'operational_handbook.md',
  'admin/monitoring': 'operational_handbook.md',
  'operations': 'operational_handbook.md',
  'developers/architecture': 'architecture_guide.md',
  'developers/setup': 'onboarding_guide.md',
  'developers/api': 'api_documentation.md',
  'developers/database': 'api_documentation.md',
  'developers/queues': 'architecture_guide.md',
  'devops': 'deployment_guide.md',
  'devops/disaster-recovery': 'deployment_guide.md',
  'qa': 'onboarding_guide.md',
};

// Next.js Server Component to read markdown files and render them
export default async function DocGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = slug.join('/');
  const fileName = fileMap[slugPath];

  if (!fileName) {
    return notFound();
  }

  // Resolve directory path to workspace '/docs'
  let markdownContent = '';
  try {
    const docsDir = path.join(process.cwd(), 'docs');
    const fullPath = path.join(docsDir, fileName);
    
    if (fs.existsSync(fullPath)) {
      markdownContent = fs.readFileSync(fullPath, 'utf8');
    } else {
      // Fallback relative path check if executed in alternative build setups
      const fallbackPath = path.resolve(process.cwd(), '../../docs', fileName);
      if (fs.existsSync(fallbackPath)) {
        markdownContent = fs.readFileSync(fallbackPath, 'utf8');
      } else {
        throw new Error(`File not found at standard path ${fullPath} or fallback ${fallbackPath}`);
      }
    }
  } catch (err) {
    console.error(`Error resolving documentation file for slug path: ${slugPath}`, err);
    return notFound();
  }

  return (
    <MarkdownRenderer content={markdownContent} slug={slugPath} />
  );
}

// Generate static params for Next.js build-time prerendering
export async function generateStaticParams() {
  return Object.keys(fileMap).map((slugPath) => ({
    slug: slugPath.split('/'),
  }));
}
