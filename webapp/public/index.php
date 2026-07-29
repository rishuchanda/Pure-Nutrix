<?php
// Supabase Configuration
$supabaseUrl = 'https://fhxlzzjsoalrmkykhacz.supabase.co';
$supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGx6empzb2Fscm1reWtoYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMzI4OTEsImV4cCI6MjA5OTkwODg5MX0.SynfgiOO394Bmw1r_XlYtTHQnG0KutZybL8TwznjZMM';

// Read the default index.html
$html = file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    die('index.html not found.');
}

// Check the requested URI
$requestUri = $_SERVER['REQUEST_URI'];
$parsedUrl = parse_url($requestUri);
$path = $parsedUrl['path'] ?? '/';

// Check if it's a product or buy page
if (preg_match('#^/(?:product|buy|pdp)/([a-zA-Z0-9-]+)/?$#', $path, $matches)) {
    $slug = $matches[1];
    
    // Fetch product details from Supabase
    $ch = curl_init();
    $apiUrl = $supabaseUrl . "/rest/v1/products?slug=eq." . urlencode($slug) . "&select=*";
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        "apikey: $supabaseAnonKey",
        "Authorization: Bearer $supabaseAnonKey"
    ));
    $response = curl_exec($ch);
    curl_close($ch);
    
    if ($response) {
        $products = json_decode($response, true);
        if (is_array($products) && count($products) > 0) {
            $product = $products[0];
            
            // Extract product data
            $name = htmlspecialchars($product['name'] ?? 'Pure Nutrix Product', ENT_QUOTES, 'UTF-8');
            // Remove HTML tags for description
            $description = strip_tags($product['description'] ?? '');
            // Limit description to ~150 chars
            if (strlen($description) > 150) {
                $description = substr($description, 0, 147) . '...';
            }
            $description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
            
            $image = 'https://purenutrix.in/assets/logo.png';
            if (!empty($product['images']) && is_array($product['images']) && count($product['images']) > 0) {
                $image = htmlspecialchars($product['images'][0], ENT_QUOTES, 'UTF-8');
            }
            
            $currentUrl = "https://purenutrix.in" . htmlspecialchars($path, ENT_QUOTES, 'UTF-8');
            
            // Replacements
            $titleTag = "<title>Pure Nutrix | $name</title>";
            $html = preg_replace('/<title>.*?<\/title>/is', $titleTag, $html);
            $html = preg_replace('/<meta name="title" content="[^"]*">/is', '<meta name="title" content="' . $titleTag . '">', $html);
            
            $html = preg_replace('/<meta name="description" content="[^"]*"/is', '<meta name="description" content="' . $description . '"', $html);
            
            $html = preg_replace('/<meta property="og:title" content="[^"]*">/is', '<meta property="og:title" content="Pure Nutrix | ' . $name . '">', $html);
            $html = preg_replace('/<meta property="og:description" content="[^"]*">/is', '<meta property="og:description" content="' . $description . '">', $html);
            $html = preg_replace('/<meta property="og:image" content="[^"]*">/is', '<meta property="og:image" content="' . $image . '">', $html);
            $html = preg_replace('/<meta property="og:url" content="[^"]*">/is', '<meta property="og:url" content="' . $currentUrl . '">', $html);
            
            $html = preg_replace('/<meta property="twitter:title" content="[^"]*">/is', '<meta property="twitter:title" content="Pure Nutrix | ' . $name . '">', $html);
            $html = preg_replace('/<meta property="twitter:description" content="[^"]*">/is', '<meta property="twitter:description" content="' . $description . '">', $html);
            $html = preg_replace('/<meta property="twitter:image" content="[^"]*">/is', '<meta property="twitter:image" content="' . $image . '">', $html);
            
            // Generate semantic HTML for ad bots / crawlers that don't execute JS
            $price = isset($product['price']) ? $product['price'] : '';
            $botHtml = '<div id="seo-bot-content" style="display:none;" aria-hidden="true">';
            $botHtml .= '<h1>' . $name . '</h1>';
            if ($price) {
                $botHtml .= '<h2>Price: ₹' . htmlspecialchars($price, ENT_QUOTES, 'UTF-8') . '</h2>';
            }
            $botHtml .= '<p>' . htmlspecialchars(strip_tags($product['description'] ?? ''), ENT_QUOTES, 'UTF-8') . '</p>';
            $botHtml .= '<img src="' . $image . '" alt="' . $name . '" />';
            $botHtml .= '</div>';
            
            // Inject bot HTML right after the opening <body> tag
            $html = preg_replace('/<body[^>]*>/i', '$0' . "\n" . $botHtml, $html);
        }
    }
}

// Output the final HTML
echo $html;
