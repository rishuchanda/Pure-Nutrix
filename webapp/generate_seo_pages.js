import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSeoPages() {
  console.log("Fetching products from Supabase...");
  const { data: products, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error("Error fetching products:", error);
    process.exit(1);
  }

  const distDir = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.error("dist/index.html not found! Please run 'npm run build' first.");
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  for (const product of products) {
    let seoHtml = baseHtml;
    
    const title = `${product.name} | Pure Nutrix`;
    const description = (product.short_description || product.name || '').replace(/(<([^>]+)>)/ig, "").substring(0, 160);
    
    let imageUrl = 'https://purenutrix.in/assets/logo.png';
    if (product.image_urls && product.image_urls.length > 0) {
      imageUrl = product.image_urls[0];
      if (!imageUrl.startsWith('http')) {
        imageUrl = `https://purenutrix.in${imageUrl}`;
      }
    }
    
    const productUrl = `https://purenutrix.in/product/${product.slug || product.id}`;

    // Replace OG tags
    seoHtml = seoHtml.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
    seoHtml = seoHtml.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
    seoHtml = seoHtml.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`);
    seoHtml = seoHtml.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${productUrl}">`);

    // Replace Twitter tags
    seoHtml = seoHtml.replace(/<meta property="twitter:title" content="[^"]*">/, `<meta property="twitter:title" content="${title}">`);
    seoHtml = seoHtml.replace(/<meta property="twitter:description" content="[^"]*">/, `<meta property="twitter:description" content="${description}">`);
    seoHtml = seoHtml.replace(/<meta property="twitter:image" content="[^"]*">/, `<meta property="twitter:image" content="${imageUrl}">`);
    seoHtml = seoHtml.replace(/<meta property="twitter:url" content="[^"]*">/, `<meta property="twitter:url" content="${productUrl}">`);

    // Replace normal Title and Meta Description
    seoHtml = seoHtml.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    seoHtml = seoHtml.replace(/<meta name="title" content="[^"]*">/, `<meta name="title" content="${title}">`);
    seoHtml = seoHtml.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`);

    const productDirSlug = path.join(distDir, 'product', product.slug || 'unknown');
    const productDirId = path.join(distDir, 'product', product.id);

    fs.mkdirSync(productDirSlug, { recursive: true });
    fs.writeFileSync(path.join(productDirSlug, 'index.html'), seoHtml);
    
    fs.mkdirSync(productDirId, { recursive: true });
    fs.writeFileSync(path.join(productDirId, 'index.html'), seoHtml);

    console.log(`Generated SEO page for: ${product.name} at /product/${product.slug || product.id}`);
  }
  
  console.log("SEO static pages generated successfully!");
}

generateSeoPages();
